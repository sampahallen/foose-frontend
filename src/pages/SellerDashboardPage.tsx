import { useState, type FormEvent, type ReactNode } from 'react'
import { IoMegaphone, IoReceiptOutline } from 'react-icons/io5'
import { AppShell, Badge, ButtonLink, EmptyState, ErrorState, Icon, ImagePreviewInput, LoadingState, SectionHeader, StatCard } from '../components'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { apiDelete, apiPut } from '../lib/api'
import type { Listing, Order, Shop } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { formatDateTime, formatMoney, getListingImage } from '../utils/format'
import { getCurrentAppPathname, withBasePath } from '../utils/navigation'
import { canSellerMarkPickupReady, isHistoricalOrder, orderAddress, orderProgressLabel, participantContact, participantName } from '../utils/orderStatus'
import { isActiveTopPick, listingPromotionPackages, startPromotionCheckout, type PromotionPackageName } from '../utils/promotions'

const ACCEPT_IMAGES = 'image/jpeg,image/png,image/webp'

function appendIfPresent(source: FormData, target: FormData, name: string) {
  if (source.has(name)) target.append(name, String(source.get(name) || ''))
}

function appendSelectedFile(formData: FormData, form: HTMLFormElement, name: string) {
  const input = form.elements.namedItem(name) as HTMLInputElement | null
  const file = input?.files?.[0]
  if (file && file.name && file.size > 0) formData.append(name, file)
}

function listingIdValue(value: Listing | string | undefined) {
  if (!value) return ''
  return typeof value === 'string' ? value : value._id
}

function orderForListing(orders: Order[], listing: Listing) {
  return orders.find((order) => order.items.some((item) => listingIdValue(item.listingId) === listing._id || item.title === listing.title))
}

