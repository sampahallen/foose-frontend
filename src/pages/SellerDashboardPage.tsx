import { useState, type FormEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { IoMegaphone, IoReceiptOutline } from 'react-icons/io5'
import { AppShell, AvatarCropDialog, Badge, ButtonLink, FloatingCreateButton, Icon, InlineNotice, ManagementListingCard, ManagementListingMasonry, ManagementListingMasonrySkeleton, RefreshIndicator, SafeImage, SectionHeader, SelectControl, ShopManagementMobileNav, ShopManagementSidebar, StatePanel, StatCard, useToast } from '../components'
import { ConfirmDialog } from '../components/forms/Dialog'
import { SubmitButton } from '../components/forms/FormControls'
import { FormActions } from '../components/forms/FormLayout'
import { SellerOverviewSkeleton, ShopSettingsSkeleton } from '../components/operational/OperationalStates'
import { GHANA_BANKS } from '../data/ghanaBanks'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { apiDelete, apiPut } from '../lib/api'
import type { Listing, Order, Shop, User } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { formatDateTime, formatMoney, initials } from '../utils/format'
import { canonicalGhanaRegion, GHANA_REGIONS } from '../utils/ghanaRegions'
import { getCurrentAppPathname, withBasePath } from '../utils/navigation'
import { canSellerMarkPickupReady, isHistoricalOrder, orderAddress, orderProgressLabel, participantContact, participantName } from '../utils/orderStatus'

const MOBILE_MONEY_PROVIDERS = ['MTN', 'Telecel', 'AirtelTigo'] as const
const GENERAL_FIELDS = ['shopName', 'category', 'bio'] as const
const LOCATION_FIELDS = ['city', 'region'] as const
const SOCIAL_FIELDS = ['instagram', 'whatsapp'] as const
const PAYOUT_FIELDS = ['payoutMethodType', 'payoutAccountName', 'payoutProvider', 'payoutAccountNumber', 'payoutBankName', 'payoutBranch'] as const
const SHOP_SETTING_FIELDS = [...GENERAL_FIELDS, ...LOCATION_FIELDS, ...SOCIAL_FIELDS, ...PAYOUT_FIELDS] as const
const shopSettingsControl = 'min-h-11 w-full min-w-0 rounded-xl border border-foose-border bg-white px-3 py-2.5 text-base text-foose-text outline-none transition placeholder:text-foose-faint focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:bg-accent-light/50 disabled:text-foose-muted sm:min-h-12 sm:py-3 sm:text-sm'
const shopSettingsTextarea = `${shopSettingsControl} min-h-24 resize-y sm:min-h-28`

function appendIfPresent(source: FormData, target: FormData, name: string) {
  if (source.has(name)) target.append(name, String(source.get(name) || ''))
}

function settingsFormData(form: HTMLFormElement, fields: readonly string[]) {
  const sourceData = new FormData(form)
  const formData = new FormData()

  SHOP_SETTING_FIELDS.forEach((field) => {
    if (fields.includes(field)) appendIfPresent(sourceData, formData, field)
  })
  return formData
}

function sectionIsValid(form: HTMLFormElement, fields: readonly string[]) {
  for (const field of fields) {
    const control = form.elements.namedItem(field)
    if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) {
      if (!control.checkValidity()) {
        control.reportValidity()
        return false
      }
    }
  }
  return true
}

function listingIdValue(value: Listing | string | undefined) {
  if (!value) return ''
  return typeof value === 'string' ? value : value._id
}

function orderForListing(orders: Order[], listing: Listing) {
  return orders.find((order) => order.items.some((item) => listingIdValue(item.listingId) === listing._id || item.title === listing.title))
}

