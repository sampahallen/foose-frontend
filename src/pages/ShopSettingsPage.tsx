import { useState, type FormEvent } from 'react'
import {
  AvatarCropDialog,
  FloatingCreateButton,
  Icon,
  InlineNotice,
  SafeImage,
  SelectControl,
  ShopAccessGate,
  ShopManagementLayout,
  ShopManagementPageHeader,
  StatePanel,
} from '../components'
import { FormField, TextAreaField, TextField } from '../components/forms/FormField'
import { ShopSettingsSkeleton } from '../components/operational/OperationalStates'
import { GHANA_BANKS } from '../data/ghanaBanks'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { apiPut } from '../lib/api'
import type { Shop, User } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { initials } from '../utils/format'
import { canonicalGhanaRegion, GHANA_REGIONS } from '../utils/ghanaRegions'

const MOBILE_MONEY_PROVIDERS = ['MTN', 'Telecel', 'AirtelTigo'] as const
const GENERAL_FIELDS = ['shopName', 'category', 'bio'] as const
const LOCATION_FIELDS = ['city', 'region'] as const
const SOCIAL_FIELDS = ['instagram', 'whatsapp'] as const
const PAYOUT_FIELDS = ['payoutMethodType', 'payoutAccountName', 'payoutProvider', 'payoutAccountNumber', 'payoutBankName', 'payoutBranch'] as const
const SHOP_SETTING_FIELDS = [...GENERAL_FIELDS, ...LOCATION_FIELDS, ...SOCIAL_FIELDS, ...PAYOUT_FIELDS] as const

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