function ShopManagementSidebar({
  activePanel,
  collapsed,
  onToggle,
}: {
  activePanel: 'listings' | 'overview' | 'settings' | 'sold'
  collapsed: boolean
  onToggle: () => void
}) {
  const topItems: Array<{
    active?: boolean
    href: string
    icon: Parameters<typeof Icon>[0]['name']
    label: string
  }> = [
    { active: activePanel === 'overview', href: '/manage-shop', icon: 'store', label: 'Shop mgmt.' },
    { active: activePanel === 'listings', href: '/manage-shop/listings', icon: 'grid', label: 'Shop listings' },
    { href: '/manage-shop/orders', icon: 'box', label: 'Orders' },
  ]
  const bottomItems: Array<{
    active?: boolean
    href: string
    icon: Parameters<typeof Icon>[0]['name']
    label: string
  }> = [
    { active: activePanel === 'settings', href: '/manage-shop/settings', icon: 'settings', label: 'Shop settings' },
    { href: '/listings/new', icon: 'plus', label: 'Add listing' },
  ]
  const navLink = (item: (typeof topItems)[number]) => (
    <a
      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition hover:bg-accent-light hover:text-accent ${item.active ? 'bg-accent text-white hover:bg-accent hover:text-white' : 'text-foose-muted'} ${collapsed ? 'justify-center' : ''}`}
      href={withBasePath(item.href)}
      key={item.href}
      title={item.label}
    >
      <Icon name={item.icon} />
      {!collapsed && <span>{item.label}</span>}
    </a>
  )

  return (
    <aside className={`fixed left-4 top-20 z-30 hidden h-[calc(100dvh-6rem)] flex-col rounded-2xl border border-foose-border bg-foose-surface p-3 shadow-xl transition-all lg:flex ${collapsed ? 'w-18' : 'w-64'}`}>
      <button
        aria-label={collapsed ? 'Expand shop sidebar' : 'Collapse shop sidebar'}
        className="mb-4 inline-flex size-10 items-center justify-center self-end rounded-xl border border-foose-border bg-foose-surface-low text-foose-text transition hover:border-accent hover:text-accent"
        onClick={onToggle}
        type="button"
      >
        <Icon name="menu" />
      </button>
      <nav className="flex flex-1 flex-col justify-between gap-10">
        <div className="flex flex-col gap-2">{topItems.map(navLink)}</div>
        <div className="flex flex-col gap-2 border-t border-foose-border pt-4">{bottomItems.map(navLink)}</div>
      </nav>
    </aside>
  )
}

function ShopSettingsPanel({
  onSaved,
  shop,
}: {
  onSaved: () => Promise<unknown>
  shop?: Shop
}) {
  const [editable, setEditable] = useState<Set<string>>(() => new Set())
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  function isEditable(name: string) {
    return editable.has(name)
  }

  function toggleEditable(name: string) {
    setEditable((current) => {
      const next = new Set(current)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function fieldFrame(name: string, label: string, control: ReactNode) {
    const open = isEditable(name)
    return (
      <div className={`rounded-xl border p-4 transition ${open ? 'border-accent bg-accent-light/40' : 'border-foose-border bg-foose-surface'}`}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="text-sm font-bold text-foose-text" htmlFor={name}>
            {label}
          </label>
          <button
            className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition ${open ? 'border-accent bg-accent text-white' : 'border-foose-border bg-white text-accent hover:bg-accent hover:text-white'}`}
            onClick={() => toggleEditable(name)}
            type="button"
          >
            <Icon name="pencil" size={16} /> {open ? 'Unlocked' : 'Edit'}
          </button>
        </div>
        {control}
      </div>
    )
  }

  async function saveShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setSaving(true)

    const form = event.currentTarget
    const sourceData = new FormData(form)
    const formData = new FormData()

    ;[
      'shopName',
      'bio',
      'category',
      'instagram',
      'whatsapp',
      'payoutMethodType',
      'payoutAccountName',
      'payoutProvider',
      'payoutAccountNumber',
      'payoutBankName',
      'payoutBranch',
    ].forEach((field) => appendIfPresent(sourceData, formData, field))
    appendSelectedFile(formData, form, 'logo')
    appendSelectedFile(formData, form, 'banner')

    try {
      await apiPut<{ shop: Shop }>('/digishops/me', formData)
      await onSaved()
      setEditable(new Set())
      setMessage('Shop settings saved.')
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to update shop settings'))
    } finally {
      setSaving(false)
    }
  }

  if (!shop) {
    return <LoadingState label="Loading shop settings..." />
  }

  return (
    <section className="rounded-2xl border border-foose-border bg-foose-surface p-4 shadow-sm md:p-6">
      <SectionHeader title="Shop settings" eyebrow="Unlock individual fields, make your change, then save." />
      <form className="space-y-5 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-foose-border [&_input]:bg-white [&_input]:px-3 [&_input]:py-3 [&_input]:outline-none [&_input]:transition [&_input]:disabled:bg-foose-surface-low [&_input]:disabled:text-foose-muted [&_input]:focus:border-accent [&_input]:focus:ring-2 [&_input]:focus:ring-accent/15 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-foose-border [&_select]:bg-white [&_select]:px-3 [&_select]:py-3 [&_select]:outline-none [&_select]:disabled:bg-foose-surface-low [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-foose-border [&_textarea]:bg-white [&_textarea]:px-3 [&_textarea]:py-3 [&_textarea]:outline-none [&_textarea]:disabled:bg-foose-surface-low" encType="multipart/form-data" onSubmit={(event) => void saveShop(event)}>
        <div className="grid gap-4 lg:grid-cols-2">
          {fieldFrame('shopName', 'Shop name', <input defaultValue={shop.shopName} disabled={!isEditable('shopName')} id="shopName" name="shopName" required />)}
          {fieldFrame(
            'category',
            'Primary category',
            <select defaultValue={shop.category || 'both'} disabled={!isEditable('category')} id="category" name="category">
              <option value="retail">Retail</option>
              <option value="wholesale">Wholesale</option>
              <option value="both">Both</option>
            </select>,
          )}
          <div className="lg:col-span-2">
            {fieldFrame('bio', 'Shop bio', <textarea defaultValue={shop.bio || ''} disabled={!isEditable('bio')} id="bio" name="bio" rows={5} />)}
          </div>
          {fieldFrame('instagram', 'Instagram', <input defaultValue={shop.socialLinks?.instagram || ''} disabled={!isEditable('instagram')} id="instagram" name="instagram" placeholder="@yourshop" />)}
          {fieldFrame('whatsapp', 'WhatsApp', <input defaultValue={shop.socialLinks?.whatsapp || ''} disabled={!isEditable('whatsapp')} id="whatsapp" name="whatsapp" placeholder="+233..." />)}
        </div>

        <fieldset className="rounded-2xl border border-foose-border bg-foose-surface-low p-4">
          <legend className="px-2 text-sm font-bold text-foose-text">Funds collection method</legend>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {fieldFrame(
              'payoutMethodType',
              'Method',
              <select defaultValue={shop.payoutMethod?.type || 'mobile_money'} disabled={!isEditable('payoutMethodType')} id="payoutMethodType" name="payoutMethodType">
                <option value="mobile_money">Mobile money</option>
                <option value="bank_transfer">Bank transfer</option>
              </select>,
            )}
            {fieldFrame('payoutAccountName', 'Account name', <input defaultValue={shop.payoutMethod?.accountName || ''} disabled={!isEditable('payoutAccountName')} id="payoutAccountName" name="payoutAccountName" />)}
            {fieldFrame('payoutProvider', 'Provider', <input defaultValue={shop.payoutMethod?.provider || ''} disabled={!isEditable('payoutProvider')} id="payoutProvider" name="payoutProvider" />)}
            {fieldFrame('payoutAccountNumber', 'Account / phone number', <input defaultValue={shop.payoutMethod?.accountNumber || ''} disabled={!isEditable('payoutAccountNumber')} id="payoutAccountNumber" name="payoutAccountNumber" />)}
            {fieldFrame('payoutBankName', 'Bank name', <input defaultValue={shop.payoutMethod?.bankName || ''} disabled={!isEditable('payoutBankName')} id="payoutBankName" name="payoutBankName" />)}
            {fieldFrame('payoutBranch', 'Branch', <input defaultValue={shop.payoutMethod?.branch || ''} disabled={!isEditable('payoutBranch')} id="payoutBranch" name="payoutBranch" />)}
          </div>
        </fieldset>

        <div className="grid gap-4 lg:grid-cols-2">
          {fieldFrame(
            'logo',
            'Shop logo',
            <div className="space-y-3">
              {shop.logoUrl && <img alt="" className="size-20 rounded-xl border border-foose-border object-cover" src={shop.logoUrl} />}
              {isEditable('logo') && <ImagePreviewInput accept={ACCEPT_IMAGES} maxFiles={1} name="logo" />}
            </div>,
          )}
          {fieldFrame(
            'banner',
            'Shop banner',
            <div className="space-y-3">
              {shop.bannerUrl && <img alt="" className="h-24 w-full rounded-xl border border-foose-border object-cover" src={shop.bannerUrl} />}
              {isEditable('banner') && <ImagePreviewInput accept={ACCEPT_IMAGES} maxFiles={1} name="banner" />}
            </div>,
          )}
        </div>

        {error && <ErrorState message={error} />}
        {message && <p className="rounded-lg bg-foose-success-bg px-4 py-3 text-sm font-bold text-foose-success">{message}</p>}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-foose-border pt-5">
          <ButtonLink to="/manage-shop" variant="secondary">
            Back to listings
          </ButtonLink>
          <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-accent bg-accent px-5 py-2.5 text-center text-sm font-bold text-white shadow-md shadow-accent/15 transition hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-50" disabled={saving} type="submit">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </section>
  )
}

