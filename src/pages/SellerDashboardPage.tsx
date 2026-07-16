import { useState, type FormEvent, type ReactNode } from 'react'
import { IoMegaphone, IoReceiptOutline } from 'react-icons/io5'
import { AppShell, Badge, ButtonLink, EmptyState, ErrorState, Icon, ImagePreviewInput, LoadingState, SectionHeader, SelectControl, StatCard } from '../components'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { apiDelete, apiPut } from '../lib/api'
import type { Listing, Order, Shop, User } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { formatDateTime, formatMoney, getListingImage } from '../utils/format'
import { canonicalGhanaRegion, GHANA_REGIONS } from '../utils/ghanaRegions'
import { getCurrentAppPathname, withBasePath } from '../utils/navigation'
import { canSellerMarkPickupReady, isHistoricalOrder, orderAddress, orderProgressLabel, participantContact, participantName } from '../utils/orderStatus'
import { isActiveTopPick } from '../utils/promotions'

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
    { active: activePanel === 'overview', href: '/manage-shop', icon: 'store', label: 'Shop Management' },
    { active: activePanel === 'listings', href: '/manage-shop/listings', icon: 'grid', label: 'Shop listings' },
    { href: '/manage-shop/orders', icon: 'box', label: 'Orders' },
  ]
  const bottomItems: typeof topItems = [
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
  defaultLocation,
  onSaved,
  shop,
}: {
  defaultLocation?: User['location']
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
      <div className={`rounded-xl border p-3 transition ${open ? 'border-accent bg-accent-light/40' : 'border-foose-border bg-white'}`}>
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
      'city',
      'region',
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

  const city = shop.location?.city?.trim() || defaultLocation?.city?.trim() || ''
  const region = canonicalGhanaRegion(shop.location?.region) || canonicalGhanaRegion(defaultLocation?.region)
  const hasLegacyRegion = Boolean(region && !GHANA_REGIONS.some((option) => option === region))

  return (
    <section>
      <form className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-foose-border [&_input]:bg-white [&_input]:px-3 [&_input]:py-3 [&_input]:outline-none [&_input]:transition [&_input]:disabled:bg-accent-light/50 [&_input]:disabled:text-foose-muted [&_input]:focus:border-accent [&_input]:focus:ring-2 [&_input]:focus:ring-accent/15 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-foose-border [&_select]:bg-white [&_select]:px-3 [&_select]:py-3 [&_select]:outline-none [&_select]:disabled:bg-accent-light/50 [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-foose-border [&_textarea]:bg-white [&_textarea]:px-3 [&_textarea]:py-3 [&_textarea]:outline-none [&_textarea]:disabled:bg-accent-light/50" encType="multipart/form-data" onSubmit={(event) => void saveShop(event)}>
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-foose-border bg-foose-surface shadow-sm">
            <header className="flex items-center justify-between gap-3 border-b border-foose-border bg-accent-light/50 px-4 py-4 md:px-6">
              <div>
                <h2 className="text-xl font-black text-foose-text">General info</h2>
                <p className="text-sm text-foose-muted">Core details shoppers see first.</p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-black text-accent hover:bg-white" onClick={() => setEditable(new Set(['shopName', 'category', 'bio']))} type="button">
                <Icon name="pencil" size={16} /> Edit
              </button>
            </header>
            <div className="grid gap-4 p-4 md:grid-cols-2 md:p-6">
              {fieldFrame('shopName', 'Shop name', <input defaultValue={shop.shopName} disabled={!isEditable('shopName')} id="shopName" name="shopName" required />)}
              {fieldFrame(
                'category',
                'Primary category',
                <SelectControl defaultValue={shop.category || 'both'} disabled={!isEditable('category')} id="category" name="category">
                  <option value="retail">Retail</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="both">Both</option>
                </SelectControl>,
              )}
              <div className="md:col-span-2">
                {fieldFrame('bio', 'Shop bio', <textarea defaultValue={shop.bio || ''} disabled={!isEditable('bio')} id="bio" name="bio" rows={5} />)}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-foose-border bg-foose-surface shadow-sm">
            <header className="flex items-center justify-between gap-3 border-b border-foose-border bg-accent-light/50 px-4 py-4 md:px-6">
              <div>
                <h2 className="text-xl font-black text-foose-text">Shop location</h2>
                <p className="text-sm text-foose-muted">Used to tag every item and power marketplace location filters.</p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-black text-accent hover:bg-white" onClick={() => setEditable(new Set(['city', 'region']))} type="button">
                <Icon name="pencil" size={16} /> Edit
              </button>
            </header>
            <div className="grid gap-4 p-4 md:grid-cols-2 md:p-6">
              {fieldFrame('city', 'City or town', <input defaultValue={city} disabled={!isEditable('city')} id="city" name="city" placeholder="e.g. Accra" required />)}
              {fieldFrame(
                'region',
                'Region',
                <SelectControl defaultValue={region} disabled={!isEditable('region')} id="region" name="region" required>
                  <option value="">Select region</option>
                  {hasLegacyRegion && <option value={region}>{region}</option>}
                  {GHANA_REGIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </SelectControl>,
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-foose-border bg-foose-surface shadow-sm">
            <header className="flex items-center justify-between gap-3 border-b border-foose-border bg-accent-light/50 px-4 py-4 md:px-6">
              <div>
                <h2 className="text-xl font-black text-foose-text">Social connections</h2>
                <p className="text-sm text-foose-muted">Keep your customer contact links tidy.</p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-black text-accent hover:bg-white" onClick={() => setEditable(new Set(['instagram', 'whatsapp']))} type="button">
                <Icon name="pencil" size={16} /> Edit
              </button>
            </header>
            <div className="grid gap-4 p-4 md:grid-cols-2 md:p-6">
              {fieldFrame('instagram', 'Instagram', <input defaultValue={shop.socialLinks?.instagram || ''} disabled={!isEditable('instagram')} id="instagram" name="instagram" placeholder="@yourshop" />)}
              {fieldFrame('whatsapp', 'WhatsApp', <input defaultValue={shop.socialLinks?.whatsapp || ''} disabled={!isEditable('whatsapp')} id="whatsapp" name="whatsapp" placeholder="+233..." />)}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-foose-border bg-foose-surface shadow-sm">
            <header className="flex items-center justify-between gap-3 border-b border-foose-border bg-accent-light/50 px-4 py-4 md:px-6">
              <div>
                <h2 className="text-xl font-black text-foose-text">Funds collection method</h2>
                <p className="text-sm text-foose-muted">Where Foose should send shop funds.</p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-black text-accent hover:bg-white" onClick={() => setEditable(new Set(['payoutMethodType', 'payoutAccountName', 'payoutProvider', 'payoutAccountNumber', 'payoutBankName', 'payoutBranch']))} type="button">
                <Icon name="pencil" size={16} /> Edit
              </button>
            </header>
            <div className="grid gap-4 p-4 md:grid-cols-2 md:p-6">
              {fieldFrame(
                'payoutMethodType',
                'Method',
                <SelectControl defaultValue={shop.payoutMethod?.type || 'mobile_money'} disabled={!isEditable('payoutMethodType')} id="payoutMethodType" name="payoutMethodType">
                  <option value="mobile_money">Mobile money</option>
                  <option value="bank_transfer">Bank transfer</option>
                </SelectControl>,
              )}
              {fieldFrame('payoutProvider', 'Provider', <input defaultValue={shop.payoutMethod?.provider || ''} disabled={!isEditable('payoutProvider')} id="payoutProvider" name="payoutProvider" placeholder="MTN, Vodafone, bank..." />)}
              {fieldFrame('payoutAccountName', 'Account name', <input defaultValue={shop.payoutMethod?.accountName || ''} disabled={!isEditable('payoutAccountName')} id="payoutAccountName" name="payoutAccountName" />)}
              {fieldFrame('payoutAccountNumber', 'Account / phone number', <input defaultValue={shop.payoutMethod?.accountNumber || ''} disabled={!isEditable('payoutAccountNumber')} id="payoutAccountNumber" name="payoutAccountNumber" />)}
              {fieldFrame('payoutBankName', 'Bank name', <input defaultValue={shop.payoutMethod?.bankName || ''} disabled={!isEditable('payoutBankName')} id="payoutBankName" name="payoutBankName" />)}
              {fieldFrame('payoutBranch', 'Branch', <input defaultValue={shop.payoutMethod?.branch || ''} disabled={!isEditable('payoutBranch')} id="payoutBranch" name="payoutBranch" />)}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-foose-border bg-foose-surface shadow-sm">
            <header className="border-b border-foose-border bg-accent-light/50 px-4 py-4">
              <h2 className="text-xl font-black text-foose-text">Brand assets</h2>
            </header>
            <div className="space-y-5 p-4">
              {fieldFrame(
                'logo',
                'Shop logo',
                <div className="space-y-3">
                  {shop.logoUrl && <img alt="" className="size-24 rounded-2xl border border-foose-border object-cover" src={shop.logoUrl} />}
                  {isEditable('logo') ? <ImagePreviewInput accept={ACCEPT_IMAGES} maxFiles={1} name="logo" /> : <button className="flex min-h-28 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-foose-border bg-accent-light/50 text-sm font-bold text-foose-muted" onClick={() => toggleEditable('logo')} type="button"><Icon name="upload" /> Upload logo</button>}
                </div>,
              )}
              {fieldFrame(
                'banner',
                'Shop banner',
                <div className="space-y-3">
                  {shop.bannerUrl && <img alt="" className="h-28 w-full rounded-2xl border border-foose-border object-cover" src={shop.bannerUrl} />}
                  {isEditable('banner') ? <ImagePreviewInput accept={ACCEPT_IMAGES} maxFiles={1} name="banner" /> : <button className="flex min-h-32 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-foose-border bg-accent-light/50 text-sm font-bold text-foose-muted" onClick={() => toggleEditable('banner')} type="button"><Icon name="upload" /> Upload banner</button>}
                </div>,
              )}
              <div className="rounded-2xl bg-accent-light p-4 text-sm leading-6 text-foose-muted">
                <strong className="mb-1 block text-accent">Identity verification</strong>
                Ensure your shop brand assets align with marketplace guidelines to maintain professional visibility.
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-foose-border bg-accent-light p-5 text-sm leading-6 text-foose-muted shadow-sm">
            <strong className="mb-2 block text-foose-text">Pro tip</strong>
            Adding a detailed shop bio increases customer trust. Describe your values and what makes your thrift store unique.
          </section>
        </aside>

        {error && <ErrorState message={error} />}
        {message && <p className="rounded-lg bg-foose-success-bg px-4 py-3 text-sm font-bold text-foose-success">{message}</p>}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-foose-border pt-5 lg:col-span-2">
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

  return (
    <AppShell active="profile" searchPlaceholder="Search marketplace..." showFooter={false}>
      <ShopManagementSidebar activePanel={activePanel} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((value) => !value)} />
      <div className={sidebarCollapsed ? 'lg:pl-24' : 'lg:pl-72'}>
        <div className="mb-5 flex flex-wrap items-center gap-2 lg:hidden">
          <ButtonLink to="/manage-shop" variant={activePanel === 'overview' ? 'primary' : 'secondary'}>
            <Icon name="store" /> Shop Management
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
        <div className="dashboard-head mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base max-md:[&_h1]:text-2xl">
          <div>
            <h1>{activePanel === 'settings' ? 'Shop settings' : activePanel === 'sold' ? 'Sold items' : activePanel === 'listings' ? 'Shop listings' : shop.data?.shop.shopName || 'Manage shop'}</h1>
            <p>{activePanel === 'settings' ? 'Edit your DigiShop profile and payout details.' : activePanel === 'sold' ? 'Review sold listings and the orders attached to them.' : activePanel === 'listings' ? 'Search, filter, promote, edit, and manage your inventory.' : 'A cleaner control room for orders, revenue, shop health, and next actions.'}</p>
            {shop.data?.shop.slug && <a href={withBasePath(`/shops/${shop.data.shop.slug}`)}>View public shop</a>}
          </div>
          <div className="button-row flex flex-wrap items-center gap-3">
            {activePanel !== 'overview' && (
              <ButtonLink to="/manage-shop" variant="secondary">
                <Icon name="arrow" /> Back
              </ButtonLink>
            )}
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
          <ShopSettingsPanel defaultLocation={user?.location} onSaved={shop.refetch} shop={shop.data?.shop} />
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
              <section className="mx-auto w-full max-w-[1280px] rounded-xl bg-foose-surface p-3 shadow-sm md:p-5">
                <SectionHeader
                  action={
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <ButtonLink to="/manage-shop/sold" variant="secondary">
                        <IoReceiptOutline /> Sold items
                      </ButtonLink>
                      <ButtonLink to="/manage-shop/promotions" variant="primary">
                        <IoMegaphone /> Promote listings
                      </ButtonLink>
                    </div>
                  }
                  title="Shop listings"
                />
                <div className="mb-5 grid gap-3 rounded-xl bg-foose-surface-low p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_150px_150px_150px_150px] [&_input]:h-11 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-foose-border [&_input]:bg-white [&_input]:px-3 [&_input]:text-sm [&_input]:outline-none [&_input]:focus:border-accent [&_label]:grid [&_label]:gap-1 [&_label_span]:text-xs [&_label_span]:font-bold [&_label_span]:text-foose-muted [&_select]:h-11 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-foose-border [&_select]:bg-white [&_select]:px-3 [&_select]:text-sm [&_select]:outline-none [&_select]:focus:border-accent">
                  <label>
                    <span className="sr-only">Search</span>
                    <input
                      aria-label="Search shop listings"
                      onChange={(event) => {
                        setListingQuery(event.target.value)
                        setListingPage(1)
                      }}
                      placeholder="Search listings"
                      value={listingQuery}
                    />
                  </label>
                  <SelectControl
                    aria-label="Filter by type"
                    onChange={(event) => {
                      setListingTypeFilter(event.target.value)
                      setListingPage(1)
                    }}
                    value={listingTypeFilter}
                    variant="filter"
                  >
                    <option value="">All types</option>
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                  </SelectControl>
                  <SelectControl
                    aria-label="Filter by status"
                    onChange={(event) => {
                      setListingStatus(event.target.value)
                      setListingPage(1)
                    }}
                    value={listingStatus}
                    variant="filter"
                  >
                    <option value="">All statuses</option>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                  </SelectControl>
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
                {!!inventoryListings.length && !filteredListings.length && <EmptyState body="Adjust your listing search or filters." title="No listings match" />}
                {!!filteredListings.length && (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {visibleListings.map((listing) => (
                      <article className="flex min-h-full flex-col rounded-xl bg-white p-3 shadow-sm" key={listing._id}>
                        <div className="relative mb-3 overflow-hidden rounded-lg bg-foose-surface-low aspect-[4/3] [&_img]:h-full [&_img]:w-full [&_img]:object-contain">
                          {isActiveTopPick(listing.promotionTags, listing.promotionExpiresAt) && (
                            <span className="absolute left-2 top-2">
                              <Badge tone="success">Top Pick</Badge>
                            </span>
                          )}
                          {getListingImage(listing) ? <img alt={listing.title} src={getListingImage(listing)} /> : <span className="flex h-full items-center justify-center text-sm font-semibold text-foose-faint">No image</span>}
                        </div>
                        <div className="flex flex-1 flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={listing.type === 'wholesale' ? 'warning' : 'accent'}>{listing.type}</Badge>
                            <Badge tone={listing.status === 'sold' ? 'danger' : 'neutral'}>{listing.status || 'active'}</Badge>
                            {isActiveTopPick(listing.promotionTags, listing.promotionExpiresAt) && <Badge tone="success">Top Pick</Badge>}
                          </div>
                          <h3 className="line-clamp-1 text-sm font-bold text-foose-text">{listing.title || 'Untitled listing'}</h3>
                          <p className="text-base font-black text-accent">{listing.status === 'draft' ? '---' : formatMoney(listing.price, listing.currency)}</p>
                          <small className="text-xs font-bold uppercase tracking-wider text-foose-muted">{listing.type === 'retail' ? 'Single retail item' : `${listing.quantity || 0} available / min ${listing.bulkMinQty || 1}`}</small>
                        </div>
                        <div className="mt-3 flex flex-nowrap items-center justify-end gap-2 border-t border-foose-border pt-3">
                          <a className="inline-flex min-h-9 items-center justify-center rounded-lg border border-foose-border bg-white px-3 text-xs font-bold text-foose-text transition hover:border-accent hover:text-accent" href={withBasePath(`/listing/${listing._id}`)}>
                            View
                          </a>
                          <a aria-label={`Edit ${listing.title}`} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-foose-border bg-white px-3 text-accent transition hover:border-accent hover:bg-accent hover:text-white" href={withBasePath(`/listings/${listing._id}/edit`)}>
                            <Icon name="pencil" size={16} />
                          </a>
                          <button
                            aria-label={deletingId === listing._id ? `Removing ${listing.title}` : `Remove ${listing.title}`}
                            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-foose-border bg-white px-3 text-foose-danger transition hover:border-foose-danger hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50"
                            disabled={deletingId === listing._id}
                            onClick={() => void deleteListing(listing._id)}
                            type="button"
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                {filteredListings.length > listingsPerPage && (
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-foose-border pt-4 text-sm text-foose-muted">
                    <span>
                      Showing {(currentListingPage - 1) * listingsPerPage + 1}-{Math.min(currentListingPage * listingsPerPage, filteredListings.length)} of {filteredListings.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <button className="rounded-lg border border-foose-border bg-white px-3 py-2 font-bold text-foose-text disabled:opacity-50" disabled={currentListingPage === 1} onClick={() => setListingPage((page) => Math.max(1, page - 1))} type="button">
                        Previous
                      </button>
                      <span className="font-bold text-foose-text">
                        {currentListingPage} / {listingPageCount}
                      </span>
                      <button className="rounded-lg border border-foose-border bg-white px-3 py-2 font-bold text-foose-text disabled:opacity-50" disabled={currentListingPage === listingPageCount} onClick={() => setListingPage((page) => Math.min(listingPageCount, page + 1))} type="button">
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
