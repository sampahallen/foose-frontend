import { useEffect, useMemo, useState, type FormEvent } from 'react'
import fooseLogo from '../assets/foose-logo-white.png'
import { ButtonLink, Icon, ImagePreviewInput, InlineNotice, SelectControl, StatePanel, StepIndicator } from '../components'
import { ChoiceCardGroup, ErrorSummary, SubmitButton } from '../components/forms/FormControls'
import { FormField, TextAreaField, TextField } from '../components/forms/FormField'
import { FormActions, FormPage, FormSection } from '../components/forms/FormLayout'
import { UnsavedChangesGuard } from '../components/forms/UnsavedChangesGuard'
import { useLocalDraft } from '../components/forms/useLocalDraft'
import { NavigationBackButton } from '../components/navigation'
import { useAuth } from '../hooks/useAuth'
import { apiPost } from '../lib/api'
import type { Shop } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { canonicalGhanaRegion, GHANA_REGIONS } from '../utils/ghanaRegions'
import { normalizePhone } from '../utils/formValidation'
import { navigateTo } from '../utils/navigation'
import { navigateWithFlash } from '../utils/navigationFlash'

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

function ShopSetupHeader() {
  return (
    <header className="flow-top grid h-16 grid-cols-[1fr_auto_1fr] items-center bg-accent px-4 text-white md:px-8">
      <div className="flex items-center gap-2">
        <NavigationBackButton
          className="bg-white/10 text-white shadow-none hover:bg-white/20 hover:text-white focus-visible:ring-white focus-visible:ring-offset-accent"
          fallback={{ href: '/profile', label: 'Profile' }}
          variant="icon"
        />
        <span className="hidden sm:inline-flex"><HeaderLogo /></span>
      </div>
      <span className="text-center text-sm font-bold sm:text-base">Set up your shop</span>
      <span aria-hidden className="size-11 justify-self-end" />
    </header>
  )
}