export function SellerDashboardPage() {
  const { user } = useAuth()
  const [deleteError, setDeleteError] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [orderActionId, setOrderActionId] = useState('')
  const [listingQuery, setListingQuery] = useState('')
  const [listingDateFrom, setListingDateFrom] = useState('')
  const [listingDateTo, setListingDateTo] = useState('')
  const [listingPage, setListingPage] = useState(1)
  const [listingStatus, setListingStatus] = useState('')
  const [listingTypeFilter, setListingTypeFilter] = useState('')
  const [promotingListingId, setPromotingListingId] = useState('')
  const [listingPromotionPackage, setListingPromotionPackage] = useState<PromotionPackageName>('basic')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const shop = useApiResource<{ shop: Shop }>('/digishops/me', Boolean(user?.hasShop))
  const orders = useApiResource<{ orders: Order[] }>('/orders/me/selling', Boolean(user?.hasShop))
  const listings = useApiResource<{ listings: Listing[] }>('/listings/me', Boolean(user?.hasShop))
  const currentPath = getCurrentAppPathname()
  const activePanel = currentPath.startsWith('/manage-shop/settings')
    ? 'settings'
    : currentPath.startsWith('/manage-shop/sold')
      ? 'sold'
      : currentPath.startsWith('/manage-shop/listings')
        ? 'listings'
        : 'overview'

  const sellerOrders = orders.data?.orders || []
  const activeSellerOrders = sellerOrders.filter((order) => !isHistoricalOrder(order))
  const previewSellerOrders = activeSellerOrders.slice(0, 3)
  const remainingSellerOrders = Math.max(activeSellerOrders.length - previewSellerOrders.length, 0)
  const totalRevenue = sellerOrders.reduce((sum, order) => (order.status === 'delivered' ? sum + order.totalAmount : sum), 0) || 0
  const allListings = listings.data?.listings || []
  const inventoryListings = allListings.filter((listing) => listing.status !== 'sold')
  const soldListings = allListings.filter((listing) => listing.status === 'sold')
  const filteredListings =
    inventoryListings.filter((listing) => {
      const haystack = [listing.title, listing.category, listing.brand, listing.status, listing.type].filter(Boolean).join(' ').toLowerCase()
      const matchesQuery = !listingQuery || haystack.includes(listingQuery.toLowerCase())
      const matchesStatus = !listingStatus || listing.status === listingStatus
      const matchesType = !listingTypeFilter || listing.type === listingTypeFilter
      const createdAt = listing.createdAt ? new Date(listing.createdAt).getTime() : 0
      const fromDate = listingDateFrom ? new Date(`${listingDateFrom}T00:00:00`).getTime() : 0
      const toDate = listingDateTo ? new Date(`${listingDateTo}T23:59:59`).getTime() : 0
      const matchesFrom = !fromDate || (createdAt && createdAt >= fromDate)
      const matchesTo = !toDate || (createdAt && createdAt <= toDate)
      return matchesQuery && matchesStatus && matchesType && matchesFrom && matchesTo
    })
  const listingsPerPage = 6
  const listingPageCount = Math.max(1, Math.ceil(filteredListings.length / listingsPerPage))
  const currentListingPage = Math.min(listingPage, listingPageCount)
  const visibleListings = filteredListings.slice((currentListingPage - 1) * listingsPerPage, currentListingPage * listingsPerPage)

  if (!user?.isKycVerified) {
    return (
      <AppShell>
        <EmptyState
          action={<ButtonLink to="/kyc">Start KYC</ButtonLink>}
          body="The backend requires approved KYC before opening or managing a DigiShop."
          icon="shield"
          title="KYC required"
        />
      </AppShell>
    )
  }

  if (!user.hasShop) {
    return (
      <AppShell>
        <EmptyState
          action={<ButtonLink to="/open-shop">Open your DigiShop</ButtonLink>}
          body="Open a DigiShop to manage listings and seller orders."
          title="No DigiShop yet"
        />
      </AppShell>
    )
  }

  async function deleteListing(id: string) {
    if (!window.confirm('Remove this listing from the marketplace?')) return
    setDeleteError('')
    setDeletingId(id)
    try {
      await apiDelete(`/listings/${id}`)
      await listings.refetch()
    } catch (requestError) {
      setDeleteError(getErrorMessage(requestError, 'Unable to remove listing'))
    } finally {
      setDeletingId('')
    }
  }

  async function updateOrder(id: string, action: 'process' | 'shipped' | 'pickup-ready') {
    setOrderActionId(`${id}-${action}`)
    try {
      await apiPut(`/orders/${id}/${action}`, {})
      await orders.refetch()
    } catch (requestError) {
      setDeleteError(getErrorMessage(requestError, 'Unable to update order'))
    } finally {
      setOrderActionId('')
    }
  }

  async function promoteListing(id: string) {
    setDeleteError('')
    setPromotingListingId(id)
    try {
      await startPromotionCheckout('listing', id, listingPromotionPackage)
    } catch (requestError) {
      setDeleteError(getErrorMessage(requestError, 'Unable to start listing promotion'))
    } finally {
      setPromotingListingId('')
    }
  }

  return (
    <AppShell active="profile" searchPlaceholder="Search marketplace..." showFooter={false}>
      <ShopManagementSidebar activePanel={activePanel} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((value) => !value)} />
      <div className={`transition-[padding] duration-200 ${sidebarCollapsed ? 'lg:pl-24' : 'lg:pl-72'}`}>
        <div className="mb-5 flex flex-wrap items-center gap-2 lg:hidden">
          <ButtonLink to="/manage-shop" variant={activePanel === 'overview' ? 'primary' : 'secondary'}>
            <Icon name="store" /> Shop mgmt.
          </ButtonLink>
          <ButtonLink to="/manage-shop/listings" variant={activePanel === 'listings' ? 'primary' : 'secondary'}>
            <Icon name="grid" /> Listings
          </ButtonLink>
          <ButtonLink to="/manage-shop/orders" variant="secondary">
            <Icon name="box" /> Orders
          </ButtonLink>
          <ButtonLink to="/manage-shop/settings" variant={activePanel === 'settings' ? 'primary' : 'secondary'}>
            <Icon name="settings" /> Settings
          </ButtonLink>
          <ButtonLink to="/listings/new" variant="secondary">
            <Icon name="plus" /> Add listing
          </ButtonLink>
        </div>
        <div className="dashboard-head mb-6 flex flex-col gap-4 rounded-2xl bg-accent-light/60 p-4 shadow-sm md:flex-row md:items-center md:justify-between md:p-6 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base max-md:[&_h1]:text-2xl">
          <div>
            <h1>{activePanel === 'settings' ? 'Shop settings' : activePanel === 'sold' ? 'Sold items' : activePanel === 'listings' ? 'Shop listings' : shop.data?.shop.shopName || 'Manage shop'}</h1>
            <p>{activePanel === 'settings' ? 'Edit your DigiShop profile and payout details.' : activePanel === 'sold' ? 'Review sold listings and the orders attached to them.' : activePanel === 'listings' ? 'Search, filter, promote, edit, and manage your inventory.' : 'A cleaner control room for orders, revenue, shop health, and next actions.'}</p>
            {shop.data?.shop.slug && <a href={withBasePath(`/shops/${shop.data.shop.slug}`)}>View public shop</a>}
          </div>
          <div className="button-row flex flex-wrap items-center gap-3">
            <ButtonLink to="/listings/new">Add Listing</ButtonLink>
            <ButtonLink to="/wallet" variant="secondary">
              Wallet
            </ButtonLink>
          </div>
        </div>
        {(shop.loading || orders.loading || listings.loading) && <LoadingState label="Loading seller workspace..." />}
        {(shop.error || orders.error || listings.error) && (
          <ErrorState message={shop.error || orders.error || listings.error} retry={() => void Promise.all([shop.refetch(), orders.refetch(), listings.refetch()])} />
        )}
        {deleteError && <ErrorState message={deleteError} />}
        {activePanel === 'settings' ? (
          <ShopSettingsPanel onSaved={shop.refetch} shop={shop.data?.shop} />
        ) : activePanel === 'sold' ? (
          <section className="rounded-2xl bg-foose-surface p-3 shadow-sm md:p-5">
            <SectionHeader
              action={
                <ButtonLink to="/manage-shop" variant="secondary">
                  <Icon name="grid" /> Shop listings
                </ButtonLink>
              }
              title="Sold items"
              eyebrow="Sold inventory is separated from active shop management."
            />
            {!soldListings.length && <EmptyState body="Sold listings will appear here after checkout." title="No sold items yet" />}
            {!!soldListings.length && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {soldListings.map((listing) => {
                  const order = orderForListing(sellerOrders, listing)
                  const orderLine = order?.items.find((item) => listingIdValue(item.listingId) === listing._id || item.title === listing.title)

                  return (
                    <article className="rounded-xl bg-white p-3 shadow-sm" key={listing._id}>
                      <div className="mb-3 overflow-hidden rounded-lg bg-foose-surface-low aspect-[4/3] [&_img]:h-full [&_img]:w-full [&_img]:object-contain">
                        {getListingImage(listing) ? <img alt={listing.title} src={getListingImage(listing)} /> : <span className="flex h-full items-center justify-center text-sm font-semibold text-foose-faint">No image</span>}
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-bold text-foose-text">{listing.title}</h3>
                            <p className="text-sm font-semibold text-accent">{formatMoney(orderLine?.price || listing.price, listing.currency)}</p>
                          </div>
                          <Badge tone="danger">Sold</Badge>
                        </div>
                        <dl className="grid gap-2 text-sm [&_div]:rounded-lg [&_div]:bg-foose-surface-low [&_div]:p-3 [&_dt]:text-xs [&_dt]:font-bold [&_dt]:uppercase [&_dt]:tracking-widest [&_dt]:text-foose-faint [&_dd]:mt-1 [&_dd]:font-semibold [&_dd]:text-foose-text">
                          <div>
                            <dt>Buyer</dt>
                            <dd>{order ? participantName(order.buyerId, 'Buyer') : 'Order pending'}</dd>
                          </div>
                          <div>
                            <dt>Status</dt>
                            <dd>{order ? orderProgressLabel(order) : 'Sold'}</dd>
                          </div>
                          <div>
                            <dt>Sold on</dt>
                            <dd>{formatDateTime(order?.createdAt || listing.updatedAt)}</dd>
                          </div>
                        </dl>
                        {order ? (
                          <a className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-accent bg-accent px-3 text-sm font-bold text-white transition hover:bg-accent-hover" href={withBasePath(`/orders/${order._id}`)}>
                            <IoReceiptOutline /> View order details
                          </a>
                        ) : (
                          <span className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-foose-border bg-foose-surface-low px-3 text-sm font-bold text-foose-muted">
                            Order details unavailable
                          </span>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        ) : (
          <>
            {activePanel === 'overview' && (
              <>
            <div className="stats-row mb-8 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon="money" label="Delivered revenue" value={formatMoney(totalRevenue)} note="Completed orders" />
              <StatCard icon="box" label="Active Orders" value={String(activeSellerOrders.length)} note="Seller orders" />
              <StatCard icon="star" label="Shop Rating" value={`${shop.data?.shop.rating || 0} / 5.0`} note={`${shop.data?.shop.totalReviews || 0} reviews`} />
            </div>
            <section className="rounded-2xl bg-foose-surface p-4 shadow-sm md:p-6">
          <SectionHeader title="Seller Orders" eyebrow="Latest paid items that need seller action." action={<a href={withBasePath('/manage-shop/orders')}>{remainingSellerOrders ? `View all (${remainingSellerOrders} more)` : 'View all'}</a>} />
          {!previewSellerOrders.length && <EmptyState body="Paid orders will appear after buyers check out." title="No seller orders" />}
          {!!previewSellerOrders.length && (
            <div className="seller-orders space-y-4 [&_article.highlighted]:border-accent [&_article.highlighted]:bg-accent-light">
              {previewSellerOrders.map((order) => (
                <article className="seller-order-card rounded-xl border border-foose-border bg-foose-surface p-4" id={`order-${order._id}`} key={order._id}>
                  <div>
                    <div className="badge-row flex flex-wrap items-center gap-3">
                      <Badge tone={order.status === 'disputed' ? 'danger' : order.sellerAction === 'pickup_ready' ? 'warning' : 'accent'}>{orderProgressLabel(order)}</Badge>
                      <Badge tone={order.paymentStatus === 'paid' ? 'success' : 'warning'}>{order.paymentStatus || 'unpaid'}</Badge>
                      <Badge>{order.delivery?.method || 'delivery'}</Badge>
                    </div>
                    <h3>{order.items[0]?.title || 'Order item'}</h3>
                    <p>
                      {formatMoney(order.totalAmount, order.currency)}
                      {order.deliveryFee ? ` incl. ${formatMoney(order.deliveryFee, order.currency)} delivery` : ''}
                    </p>
                    <dl className="seller-order-meta grid gap-3 sm:grid-cols-2 [&_div]:rounded-lg [&_div]:bg-foose-surface-low [&_div]:p-3 [&_dt]:text-xs [&_dt]:font-bold [&_dt]:uppercase [&_dt]:tracking-widest [&_dt]:text-foose-faint [&_dd]:mt-1 [&_dd]:text-sm [&_dd]:font-semibold [&_dd]:text-foose-text">
                      <div>
                        <dt>Buyer</dt>
                        <dd>{participantName(order.buyerId, 'Buyer')}</dd>
                      </div>
                      <div>
                        <dt>Contact</dt>
                        <dd>{participantContact(order.buyerId) || 'No contact saved'}</dd>
                      </div>
                      <div>
                        <dt>Address / pickup</dt>
                        <dd>{order.delivery?.method === 'delivery' ? orderAddress(order) || 'Address not provided' : orderAddress(order) || 'Pickup details pending'}</dd>
                      </div>
                      <div>
                        <dt>Action deadline</dt>
                        <dd>{formatDateTime(order.sellerActionDeadline)}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="table-actions flex flex-wrap items-center gap-3 justify-end">
                    {['pending', 'paid'].includes(order.status) && (
                      <button
                        className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent"
                        disabled={orderActionId === `${order._id}-process`}
                        onClick={() => void updateOrder(order._id, 'process')}
                        type="button"
                      >
                        {orderActionId === `${order._id}-process` ? 'Processing...' : 'Accept'}
                      </button>
                    )}
                    {order.delivery?.method === 'delivery' && ['paid', 'processing'].includes(order.status) && (
                      <button
                        className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover"
                        disabled={orderActionId === `${order._id}-shipped`}
                        onClick={() => void updateOrder(order._id, 'shipped')}
                        type="button"
                      >
                        {orderActionId === `${order._id}-shipped` ? 'Sending...' : 'Mark sent'}
                      </button>
                    )}
                    {order.delivery?.method === 'pickup' && order.sellerAction === 'pickup_ready' && <Badge tone="warning">Awaiting pickup</Badge>}
                    {canSellerMarkPickupReady(order) && (
                      <button
                        className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover"
                        disabled={orderActionId === `${order._id}-pickup-ready`}
                        onClick={() => void updateOrder(order._id, 'pickup-ready')}
                        type="button"
                      >
                        {orderActionId === `${order._id}-pickup-ready` ? 'Notifying buyer...' : 'Pickup ready'}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
            </section>
              </>
            )}
            {activePanel === 'listings' && (
          <section className="home-section mx-auto w-full max-w-[1280px] rounded-xl bg-foose-surface p-3 md:p-5 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:md:text-4xl [&_a]:font-bold [&_a]:text-accent max-lg:rounded-lg max-lg:p-3 max-md:[&>h2]:text-2xl">
            <SectionHeader
              action={
                <ButtonLink to="/manage-shop/sold" variant="secondary">
                  <IoReceiptOutline /> Sold items
                </ButtonLink>
              }
              title="Shop listings"
            />
            <div className="mb-3 flex flex-wrap items-center justify-end gap-2 text-sm">
              <label className="font-bold text-foose-muted" htmlFor="listing-promotion-package">
                Promotion package
              </label>
              <select
                className="h-10 rounded-lg border border-foose-border bg-white px-3 text-sm font-semibold text-foose-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                id="listing-promotion-package"
                onChange={(event) => setListingPromotionPackage(event.target.value as PromotionPackageName)}
                value={listingPromotionPackage}
              >
                {listingPromotionPackages.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="listing-manager-toolbar mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,0.85fr)] [&_input]:h-10 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-foose-border [&_input]:bg-foose-surface [&_input]:px-3 [&_input]:text-sm [&_input]:outline-none [&_input]:transition [&_input]:focus:border-accent [&_input]:focus:ring-2 [&_input]:focus:ring-accent/15 [&_label]:space-y-1 [&_label_span]:text-xs [&_label_span]:font-bold [&_label_span]:uppercase [&_label_span]:tracking-wider [&_label_span]:text-foose-faint [&_select]:h-10 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-foose-border [&_select]:bg-foose-surface [&_select]:px-3 [&_select]:text-sm [&_select]:outline-none [&_select]:transition [&_select]:focus:border-accent [&_select]:focus:ring-2 [&_select]:focus:ring-accent/15">
              <input
                aria-label="Search shop listings"
                onChange={(event) => {
                  setListingQuery(event.target.value)
                  setListingPage(1)
                }}
                placeholder="Search your listings..."
                value={listingQuery}
              />
              <select
                aria-label="Filter by type"
                onChange={(event) => {
                  setListingTypeFilter(event.target.value)
                  setListingPage(1)
                }}
                value={listingTypeFilter}
              >
                <option value="">All types</option>
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
              </select>
              <select
                aria-label="Filter by status"
                onChange={(event) => {
                  setListingStatus(event.target.value)
                  setListingPage(1)
                }}
                value={listingStatus}
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
              <label>
                <span>Start date</span>
                <input
                  aria-label="Filter listings from date"
                  onChange={(event) => {
                    setListingDateFrom(event.target.value)
                    setListingPage(1)
                  }}
                  type="date"
                  value={listingDateFrom}
                />
              </label>
              <label>
                <span>End date</span>
                <input
                  aria-label="Filter listings to date"
                  onChange={(event) => {
                    setListingDateTo(event.target.value)
                    setListingPage(1)
                  }}
                  type="date"
                  value={listingDateTo}
                />
              </label>
            </div>
            {!inventoryListings.length && <EmptyState body="Create listings to manage inventory here." title="No listings yet" />}
            {!!inventoryListings.length && !filteredListings.length && (
              <EmptyState body="Adjust your listing search or filters." title="No listings match" />
            )}
            {!!filteredListings.length && (
              <div className="listing-manager-grid grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visibleListings.map((listing) => (
                  <article className="listing-manager-card rounded-xl bg-foose-surface shadow-sm p-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:leading-tight [&_small]:text-xs [&_small]:uppercase [&_small]:tracking-wide [&_small]:text-foose-faint flex flex-col gap-3" key={listing._id}>
                    <div className="listing-manager-image relative overflow-hidden rounded-lg bg-foose-surface-low [&_img]:h-full [&_img]:w-full [&_img]:object-contain aspect-[4/3] image-frame">
                      <button
                        aria-label={isActiveTopPick(listing.promotionTags, listing.promotionExpiresAt) ? `${listing.title} is promoted` : `Promote ${listing.title}`}
                        className={`absolute left-3 top-3 z-10 inline-flex size-10 items-center justify-center rounded-full border shadow-lg transition disabled:pointer-events-none disabled:opacity-70 ${isActiveTopPick(listing.promotionTags, listing.promotionExpiresAt) ? 'border-accent bg-accent text-white' : 'border-white/80 bg-white text-accent hover:bg-accent hover:text-white'}`}
                        disabled={promotingListingId === listing._id || isActiveTopPick(listing.promotionTags, listing.promotionExpiresAt)}
                        onClick={() => void promoteListing(listing._id)}
                        title={isActiveTopPick(listing.promotionTags, listing.promotionExpiresAt) ? 'Promoted in Top Picks' : `Promote with ${listingPromotionPackage}`}
                        type="button"
                      >
                        <IoMegaphone />
                      </button>
                      {getListingImage(listing) ? <img alt={listing.title} src={getListingImage(listing)} /> : <span className="image-placeholder flex min-h-32 items-center justify-center bg-foose-surface-mid text-sm font-semibold text-foose-faint">No image</span>}
                    </div>
                    <div>
                      <div className="badge-row flex flex-wrap items-center gap-3">
                        <Badge tone={listing.type === 'wholesale' ? 'warning' : 'accent'}>{listing.type}</Badge>
                        <Badge tone={listing.status === 'sold' ? 'danger' : 'neutral'}>{listing.status || 'active'}</Badge>
                        {isActiveTopPick(listing.promotionTags, listing.promotionExpiresAt) && <Badge tone="success">Top Pick</Badge>}
                      </div>
                      <h3>{listing.title}</h3>
                      <p>{formatMoney(listing.price, listing.currency)}</p>
                      <small>
                        {listing.type === 'retail'
                          ? 'Single retail item'
                          : `${listing.quantity || 0} available / min ${listing.bulkMinQty || 1}`}
                      </small>
                    </div>
                    <div className="table-actions mt-auto flex flex-nowrap items-center justify-end gap-2">
                      <a className="button inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-center text-sm font-bold transition whitespace-nowrap disabled:pointer-events-none disabled:opacity-50 button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" href={withBasePath(`/listing/${listing._id}`)}>
                        View
                      </a>
                      <a aria-label={`Edit ${listing.title}`} className="icon-button inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-accent bg-white text-accent shadow-sm transition hover:bg-accent hover:text-white" href={withBasePath(`/listings/${listing._id}/edit`)} title="Edit listing">
                        <Icon name="pencil" />
                      </a>
                      <button
                        aria-label={deletingId === listing._id ? `Removing ${listing.title}` : `Remove ${listing.title}`}
                        className="icon-button inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-foose-danger transition hover:border-foose-danger hover:bg-red-100 disabled:pointer-events-none disabled:opacity-50"
                        disabled={deletingId === listing._id}
                        onClick={() => void deleteListing(listing._id)}
                        title={deletingId === listing._id ? 'Removing...' : 'Remove listing'}
                        type="button"
                      >
                        <Icon name="trash" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {filteredListings.length > listingsPerPage && (
              <div className="listing-pagination mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-foose-border pt-4 text-sm text-foose-muted">
                <span>
                  Showing {(currentListingPage - 1) * listingsPerPage + 1}-{Math.min(currentListingPage * listingsPerPage, filteredListings.length)} of {filteredListings.length}
                </span>
                <div className="flex items-center gap-2">
                  <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-foose-border bg-foose-surface px-3 font-semibold text-foose-text transition hover:border-accent hover:text-accent disabled:opacity-50" disabled={currentListingPage === 1} onClick={() => setListingPage((page) => Math.max(1, page - 1))} type="button">
                    Previous
                  </button>
                  <span className="font-semibold text-foose-text">
                    {currentListingPage} / {listingPageCount}
                  </span>
                  <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-foose-border bg-foose-surface px-3 font-semibold text-foose-text transition hover:border-accent hover:text-accent disabled:opacity-50" disabled={currentListingPage === listingPageCount} onClick={() => setListingPage((page) => Math.min(listingPageCount, page + 1))} type="button">
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