function ShopSettingsForm({
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
  const [savingSection, setSavingSection] = useState('')

  function isEditable(name: string) {
    return editable.has(name)
  }

  function unlockFields(names: readonly string[]) {
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

  async function saveSection(event: FormEvent<HTMLFormElement>, fields: readonly string[], label: string) {
    event.preventDefault()
    const form = event.currentTarget
    if (!sectionIsValid(form, fields)) return
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
        disabled={Boolean(savingSection)}
        onClick={() => { if (!editing) unlockFields(fields) }}
        type={editing ? 'submit' : 'button'}
      >
        <Icon name={editing ? 'check' : 'pencil'} size={16} /> {savingThisSection ? 'Saving…' : editing ? 'Save changes' : 'Edit'}
      </button>
    )
  }

  const city = shop.location?.city?.trim() || defaultLocation?.city?.trim() || ''
  const region = canonicalGhanaRegion(shop.location?.region) || canonicalGhanaRegion(defaultLocation?.region)
  const hasLegacyRegion = Boolean(region && !GHANA_REGIONS.some((option) => option === region))
  const selectedBank = GHANA_BANKS.find((bank) => bank.name === selectedBankName)
  const hasLegacyBank = Boolean(selectedBankName && !selectedBank)
  const hasLegacyBranch = Boolean(selectedBranch && !selectedBank?.branches.includes(selectedBranch))

  return (
    <section className="space-y-5">
      {error && <InlineNotice title="Shop settings were not saved" tone="error">{error}</InlineNotice>}
      {message && <InlineNotice title="Changes saved" tone="success">{message}</InlineNotice>}

      <section className="overflow-hidden rounded-2xl border border-foose-border bg-foose-surface shadow-sm">
        <form onSubmit={(event) => void saveSection(event, GENERAL_FIELDS, 'General info')}>
          <header className="flex items-start justify-between gap-3 border-b border-foose-border bg-accent-light/50 px-3 py-4 sm:px-4 md:px-6">
            <div className="min-w-0">
              <h2 className="text-xl font-black text-foose-text">General info</h2>
              <p className="text-sm text-foose-muted">Core details shoppers see first.</p>
            </div>
            {sectionAction('General info', GENERAL_FIELDS)}
          </header>
          <div className="grid gap-4 p-3 sm:p-4 md:grid-cols-2 md:p-6">
            <TextField defaultValue={shop.shopName} disabled={!isEditable('shopName')} id="shopName" label="Shop name" name="shopName" required />
            <FormField htmlFor="category" label="Primary category">
              <SelectControl defaultValue={shop.category || 'both'} disabled={!isEditable('category')} id="category" name="category">
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="both">Both</option>
              </SelectControl>
            </FormField>
            <TextAreaField defaultValue={shop.bio || ''} disabled={!isEditable('bio')} id="bio" label="Shop bio" name="bio" rows={5} wrapperClassName="md:col-span-2" />
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-foose-border bg-foose-surface shadow-sm">
        <form onSubmit={(event) => void saveSection(event, LOCATION_FIELDS, 'Shop location')}>
          <header className="flex items-start justify-between gap-3 border-b border-foose-border bg-accent-light/50 px-3 py-4 sm:px-4 md:px-6">
            <div className="min-w-0">
              <h2 className="text-xl font-black text-foose-text">Shop location</h2>
              <p className="text-sm text-foose-muted">Used to tag every item and power marketplace location filters.</p>
            </div>
            {sectionAction('Shop location', LOCATION_FIELDS)}
          </header>
          <div className="grid gap-4 p-3 sm:p-4 md:grid-cols-2 md:p-6">
            <TextField defaultValue={city} disabled={!isEditable('city')} id="city" label="City or town" name="city" placeholder="e.g. Accra" required />
            <FormField htmlFor="region" label="Region" required>
              <SelectControl defaultValue={region} disabled={!isEditable('region')} id="region" name="region" required>
                <option value="">Select region</option>
                {hasLegacyRegion && <option value={region}>{region}</option>}
                {GHANA_REGIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </SelectControl>
            </FormField>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-foose-border bg-foose-surface shadow-sm">
        <form onSubmit={(event) => void saveSection(event, SOCIAL_FIELDS, 'Social connections')}>
          <header className="flex items-start justify-between gap-3 border-b border-foose-border bg-accent-light/50 px-3 py-4 sm:px-4 md:px-6">
            <div className="min-w-0">
              <h2 className="text-xl font-black text-foose-text">Social connections</h2>
              <p className="text-sm text-foose-muted">Keep your customer contact links tidy.</p>
            </div>
            {sectionAction('Social connections', SOCIAL_FIELDS)}
          </header>
          <div className="grid gap-4 p-3 sm:p-4 md:grid-cols-2 md:p-6">
            <TextField defaultValue={shop.socialLinks?.instagram || ''} disabled={!isEditable('instagram')} id="instagram" label="Instagram" name="instagram" placeholder="@yourshop" />
            <TextField defaultValue={shop.socialLinks?.whatsapp || ''} disabled={!isEditable('whatsapp')} id="whatsapp" label="WhatsApp" name="whatsapp" placeholder="+233..." />
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-foose-border bg-foose-surface shadow-sm">
        <form onSubmit={(event) => void saveSection(event, PAYOUT_FIELDS, 'Funds collection method')}>
          <header className="flex items-start justify-between gap-3 border-b border-foose-border bg-accent-light/50 px-3 py-4 sm:px-4 md:px-6">
            <div className="min-w-0">
              <h2 className="text-xl font-black text-foose-text">Funds collection method</h2>
              <p className="text-sm text-foose-muted">Where Foose should send shop funds.</p>
            </div>
            {sectionAction('Funds collection method', PAYOUT_FIELDS)}
          </header>
          <div className="grid gap-4 p-3 sm:p-4 md:grid-cols-2 md:p-6">
            <FormField htmlFor="payoutMethodType" label="Method" required>
              <SelectControl disabled={!isEditable('payoutMethodType')} id="payoutMethodType" name="payoutMethodType" onChange={(event) => setPayoutMethodType(event.target.value as 'mobile_money' | 'bank_transfer')} required value={payoutMethodType}>
                <option value="mobile_money">Mobile money</option>
                <option value="bank_transfer">Bank transfer</option>
              </SelectControl>
            </FormField>
            {payoutMethodType === 'mobile_money' ? (
              <div className="contents" key="mobile-money-fields">
                <FormField htmlFor="payoutProvider" label="Provider" required>
                  <SelectControl defaultValue={shop.payoutMethod?.provider || ''} disabled={!isEditable('payoutProvider')} id="payoutProvider" name="payoutProvider" required>
                    <option value="">Select provider</option>
                    {MOBILE_MONEY_PROVIDERS.map((provider) => <option key={provider} value={provider}>{provider === 'Telecel' ? 'Telecel (formerly Vodafone)' : provider}</option>)}
                  </SelectControl>
                </FormField>
                <TextField defaultValue={shop.payoutMethod?.accountName || ''} disabled={!isEditable('payoutAccountName')} id="payoutAccountName" label="Account name" name="payoutAccountName" required />
                <TextField defaultValue={shop.payoutMethod?.accountNumber || ''} disabled={!isEditable('payoutAccountNumber')} id="payoutAccountNumber" inputMode="tel" label="Phone number" name="payoutAccountNumber" placeholder="e.g. 024 000 0000" required type="tel" />
              </div>
            ) : (
              <div className="contents" key="bank-transfer-fields">
                <FormField htmlFor="payoutBankName" label="Bank" required>
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
                  </SelectControl>
                </FormField>
                <FormField htmlFor="payoutBranch" label="Branch" required>
                  <SelectControl disabled={!isEditable('payoutBranch') || !selectedBank} id="payoutBranch" name="payoutBranch" onChange={(event) => setSelectedBranch(event.target.value)} required value={selectedBranch}>
                    <option value="">{selectedBank ? 'Select branch' : 'Select a bank first'}</option>
                    {hasLegacyBranch && <option value={selectedBranch}>{selectedBranch}</option>}
                    {selectedBank?.branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
                  </SelectControl>
                </FormField>
                <TextField autoComplete="off" defaultValue={shop.payoutMethod?.type === 'bank_transfer' ? shop.payoutMethod.accountName || '' : ''} disabled={!isEditable('payoutAccountName')} id="payoutAccountName" label="Account name" name="payoutAccountName" required />
                <TextField autoComplete="off" defaultValue={shop.payoutMethod?.type === 'bank_transfer' ? shop.payoutMethod.accountNumber || '' : ''} disabled={!isEditable('payoutAccountNumber')} id="payoutAccountNumber" inputMode="numeric" label="Account number" name="payoutAccountNumber" required />
              </div>
            )}
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-foose-border bg-foose-surface shadow-sm">
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

function ShopSettingsPageBody() {
  const { user } = useAuth()
  const shop = useApiResource<{ shop: Shop }>('/digishops/me')

  return (
    <ShopManagementLayout activePanel="settings" fab={<FloatingCreateButton href="/listings/new" label="Add listing" />}>
      <ShopManagementPageHeader description="Edit your DigiShop profile and payout details." title="Shop settings" />

      {shop.error && !shop.data ? (
        <StatePanel
          action={<button className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-bold text-white hover:bg-accent-hover" onClick={shop.refetch} type="button">Retry</button>}
          body="We could not load your DigiShop settings. Your saved shop details have not been changed."
          layout="section"
          title="Shop settings unavailable"
          tone="error"
        />
      ) : shop.data?.shop ? (
        <ShopSettingsForm defaultLocation={user?.location} onSaved={shop.refetch} shop={shop.data.shop} />
      ) : <ShopSettingsSkeleton label="Loading shop settings" />}
    </ShopManagementLayout>
  )
}

export function ShopSettingsPage() {
  return (
    <ShopAccessGate>
      <ShopSettingsPageBody />
    </ShopAccessGate>
  )
}