export function OpenShopPage() {
  const { refreshUser, user } = useAuth()
  const [error, setError] = useState('')
  const [shopName, setShopName] = useState('')
  const [shopNameTouched, setShopNameTouched] = useState(false)
  const [cityInput, setCityInput] = useState<string>()
  const [cityTouched, setCityTouched] = useState(false)
  const [regionInput, setRegionInput] = useState<string>()
  const [regionTouched, setRegionTouched] = useState(false)
  const [bio, setBio] = useState('')
  const [category, setCategory] = useState('both')
  const [step, setStep] = useState(0)
  const [validationAttempt, setValidationAttempt] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const city = cityInput ?? user?.location?.city?.trim() ?? ''
  const region = regionInput ?? canonicalGhanaRegion(user?.location?.region)
  const hasLegacyRegion = Boolean(region && !GHANA_REGIONS.some((option) => option === region))
  const shopNameValid = shopName.trim().length >= 2
  const cityValid = city.trim().length >= 2
  const regionValid = region.trim().length >= 2
  const canSubmit = shopNameValid && cityValid && regionValid
  const shopNameInvalid = shopNameTouched && !shopNameValid
  const cityInvalid = cityTouched && !cityValid
  const regionInvalid = regionTouched && !regionValid
  const validationErrors = [
    ...(!shopNameValid ? [{ fieldId: 'shop-name', message: 'Enter a shop name with at least 2 characters.' }] : []),
    ...(!cityValid ? [{ fieldId: 'shop-city', message: 'Enter a city or town with at least 2 characters.' }] : []),
    ...(!regionValid ? [{ fieldId: 'shop-region', message: 'Select a region.' }] : []),
  ]
  const draftValue = useMemo(() => ({ bio, category, city, region, shopName }), [bio, category, city, region, shopName])
  const draft = useLocalDraft({
    formId: 'open-shop',
    onRestore: (saved) => {
      if (typeof saved.shopName === 'string') setShopName(saved.shopName)
      if (typeof saved.bio === 'string') setBio(saved.bio)
      if (typeof saved.category === 'string') setCategory(saved.category)
      if (typeof saved.city === 'string') setCityInput(saved.city)
      if (typeof saved.region === 'string') setRegionInput(saved.region)
    },
    userId: user?._id,
    value: draftValue,
  })
  const dirty = Boolean(shopName || bio || cityInput !== undefined || regionInput !== undefined || category !== 'both')

  useEffect(() => {
    if (user?.hasShop) navigateTo('/manage-shop')
  }, [user?.hasShop])

  async function createShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) {
      setShopNameTouched(true)
      setCityTouched(true)
      setRegionTouched(true)
      setStep(!shopNameValid ? 0 : 1)
      setValidationAttempt((attempt) => attempt + 1)
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
      draft.clearDraft()
      await refreshUser()
      navigateWithFlash(`/manage-shop?shop=${data.shop.slug}`, { message: 'Your DigiShop is ready to customize and stock.', title: 'DigiShop opened', tone: 'success' })
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to create shop'))
    } finally {
      setSubmitting(false)
    }
  }

  function continueSetup() {
    if (step === 0 && !shopNameValid) {
      setShopNameTouched(true)
      setValidationAttempt((attempt) => attempt + 1)
      return
    }
    if (step === 1 && (!cityValid || !regionValid)) {
      setCityTouched(true)
      setRegionTouched(true)
      setValidationAttempt((attempt) => attempt + 1)
      return
    }
    setValidationAttempt(0)
    setStep((current) => Math.min(3, current + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!user?.isKycVerified) {
    return (
      <div className="flow-page min-h-dvh bg-foose-bg">
        <ShopSetupHeader />
        <main className="flow-content mx-auto w-full max-w-5xl px-4 py-8 [&.narrow]:max-w-3xl narrow">
          <StatePanel
            action={<ButtonLink to="/kyc">Complete KYC</ButtonLink>}
            body="The server requires approved KYC before you can open a DigiShop."
            layout="page"
            title="KYC approval required"
            tone="permission"
          />
        </main>
      </div>
    )
  }

  return (
    <div className="flow-page min-h-dvh bg-foose-bg">
      <ShopSetupHeader />
      <main className="flow-content w-full">
        <FormPage description="Create your shop identity, location, payout destination, and brand in four short steps." eyebrow={`Step ${step + 1} of 4`} title="Open your DigiShop" width="standard">
          <UnsavedChangesGuard when={dirty && !submitting} />
          {draft.hasRecoverableDraft && (
            <InlineNotice
              action={(
                <div className="flex gap-2">
                  <button className="min-h-11 rounded-lg px-3 font-black text-accent hover:bg-white" onClick={() => draft.resumeDraft()} type="button">Resume</button>
                  <button className="min-h-11 rounded-lg px-3 font-black text-foose-muted hover:bg-white" onClick={() => draft.discardDraft()} type="button">Discard</button>
                </div>
              )}
              title="Continue setting up your shop?"
            >
              We found a recent local draft. Payout details and image files were not stored.
            </InlineNotice>
          )}
          <StepIndicator
            current={step}
            label="Shop setup progress"
            onStepChange={(index) => { if (index < step) setStep(index) }}
            steps={['Identity', 'Location', 'Payout', 'Brand']}
          />

          <form className="space-y-5" encType="multipart/form-data" noValidate onSubmit={(event) => void createShop(event)}>
            <ErrorSummary
              errors={validationErrors.filter((item) => step === 0 ? item.fieldId === 'shop-name' : step === 1 ? item.fieldId !== 'shop-name' : step === 3)}
              focus={validationAttempt > 0}
            />

            <div hidden={step !== 0}>
              <FormSection description="Choose the public name and inventory focus shoppers will recognize." title="Shop identity">
                <TextField
                  autoComplete="organization"
                  error={shopNameInvalid ? 'Enter at least 2 characters.' : undefined}
                  id="shop-name"
                  label="Shop name"
                  name="shopName"
                  onBlur={() => setShopNameTouched(true)}
                  onChange={(event) => setShopName(event.target.value)}
                  placeholder="e.g. Accra Vintage Finds"
                  required
                  value={shopName}
                />
                <TextAreaField id="shop-bio" label="Shop bio" maxLength={500} name="bio" onChange={(event) => setBio(event.target.value)} optional placeholder="Tell buyers what you curate and what makes the shop distinct." rows={5} value={bio} />
                <ChoiceCardGroup
                  label="Primary category"
                  name="category"
                  onChange={setCategory}
                  options={[
                    { description: 'Sell individual items.', label: 'Retail', value: 'retail' },
                    { description: 'Sell bales and bulk lots.', label: 'Wholesale', value: 'wholesale' },
                    { description: 'Offer both formats.', label: 'Retail + wholesale', value: 'both' },
                  ]}
                  value={category}
                />
              </FormSection>
            </div>

            <div hidden={step !== 1}>
              <FormSection columns={2} description="This becomes the default location for your listings and marketplace filters." title="Shop location">
                <TextField
                  autoComplete="address-level2"
                  error={cityInvalid ? 'Enter at least 2 characters.' : undefined}
                  id="shop-city"
                  label="City or town"
                  name="city"
                  onBlur={() => { setCityInput(city); setCityTouched(true) }}
                  onChange={(event) => setCityInput(event.target.value)}
                  placeholder="e.g. Accra"
                  required
                  value={city}
                />
                <FormField error={regionInvalid ? 'Select a region.' : undefined} htmlFor="shop-region" label="Region" required>
                  <SelectControl
                    aria-describedby={regionInvalid ? 'shop-region-error' : undefined}
                    aria-invalid={regionInvalid || undefined}
                    id="shop-region"
                    name="region"
                    onChange={(event) => { setRegionInput(event.target.value); setRegionTouched(true) }}
                    required
                    value={region}
                  >
                    <option value="">Select region</option>
                    {hasLegacyRegion && <option value={region}>{region}</option>}
                    {GHANA_REGIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </SelectControl>
                </FormField>
              </FormSection>
            </div>

            <div hidden={step !== 2}>
              <FormSection columns={2} description="Foose uses this destination after escrow releases. For your security, payout values are never saved in local drafts." title="Funds collection method">
                <FormField htmlFor="payout-method" label="Method">
                  <SelectControl defaultValue="mobile_money" id="payout-method" name="payoutMethodType">
                    <option value="mobile_money">Mobile money</option>
                    <option value="bank_transfer">Bank transfer</option>
                  </SelectControl>
                </FormField>
                <TextField autoComplete="name" defaultValue={user?.name || ''} id="payout-name" label="Account name" name="payoutAccountName" optional placeholder="Registered account name" />
                <TextField id="payout-provider" label="Provider" name="payoutProvider" optional placeholder="MTN, Telecel, AirtelTigo, bank…" />
                <TextField autoComplete="tel" defaultValue={user?.phone || ''} id="payout-number" inputMode="tel" label="Account or phone number" name="payoutAccountNumber" onBlur={(event) => { event.currentTarget.value = normalizePhone(event.currentTarget.value) }} optional placeholder="0240000000" />
                <TextField id="payout-bank" label="Bank name" name="payoutBankName" optional placeholder="For bank transfer" />
                <TextField id="payout-branch" label="Branch" name="payoutBranch" optional />
              </FormSection>
            </div>

            <div hidden={step !== 3}>
              <FormSection columns={2} description="Add recognizable imagery now, or return to Shop settings after setup." title="Brand and review">
                <FormField hint="Upload a square JPEG, PNG, or WebP image." htmlFor="logo" label="Shop logo" optional>
                  <ImagePreviewInput accept={ACCEPT_IMAGES} maxFiles={1} name="logo" />
                </FormField>
                <FormField hint="Upload a wide JPEG, PNG, or WebP image." htmlFor="banner" label="Shop banner" optional>
                  <ImagePreviewInput accept={ACCEPT_IMAGES} maxFiles={1} name="banner" />
                </FormField>
                <div className="form-field-wide rounded-2xl bg-accent-light/55 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-accent">Ready to open</p>
                  <h3 className="mt-2 font-display text-2xl font-semibold text-foose-text">{shopName || 'Your DigiShop'}</h3>
                  <p className="mt-2 text-sm leading-6 text-foose-muted">{city && region ? `${city}, ${region}` : 'Add your location'} · {category === 'both' ? 'Retail and wholesale' : category}</p>
                  {bio && <p className="mt-3 text-sm leading-6 text-foose-text">{bio}</p>}
                </div>
              </FormSection>
            </div>

            {error && <InlineNotice title="DigiShop was not created" tone="error">{error}</InlineNotice>}
            <FormActions sticky>
              {step === 0 ? <ButtonLink to="/" variant="secondary">Cancel</ButtonLink> : (
                <button className="inline-flex min-h-12 items-center justify-center rounded-xl border border-foose-border bg-white px-5 text-sm font-bold text-foose-text hover:border-accent hover:text-accent" onClick={() => setStep((current) => Math.max(0, current - 1))} type="button">Back</button>
              )}
              {step < 3 ? (
                <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-black text-white shadow-md shadow-accent/15 hover:bg-accent-hover" onClick={continueSetup} type="button">Continue <Icon name="arrow" /></button>
              ) : (
                <SubmitButton loading={submitting} loadingLabel="Opening DigiShop…">Create DigiShop <Icon name="arrow" /></SubmitButton>
              )}
            </FormActions>
          </form>
        </FormPage>
      </main>
    </div>
  )
}
