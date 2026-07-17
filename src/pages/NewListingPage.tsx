import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AppShell, ButtonLink, DropdownChevron, HashtagInput, Icon, ImagePreviewInput, InlineNotice, SelectControl, StatePanel, StepIndicator } from '../components'
import { ErrorSummary, SubmitButton } from '../components/forms/FormControls'
import { FormField, TextAreaField, TextField } from '../components/forms/FormField'
import { FormActions, FormPage, FormSection } from '../components/forms/FormLayout'
import { UnsavedChangesGuard } from '../components/forms/UnsavedChangesGuard'
import { useLocalDraft } from '../components/forms/useLocalDraft'
import { FormPageSkeleton } from '../components/operational/OperationalStates'
import { NavigationBackButton } from '../components/navigation'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { apiPost, apiPut } from '../lib/api'
import type { Listing } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { LISTING_BRANDS, LISTING_CATEGORIES, LISTING_COLORS, LISTING_CONDITIONS, sizePlaceholderForCategory } from '../utils/listingTaxonomy'
import { getCurrentAppPathname } from '../utils/navigation'
import { navigateWithFlash } from '../utils/navigationFlash'

function readFormText(formData: FormData, name: string) {
  return String(formData.get(name) || '').trim()
}

function optionalNumber(value: string) {
  if (!value) return undefined
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function appendText(formData: FormData, name: string, value: string | number | undefined) {
  if (value === undefined || value === '') return
  formData.append(name, String(value))
}

const ACCEPT_IMAGES = 'image/jpeg,image/png,image/webp'
const listingSelectControl =
  'h-12 w-full appearance-none rounded-xl border border-foose-border bg-foose-surface px-3 pr-10 text-sm font-semibold text-foose-text outline-none transition hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent/15'

type ListingDropdownOption = {
  label: string
  swatch?: string
  value: string
}

function ListingDropdown({
  dividerAfter,
  name,
  onChange,
  options,
  placeholder,
  value,
}: {
  dividerAfter?: string
  name: string
  onChange?: (value: string) => void
  options: ListingDropdownOption[]
  placeholder: string
  value?: string
}) {
  const [open, setOpen] = useState(false)
  const [internalValue, setInternalValue] = useState(value || '')
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const selectedValue = value ?? internalValue
  const selectedOption = options.find((option) => option.value === selectedValue)

  useEffect(() => {
    if (!open) return undefined

    function closeOnOutsideClick(event: MouseEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) setOpen(false)
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  function selectOption(option: ListingDropdownOption) {
    setInternalValue(option.value)
    onChange?.(option.value)
    setOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <input name={name} type="hidden" value={selectedValue} />
      <button
        aria-expanded={open}
        className={`flex h-12 w-full items-center justify-between gap-3 rounded-xl border border-foose-border bg-foose-surface px-3 text-left text-sm font-semibold text-foose-text outline-none transition hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent/15 ${!selectedOption ? 'text-foose-faint' : ''}`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="min-w-0 truncate">{selectedOption?.label || placeholder}</span>
        <span className="flex items-center gap-3">
          {selectedOption?.swatch && <span aria-hidden className="size-5 rounded-full border border-black/15" style={{ background: selectedOption.swatch }} />}
          <span className="inline-flex text-accent">
            <DropdownChevron className="text-[15px]" open={open} />
          </span>
        </span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-30 max-h-72 overflow-y-auto rounded-xl border border-foose-border bg-white p-1.5 shadow-2xl">
          {options.map((option) => (
            <div key={option.value}>
              <button
                className={`flex min-h-10 w-full items-center justify-between gap-4 rounded-lg px-3 text-left text-sm font-semibold transition hover:bg-accent-light hover:text-accent ${option.value === selectedValue ? 'bg-accent-light text-accent' : 'text-foose-text'}`}
                onClick={() => selectOption(option)}
                type="button"
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {option.swatch && <span aria-hidden className="size-5 shrink-0 rounded-full border border-black/15" style={{ background: option.swatch }} />}
              </button>
              {dividerAfter === option.value && <hr className="my-1.5 border-0 border-t border-foose-border" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function currentEditId() {
  const match = getCurrentAppPathname().match(/^\/listings\/([^/]+)\/edit/)
  return match ? decodeURIComponent(match[1]).trim() : ''
}

function sourceEventId() {
  return new URLSearchParams(window.location.search).get('eventId')?.trim() || ''
}

function parseGhsToPesewas(value: string) {
  const normalized = value.trim().replace(/,/g, '.')
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null
  const [whole, decimal = ''] = normalized.split('.')
  return Number(whole) * 100 + Number(decimal.padEnd(2, '0').slice(0, 2))
}

function priceInputValue(price?: number) {
  if (price === undefined) return ''
  return (price / 100).toFixed(2)
}

export function NewListingPage() {
  const { user } = useAuth()
  const editId = currentEditId()
  const eventId = sourceEventId()
  const editResource = useApiResource<{ listing: Listing }>(editId ? `/listings/${editId}` : null)
  const listing = editResource.data?.listing
  const shopReturnPath = listing?.status === 'draft' ? '/manage-shop/drafts' : '/manage-shop/listings'
  const returnFallback = eventId
    ? { href: `/community/events/${eventId}/manage`, label: 'Event' }
    : listing?.status === 'draft'
      ? { href: '/manage-shop/drafts', label: 'Draft listings' }
      : { href: shopReturnPath, label: 'Active listings' }
  const [error, setError] = useState('')
  const [selectedListingType, setSelectedListingType] = useState<'' | 'retail' | 'wholesale'>('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedCondition, setSelectedCondition] = useState('')
  const [titleValue, setTitleValue] = useState(listing?.title || '')
  const [priceValue, setPriceValue] = useState(listing ? priceInputValue(listing.price) : '')
  const [descriptionValue, setDescriptionValue] = useState(listing?.description || '')
  const [quantityValue, setQuantityValue] = useState(listing?.quantity ? String(listing.quantity) : '')
  const [bulkMinQtyValue, setBulkMinQtyValue] = useState(listing?.bulkMinQty ? String(listing.bulkMinQty) : '')
  const [brandValue, setBrandValue] = useState(listing?.brand || '')
  const [colorValue, setColorValue] = useState<string>(listing?.color || 'multi')
  const [sizeValue, setSizeValue] = useState(listing?.size || '')
  const [genderValue, setGenderValue] = useState(listing?.gender || '')
  const [bulkWeightValue, setBulkWeightValue] = useState(listing?.bulkWeight || '')
  const [flawNoteValue, setFlawNoteValue] = useState('')
  const [hashtags, setHashtags] = useState<string[]>(listing?.hashtags || [])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [step, setStep] = useState(0)
  const [validationAttempt, setValidationAttempt] = useState(0)
  const restoredRef = useRef(false)
  const [touched, setTouched] = useState({ bulkMinQty: false, price: false, quantity: false, title: false })
  const [submitting, setSubmitting] = useState(false)
  const [submittingAction, setSubmittingAction] = useState<'active' | 'draft' | ''>('')
  const listingType = selectedListingType || listing?.type || 'retail'
  const categoryValue = selectedCategory || listing?.category || ''
  const conditionValue = selectedCondition || listing?.condition || ''
  const brandOptions = listing?.brand && !LISTING_BRANDS.includes(listing.brand) ? [...LISTING_BRANDS, listing.brand].sort((a, b) => a.localeCompare(b)) : LISTING_BRANDS
  const brandedOptions = brandOptions.filter((brand) => brand !== 'Unbranded').sort((a, b) => a.localeCompare(b))
  const brandDropdownOptions = ['Unbranded', ...brandedOptions].map((brand) => ({ label: brand, value: brand }))
  const colorDropdownOptions = LISTING_COLORS.map((color) => ({ label: color.label, swatch: color.hex, value: color.value }))
  const needsFlawProof = conditionValue === 'fair' || conditionValue === 'poor'
  const sizePlaceholder = sizePlaceholderForCategory(categoryValue)
  const priceNumber = parseGhsToPesewas(priceValue)
  const bulkQuantity = optionalNumber(quantityValue)
  const minimumOrderQuantity = optionalNumber(bulkMinQtyValue)
  const wholesaleValid =
    listingType !== 'wholesale' ||
    Boolean(bulkQuantity && minimumOrderQuantity && bulkQuantity >= 1 && minimumOrderQuantity >= 1 && minimumOrderQuantity <= bulkQuantity)
  const canSubmitListing = titleValue.trim().length >= 2 && priceNumber !== null && priceNumber >= 0 && wholesaleValid
  const titleInvalid = touched.title && titleValue.trim().length < 2
  const priceInvalid = touched.price && (priceNumber === null || priceNumber < 0)
  const quantityInvalid = touched.quantity && listingType === 'wholesale' && (!bulkQuantity || bulkQuantity < 1)
  const bulkMinQtyInvalid =
    touched.bulkMinQty &&
    listingType === 'wholesale' &&
    (!minimumOrderQuantity || minimumOrderQuantity < 1 || Boolean(bulkQuantity && minimumOrderQuantity > bulkQuantity))
  const validationErrors = [
    ...(titleValue.trim().length < 2 ? [{ fieldId: 'listing-title', message: 'Enter a listing title with at least 2 characters.' }] : []),
    ...(priceNumber === null || priceNumber < 0 ? [{ fieldId: 'listing-price', message: 'Enter a valid price with up to two decimal places.' }] : []),
    ...(quantityInvalid ? [{ fieldId: 'listing-quantity', message: 'Enter the total available quantity.' }] : []),
    ...(bulkMinQtyInvalid ? [{ fieldId: 'listing-minimum', message: minimumOrderQuantity && bulkQuantity && minimumOrderQuantity > bulkQuantity ? 'Minimum order cannot exceed total quantity.' : 'Enter the minimum order quantity.' }] : []),
  ]
  const draftValue = useMemo(() => ({
    brand: brandValue,
    bulkMinQty: bulkMinQtyValue,
    bulkWeight: bulkWeightValue,
    category: categoryValue,
    color: colorValue,
    condition: conditionValue,
    description: descriptionValue,
    flawNote: flawNoteValue,
    gender: genderValue,
    hashtags,
    listingType,
    price: priceValue,
    quantity: quantityValue,
    size: sizeValue,
    title: titleValue,
  }), [brandValue, bulkMinQtyValue, bulkWeightValue, categoryValue, colorValue, conditionValue, descriptionValue, flawNoteValue, genderValue, hashtags, listingType, priceValue, quantityValue, sizeValue, titleValue])
  const draft = useLocalDraft({
    enabled: !editResource.initialLoading,
    formId: 'listing',
    onRestore: (saved) => {
      restoredRef.current = true
      if (saved.listingType === 'retail' || saved.listingType === 'wholesale') setSelectedListingType(saved.listingType)
      if (typeof saved.title === 'string') setTitleValue(saved.title)
      if (typeof saved.description === 'string') setDescriptionValue(saved.description)
      if (typeof saved.price === 'string') setPriceValue(saved.price)
      if (typeof saved.category === 'string') setSelectedCategory(saved.category)
      if (typeof saved.brand === 'string') setBrandValue(saved.brand)
      if (typeof saved.condition === 'string') setSelectedCondition(saved.condition)
      if (typeof saved.color === 'string') setColorValue(saved.color)
      if (typeof saved.size === 'string') setSizeValue(saved.size)
      if (typeof saved.gender === 'string') setGenderValue(saved.gender)
      if (typeof saved.quantity === 'string') setQuantityValue(saved.quantity)
      if (typeof saved.bulkMinQty === 'string') setBulkMinQtyValue(saved.bulkMinQty)
      if (typeof saved.bulkWeight === 'string') setBulkWeightValue(saved.bulkWeight)
      if (typeof saved.flawNote === 'string') setFlawNoteValue(saved.flawNote)
      if (Array.isArray(saved.hashtags)) setHashtags(saved.hashtags.filter((tag): tag is string => typeof tag === 'string'))
    },
    resourceId: editId || 'new',
    userId: user?._id,
    value: draftValue,
  })
  const dirty = listing
    ? titleValue !== (listing.title || '') || descriptionValue !== (listing.description || '') || priceValue !== priceInputValue(listing.price) || selectedFiles.length > 0
    : Boolean(titleValue || descriptionValue || priceValue || selectedCategory || brandValue || selectedCondition || hashtags.length || selectedFiles.length || selectedListingType)

  useEffect(() => {
    if (!listing || restoredRef.current) return
    setTitleValue(listing.title || '')
    setPriceValue(priceInputValue(listing.price))
    setDescriptionValue(listing.description || '')
    setQuantityValue(listing.quantity ? String(listing.quantity) : '')
    setBulkMinQtyValue(listing.bulkMinQty ? String(listing.bulkMinQty) : '')
    setBrandValue(listing.brand || '')
    setColorValue(listing.color || 'multi')
    setSizeValue(listing.size || '')
    setGenderValue(listing.gender || '')
    setBulkWeightValue(listing.bulkWeight || '')
    setHashtags(listing.hashtags || [])
  }, [listing])

  function continueListingStep() {
    if (step === 0 && titleValue.trim().length < 2) {
      setTouched((current) => ({ ...current, title: true }))
      setValidationAttempt((attempt) => attempt + 1)
      return
    }
    if (step === 1 && !canSubmitListing) {
      setTouched({ bulkMinQty: true, price: true, quantity: true, title: true })
      setValidationAttempt((attempt) => attempt + 1)
      return
    }
    setValidationAttempt(0)
    setStep((current) => Math.min(3, current + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function createListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmitListing) {
      setTouched({ bulkMinQty: true, price: true, quantity: true, title: true })
      setStep(titleValue.trim().length < 2 ? 0 : 1)
      setValidationAttempt((attempt) => attempt + 1)
      return
    }
    const form = event.currentTarget
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const requestedStatus = submitter?.dataset.status === 'draft' ? 'draft' : 'active'
    const sourceData = new FormData(form)
    const uploadData = new FormData()
    const price = parseGhsToPesewas(readFormText(sourceData, 'price'))
    const bulkQuantity = optionalNumber(readFormText(sourceData, 'quantity'))
    const minimumOrderQuantity = optionalNumber(readFormText(sourceData, 'bulkMinQty'))
    const flawNote = readFormText(sourceData, 'flawNote')
    const imageInput = form.elements.namedItem('images') as HTMLInputElement | null
    const selectedFiles = Array.from(imageInput?.files || []).slice(0, 6)
    const keptImageCount = sourceData.getAll('keptImages').filter(Boolean).length

    if (price === null || price < 0) {
      setError('Enter a valid price with up to two decimal places.')
      return
    }

    if (listingType === 'wholesale') {
      if (!bulkQuantity || bulkQuantity < 1) {
        setError('Enter the total quantity available for the wholesale lot.')
        return
      }

      if (!minimumOrderQuantity || minimumOrderQuantity < 1) {
        setError('Enter the minimum order quantity for wholesale buyers.')
        return
      }

      if (minimumOrderQuantity > bulkQuantity) {
        setError('Minimum order quantity cannot be greater than total available quantity.')
        return
      }
    }

    if (needsFlawProof) {
      if (!flawNote) {
        setError('For fair or poor condition items, describe the flaw so escrow review is clear.')
        return
      }

      if (!selectedFiles.length && !keptImageCount) {
        setError('For fair or poor condition items, upload at least one image that shows the flaw.')
        return
      }
    }

    appendText(uploadData, 'currency', 'GHS')
    appendText(uploadData, 'price', price)
    appendText(uploadData, 'status', requestedStatus)
    appendText(uploadData, 'title', readFormText(sourceData, 'title'))
    appendText(uploadData, 'type', listingType)
    appendText(uploadData, 'visibility', eventId && !editId ? 'event' : undefined)
    sourceData.getAll('keptImages').forEach((image) => appendText(uploadData, 'keptImages', String(image)))
    if (sourceData.has('keptImagesTouched')) appendText(uploadData, 'keptImagesTouched', '1')

    appendText(uploadData, 'description', needsFlawProof ? `${readFormText(sourceData, 'description')}\n\nFlaws: ${flawNote}`.trim() : readFormText(sourceData, 'description'))
    uploadData.append('hashtags', readFormText(sourceData, 'hashtags'))
    ;['category', 'brand', 'condition', 'color'].forEach((field) => {
      appendText(uploadData, field, readFormText(sourceData, field))
    })

    if (listingType === 'retail') {
      ;['size', 'gender'].forEach((field) => {
        appendText(uploadData, field, readFormText(sourceData, field))
      })
      appendText(uploadData, 'quantity', 1)
    } else {
      appendText(uploadData, 'quantity', bulkQuantity)
      appendText(uploadData, 'bulkMinQty', minimumOrderQuantity)
      appendText(uploadData, 'bulkWeight', readFormText(sourceData, 'bulkWeight'))
    }

    selectedFiles.forEach((file) => uploadData.append('images', file))

    setSubmitting(true)
    setSubmittingAction(requestedStatus)
    setError('')

    try {
      const data = editId
        ? await apiPut<{ listing: Listing }>(`/listings/${editId}`, uploadData)
        : await apiPost<{ listing: Listing }>('/listings', uploadData)

      if (!editId && eventId && requestedStatus === 'active') {
        await apiPost(`/community/events/${eventId}/listings`, { listingId: data.listing._id })
        draft.clearDraft()
        navigateWithFlash(`/community/events/${eventId}/manage`, { message: 'The listing is live and attached to this pop-up.', title: 'Listing published', tone: 'success' })
        return
      }

      draft.clearDraft()
      navigateWithFlash(
        requestedStatus === 'draft' ? '/manage-shop/drafts' : `/listing/${data.listing._id}`,
        { message: requestedStatus === 'draft' ? 'Your listing draft was saved.' : `Your listing was ${editId ? 'updated' : 'published'}.`, title: requestedStatus === 'draft' ? 'Draft saved' : 'Listing ready', tone: 'success' },
      )
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to save listing'))
    } finally {
      setSubmitting(false)
      setSubmittingAction('')
    }
  }

  if (!user?.isKycVerified) {
    return (
      <AppShell>
        <NavigationBackButton className="mb-5" fallback={returnFallback} />
        <StatePanel
          action={<ButtonLink to="/kyc">Complete KYC</ButtonLink>}
          body="KYC approval is required before you can add listings."
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
        <NavigationBackButton className="mb-5" fallback={returnFallback} />
        <StatePanel
          action={<ButtonLink to="/open-shop">Open your DigiShop</ButtonLink>}
          body="Create a DigiShop before publishing marketplace listings."
          layout="page"
          title="DigiShop required"
          tone="permission"
        />
      </AppShell>
    )
  }

  if (editId && editResource.initialLoading) {
    return (
      <AppShell searchPlaceholder="Search marketplace...">
        <NavigationBackButton className="mb-5" fallback={returnFallback} />
        <FormPageSkeleton label="Loading listing editor" media />
      </AppShell>
    )
  }

  if (editId && editResource.error && !editResource.data) {
    return (
      <AppShell searchPlaceholder="Search marketplace...">
        <NavigationBackButton className="mb-5" fallback={returnFallback} />
        <StatePanel action={<button className="button button-secondary min-h-11 px-5" onClick={() => void editResource.refetch()} type="button">Retry</button>} body={editResource.error} layout="page" title="Listing unavailable" tone="unavailable" />
      </AppShell>
    )
  }

  return (
    <AppShell searchPlaceholder="Search marketplace...">
      <FormPage
        aside={(
          <div className="rounded-2xl border border-foose-border bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-accent">Listing preview</p>
            <h2 className="mt-3 font-display text-2xl font-semibold text-foose-text">{titleValue || 'Your listing title'}</h2>
            <p className="mt-2 text-xl font-black text-accent">{priceValue ? `GHS ${priceValue}` : 'Add a price'}</p>
            <p className="mt-3 line-clamp-4 text-sm leading-6 text-foose-muted">{descriptionValue || 'Your description will appear here as you build the listing.'}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-foose-muted"><span className="rounded-full bg-accent-light px-3 py-1.5">{listingType}</span>{categoryValue && <span className="rounded-full bg-foose-surface-low px-3 py-1.5">{categoryValue}</span>}</div>
          </div>
        )}
        description={editId ? 'Update the listing details buyers see. All sections stay available on this page.' : 'Build a clear, trustworthy marketplace listing in four short steps.'}
        eyebrow={(
          <NavigationBackButton fallback={returnFallback} />
        )}
        title={editId ? 'Edit listing' : 'Add listing'}
        width="wide"
      >
        {!editId && (
          <StepIndicator
            current={step}
            label="Listing creation progress"
            onStepChange={(index) => { if (index < step) setStep(index) }}
            steps={['Details', 'Pricing', 'Media', 'Review']}
          />
        )}

        <form className="space-y-5" encType="multipart/form-data" noValidate onSubmit={(event) => void createListing(event)}>
          <UnsavedChangesGuard when={dirty && !submitting} />
          {draft.hasRecoverableDraft && (
            <InlineNotice action={<div className="flex gap-2"><button className="min-h-11 rounded-lg px-3 font-black text-accent hover:bg-white" onClick={() => draft.resumeDraft()} type="button">Resume</button><button className="min-h-11 rounded-lg px-3 font-black text-foose-muted hover:bg-white" onClick={() => draft.discardDraft()} type="button">Discard</button></div>} title="Continue your listing draft?">Listing details were saved on this device. Image files were not stored and must be selected again.</InlineNotice>
          )}
          <ErrorSummary errors={validationAttempt ? validationErrors : []} focus={validationAttempt > 0} />

          <FormSection className={!editId && step !== 0 ? 'hidden' : ''} columns={2} description="Give shoppers a concise name, useful context, and the right listing format." title="Details">
            <TextField error={titleInvalid ? 'Enter at least 2 characters.' : undefined} id="listing-title" label="Title" name="title" onBlur={() => setTouched((current) => ({ ...current, title: true }))} onChange={(event) => setTitleValue(event.target.value)} placeholder="Vintage bomber jacket" required value={titleValue} wrapperClassName="form-field-wide" />
            <TextAreaField id="listing-description" label="Description" maxLength={1200} name="description" onChange={(event) => setDescriptionValue(event.target.value)} optional placeholder="Condition, fit, measurements, and pickup notes" rows={5} value={descriptionValue} wrapperClassName="form-field-wide" />
            <div className="form-field-wide"><HashtagInput initialTags={hashtags} label="Vibe hashtags" name="hashtags" onChange={setHashtags} /></div>
            <FormField hint={listingType === 'retail' ? 'Retail listings are single items.' : 'Wholesale listings use bulk quantities and minimum order quantities.'} htmlFor="listing-type" label="Listing type" required>
              <SelectControl className={listingSelectControl} id="listing-type" name="type" onChange={(event) => setSelectedListingType(event.target.value as 'retail' | 'wholesale')} required value={listingType}><option value="retail">Retail</option><option value="wholesale">Wholesale</option></SelectControl>
            </FormField>
          </FormSection>

          <FormSection className={!editId && step !== 1 ? 'hidden' : ''} columns={2} description="Set the price and attributes buyers use to compare and filter products." title="Pricing and attributes">
            <TextField error={priceInvalid ? 'Enter a valid amount, like 240.00.' : undefined} hint="Use up to two decimal places." id="listing-price" inputMode="decimal" label={listingType === 'wholesale' ? 'Unit price (GHS)' : 'Price (GHS)'} name="price" onBlur={() => setTouched((current) => ({ ...current, price: true }))} onChange={(event) => setPriceValue(event.target.value)} placeholder="240.00" prefix="GHS" required value={priceValue} />
            <FormField htmlFor="listing-category" label="Category" optional><SelectControl className={listingSelectControl} id="listing-category" name="category" onChange={(event) => setSelectedCategory(event.target.value)} value={categoryValue}><option value="">Select category</option>{LISTING_CATEGORIES.map((category) => <option key={category.label} value={category.label}>{category.label}</option>)}</SelectControl></FormField>
            <FormField htmlFor="listing-brand" label="Brand" optional><ListingDropdown dividerAfter="Unbranded" name="brand" onChange={setBrandValue} options={brandDropdownOptions} placeholder="Select brand" value={brandValue} /></FormField>
            {listingType === 'retail' && <TextField id="listing-size" label="Size" name="size" onChange={(event) => setSizeValue(event.target.value)} optional placeholder={sizePlaceholder} value={sizeValue} />}
            {listingType === 'retail' && <FormField htmlFor="listing-gender" label="Gender" optional><SelectControl className={listingSelectControl} id="listing-gender" name="gender" onChange={(event) => setGenderValue(event.target.value)} value={genderValue}><option value="">Select gender</option><option value="men">Men</option><option value="women">Women</option><option value="unisex">Unisex</option><option value="kids">Kids</option></SelectControl></FormField>}
            <FormField htmlFor="listing-condition" label="Condition" optional><SelectControl className={listingSelectControl} id="listing-condition" name="condition" onChange={(event) => setSelectedCondition(event.target.value)} value={conditionValue}><option value="">Select condition</option>{LISTING_CONDITIONS.map((condition) => <option key={condition} value={condition}>{condition[0].toUpperCase() + condition.slice(1)}</option>)}</SelectControl></FormField>
            <FormField htmlFor="listing-color" label="Color" optional><ListingDropdown name="color" onChange={setColorValue} options={colorDropdownOptions} placeholder="Select color" value={colorValue} /></FormField>
            {needsFlawProof && <TextAreaField className="border-amber-300 bg-amber-50" hint="Fair or poor items need an image showing the flaw. This note is appended to the description." id="listing-flaw" label="Flaw note for escrow review" name="flawNote" onChange={(event) => setFlawNoteValue(event.target.value)} placeholder="Small stain on the left sleeve, shown in photo 2." required rows={3} value={flawNoteValue} wrapperClassName="form-field-wide rounded-xl bg-amber-50 p-4" />}
            {listingType === 'wholesale' && <TextField error={quantityInvalid ? 'Enter at least 1 item.' : undefined} id="listing-quantity" label="Total available quantity" min="1" name="quantity" onBlur={() => setTouched((current) => ({ ...current, quantity: true }))} onChange={(event) => setQuantityValue(event.target.value)} placeholder="100" required step="1" type="number" value={quantityValue} />}
            {listingType === 'wholesale' && <TextField error={bulkMinQtyInvalid ? (minimumOrderQuantity && bulkQuantity && minimumOrderQuantity > bulkQuantity ? 'Minimum order cannot exceed total quantity.' : 'Enter at least 1 item.') : undefined} id="listing-minimum" label="Minimum order quantity" min="1" name="bulkMinQty" onBlur={() => setTouched((current) => ({ ...current, bulkMinQty: true }))} onChange={(event) => setBulkMinQtyValue(event.target.value)} placeholder="10" required step="1" type="number" value={bulkMinQtyValue} />}
            {listingType === 'wholesale' && <TextField id="listing-weight" label="Bulk weight" name="bulkWeight" onChange={(event) => setBulkWeightValue(event.target.value)} optional placeholder="25kg" value={bulkWeightValue} />}
          </FormSection>

          <FormSection className={!editId && step !== 2 ? 'hidden' : ''} description="Use clear, consistent photos. Drag to reorder them; the first image becomes the marketplace cover." title="Media">
            <ImagePreviewInput accept={ACCEPT_IMAGES} aspect="square" existingImages={listing?.images || []} hint={editId ? 'Keep, remove, reorder, or add images up to six total.' : 'Files are not stored in local drafts and must be selected again.'} keptName="keptImages" keptTouchedName="keptImagesTouched" label="Listing images" maxFiles={6} multiple name="images" onFilesChange={setSelectedFiles} />
          </FormSection>

          {!editId && <FormSection className={step !== 3 ? 'hidden' : ''} description="Check the core details before publishing. You can go back without losing your entries." title="Review and publish"><div className="rounded-2xl bg-accent-light/50 p-5"><h3 className="font-display text-2xl font-semibold text-foose-text">{titleValue || 'Untitled listing'}</h3><p className="mt-2 text-xl font-black text-accent">{priceValue ? `GHS ${priceValue}` : 'Price missing'}</p><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="font-bold text-foose-faint">Format</dt><dd className="mt-1 font-semibold text-foose-text">{listingType}</dd></div><div><dt className="font-bold text-foose-faint">Category</dt><dd className="mt-1 font-semibold text-foose-text">{categoryValue || 'Not specified'}</dd></div><div><dt className="font-bold text-foose-faint">Images selected</dt><dd className="mt-1 font-semibold text-foose-text">{selectedFiles.length}</dd></div><div><dt className="font-bold text-foose-faint">Hashtags</dt><dd className="mt-1 font-semibold text-foose-text">{hashtags.length}</dd></div></dl></div></FormSection>}

          {error && <InlineNotice title="Listing was not saved" tone="error">{error}</InlineNotice>}

          <FormActions sticky>
            {!editId && step > 0 ? <button className="inline-flex min-h-12 items-center justify-center rounded-xl border border-foose-border bg-white px-5 text-sm font-bold text-foose-text hover:border-accent hover:text-accent" onClick={() => setStep((current) => Math.max(0, current - 1))} type="button">Back</button> : <ButtonLink to={eventId ? `/community/events/${eventId}/manage` : shopReturnPath} variant="secondary">Cancel</ButtonLink>}
            {!editId && step < 3 ? <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-black text-white shadow-md shadow-accent/15 hover:bg-accent-hover" onClick={continueListingStep} type="button">Continue <Icon name="arrow" /></button> : <>
              <button className="inline-flex min-h-12 items-center justify-center rounded-xl border border-foose-border bg-white px-5 text-sm font-black text-foose-text hover:border-accent hover:text-accent disabled:opacity-50" data-status="draft" disabled={submitting} type="submit">{submitting && submittingAction === 'draft' ? 'Saving draft…' : 'Save as draft'}</button>
              <SubmitButton loading={submitting && submittingAction === 'active'} loadingLabel="Saving listing…">{editId ? 'Save item' : 'Post item'} <Icon name="plus" /></SubmitButton>
            </>}
          </FormActions>
        </form>
      </FormPage>
    </AppShell>
  )
}
