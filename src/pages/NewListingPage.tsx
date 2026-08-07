import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { BsFillSendPlusFill } from 'react-icons/bs'
import { FaAngleRight } from 'react-icons/fa'
import { AppShell, ButtonLink, HashtagInput, Icon, ImagePreviewInput, InlineNotice, LightboxImage, SelectControl, StatePanel, StepIndicator } from '../components'
import { clearDraftImages, loadDraftImages, saveDraftImages } from '../components/forms/draftImageStore'
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
import {
  LISTING_BALE_GRADES,
  LISTING_BRANDS,
  LISTING_CATEGORIES,
  LISTING_COLORS,
  LISTING_CONDITIONS,
  LISTING_FITS,
  LISTING_FOOTWEAR_SIZES,
  LISTING_MATERIALS,
  LISTING_PATTERNS,
  categoryUsesField,
  normalizeCategorySelection,
  optionLabel,
  pruneListingAttributes,
  sizeLabelForCategory,
  sizePlaceholderForCategory,
  type ListingAttributes,
} from '../utils/listingTaxonomy'
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

function taxonomyOptions(options: readonly string[]) {
  return options.map((value) => <option key={value} value={value}>{optionLabel(value)}</option>)
}

const ACCEPT_IMAGES = 'image/jpeg,image/png,image/webp'
const LISTING_DESCRIPTION_MAX = 500
const listingSelectControl = 'w-full'

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
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | undefined>(undefined)
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
  const [attributeValues, setAttributeValues] = useState<ListingAttributes>(listing?.attributes || {})
  const [flawNoteValue, setFlawNoteValue] = useState('')
  const [hashtags, setHashtags] = useState<string[]>(listing?.hashtags || [])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedPreviews, setSelectedPreviews] = useState<{ file: File; url: string }[]>([])
  const selectedPreviewsRef = useRef(selectedPreviews)
  const [step, setStep] = useState(0)
  const [validationAttempt, setValidationAttempt] = useState(0)
  const restoredRef = useRef(false)
  const [touched, setTouched] = useState({ bulkMinQty: false, price: false, quantity: false, title: false })
  const [submitting, setSubmitting] = useState(false)
  const [submittingAction, setSubmittingAction] = useState<'active' | 'draft' | ''>('')
  const listingType = selectedListingType || listing?.type || 'retail'
  const storedSelection = normalizeCategorySelection(listing?.category, listing?.subcategory)
  const categoryValue = selectedCategory ?? storedSelection.category
  const subcategoryValue = selectedSubcategory ?? storedSelection.subcategory
  const conditionValue = selectedCondition || listing?.condition || ''
  const brandOptions = listing?.brand && !LISTING_BRANDS.includes(listing.brand) ? [...LISTING_BRANDS, listing.brand].sort((a, b) => a.localeCompare(b)) : LISTING_BRANDS
  const brandedOptions = brandOptions.filter((brand) => brand !== 'Unbranded').sort((a, b) => a.localeCompare(b))
  const footwearSizeOptions = sizeValue && !LISTING_FOOTWEAR_SIZES.includes(sizeValue)
    ? [...LISTING_FOOTWEAR_SIZES, sizeValue]
    : LISTING_FOOTWEAR_SIZES
  const availableSubcategories = LISTING_CATEGORIES.find((entry) => entry.label === categoryValue)?.subcategories || []
  const needsFlawProof = conditionValue === 'fair' || conditionValue === 'poor'
  const sizePlaceholder = sizePlaceholderForCategory(categoryValue, subcategoryValue)
  const showsField = (field: Parameters<typeof categoryUsesField>[1]) =>
    categoryUsesField(categoryValue, field, subcategoryValue, listingType)
  const priceNumber = parseGhsToPesewas(priceValue)
  const bulkQuantity = optionalNumber(quantityValue)
  const minimumOrderQuantity = optionalNumber(bulkMinQtyValue)
  const wholesaleValid =
    listingType !== 'wholesale' ||
    Boolean(bulkQuantity && minimumOrderQuantity && bulkQuantity >= 1 && minimumOrderQuantity >= 1 && minimumOrderQuantity <= bulkQuantity)
  const categoryMissing = !categoryValue
  const sizeMissing = showsField('size') && !sizeValue.trim()
  const genderMissing = showsField('gender') && !genderValue
  const conditionMissing = !conditionValue
  const attributesValid = !categoryMissing && !sizeMissing && !genderMissing && !conditionMissing
  const canSubmitListing = titleValue.trim().length >= 2 && priceNumber !== null && priceNumber >= 0 && wholesaleValid && attributesValid
  const titleInvalid = touched.title && titleValue.trim().length < 2
  const priceInvalid = touched.price && (priceNumber === null || priceNumber < 0)
  const quantityInvalid = touched.quantity && listingType === 'wholesale' && (!bulkQuantity || bulkQuantity < 1)
  const bulkMinQtyInvalid =
    touched.bulkMinQty &&
    listingType === 'wholesale' &&
    (!minimumOrderQuantity || minimumOrderQuantity < 1 || Boolean(bulkQuantity && minimumOrderQuantity > bulkQuantity))
  const categoryInvalid = validationAttempt > 0 && categoryMissing
  const sizeInvalid = validationAttempt > 0 && sizeMissing
  const genderInvalid = validationAttempt > 0 && genderMissing
  const conditionInvalid = validationAttempt > 0 && conditionMissing
  const validationErrors = [
    ...(titleValue.trim().length < 2 ? [{ fieldId: 'listing-title', message: 'Enter a listing title with at least 2 characters.' }] : []),
    ...(priceNumber === null || priceNumber < 0 ? [{ fieldId: 'listing-price', message: 'Enter a valid price with up to two decimal places.' }] : []),
    ...(categoryMissing ? [{ fieldId: 'listing-category', message: 'Choose a category.' }] : []),
    ...(sizeMissing ? [{ fieldId: 'listing-size', message: 'Enter a size.' }] : []),
    ...(genderMissing ? [{ fieldId: 'listing-gender', message: 'Choose a gender.' }] : []),
    ...(conditionMissing ? [{ fieldId: 'listing-condition', message: 'Choose a condition.' }] : []),
    ...(quantityInvalid ? [{ fieldId: 'listing-quantity', message: 'Enter the total available quantity.' }] : []),
    ...(bulkMinQtyInvalid ? [{ fieldId: 'listing-minimum', message: minimumOrderQuantity && bulkQuantity && minimumOrderQuantity > bulkQuantity ? 'Minimum order cannot exceed total quantity.' : 'Enter the minimum order quantity.' }] : []),
  ]
  const draftValue = useMemo(() => ({
    brand: brandValue,
    bulkMinQty: bulkMinQtyValue,
    bulkWeight: bulkWeightValue,
    attributes: attributeValues,
    category: categoryValue,
    subcategory: subcategoryValue,
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
  }), [attributeValues, brandValue, bulkMinQtyValue, bulkWeightValue, categoryValue, colorValue, conditionValue, descriptionValue, flawNoteValue, genderValue, hashtags, listingType, priceValue, quantityValue, sizeValue, subcategoryValue, titleValue])
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
      if (typeof saved.subcategory === 'string') setSelectedSubcategory(saved.subcategory)
      if (typeof saved.brand === 'string') setBrandValue(saved.brand)
      if (typeof saved.condition === 'string') setSelectedCondition(saved.condition)
      if (typeof saved.color === 'string') setColorValue(saved.color)
      if (typeof saved.size === 'string') setSizeValue(saved.size)
      if (typeof saved.gender === 'string') setGenderValue(saved.gender)
      if (typeof saved.quantity === 'string') setQuantityValue(saved.quantity)
      if (typeof saved.bulkMinQty === 'string') setBulkMinQtyValue(saved.bulkMinQty)
      if (typeof saved.bulkWeight === 'string') setBulkWeightValue(saved.bulkWeight)
      if (saved.attributes && typeof saved.attributes === 'object' && !Array.isArray(saved.attributes)) setAttributeValues(saved.attributes as ListingAttributes)
      if (typeof saved.flawNote === 'string') setFlawNoteValue(saved.flawNote)
      if (Array.isArray(saved.hashtags)) setHashtags(saved.hashtags.filter((tag): tag is string => typeof tag === 'string'))
    },
    resourceId: editId || 'new',
    userId: user?._id,
    value: draftValue,
  })
  const dirty = listing
    ? titleValue !== (listing.title || '') || descriptionValue !== (listing.description || '') || priceValue !== priceInputValue(listing.price) || categoryValue !== storedSelection.category || subcategoryValue !== storedSelection.subcategory || JSON.stringify(attributeValues) !== JSON.stringify(listing.attributes || {}) || selectedFiles.length > 0
    : Boolean(titleValue || descriptionValue || priceValue || selectedCategory || brandValue || selectedCondition || hashtags.length || selectedFiles.length || selectedListingType)

  useEffect(() => {
    selectedPreviewsRef.current = selectedPreviews
  }, [selectedPreviews])

  useEffect(() => () => {
    selectedPreviewsRef.current.forEach((item) => URL.revokeObjectURL(item.url))
  }, [])

  function handleSelectedFilesChange(files: File[]) {
    const previousByFile = new Map(selectedPreviews.map((item) => [item.file, item.url]))
    const nextPreviews = files.map((file) => {
      const existingUrl = previousByFile.get(file)
      if (existingUrl) {
        previousByFile.delete(file)
        return { file, url: existingUrl }
      }
      return { file, url: URL.createObjectURL(file) }
    })
    previousByFile.forEach((url) => URL.revokeObjectURL(url))
    setSelectedPreviews(nextPreviews)
    setSelectedFiles(files)
    void saveDraftImages(draft.storageKey, files)
  }

  function handleResumeDraft() {
    draft.resumeDraft()
    void loadDraftImages(draft.storageKey).then((files) => {
      if (files.length) handleSelectedFilesChange(files)
    })
  }

  function handleDiscardDraft() {
    draft.discardDraft()
    void clearDraftImages(draft.storageKey)
  }

  useEffect(() => {
    if (!listing || restoredRef.current) return
    setTitleValue(listing.title || '')
    setPriceValue(priceInputValue(listing.price))
    setDescriptionValue(listing.description || '')
    setQuantityValue(listing.quantity ? String(listing.quantity) : '')
    setBulkMinQtyValue(listing.bulkMinQty ? String(listing.bulkMinQty) : '')
    const normalizedListingCategory = normalizeCategorySelection(listing.category, listing.subcategory)
    setSelectedCategory(normalizedListingCategory.category)
    setSelectedSubcategory(normalizedListingCategory.subcategory)
    setBrandValue(listing.brand || '')
    setColorValue(listing.color || 'multi')
    setSizeValue(listing.size || '')
    setGenderValue(listing.gender || '')
    setBulkWeightValue(listing.bulkWeight || '')
    setAttributeValues(listing.attributes || {})
    setHashtags(listing.hashtags || [])
  }, [listing])

  function changeCategorySelection(category: string, subcategory: string) {
    setSelectedCategory(category)
    setSelectedSubcategory(subcategory)
    setAttributeValues((current) => pruneListingAttributes(category, current, subcategory, listingType))
    if (!categoryUsesField(category, 'brand', subcategory, listingType)) setBrandValue('')
    if (!categoryUsesField(category, 'size', subcategory, listingType)) setSizeValue('')
    if (!categoryUsesField(category, 'gender', subcategory, listingType)) setGenderValue('')
  }

  function changeListingType(type: 'retail' | 'wholesale') {
    setSelectedListingType(type)
    setAttributeValues((current) => pruneListingAttributes(categoryValue, current, subcategoryValue, type))
  }

  function changeAttribute(name: keyof ListingAttributes, value: string) {
    setAttributeValues((current) => ({ ...current, [name]: value || undefined }))
  }

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
    setStep((current) => Math.min(2, current + 1))
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
    const submittedDescription = readFormText(sourceData, 'description')
    const completeDescription = needsFlawProof ? `${submittedDescription}\n\nFlaws: ${flawNote}`.trim() : submittedDescription
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

    if (completeDescription.length > LISTING_DESCRIPTION_MAX) {
      setError(`Keep the complete listing description within ${LISTING_DESCRIPTION_MAX} characters.`)
      setStep(needsFlawProof ? 1 : 0)
      return
    }

    appendText(uploadData, 'currency', 'GHS')
    appendText(uploadData, 'price', price)
    appendText(uploadData, 'status', requestedStatus)
    appendText(uploadData, 'title', readFormText(sourceData, 'title'))
    appendText(uploadData, 'type', listingType)
    appendText(uploadData, 'visibility', eventId && !editId ? 'event' : undefined)
    sourceData.getAll('keptImages').forEach((image) => appendText(uploadData, 'keptImages', String(image)))
    if (sourceData.has('keptImagesTouched')) appendText(uploadData, 'keptImagesTouched', '1')

    appendText(uploadData, 'description', completeDescription)
    uploadData.append('hashtags', readFormText(sourceData, 'hashtags'))
    ;['category', 'subcategory', 'condition', 'color'].forEach((field) => {
      appendText(uploadData, field, readFormText(sourceData, field))
    })
    if (showsField('brand')) appendText(uploadData, 'brand', readFormText(sourceData, 'brand'))
    if (showsField('size')) appendText(uploadData, 'size', readFormText(sourceData, 'size'))
    if (showsField('gender')) appendText(uploadData, 'gender', readFormText(sourceData, 'gender'))
    appendText(uploadData, 'attributes', JSON.stringify(pruneListingAttributes(categoryValue, attributeValues, subcategoryValue, listingType)))

    if (listingType === 'retail') {
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
        void clearDraftImages(draft.storageKey)
        navigateWithFlash(`/community/events/${eventId}/manage`, { message: 'The listing is live and attached to this pop-up.', title: 'Listing published', tone: 'success' })
        return
      }

      draft.clearDraft()
      void clearDraftImages(draft.storageKey)
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
        <StatePanel action={<button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={() => void editResource.refetch()} type="button">Retry</button>} body={editResource.error} layout="page" title="Listing unavailable" tone="unavailable" />
      </AppShell>
    )
  }

  return (
    <AppShell searchPlaceholder="Search marketplace...">
      <FormPage
        aside={(
          <div className="rounded-2xl border border-foose-border bg-foose-surface p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-accent">Listing preview</p>
            <h2 className="mt-3 font-display text-2xl font-semibold text-foose-text">{titleValue || 'Your listing title'}</h2>
            <p className="mt-2 text-xl font-black text-accent">{priceValue ? `GHS ${priceValue}` : 'Add a price'}</p>
            <p className="mt-3 line-clamp-4 text-sm leading-6 text-foose-muted">{descriptionValue || 'Your description will appear here as you build the listing.'}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-foose-muted"><span className="rounded-full bg-accent-light px-3 py-1.5">{listingType}</span>{categoryValue && <span className="rounded-full bg-foose-surface-low px-3 py-1.5">{categoryValue}</span>}{subcategoryValue && <span className="rounded-full bg-foose-surface-low px-3 py-1.5">{subcategoryValue}</span>}</div>
          </div>
        )}
        description={editId ? 'Update the listing details buyers see. All sections stay available on this page.' : 'Build a clear, trustworthy marketplace listing in three short steps.'}
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
            steps={['Details & media', 'Pricing', 'Review']}
          />
        )}

        <form className="space-y-5" encType="multipart/form-data" noValidate onSubmit={(event) => void createListing(event)}>
          <UnsavedChangesGuard when={dirty && !submitting} />
          {draft.hasRecoverableDraft && (
            <InlineNotice action={<div className="flex gap-2"><button className="min-h-11 rounded-lg px-3 font-black text-accent hover:bg-accent-light" onClick={handleResumeDraft} type="button">Resume</button><button className="min-h-11 rounded-lg px-3 font-black text-foose-muted hover:bg-foose-surface-low" onClick={handleDiscardDraft} type="button">Discard</button></div>} title="Continue your listing draft?">{null}</InlineNotice>
          )}
          <ErrorSummary errors={validationAttempt ? validationErrors : []} focus={validationAttempt > 0} />

          <FormSection className={!editId && step !== 0 ? 'hidden' : ''} columns={2} description="Add clear photos and the essential information shoppers need to understand the item." title="Details and media">
            <div className="form-field-wide">
              <ImagePreviewInput accept={ACCEPT_IMAGES} aspect="square" existingImages={listing?.images || []} hint={editId ? 'Images stay in the order added. You can keep, remove, or add up to six.' : 'Images stay in the order added. Save as draft to store selected images securely.'} keptName="keptImages" keptTouchedName="keptImagesTouched" label="Listing images" maxFiles={6} multiple name="images" onFilesChange={handleSelectedFilesChange} presentation="strip" />
            </div>
            <TextField error={titleInvalid ? 'Enter at least 2 characters.' : undefined} id="listing-title" label="Title" name="title" onBlur={() => setTouched((current) => ({ ...current, title: true }))} onChange={(event) => setTitleValue(event.target.value)} placeholder="Vintage bomber jacket" required value={titleValue} wrapperClassName="form-field-wide" />
            <TextAreaField id="listing-description" label="Description" maxLength={LISTING_DESCRIPTION_MAX} name="description" onChange={(event) => setDescriptionValue(event.target.value)} optional placeholder="Condition, fit, measurements, and pickup notes" rows={5} value={descriptionValue} wrapperClassName="form-field-wide" />
            <div className="form-field-wide"><HashtagInput initialTags={hashtags} label="Vibe hashtags" name="hashtags" onChange={setHashtags} /></div>
            <FormField hint={listingType === 'retail' ? 'Retail listings are single items.' : 'Wholesale listings use bulk quantities and minimum order quantities.'} htmlFor="listing-type" label="Listing type" required>
              <SelectControl className={listingSelectControl} id="listing-type" name="type" onChange={(event) => changeListingType(event.target.value as 'retail' | 'wholesale')} required value={listingType}><option value="retail">Retail</option><option value="wholesale">Wholesale</option></SelectControl>
            </FormField>
          </FormSection>

          <FormSection className={!editId && step !== 1 ? 'hidden' : ''} columns={2} description="Set the price and attributes buyers use to compare and filter products." title="Pricing and attributes">
            <TextField error={priceInvalid ? 'Enter a valid amount, like 240.00.' : undefined} hint="Use up to two decimal places." id="listing-price" inputMode="decimal" label={listingType === 'wholesale' ? 'Unit price (GHS)' : 'Price (GHS)'} name="price" onBlur={() => setTouched((current) => ({ ...current, price: true }))} onChange={(event) => setPriceValue(event.target.value)} placeholder="240.00" prefix="GHS" required value={priceValue} />
            <FormField error={categoryInvalid ? 'Choose a category.' : undefined} htmlFor="listing-category" label="Category" required>
              <SelectControl className={listingSelectControl} id="listing-category" name="category" onChange={(event) => changeCategorySelection(event.target.value, '')} required value={categoryValue}>
                <option value="">Select category</option>
                {LISTING_CATEGORIES.map((entry) => <option key={entry.label} value={entry.label}>{entry.label}</option>)}
              </SelectControl>
            </FormField>
            {availableSubcategories.length > 0 && (
              <FormField htmlFor="listing-subcategory" label="Subcategory" optional>
                <SelectControl className={listingSelectControl} id="listing-subcategory" name="subcategory" onChange={(event) => changeCategorySelection(categoryValue, event.target.value)} value={subcategoryValue}>
                  <option value="">All {categoryValue}</option>
                  {availableSubcategories.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
                </SelectControl>
              </FormField>
            )}
            {showsField('size') && categoryValue === 'Footwear' && (
              <FormField error={sizeInvalid ? 'Select a size.' : undefined} htmlFor="listing-size" label={sizeLabelForCategory(categoryValue, subcategoryValue)} required>
                <SelectControl className={listingSelectControl} id="listing-size" name="size" onChange={(event) => setSizeValue(event.target.value)} required value={sizeValue}>
                  <option value="">Select EU size</option>
                  {footwearSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
                </SelectControl>
              </FormField>
            )}
            {showsField('size') && categoryValue !== 'Footwear' && <TextField error={sizeInvalid ? 'Enter a size.' : undefined} id="listing-size" label={sizeLabelForCategory(categoryValue, subcategoryValue)} name="size" onChange={(event) => setSizeValue(event.target.value)} placeholder={sizePlaceholder} required value={sizeValue} />}
            {showsField('gender') && <FormField error={genderInvalid ? 'Choose a gender.' : undefined} htmlFor="listing-gender" label="Gender" required><SelectControl className={listingSelectControl} id="listing-gender" name="gender" onChange={(event) => setGenderValue(event.target.value)} required value={genderValue}><option value="">Select gender</option><option value="men">Men</option><option value="women">Women</option><option value="unisex">Unisex</option><option value="kids">Kids</option></SelectControl></FormField>}
            <FormField error={conditionInvalid ? 'Choose a condition.' : undefined} htmlFor="listing-condition" label="Condition" required><SelectControl className={listingSelectControl} id="listing-condition" name="condition" onChange={(event) => setSelectedCondition(event.target.value)} required value={conditionValue}><option value="">Select condition</option>{LISTING_CONDITIONS.map((condition) => <option key={condition} value={condition}>{condition[0].toUpperCase() + condition.slice(1)}</option>)}</SelectControl></FormField>
            {showsField('brand') && (
              <FormField htmlFor="listing-brand" label="Brand" optional>
                <SelectControl className={listingSelectControl} id="listing-brand" name="brand" onChange={(event) => setBrandValue(event.target.value)} value={brandValue}>
                  <option value="">Select brand</option>
                  <option value="Unbranded">Unbranded</option>
                  {brandedOptions.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                </SelectControl>
              </FormField>
            )}
            {showsField('material') && <FormField htmlFor="listing-material" label="Material" optional><SelectControl className={listingSelectControl} id="listing-material" onChange={(event) => changeAttribute('material', event.target.value)} value={attributeValues.material || ''}><option value="">Select material</option>{taxonomyOptions(LISTING_MATERIALS)}</SelectControl></FormField>}
            {showsField('fit') && <FormField htmlFor="listing-fit" label="Fit" optional><SelectControl className={listingSelectControl} id="listing-fit" onChange={(event) => changeAttribute('fit', event.target.value)} value={attributeValues.fit || ''}><option value="">Select fit</option>{taxonomyOptions(LISTING_FITS)}</SelectControl></FormField>}
            {showsField('pattern') && <FormField htmlFor="listing-pattern" label="Pattern" optional><SelectControl className={listingSelectControl} id="listing-pattern" onChange={(event) => changeAttribute('pattern', event.target.value)} value={attributeValues.pattern || ''}><option value="">Select pattern</option>{taxonomyOptions(LISTING_PATTERNS)}</SelectControl></FormField>}
            {showsField('baleGrade') && <FormField htmlFor="listing-bale-grade" label="Bale grade" optional><SelectControl className={listingSelectControl} id="listing-bale-grade" onChange={(event) => changeAttribute('baleGrade', event.target.value)} value={attributeValues.baleGrade || ''}><option value="">Select grade</option>{taxonomyOptions(LISTING_BALE_GRADES)}</SelectControl></FormField>}
            <FormField htmlFor="listing-color" label="Color" optional>
              <SelectControl className={listingSelectControl} id="listing-color" name="color" onChange={(event) => setColorValue(event.target.value)} value={colorValue}>
                {LISTING_COLORS.map((color) => <option data-swatch={color.hex} key={color.value} value={color.value}>{color.label}</option>)}
              </SelectControl>
            </FormField>
            {needsFlawProof && <TextAreaField className="border-foose-warning/30 bg-foose-warning-bg" hint="Fair or poor items need an image showing the flaw. This note is appended to the description." id="listing-flaw" label="Flaw note for escrow review" name="flawNote" onChange={(event) => setFlawNoteValue(event.target.value)} placeholder="Small stain on the left sleeve, shown in photo 2." required rows={3} value={flawNoteValue} wrapperClassName="form-field-wide rounded-xl bg-foose-warning-bg p-4" />}
            {listingType === 'wholesale' && <TextField error={quantityInvalid ? 'Enter at least 1 item.' : undefined} id="listing-quantity" label="Total available quantity" min="1" name="quantity" onBlur={() => setTouched((current) => ({ ...current, quantity: true }))} onChange={(event) => setQuantityValue(event.target.value)} placeholder="100" required step="1" type="number" value={quantityValue} />}
            {listingType === 'wholesale' && <TextField error={bulkMinQtyInvalid ? (minimumOrderQuantity && bulkQuantity && minimumOrderQuantity > bulkQuantity ? 'Minimum order cannot exceed total quantity.' : 'Enter at least 1 item.') : undefined} id="listing-minimum" label="Minimum order quantity" min="1" name="bulkMinQty" onBlur={() => setTouched((current) => ({ ...current, bulkMinQty: true }))} onChange={(event) => setBulkMinQtyValue(event.target.value)} placeholder="10" required step="1" type="number" value={bulkMinQtyValue} />}
            {listingType === 'wholesale' && <TextField id="listing-weight" label="Bulk weight" name="bulkWeight" onChange={(event) => setBulkWeightValue(event.target.value)} optional placeholder="25kg" value={bulkWeightValue} />}
          </FormSection>

          {!editId && <FormSection className={step !== 2 ? 'hidden' : ''} description="Check the core details before publishing. You can go back without losing your entries." title="Review and publish"><div className="rounded-2xl bg-accent-light/50 p-5"><h3 className="font-display text-2xl font-semibold text-foose-text">{titleValue || 'Untitled listing'}</h3><p className="mt-2 text-xl font-black text-accent">{priceValue ? `GHS ${priceValue}` : 'Price missing'}</p><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="font-bold text-foose-faint">Format</dt><dd className="mt-1 font-semibold capitalize text-foose-text">{listingType}</dd></div><div><dt className="font-bold text-foose-faint">Category</dt><dd className="mt-1 flex items-center gap-1 font-semibold text-foose-text">{categoryValue || 'Not specified'}{subcategoryValue && <><FaAngleRight aria-hidden className="shrink-0 text-foose-faint" size={12} />{subcategoryValue}</>}</dd></div>{Object.entries(pruneListingAttributes(categoryValue, attributeValues, subcategoryValue, listingType)).map(([name, value]) => <div key={name}><dt className="font-bold text-foose-faint">{optionLabel(name)}</dt><dd className="mt-1 font-semibold text-foose-text">{optionLabel(String(value))}</dd></div>)}<div className="sm:col-span-2"><dt className="font-bold text-foose-faint">Images selected</dt><dd className="mt-1">{selectedPreviews.length ? <div className="flex flex-wrap gap-2">{selectedPreviews.map((item, index) => <div className="size-16 shrink-0 overflow-hidden rounded-lg border border-foose-border bg-foose-surface-mid sm:size-20 [&_img]:h-full [&_img]:w-full [&_img]:object-cover" key={item.url}><LightboxImage alt={`Listing photo ${index + 1}`} index={index} items={selectedPreviews.map((preview, previewIndex) => ({ alt: `Listing photo ${previewIndex + 1}`, src: preview.url }))} src={item.url} /></div>)}</div> : <span className="font-semibold text-foose-text">No images selected</span>}</dd></div><div className="sm:col-span-2"><dt className="font-bold text-foose-faint">Hashtags</dt><dd className="mt-1">{hashtags.length ? <div className="flex flex-wrap gap-2">{hashtags.map((tag) => <span className="rounded-full bg-accent-light px-3 py-1.5 text-xs font-bold text-accent" key={tag}>#{tag}</span>)}</div> : <span className="font-semibold text-foose-text">No hashtags added</span>}</dd></div></dl></div></FormSection>}

          {error && <InlineNotice title="Listing was not saved" tone="error">{error}</InlineNotice>}

          <FormActions sticky>
            {!editId && step > 0 ? <button className="inline-flex min-h-12 items-center justify-center rounded-xl border border-foose-border bg-foose-surface px-5 text-sm font-bold text-foose-text hover:border-accent hover:text-accent" onClick={() => setStep((current) => Math.max(0, current - 1))} type="button">Back</button> : <ButtonLink to={eventId ? `/community/events/${eventId}/manage` : shopReturnPath} variant="secondary">Cancel</ButtonLink>}
            {!editId && step < 2 ? <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-black text-white shadow-md shadow-accent/15 hover:bg-accent-hover" onClick={continueListingStep} type="button">Continue <Icon name="arrow" /></button> : <>
              <button className="inline-flex min-h-12 items-center justify-center rounded-xl border border-foose-border bg-foose-surface px-5 text-sm font-black text-foose-text hover:border-accent hover:text-accent disabled:opacity-50" data-status="draft" disabled={submitting} type="submit">{submitting && submittingAction === 'draft' ? 'Saving draft…' : 'Save as draft'}</button>
              <SubmitButton loading={submitting && submittingAction === 'active'} loadingLabel="Saving listing…"><span className="flex flex-row items-center gap-2">{editId ? 'Save item' : 'Post'} <BsFillSendPlusFill /></span></SubmitButton>
            </>}
          </FormActions>
        </form>
      </FormPage>
    </AppShell>
  )
}