function ShopSettingsPanel({
  defaultLocation,
  onSaved,
  shop,
}: {
  defaultLocation?: User['location']
  onSaved: () => Promise<unknown>
  shop: Shop
}) {
  const [editable, setEditable] = useState<Set<string>>(() => new Set())
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [payoutMethodType, setPayoutMethodType] = useState<'mobile_money' | 'bank_transfer'>(shop.payoutMethod?.type || 'mobile_money')
  const [selectedBankName, setSelectedBankName] = useState(shop.payoutMethod?.bankName || '')
  const [selectedBranch, setSelectedBranch] = useState(shop.payoutMethod?.branch || '')
  const [assetEditor, setAssetEditor] = useState<'banner' | 'logo' | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingSection, setSavingSection] = useState('')

  function isEditable(name: string) {
    return editable.has(name)
  }

  function unlockFields(names: string[]) {
    setEditable((current) => new Set([...current, ...names]))
  }

  function lockFields(names: readonly string[]) {
    setEditable((current) => {
      const next = new Set(current)
      names.forEach((name) => next.delete(name))
      return next
    })
  }

  async function saveCroppedAsset(file: File) {
    const asset = assetEditor
    if (!asset) return
    const formData = new FormData()
    formData.append(asset, file, file.name)
    setError('')
    setMessage('')

    try {
      await apiPut<{ shop: Shop }>('/digishops/me', formData)
      await onSaved()
      setMessage(`${asset === 'banner' ? 'Shop banner' : 'Shop logo'} saved.`)
      setAssetEditor(null)
    } catch (requestError) {
      const saveError = getErrorMessage(requestError, `Unable to update the shop ${asset}`)
      setError(saveError)
      throw requestError
    }
  }

  async function saveSection(form: HTMLFormElement | null, fields: readonly string[], label: string) {
    if (!form || !sectionIsValid(form, fields)) return
    setError('')
    setMessage('')
    setSavingSection(label)

    try {
      await apiPut<{ shop: Shop }>('/digishops/me', settingsFormData(form, fields))
      await onSaved()
      lockFields(fields)
      setMessage(`${label} saved.`)
    } catch (requestError) {
      setError(getErrorMessage(requestError, `Unable to update ${label.toLowerCase()}`))
    } finally {
      setSavingSection('')
    }
  }

  function sectionAction(label: string, fields: readonly string[]) {
    const editing = fields.some((field) => isEditable(field))
    const savingThisSection = savingSection === label

    return (
      <button
        aria-label={editing ? `Save ${label} changes` : `Edit ${label}`}
        className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-black transition disabled:cursor-wait disabled:opacity-60 ${editing ? 'bg-accent text-white hover:bg-accent-hover' : 'text-accent hover:bg-white'}`}
        disabled={saving || Boolean(savingSection)}
        onClick={(event) => {
          if (editing) void saveSection(event.currentTarget.form, fields, label)
          else unlockFields([...fields])
        }}
        type="button"
      >
        <Icon name={editing ? 'check' : 'pencil'} size={16} /> {savingThisSection ? 'Saving…' : editing ? 'Save changes' : 'Edit'}
      </button>
    )
  }

  function navigateToSettingsSection(event: ReactMouseEvent<HTMLAnchorElement>, sectionId: string) {
    event.preventDefault()
    const section = document.getElementById(sectionId)
    if (!section) return

    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#${sectionId}`)
    section.scrollIntoView({
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  function fieldFrame(name: string, label: string, control: ReactNode) {
    const open = isEditable(name)
    return (
      <div className={`min-w-0 rounded-xl border p-3 transition ${open ? 'border-accent bg-accent-light/40' : 'border-foose-border bg-white'}`}>
        <label className="mb-2 block min-w-0 break-words text-sm font-bold text-foose-text" htmlFor={name}>
          {label}
        </label>
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

    try {
      await apiPut<{ shop: Shop }>('/digishops/me', settingsFormData(form, SHOP_SETTING_FIELDS))
      await onSaved()
      setEditable(new Set())
      setMessage('Shop settings saved.')
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to update shop settings'))
    } finally {
      setSaving(false)
    }
  }

  const city = shop.location?.city?.trim() || defaultLocation?.city?.trim() || ''
  const region = canonicalGhanaRegion(shop.location?.region) || canonicalGhanaRegion(defaultLocation?.region)
  const hasLegacyRegion = Boolean(region && !GHANA_REGIONS.some((option) => option === region))
  const selectedBank = GHANA_BANKS.find((bank) => bank.name === selectedBankName)
  const hasLegacyBank = Boolean(selectedBankName && !selectedBank)
  const hasLegacyBranch = Boolean(selectedBranch && !selectedBank?.branches.includes(selectedBranch))

  return (
    <section>
      <form className="grid min-w-0 gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_360px]" encType="multipart/form-data" onSubmit={(event) => void saveShop(event)}>
        <div className="space-y-5">
          <section className="scroll-mt-28 overflow-hidden rounded-2xl border border-foose-border bg-foose-surface shadow-sm" id="shop-general">
            <header className="flex items-start justify-between gap-3 border-b border-foose-border bg-accent-light/50 px-3 py-4 sm:px-4 md:px-6">
              <div className="min-w-0">
                <h2 className="text-xl font-black text-foose-text">General info</h2>
                <p className="text-sm text-foose-muted">Core details shoppers see first.</p>
              </div>
              {sectionAction('General info', GENERAL_FIELDS)}
            </header>
            <div className="grid gap-4 p-3 sm:p-4 md:grid-cols-2 md:p-6">
              {fieldFrame('shopName', 'Shop name', <input className={shopSettingsControl} defaultValue={shop.shopName} disabled={!isEditable('shopName')} id="shopName" name="shopName" required />)}
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
                {fieldFrame('bio', 'Shop bio', <textarea className={shopSettingsTextarea} defaultValue={shop.bio || ''} disabled={!isEditable('bio')} id="bio" name="bio" rows={5} />)}
              </div>
            </div>
          </section>

          <section className="scroll-mt-28 overflow-hidden rounded-2xl border border-foose-border bg-foose-surface shadow-sm" id="shop-location">
            <header className="flex items-start justify-between gap-3 border-b border-foose-border bg-accent-light/50 px-3 py-4 sm:px-4 md:px-6">
              <div className="min-w-0">
                <h2 className="text-xl font-black text-foose-text">Shop location</h2>
                <p className="text-sm text-foose-muted">Used to tag every item and power marketplace location filters.</p>
              </div>
              {sectionAction('Shop location', LOCATION_FIELDS)}
            </header>
            <div className="grid gap-4 p-3 sm:p-4 md:grid-cols-2 md:p-6">
              {fieldFrame('city', 'City or town', <input className={shopSettingsControl} defaultValue={city} disabled={!isEditable('city')} id="city" name="city" placeholder="e.g. Accra" required />)}
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

          <section className="scroll-mt-28 overflow-hidden rounded-2xl border border-foose-border bg-foose-surface shadow-sm" id="shop-social">
            <header className="flex items-start justify-between gap-3 border-b border-foose-border bg-accent-light/50 px-3 py-4 sm:px-4 md:px-6">
              <div className="min-w-0">
                <h2 className="text-xl font-black text-foose-text">Social connections</h2>
                <p className="text-sm text-foose-muted">Keep your customer contact links tidy.</p>
              </div>
              {sectionAction('Social connections', SOCIAL_FIELDS)}
            </header>
            <div className="grid gap-4 p-3 sm:p-4 md:grid-cols-2 md:p-6">
              {fieldFrame('instagram', 'Instagram', <input className={shopSettingsControl} defaultValue={shop.socialLinks?.instagram || ''} disabled={!isEditable('instagram')} id="instagram" name="instagram" placeholder="@yourshop" />)}
              {fieldFrame('whatsapp', 'WhatsApp', <input className={shopSettingsControl} defaultValue={shop.socialLinks?.whatsapp || ''} disabled={!isEditable('whatsapp')} id="whatsapp" name="whatsapp" placeholder="+233..." />)}
            </div>
          </section>

          <section className="scroll-mt-28 overflow-hidden rounded-2xl border border-foose-border bg-foose-surface shadow-sm" id="shop-payout">
            <header className="flex items-start justify-between gap-3 border-b border-foose-border bg-accent-light/50 px-3 py-4 sm:px-4 md:px-6">
              <div className="min-w-0">
                <h2 className="text-xl font-black text-foose-text">Funds collection method</h2>
                <p className="text-sm text-foose-muted">Where Foose should send shop funds.</p>
              </div>
              {sectionAction('Funds collection method', PAYOUT_FIELDS)}
            </header>
            <div className="grid gap-4 p-3 sm:p-4 md:grid-cols-2 md:p-6">
              {fieldFrame(
                'payoutMethodType',
                'Method',
                <SelectControl disabled={!isEditable('payoutMethodType')} id="payoutMethodType" name="payoutMethodType" onChange={(event) => setPayoutMethodType(event.target.value as 'mobile_money' | 'bank_transfer')} required value={payoutMethodType}>
                  <option value="mobile_money">Mobile money</option>
                  <option value="bank_transfer">Bank transfer</option>
                </SelectControl>,
              )}
              {payoutMethodType === 'mobile_money' ? (
                <div className="contents" key="mobile-money-fields">
                  {fieldFrame(
                    'payoutProvider',
                    'Provider',
                    <SelectControl defaultValue={shop.payoutMethod?.provider || ''} disabled={!isEditable('payoutProvider')} id="payoutProvider" name="payoutProvider" required>
                      <option value="">Select provider</option>
                      {MOBILE_MONEY_PROVIDERS.map((provider) => <option key={provider} value={provider}>{provider === 'Telecel' ? 'Telecel (formerly Vodafone)' : provider}</option>)}
                    </SelectControl>,
                  )}
                  {fieldFrame('payoutAccountName', 'Account name', <input className={shopSettingsControl} defaultValue={shop.payoutMethod?.accountName || ''} disabled={!isEditable('payoutAccountName')} id="payoutAccountName" name="payoutAccountName" required />)}
                  {fieldFrame('payoutAccountNumber', 'Phone number', <input className={shopSettingsControl} defaultValue={shop.payoutMethod?.accountNumber || ''} disabled={!isEditable('payoutAccountNumber')} id="payoutAccountNumber" inputMode="tel" name="payoutAccountNumber" placeholder="e.g. 024 000 0000" required type="tel" />)}
                </div>
              ) : (
                <div className="contents" key="bank-transfer-fields">
                  {fieldFrame(
                    'payoutBankName',
                    'Bank',
                    <SelectControl
                      disabled={!isEditable('payoutBankName')}
                      id="payoutBankName"
                      name="payoutBankName"
                      onChange={(event) => {
                        setSelectedBankName(event.target.value)
                        setSelectedBranch('')
                      }}
                      required
                      value={selectedBankName}
                    >
                      <option value="">Select bank</option>
                      {hasLegacyBank && <option value={selectedBankName}>{selectedBankName}</option>}
                      {GHANA_BANKS.map((bank) => <option key={bank.name} value={bank.name}>{bank.name}</option>)}
                    </SelectControl>,
                  )}
                  {fieldFrame(
                    'payoutBranch',
                    'Branch',
                    <SelectControl disabled={!isEditable('payoutBranch') || !selectedBank} id="payoutBranch" name="payoutBranch" onChange={(event) => setSelectedBranch(event.target.value)} required value={selectedBranch}>
                      <option value="">{selectedBank ? 'Select branch' : 'Select a bank first'}</option>
                      {hasLegacyBranch && <option value={selectedBranch}>{selectedBranch}</option>}
                      {selectedBank?.branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
                    </SelectControl>,
                  )}
                  {fieldFrame('payoutAccountName', 'Account name', <input autoComplete="off" className={shopSettingsControl} defaultValue={shop.payoutMethod?.type === 'bank_transfer' ? shop.payoutMethod.accountName || '' : ''} disabled={!isEditable('payoutAccountName')} id="payoutAccountName" name="payoutAccountName" required />)}
                  {fieldFrame('payoutAccountNumber', 'Account number', <input autoComplete="off" className={shopSettingsControl} defaultValue={shop.payoutMethod?.type === 'bank_transfer' ? shop.payoutMethod.accountNumber || '' : ''} disabled={!isEditable('payoutAccountNumber')} id="payoutAccountNumber" inputMode="numeric" name="payoutAccountNumber" required />)}
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24">
          <nav aria-label="Shop settings sections" className="hidden rounded-2xl border border-foose-border bg-white p-3 shadow-sm xl:block">
            <p className="px-3 pb-2 text-xs font-black uppercase tracking-[0.14em] text-foose-faint">On this page</p>
            {[
              ['shop-general', 'General info'],
              ['shop-location', 'Location'],
              ['shop-social', 'Social connections'],
              ['shop-payout', 'Payout'],
              ['shop-brand', 'Brand assets'],
            ].map(([id, label]) => (
              <a
                className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-foose-muted transition hover:bg-accent-light hover:text-accent"
                href={`#${id}`}
                key={id}
                onClick={(event) => navigateToSettingsSection(event, id)}
              >
                {label}
              </a>
            ))}
          </nav>
          <section className="scroll-mt-28 overflow-hidden rounded-2xl border border-foose-border bg-foose-surface shadow-sm" id="shop-brand">
            <header className="border-b border-foose-border bg-accent-light/50 px-4 py-4">
              <h2 className="text-xl font-black text-foose-text">Brand assets</h2>
            </header>
            <div className="space-y-4 p-3 sm:p-4">
              <article className="overflow-hidden rounded-2xl border border-foose-border bg-white shadow-sm" data-testid="shop-brand-preview">
                <div className="relative aspect-[5/2] overflow-hidden bg-foose-surface-mid">
                  <SafeImage
                    alt={`${shop.shopName} banner preview`}
                    className="h-full w-full object-cover"
                    fallback="DigiShop banner"
                    fallbackClassName="h-full w-full bg-accent-light text-sm font-bold text-accent"
                    src={shop.bannerUrl}
                  />
                  <button
                    aria-label="Edit shop banner"
                    className="absolute right-3 top-3 inline-flex size-11 items-center justify-center rounded-full border-2 border-white bg-accent text-white shadow-lg transition hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    onClick={() => setAssetEditor('banner')}
                    title="Edit shop banner"
                    type="button"
                  >
                    <Icon name="pencil" size={17} />
                  </button>
                </div>
                <div className="px-4 pb-5">
                  <div className="relative -mt-10 mb-3 w-fit">
                    <SafeImage
                      alt={`${shop.shopName} logo preview`}
                      className="size-20 rounded-full border-4 border-white object-cover shadow-md"
                      fallback={initials(shop.shopName)}
                      fallbackClassName="bg-accent-light text-lg font-black text-accent"
                      src={shop.logoUrl}
                    />
                    <button
                      aria-label="Edit shop logo"
                      className="absolute -bottom-1 -right-1 inline-flex size-10 items-center justify-center rounded-full border-4 border-white bg-accent text-white shadow-md transition hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      onClick={() => setAssetEditor('logo')}
                      title="Edit shop logo"
                      type="button"
                    >
                      <Icon name="pencil" size={15} />
                    </button>
                  </div>
                  <h3 className="truncate text-lg font-black text-foose-text">{shop.shopName}</h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-5 text-foose-muted">{shop.bio || 'This is how your brand assets will appear on your public shop.'}</p>
                </div>
              </article>
            </div>
          </section>

          <section className="rounded-2xl border border-foose-border bg-accent-light p-5 text-sm leading-6 text-foose-muted shadow-sm">
            <strong className="mb-2 block text-foose-text">Pro tip</strong>
            Adding a detailed shop bio increases customer trust. Describe your values and what makes your thrift store unique.
          </section>
        </aside>

        {error && <InlineNotice title="Shop settings were not saved" tone="error">{error}</InlineNotice>}
        {message && <InlineNotice title="Changes saved" tone="success">{message}</InlineNotice>}
        <FormActions className="border-t border-foose-border pt-5 xl:col-span-2" pageInset sticky>
          <SubmitButton className="w-full sm:w-auto" loading={saving} loadingLabel="Saving shop settings…">Save changes</SubmitButton>
        </FormActions>
      </form>
      <AvatarCropDialog
        actionVerb="Save"
        assetLabel={assetEditor === 'banner' ? 'shop banner' : 'shop logo'}
        cropShape={assetEditor === 'banner' ? 'rectangle' : 'circle'}
        key={assetEditor || 'closed-brand-editor'}
        onApply={saveCroppedAsset}
        onCancel={() => setAssetEditor(null)}
        open={Boolean(assetEditor)}
        outputHeight={assetEditor === 'banner' ? 600 : 512}
        outputNameSuffix={assetEditor === 'banner' ? 'shop-banner' : 'shop-logo'}
        outputWidth={assetEditor === 'banner' ? 1500 : 512}
      />
    </section>
  )
}

export function SellerDashboardPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [deleteError, setDeleteError] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState('')
  const [orderActionId, setOrderActionId] = useState('')
  const [listingQuery, setListingQuery] = useState('')
  const [listingDateFrom, setListingDateFrom] = useState('')
  const [listingDateTo, setListingDateTo] = useState('')
  const [listingPage, setListingPage] = useState(1)
  const [listingTypeFilter, setListingTypeFilter] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const currentPath = getCurrentAppPathname()
  const activePanel = currentPath.startsWith('/manage-shop/settings')
    ? 'settings'
    : currentPath.startsWith('/manage-shop/sold')
      ? 'sold'
      : currentPath.startsWith('/manage-shop/listings')
        ? 'listings'
        : 'overview'
  const needsOrders = activePanel === 'overview' || activePanel === 'sold'
  const needsListings = activePanel === 'listings' || activePanel === 'sold'
  const listingEndpoint = activePanel === 'sold' ? '/listings/me?status=sold' : '/listings/me?status=active'
  const shop = useApiResource<{ shop: Shop }>('/digishops/me', Boolean(user?.hasShop))
  const orders = useApiResource<{ orders: Order[] }>('/orders/me/selling', Boolean(user?.hasShop && needsOrders))
  const listings = useApiResource<{ listings: Listing[] }>(listingEndpoint, Boolean(user?.hasShop && needsListings))

  const sellerOrders = orders.data?.orders || []
  const activeSellerOrders = sellerOrders.filter((order) => !isHistoricalOrder(order))
  const previewSellerOrders = activeSellerOrders.slice(0, 3)
  const remainingSellerOrders = Math.max(activeSellerOrders.length - previewSellerOrders.length, 0)
  const totalRevenue = sellerOrders.reduce((sum, order) => (order.status === 'delivered' ? sum + order.totalAmount : sum), 0) || 0
  const allListings = listings.data?.listings || []
  const activeListings = allListings.filter((listing) => !listing.status || listing.status === 'active')
  const soldListings = allListings.filter((listing) => listing.status === 'sold')
  const filteredListings =
    activeListings.filter((listing) => {
      const haystack = [listing.title, listing.category, listing.brand, listing.type, listing.size, listing.gender, listing.color].filter(Boolean).join(' ').toLowerCase()
      const matchesQuery = !listingQuery || haystack.includes(listingQuery.toLowerCase())
      const matchesType = !listingTypeFilter || listing.type === listingTypeFilter
      const createdAt = listing.createdAt ? new Date(listing.createdAt).getTime() : 0
      const fromDate = listingDateFrom ? new Date(`${listingDateFrom}T00:00:00`).getTime() : 0
      const toDate = listingDateTo ? new Date(`${listingDateTo}T23:59:59`).getTime() : 0
      const matchesFrom = !fromDate || (createdAt && createdAt >= fromDate)
      const matchesTo = !toDate || (createdAt && createdAt <= toDate)
      return matchesQuery && matchesType && matchesFrom && matchesTo
    })
  const listingsPerPage = 12
  const listingPageCount = Math.max(1, Math.ceil(filteredListings.length / listingsPerPage))
  const currentListingPage = Math.min(listingPage, listingPageCount)
  const visibleListings = filteredListings.slice((currentListingPage - 1) * listingsPerPage, currentListingPage * listingsPerPage)
  const overviewInitialLoading = activePanel === 'overview'
    && ((shop.initialLoading && !shop.data) || (orders.initialLoading && !orders.data))
  const overviewUnavailable = activePanel === 'overview'
    && Boolean(shop.error || orders.error)
    && !shop.data
    && !orders.data
  const panelRefreshing = shop.refreshing || (needsOrders && orders.refreshing) || (needsListings && listings.refreshing)
  const panelError = shop.error || (needsOrders ? orders.error : '') || (needsListings ? listings.error : '')

  if (!user?.isKycVerified) {
    return (
      <AppShell>
        <StatePanel
          action={<ButtonLink to="/kyc">Start KYC</ButtonLink>}
          body="The backend requires approved KYC before opening or managing a DigiShop."
          layout="page"
          title="KYC required"
          tone="permission"
        />
      </AppShell>
    )
  }

  if (!user.hasShop) {
    return (
      <AppShell>
        <StatePanel
          action={<ButtonLink to="/open-shop">Open your DigiShop</ButtonLink>}
          body="Open a DigiShop to manage listings and seller orders."
          layout="page"
          title="No DigiShop yet"
          tone="empty"
        />
      </AppShell>
    )
  }

  async function deleteListing(id: string) {
    setDeleteError('')
    setDeletingId(id)
    try {
      await apiDelete(`/listings/${id}`)
      await listings.refetch()
      setPendingDeleteId('')
      showToast({ message: 'The listing was removed from your shop inventory.', title: 'Listing removed', tone: 'success' })
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
      showToast({ message: action === 'process' ? 'The order was accepted.' : action === 'shipped' ? 'The order is marked as sent.' : 'The buyer was notified that pickup is ready.', title: 'Order updated', tone: 'success' })
    } catch (requestError) {
      setDeleteError(getErrorMessage(requestError, 'Unable to update order'))
    } finally {
      setOrderActionId('')
    }
  }

  return (
    <AppShell active="shop" searchPlaceholder="Search marketplace..." showFooter={false}>
      <ShopManagementSidebar activePanel={activePanel} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((value) => !value)} />
      <div className={`${sidebarCollapsed ? 'lg:pl-24' : 'lg:pl-72'} min-w-0 pb-16 lg:pb-0`}>
        <ShopManagementMobileNav activePanel={activePanel} />
        <div className="dashboard-head mb-5 flex min-w-0 flex-col gap-3 border-b border-foose-border pb-5 sm:mb-6 md:flex-row md:items-end md:justify-between [&_h1]:break-words [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base">
          <div className="min-w-0">
            <h1>{activePanel === 'settings' ? 'Shop settings' : activePanel === 'sold' ? 'Sold items' : activePanel === 'listings' ? 'Active listings' : shop.data?.shop.shopName || 'Manage shop'}</h1>
            <p>{activePanel === 'settings' ? 'Edit your DigiShop profile and payout details.' : activePanel === 'sold' ? 'Review sold listings and the orders attached to them.' : activePanel === 'listings' ? 'Search, filter, promote, edit, and manage the products currently live in your shop.' : 'A cleaner control room for orders, revenue, shop health, and next actions.'}</p>
            {shop.data?.shop.slug && <a className="mt-1 inline-flex min-h-11 items-center text-sm font-bold text-accent hover:underline" href={withBasePath(`/shops/${shop.data.shop.slug}`)}>View public shop</a>}
          </div>
          {activePanel === 'overview' && (
            <div className="button-row grid w-full gap-2 sm:w-auto">
              <ButtonLink className="w-full sm:w-auto" to="/wallet" variant="secondary">
                Wallet
              </ButtonLink>
            </div>
          )}
        </div>
        {overviewInitialLoading && <SellerOverviewSkeleton label="Loading seller workspace" />}
        <RefreshIndicator active={panelRefreshing} label="Refreshing seller workspace" />
        {overviewUnavailable && (
          <StatePanel action={<button className="button button-secondary min-h-11 px-5" onClick={() => void Promise.all([shop.refetch(), orders.refetch()])} type="button">Retry</button>} body={shop.error || orders.error} layout="page" title="Seller workspace unavailable" tone="error" />
        )}
        {panelError && (shop.data || (needsOrders && orders.data) || (needsListings && listings.data)) && <InlineNotice title="Some seller data could not refresh" tone="warning">{panelError}</InlineNotice>}
        {deleteError && <InlineNotice title="Action failed" tone="error">{deleteError}</InlineNotice>}
        {activePanel === 'settings' ? (
          shop.error && !shop.data ? (
            <StatePanel
              action={<button className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-bold text-white hover:bg-accent-hover" onClick={shop.refetch} type="button">Retry</button>}
              body="We could not load your DigiShop settings. Your saved shop details have not been changed."
              layout="section"
              title="Shop settings unavailable"
              tone="error"
            />
          ) : shop.data?.shop ? (
            <ShopSettingsPanel defaultLocation={user?.location} onSaved={shop.refetch} shop={shop.data.shop} />
          ) : <ShopSettingsSkeleton label="Loading shop settings" />
        ) : activePanel === 'sold' ? (
          <section className="rounded-none bg-transparent p-0 shadow-none sm:rounded-2xl sm:bg-foose-surface sm:p-4 sm:shadow-sm md:p-5">
            {((listings.initialLoading && !listings.data) || (listings.data && soldListings.length > 0 && orders.initialLoading && !orders.data)) && <ManagementListingMasonrySkeleton label="Loading sold listings and order details" showToolbar={false} />}
            {listings.error && !listings.data && (
              <StatePanel
                action={<button className="inline-flex min-h-11 items-center justify-center rounded-lg border border-accent bg-accent px-5 text-sm font-bold text-white" onClick={listings.refetch} type="button">Retry</button>}
                body="Your sold inventory could not be loaded. Order management remains available."
                layout="section"
                title="Sold listings unavailable"
                tone="error"
                visual={<IoReceiptOutline size={26} />}
              />
            )}
            {listings.data && !soldListings.length && <StatePanel body="Sold listings will appear here after checkout." layout="section" title="No sold items yet" tone="empty" visual={<IoReceiptOutline size={26} />} />}
            {orders.error && !orders.data && listings.data && !!soldListings.length && (
              <InlineNotice title="Order details could not load" tone="warning">Sold products remain visible below. Retry from the notice above to restore buyer and order information.</InlineNotice>
            )}
            {listings.data && !!soldListings.length && (!orders.initialLoading || Boolean(orders.error)) && (
              <ManagementListingMasonry>
                {soldListings.map((listing) => {
                  const order = orderForListing(sellerOrders, listing)
                  const orderLine = order?.items.find((item) => listingIdValue(item.listingId) === listing._id || item.title === listing.title)

                  return (
                    <ManagementListingCard
                      actions={order ? (
                        <a className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-accent bg-accent px-4 text-sm font-bold text-white transition hover:bg-accent-hover sm:w-auto" href={withBasePath(`/orders/${order._id}`)}>
                          <IoReceiptOutline /> View order details
                        </a>
                      ) : (
                        <span className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-foose-border bg-foose-surface-low px-4 text-center text-sm font-bold text-foose-muted sm:w-auto">
                          Order details unavailable
                        </span>
                      )}
                      extraDetails={(
                        <dl className="grid gap-3 text-sm sm:grid-cols-2 [&_div]:min-w-0 [&_div]:rounded-xl [&_div]:bg-foose-surface-low [&_div]:p-3 [&_dt]:text-[11px] [&_dt]:font-black [&_dt]:uppercase [&_dt]:tracking-[0.1em] [&_dt]:text-foose-faint [&_dd]:mt-1 [&_dd]:break-words [&_dd]:font-semibold [&_dd]:text-foose-text [&_dd]:[overflow-wrap:anywhere]">
                          <div>
                            <dt>Buyer</dt>
                            <dd>{order ? participantName(order.buyerId, 'Buyer') : 'Order pending'}</dd>
                          </div>
                          <div>
                            <dt>Order status</dt>
                            <dd>{order ? orderProgressLabel(order) : 'Sold'}</dd>
                          </div>
                          <div>
                            <dt>Sale price</dt>
                            <dd>{formatMoney(orderLine?.price ?? listing.price, listing.currency)}</dd>
                          </div>
                          <div>
                            <dt>Sold on</dt>
                            <dd>{formatDateTime(order?.createdAt || listing.updatedAt)}</dd>
                          </div>
                        </dl>
                      )}
                      key={listing._id}
                      listing={listing}
                    />
                  )
                })}
              </ManagementListingMasonry>
            )}
          </section>
        ) : (
          <>
            {activePanel === 'overview' && !overviewInitialLoading && !overviewUnavailable && (
              <>
            <div aria-label="Shop summary" className="stats-row -mx-3 mb-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:mb-8 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 [&>article]:min-w-[min(78vw,17rem)] [&>article]:snap-start sm:[&>article]:min-w-0">
              <StatCard icon="money" label="Delivered revenue" value={formatMoney(totalRevenue)} note="Completed orders" />
              <StatCard icon="box" label="Active Orders" value={String(activeSellerOrders.length)} note="Seller orders" />
              <StatCard icon="star" label="Shop Rating" value={`${shop.data?.shop.rating || 0} / 5.0`} note={`${shop.data?.shop.totalReviews || 0} reviews`} />
            </div>
            <section className="-mx-3 rounded-none bg-transparent px-3 shadow-none sm:mx-0 sm:rounded-2xl sm:bg-foose-surface sm:p-4 sm:shadow-sm md:p-6">
          <SectionHeader title="Seller Orders" eyebrow="Latest paid items that need seller action." action={<a className="inline-flex min-h-11 items-center" href={withBasePath('/manage-shop/orders')}>{remainingSellerOrders ? `View all (${remainingSellerOrders} more)` : 'View all'}</a>} />
          {!previewSellerOrders.length && <StatePanel body="Paid orders will appear after buyers check out." layout="section" title="No seller orders" tone="empty" />}
          {!!previewSellerOrders.length && (
            <div className="seller-orders space-y-4 [&_article.highlighted]:border-accent [&_article.highlighted]:bg-accent-light">
              {previewSellerOrders.map((order) => (
                <article className="seller-order-card rounded-xl border border-foose-border bg-foose-surface p-3 sm:p-4" id={`order-${order._id}`} key={order._id}>
                  <div>
                    <div className="badge-row flex flex-wrap items-center gap-2">
                      <Badge tone={order.status === 'disputed' ? 'danger' : order.sellerAction === 'pickup_ready' ? 'warning' : 'accent'}>{orderProgressLabel(order)}</Badge>
                      <Badge tone={order.paymentStatus === 'paid' ? 'success' : 'warning'}>{order.paymentStatus || 'unpaid'}</Badge>
                      <Badge>{order.delivery?.method || 'delivery'}</Badge>
                    </div>
                    <h3 className="mt-3 break-words font-display text-lg font-semibold text-foose-text">{order.items[0]?.title || 'Order item'}</h3>
                    <p className="mt-1 text-sm font-black text-accent">
                      {formatMoney(order.totalAmount, order.currency)}
                      {order.deliveryFee ? ` incl. ${formatMoney(order.deliveryFee, order.currency)} delivery` : ''}
                    </p>
                    <dl className="seller-order-meta grid gap-3 min-[360px]:grid-cols-2 [&_div]:min-w-0 [&_div]:rounded-lg [&_div]:bg-foose-surface-low [&_div]:p-3 [&_dt]:text-xs [&_dt]:font-bold [&_dt]:uppercase [&_dt]:tracking-widest [&_dt]:text-foose-faint [&_dd]:mt-1 [&_dd]:break-words [&_dd]:text-sm [&_dd]:font-semibold [&_dd]:text-foose-text [&_dd]:[overflow-wrap:anywhere]">
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
                  <div className="table-actions mt-4 flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    {['pending', 'paid'].includes(order.status) && (
                      <button
                        className="button inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent sm:w-auto"
                        disabled={orderActionId === `${order._id}-process`}
                        onClick={() => void updateOrder(order._id, 'process')}
                        type="button"
                      >
                        {orderActionId === `${order._id}-process` ? 'Processing...' : 'Accept'}
                      </button>
                    )}
                    {order.delivery?.method === 'delivery' && ['paid', 'processing'].includes(order.status) && (
                      <button
                        className="button inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover sm:w-auto"
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
                        className="button inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover sm:w-auto"
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
              <section className="mx-auto w-full max-w-[1280px] rounded-none bg-transparent p-0 shadow-none sm:rounded-2xl sm:bg-foose-surface sm:p-4 sm:shadow-sm md:p-5">
                <div className="mb-4 flex justify-stretch sm:justify-end">
                  <ButtonLink className="w-full sm:w-auto" to="/manage-shop/promotions" variant="primary">
                    <IoMegaphone /> Promote listings
                  </ButtonLink>
                </div>
                {listings.initialLoading && !listings.data && <ManagementListingMasonrySkeleton label="Loading active shop listings" />}
                {listings.error && !listings.data && (
                  <StatePanel
                    action={<button className="inline-flex min-h-11 items-center justify-center rounded-lg border border-accent bg-accent px-5 text-sm font-bold text-white" onClick={listings.refetch} type="button">Retry</button>}
                    body="Your active shop inventory could not be loaded. Drafts and sold items remain on their own pages."
                    layout="section"
                    title="Active listings unavailable"
                    tone="error"
                    visual={<Icon name="grid" size={26} />}
                  />
                )}
                {listings.data && !!activeListings.length && <div className="mb-5 grid min-w-0 grid-cols-1 gap-3 rounded-xl bg-foose-surface-low p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_150px_150px_150px] [&_input]:min-h-11 [&_input]:min-w-0 [&_input]:max-w-full [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-foose-border [&_input]:bg-white [&_input]:px-3 [&_input]:text-base [&_input]:outline-none [&_input]:focus:border-accent sm:[&_input]:text-sm [&_label]:grid [&_label]:min-w-0 [&_label]:gap-1 [&_label_span]:text-xs [&_label_span]:font-bold [&_label_span]:text-foose-muted">
                  <label>
                    <span>Search listings</span>
                    <input
                      aria-label="Search active listings"
                      onChange={(event) => {
                        setListingQuery(event.target.value)
                        setListingPage(1)
                      }}
                      placeholder="Search listings"
                      value={listingQuery}
                    />
                  </label>
                  <div className="grid min-w-0 gap-1">
                    <span className="text-xs font-bold text-foose-muted">Listing type</span>
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
                  </div>
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
                </div>}
                {listings.data && !activeListings.length && <StatePanel body="Publish a listing with the round + button to start filling your active shop inventory. Saved drafts live on the Drafts page." layout="section" title="No active listings yet" tone="empty" visual={<Icon name="grid" size={26} />} />}
                {listings.data && !!activeListings.length && !filteredListings.length && (
                  <StatePanel
                    action={(
                      <button
                        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-foose-border bg-white px-5 text-sm font-bold text-foose-text hover:border-accent hover:text-accent"
                        onClick={() => {
                          setListingQuery('')
                          setListingTypeFilter('')
                          setListingDateFrom('')
                          setListingDateTo('')
                          setListingPage(1)
                        }}
                        type="button"
                      >
                        Clear filters
                      </button>
                    )}
                    body="Try a broader search, another listing type, or a wider date range."
                    layout="section"
                    title="No active listings match"
                    tone="empty"
                    visual={<Icon name="filter" size={26} />}
                  />
                )}
                {listings.data && !!filteredListings.length && (
                  <ManagementListingMasonry>
                    {visibleListings.map((listing) => (
                      <ManagementListingCard
                        actions={(
                          <>
                          <a className="inline-flex flex-1 items-center justify-center rounded-lg border border-foose-border bg-white px-4 text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent sm:flex-none" href={withBasePath(`/listing/${listing._id}`)}>
                            Open listing
                          </a>
                          <a aria-label={`Edit ${listing.title}`} className="inline-flex size-11 items-center justify-center rounded-lg border border-foose-border bg-white text-accent transition hover:border-accent hover:bg-accent hover:text-white" href={withBasePath(`/listings/${listing._id}/edit`)}>
                            <Icon name="pencil" size={16} />
                          </a>
                          <button
                            aria-label={deletingId === listing._id ? `Removing ${listing.title}` : `Remove ${listing.title}`}
                            className="inline-flex size-11 items-center justify-center rounded-lg border border-foose-border bg-white text-foose-danger transition hover:border-foose-danger hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50"
                            disabled={deletingId === listing._id}
                            onClick={() => setPendingDeleteId(listing._id)}
                            type="button"
                          >
                            <Icon name="trash" size={16} />
                          </button>
                          </>
                        )}
                        key={listing._id}
                        listing={listing}
                      />
                    ))}
                  </ManagementListingMasonry>
                )}
                {listings.data && filteredListings.length > listingsPerPage && (
                  <div className="mt-6 flex flex-col gap-3 border-t border-foose-border pt-4 text-sm text-foose-muted sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <span>
                      Showing {(currentListingPage - 1) * listingsPerPage + 1}-{Math.min(currentListingPage * listingsPerPage, filteredListings.length)} of {filteredListings.length}
                    </span>
                    <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex sm:w-auto">
                      <button className="min-h-11 min-w-11 rounded-lg border border-foose-border bg-white px-3 py-2 font-bold text-foose-text disabled:opacity-50" disabled={currentListingPage === 1} onClick={() => setListingPage((page) => Math.max(1, page - 1))} type="button">
                        Previous
                      </button>
                      <span className="font-bold text-foose-text">
                        {currentListingPage} / {listingPageCount}
                      </span>
                      <button className="min-h-11 min-w-11 rounded-lg border border-foose-border bg-white px-3 py-2 font-bold text-foose-text disabled:opacity-50" disabled={currentListingPage === listingPageCount} onClick={() => setListingPage((page) => Math.min(listingPageCount, page + 1))} type="button">
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
      <ConfirmDialog
        busy={Boolean(deletingId)}
        confirmLabel="Remove listing"
        description="This removes the listing from active marketplace inventory. This action cannot be undone."
        onCancel={() => setPendingDeleteId('')}
        onConfirm={() => void deleteListing(pendingDeleteId)}
        open={Boolean(pendingDeleteId)}
        title="Remove this listing?"
        tone="destructive"
      />
      <FloatingCreateButton
        className={activePanel === 'settings' ? '!bottom-[var(--foose-fab-with-actions-inset)] lg:!bottom-6' : ''}
        href="/listings/new"
        label="Add listing"
      />
    </AppShell>
  )
}
