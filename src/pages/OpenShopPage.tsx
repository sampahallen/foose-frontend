import { useEffect, useState, type FormEvent } from 'react'
import fooseLogo from '../assets/foose-logo-white.png'
import { ButtonLink, EmptyState, ErrorState, Icon, ImagePreviewInput } from '../components'
import { useAuth } from '../hooks/useAuth'
import { apiPost } from '../lib/api'
import type { Shop } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { normalizePhone } from '../utils/formValidation'
import { navigateTo } from '../utils/navigation'

const ACCEPT_IMAGES = 'image/jpeg,image/png,image/webp'

function appendText(formData: FormData, name: string, value: FormDataEntryValue | null) {
  const text = String(value || '').trim()
  if (text) formData.append(name, text)
}

function appendSelectedFile(formData: FormData, form: HTMLFormElement, name: string) {
  const input = form.elements.namedItem(name) as HTMLInputElement | null
  const file = input?.files?.[0]
  if (file && file.name && file.size > 0) formData.append(name, file)
}

function HeaderLogo() {
  return (
    <a aria-label="Foose home" className="inline-flex shrink-0 items-center" href="/">
      <img alt="Foose" className="h-8 w-auto sm:h-9" src={fooseLogo} />
    </a>
  )
}

export function OpenShopPage() {
  const { refreshUser, user } = useAuth()
  const [error, setError] = useState('')
  const [shopName, setShopName] = useState('')
  const [shopNameTouched, setShopNameTouched] = useState(false)
  const [city, setCity] = useState('')
  const [cityTouched, setCityTouched] = useState(false)
  const [region, setRegion] = useState('')
  const [regionTouched, setRegionTouched] = useState(false)
  const [bioLength, setBioLength] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const shopNameValid = shopName.trim().length >= 2
  const cityValid = city.trim().length >= 2
  const regionValid = region.trim().length >= 2
  const canSubmit = shopNameValid && cityValid && regionValid
  const shopNameInvalid = shopNameTouched && !shopNameValid
  const cityInvalid = cityTouched && !cityValid
  const regionInvalid = regionTouched && !regionValid
  const submitHint = !canSubmit ? 'Enter a shop name, city, and region to continue.' : ''

  function requiredBadge(invalid: boolean) {
    return <span className={`ml-auto text-[10px] font-bold ${invalid ? 'text-foose-danger' : 'text-foose-faint'}`}>Required</span>
  }

  useEffect(() => {
    if (user?.hasShop) navigateTo('/manage-shop')
  }, [user?.hasShop])

  async function createShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) {
      setShopNameTouched(true)
      setCityTouched(true)
      setRegionTouched(true)
      return
    }
    const form = event.currentTarget
    const sourceData = new FormData(form)
    const formData = new FormData()
    appendText(formData, 'shopName', sourceData.get('shopName'))
    appendText(formData, 'bio', sourceData.get('bio'))
    appendText(formData, 'category', sourceData.get('category'))
    appendText(formData, 'city', sourceData.get('city'))
    appendText(formData, 'region', sourceData.get('region'))
    appendText(formData, 'payoutMethodType', sourceData.get('payoutMethodType'))
    appendText(formData, 'payoutAccountName', sourceData.get('payoutAccountName'))
    appendText(formData, 'payoutProvider', sourceData.get('payoutProvider'))
    appendText(formData, 'payoutAccountNumber', sourceData.get('payoutAccountNumber'))
    appendText(formData, 'payoutBankName', sourceData.get('payoutBankName'))
    appendText(formData, 'payoutBranch', sourceData.get('payoutBranch'))
    appendSelectedFile(formData, form, 'logo')
    appendSelectedFile(formData, form, 'banner')
    setSubmitting(true)
    setError('')

    try {
      const data = await apiPost<{ shop: Shop }>('/digishops', formData)
      await refreshUser()
      navigateTo(`/manage-shop?shop=${data.shop.slug}`)
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to create shop'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!user?.isKycVerified) {
    return (
      <div className="flow-page min-h-dvh bg-foose-bg">
        <header className="flow-top flex h-16 items-center justify-between bg-accent px-4 text-white md:px-8">
          <HeaderLogo />
          <span>Set up your shop</span>
          <a href="/">Close</a>
        </header>
        <main className="flow-content mx-auto w-full max-w-5xl px-4 py-8 [&.narrow]:max-w-3xl narrow">
          <EmptyState
            action={<ButtonLink to="/kyc">Complete KYC</ButtonLink>}
            body="The server requires approved KYC before you can open a DigiShop."
            icon="shield"
            title="KYC approval required"
          />
        </main>
      </div>
    )
  }

  return (
    <div className="flow-page min-h-dvh bg-foose-bg">
      <header className="flow-top flex h-16 items-center justify-between bg-accent px-4 text-white md:px-8">
        <HeaderLogo />
        <span>Set up your shop</span>
        <a href="/">Close</a>
      </header>
      <main className="flow-content mx-auto w-full max-w-5xl px-4 py-8 [&.narrow]:max-w-3xl narrow">
        <section className="form-card rounded-xl border border-foose-border bg-foose-surface p-5 shadow-sm md:p-7 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-foose-text [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-foose-border [&_input]:bg-foose-surface [&_input]:px-3 [&_input]:py-3 [&_input]:outline-none [&_input]:transition [&_input]:focus:border-accent [&_input]:focus:ring-2 [&_input]:focus:ring-accent/15 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-foose-border [&_select]:bg-foose-surface [&_select]:px-3 [&_select]:py-3 [&_select]:outline-none [&_select]:transition [&_select]:focus:border-accent [&_select]:focus:ring-2 [&_select]:focus:ring-accent/15 [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-foose-border [&_textarea]:bg-foose-surface [&_textarea]:px-3 [&_textarea]:py-3 [&_textarea]:outline-none [&_textarea]:transition [&_textarea]:focus:border-accent [&_textarea]:focus:ring-2 [&_textarea]:focus:ring-accent/15 max-lg:rounded-lg max-lg:p-4 large">
          <h1>Basic information</h1>
          <p>Create your DigiShop record, then add listings from your profile.</p>
          <form className="space-y-5" encType="multipart/form-data" onSubmit={(event) => void createShop(event)}>
            <label>
              <span className="flex items-center gap-2">Shop name {requiredBadge(shopNameInvalid)}</span>
              <input name="shopName" onBlur={() => setShopNameTouched(true)} onChange={(event) => setShopName(event.target.value)} placeholder="e.g. Accra Vintage Finds" required />
              {shopNameInvalid && <span className="text-xs font-semibold text-foose-danger">Enter at least 2 characters.</span>}
            </label>
            <label>
              Shop bio
              <textarea maxLength={500} name="bio" onChange={(event) => setBioLength(event.target.value.length)} placeholder="Tell buyers what you curate..." rows={5} />
              <span className="text-xs font-semibold text-foose-muted">{bioLength}/500 characters</span>
            </label>
            <label>
              Primary category
              <select defaultValue="both" name="category">
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="both">Both</option>
              </select>
            </label>
            <fieldset className="field-section space-y-4 rounded-xl border border-foose-border bg-foose-surface-low p-4">
              <legend>Shop location</legend>
              <p className="muted-copy text-sm leading-6 text-foose-muted md:text-base">
                This will be your default shop location from here on out, and buyers will use it to filter retail items and bales.
              </p>
              <div className="form-grid grid gap-4 sm:grid-cols-2 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_input]:w-full [&_input]:px-3 [&_input]:py-3">
                <label>
                  <span className="flex items-center gap-2">City or town {requiredBadge(cityInvalid)}</span>
                  <input name="city" onBlur={() => setCityTouched(true)} onChange={(event) => setCity(event.target.value)} placeholder="e.g. Accra" required />
                  {cityInvalid && <span className="text-xs font-semibold text-foose-danger">Enter at least 2 characters.</span>}
                </label>
                <label>
                  <span className="flex items-center gap-2">Region {requiredBadge(regionInvalid)}</span>
                  <input name="region" onBlur={() => setRegionTouched(true)} onChange={(event) => setRegion(event.target.value)} placeholder="e.g. Greater Accra" required />
                  {regionInvalid && <span className="text-xs font-semibold text-foose-danger">Enter at least 2 characters.</span>}
                </label>
              </div>
            </fieldset>
            <fieldset className="field-section space-y-4 rounded-xl border border-foose-border bg-foose-surface-low p-4">
              <legend>Primary funds collection method</legend>
              <p className="muted-copy text-sm leading-6 text-foose-muted md:text-base">Foose will use this as the default payout destination after escrow releases.</p>
              <div className="form-grid grid gap-4 sm:grid-cols-2 [&_.wide]:sm:col-span-2 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_input]:w-full [&_input]:px-3 [&_input]:py-3 [&_select]:w-full [&_select]:px-3 [&_select]:py-3 [&_textarea]:w-full [&_textarea]:px-3 [&_textarea]:py-3">
                <label>
                  Method
                  <select defaultValue="mobile_money" name="payoutMethodType">
                    <option value="mobile_money">Mobile money</option>
                    <option value="bank_transfer">Bank transfer</option>
                  </select>
                </label>
                <label>
                  Account name
                  <input defaultValue={user?.name || ''} name="payoutAccountName" placeholder="Registered account name" />
                </label>
                <label>
                  Provider
                  <input name="payoutProvider" placeholder="MTN, Telecel, AirtelTigo, bank..." />
                </label>
                <label>
                  Account / phone number
                  <input autoComplete="tel" defaultValue={user?.phone || ''} name="payoutAccountNumber" onBlur={(event) => { event.currentTarget.value = normalizePhone(event.currentTarget.value) }} placeholder="0240000000" />
                </label>
                <label>
                  Bank name
                  <input name="payoutBankName" placeholder="Optional for mobile money" />
                </label>
                <label>
                  Branch
                  <input name="payoutBranch" placeholder="Optional" />
                </label>
              </div>
            </fieldset>
            <label>
              Shop logo
              <ImagePreviewInput accept={ACCEPT_IMAGES} maxFiles={1} name="logo" />
              <span className="muted-copy text-sm leading-6 text-foose-muted md:text-base">Upload a square JPEG, PNG, or WebP image.</span>
            </label>
            <label>
              Shop banner
              <ImagePreviewInput accept={ACCEPT_IMAGES} maxFiles={1} name="banner" />
              <span className="muted-copy text-sm leading-6 text-foose-muted md:text-base">Upload a wide JPEG, PNG, or WebP image.</span>
            </label>
            {error && <ErrorState message={error} />}
            <div className="form-actions flex flex-wrap items-center gap-3">
              <ButtonLink to="/" variant="secondary">
                Cancel
              </ButtonLink>
              <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:border-foose-border disabled:bg-foose-surface-mid disabled:text-foose-faint disabled:shadow-none [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover" disabled={submitting || !canSubmit} type="submit">
                {submitting ? 'Creating...' : 'Create DigiShop'} <Icon name="arrow" />
              </button>
              {!canSubmit && <p className="w-full text-sm font-bold text-foose-muted">{submitHint}</p>}
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}
