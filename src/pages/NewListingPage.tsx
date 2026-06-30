import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AppShell, ButtonLink, EmptyState, ErrorState, Icon, ImagePreviewInput, LoadingState } from '../components'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { apiPost, apiPut } from '../lib/api'
import type { Listing } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { LISTING_BRANDS, LISTING_CATEGORIES, LISTING_COLORS, LISTING_CONDITIONS, sizePlaceholderForCategory } from '../utils/listingTaxonomy'
import { getCurrentAppPathname, navigateTo, withBasePath } from '../utils/navigation'

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
  'h-12 w-full appearance-none rounded-xl border border-foose-border bg-foose-surface bg-[linear-gradient(45deg,transparent_50%,#5e5f5c_50%),linear-gradient(135deg,#5e5f5c_50%,transparent_50%)] bg-[length:5px_5px,5px_5px] bg-[position:calc(100%-18px)_50%,calc(100%-13px)_50%] bg-no-repeat px-3 pr-10 text-sm font-semibold text-foose-text outline-none transition hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent/15'

type ListingDropdownOption = {
  label: string
  swatch?: string
  value: string
}

function ListingDropdown({
  dividerAfter,
  name,
  options,
  placeholder,
  value,
}: {
  dividerAfter?: string
  name: string
  options: ListingDropdownOption[]
  placeholder: string
  value?: string
}) {
  const [open, setOpen] = useState(false)
  const [selectedValue, setSelectedValue] = useState(value || '')
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const selectedOption = options.find((option) => option.value === selectedValue)

  useEffect(() => {
    setSelectedValue(value || '')
  }, [value])

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
    setSelectedValue(option.value)
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
          <span aria-hidden className={`text-xs text-foose-muted transition ${open ? 'rotate-180' : ''}`}>v</span>
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
  const [error, setError] = useState('')
  const [selectedListingType, setSelectedListingType] = useState<'' | 'retail' | 'wholesale'>('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedCondition, setSelectedCondition] = useState('')
  const [titleValue, setTitleValue] = useState(listing?.title || '')
  const [priceValue, setPriceValue] = useState(listing ? priceInputValue(listing.price) : '')
  const [descriptionLength, setDescriptionLength] = useState(listing?.description?.length || 0)
  const [quantityValue, setQuantityValue] = useState(listing?.quantity ? String(listing.quantity) : '')
  const [bulkMinQtyValue, setBulkMinQtyValue] = useState(listing?.bulkMinQty ? String(listing.bulkMinQty) : '')
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

  function requiredBadge(invalid: boolean) {
    return <span className={`ml-auto text-[10px] font-bold ${invalid ? 'text-foose-danger' : 'text-foose-faint'}`}>Required</span>
  }

  useEffect(() => {
    if (!listing) return
    setTitleValue(listing.title || '')
    setPriceValue(priceInputValue(listing.price))
    setDescriptionLength(listing.description?.length || 0)
    setQuantityValue(listing.quantity ? String(listing.quantity) : '')
    setBulkMinQtyValue(listing.bulkMinQty ? String(listing.bulkMinQty) : '')
  }, [listing])

  async function createListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmitListing) return
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
        navigateTo(`/community/events/${eventId}/manage`)
        return
      }

      navigateTo(requestedStatus === 'draft' ? '/manage-shop' : `/listing/${data.listing._id}`)
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
        <EmptyState
          action={<ButtonLink to="/kyc">Complete KYC</ButtonLink>}
          body="KYC approval is required before you can add listings."
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
          body="Create a DigiShop before publishing marketplace listings."
          icon="store"
          title="DigiShop required"
        />
      </AppShell>
    )
  }

  if (editId && editResource.loading) {
    return (
      <AppShell searchPlaceholder="Search marketplace...">
        <LoadingState label="Loading listing..." />
      </AppShell>
    )
  }

  if (editId && editResource.error) {
    return (
      <AppShell searchPlaceholder="Search marketplace...">
        <ErrorState message={editResource.error} retry={editResource.refetch} />
      </AppShell>
    )
  }

  return (
    <AppShell searchPlaceholder="Search marketplace...">
      <div className="dashboard-head mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base max-md:[&_h1]:text-2xl">
        <div>
          <a className="back-link mb-6 inline-flex items-center gap-2 text-sm font-semibold text-foose-muted hover:text-accent" href={withBasePath(eventId ? `/community/events/${eventId}/manage` : '/manage-shop')}>
            <Icon name="arrow" /> {eventId ? 'Back to event' : 'Back to shop'}
          </a>
          <h1>{editId ? 'Edit listing' : 'Add listing'}</h1>
          <p>{editId ? 'Update the listing details buyers see.' : 'Create a listing from your shop inventory.'}</p>
        </div>
      </div>

      <section className="form-card rounded-xl border border-foose-border bg-foose-surface p-5 shadow-sm md:p-7 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-foose-text [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-foose-border [&_input]:bg-foose-surface [&_input]:px-3 [&_input]:py-3 [&_input]:outline-none [&_input]:transition [&_input]:focus:border-accent [&_input]:focus:ring-2 [&_input]:focus:ring-accent/15 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-foose-border [&_select]:bg-foose-surface [&_select]:px-3 [&_select]:py-3 [&_select]:outline-none [&_select]:transition [&_select]:focus:border-accent [&_select]:focus:ring-2 [&_select]:focus:ring-accent/15 [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-foose-border [&_textarea]:bg-foose-surface [&_textarea]:px-3 [&_textarea]:py-3 [&_textarea]:outline-none [&_textarea]:transition [&_textarea]:focus:border-accent [&_textarea]:focus:ring-2 [&_textarea]:focus:ring-accent/15 max-lg:rounded-lg max-lg:p-4 large listing-form-card">
        <form className="space-y-6" encType="multipart/form-data" onSubmit={(event) => void createListing(event)}>
          <div className="listing-form-grid grid gap-5 lg:grid-cols-2 [&_.wide]:sm:col-span-2">
            <label className="wide">
              <span className="flex items-center gap-2">Title {requiredBadge(titleInvalid)}</span>
              <input defaultValue={listing?.title || ''} name="title" onBlur={() => setTouched((current) => ({ ...current, title: true }))} onChange={(event) => setTitleValue(event.target.value)} placeholder="Vintage bomber jacket" required />
              {titleInvalid && <span className="text-xs font-semibold text-foose-danger">Enter at least 2 characters.</span>}
            </label>
            <label className="wide">
              Description
              <textarea defaultValue={listing?.description || ''} maxLength={1200} name="description" onChange={(event) => setDescriptionLength(event.target.value.length)} placeholder="Condition, fit, measurements, and pickup notes" rows={5} />
              <span className="text-xs font-semibold text-foose-muted">{descriptionLength}/1200 characters</span>
            </label>
            <label>
              <span className="flex items-center gap-2">Listing type {requiredBadge(false)}</span>
              <select
                className={listingSelectControl}
                name="type"
                onChange={(event) => setSelectedListingType(event.target.value as 'retail' | 'wholesale')}
                required
                value={listingType}
              >
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
              </select>
              <span className="muted-copy text-sm leading-6 text-foose-muted md:text-base">
                {listingType === 'retail'
                  ? 'Retail listings are single items. Upload a separate listing for each extra piece.'
                  : 'Wholesale listings use bulk quantities and minimum order quantities.'}
              </span>
            </label>
            <label>
              <span className="flex items-center gap-2">{listingType === 'wholesale' ? 'Unit price (GHS)' : 'Price (GHS)'} {requiredBadge(priceInvalid)}</span>
              <input defaultValue={priceInputValue(listing?.price)} inputMode="decimal" name="price" onBlur={() => setTouched((current) => ({ ...current, price: true }))} onChange={(event) => setPriceValue(event.target.value)} placeholder="240.00" required />
              <span className="muted-copy text-sm leading-6 text-foose-muted md:text-base">Use up to two decimal places. The API stores the exact pesewa amount.</span>
              {priceInvalid && <span className="text-xs font-semibold text-foose-danger">Enter a valid amount, like 240.00.</span>}
            </label>
            <label>
              Category
              <select
                className={listingSelectControl}
                name="category"
                onChange={(event) => setSelectedCategory(event.target.value)}
                value={categoryValue}
              >
                <option value="">Select category</option>
                {LISTING_CATEGORIES.map((category) => (
                  <option key={category.label} value={category.label}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Brand
              <ListingDropdown dividerAfter="Unbranded" name="brand" options={brandDropdownOptions} placeholder="Select brand" value={listing?.brand || ''} />
            </label>
            {listingType === 'retail' && (
              <>
                <label>
                  Size
                  <input defaultValue={listing?.size || ''} name="size" placeholder={sizePlaceholder} />
                </label>
                <label>
                  Gender
                  <select className={listingSelectControl} defaultValue={listing?.gender || ''} name="gender">
                    <option value="">Select gender</option>
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                    <option value="unisex">Unisex</option>
                    <option value="kids">Kids</option>
                  </select>
                </label>
              </>
            )}
            <label>
              Condition
              <select className={listingSelectControl} name="condition" onChange={(event) => setSelectedCondition(event.target.value)} value={conditionValue}>
                <option value="">Select condition</option>
                {LISTING_CONDITIONS.map((condition) => (
                  <option key={condition} value={condition}>
                    {condition[0].toUpperCase() + condition.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            {needsFlawProof && (
              <label className="wide rounded-xl border border-amber-200 bg-amber-50 p-4">
                Flaw note for escrow review
                <textarea name="flawNote" placeholder="Example: Small stain on left sleeve, shown in photo 2." rows={3} />
                <span className="text-sm font-normal leading-6 text-amber-800">
                  Fair or poor items need at least one image showing the flaw. This note is added to the listing description.
                </span>
              </label>
            )}
            <label>
              Color
              <ListingDropdown name="color" options={colorDropdownOptions} placeholder="Select color" value={listing?.color || 'multi'} />
            </label>
            {listingType === 'wholesale' && (
              <>
                <label>
                  <span className="flex items-center gap-2">Total available quantity {requiredBadge(quantityInvalid)}</span>
                  <input defaultValue={listing?.quantity || ''} min="1" name="quantity" onBlur={() => setTouched((current) => ({ ...current, quantity: true }))} onChange={(event) => setQuantityValue(event.target.value)} placeholder="100" required step="1" type="number" />
                  {quantityInvalid && <span className="text-xs font-semibold text-foose-danger">Enter at least 1 item.</span>}
                </label>
                <label>
                  <span className="flex items-center gap-2">Minimum order quantity {requiredBadge(bulkMinQtyInvalid)}</span>
                  <input defaultValue={listing?.bulkMinQty || ''} min="1" name="bulkMinQty" onBlur={() => setTouched((current) => ({ ...current, bulkMinQty: true }))} onChange={(event) => setBulkMinQtyValue(event.target.value)} placeholder="10" required step="1" type="number" />
                  {bulkMinQtyInvalid && (!minimumOrderQuantity || minimumOrderQuantity < 1) && <span className="text-xs font-semibold text-foose-danger">Enter at least 1 item.</span>}
                  {bulkMinQtyInvalid && bulkQuantity && minimumOrderQuantity && minimumOrderQuantity > bulkQuantity && <span className="text-xs font-semibold text-foose-danger">Minimum order cannot exceed total quantity.</span>}
                </label>
                <label>
                  Bulk weight (optional)
                  <input defaultValue={listing?.bulkWeight || ''} name="bulkWeight" placeholder="25kg" />
                </label>
              </>
            )}
            <label className="wide">
              Listing images
              <ImagePreviewInput
                accept={ACCEPT_IMAGES}
                existingImages={listing?.images || []}
                keptName="keptImages"
                keptTouchedName="keptImagesTouched"
                maxFiles={6}
                multiple
                name="images"
              />
              <span className="muted-copy text-sm leading-6 text-foose-muted md:text-base">
                {editId ? 'Add or remove images one at a time, up to six total.' : 'Upload up to six JPEG, PNG, or WebP files. You can add them one at a time.'}
              </span>
            </label>
          </div>

          {error && <ErrorState message={error} />}

          <div className="form-actions flex flex-wrap items-center gap-3">
            <ButtonLink to={eventId ? `/community/events/${eventId}/manage` : '/manage-shop'} variant="secondary">
              Cancel
            </ButtonLink>
            <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" data-status="draft" disabled={submitting || !canSubmitListing} type="submit">
              {submitting && submittingAction === 'draft' ? 'Saving draft...' : 'Save as draft'}
            </button>
            <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:border-foose-border disabled:bg-foose-surface-mid disabled:text-foose-faint disabled:shadow-none [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover" disabled={submitting || !canSubmitListing} type="submit">
              {submitting && submittingAction === 'active' ? 'Saving...' : editId ? 'Save item' : 'Post item'} <Icon name="plus" />
            </button>
          </div>
        </form>
      </section>
    </AppShell>
  )
}
