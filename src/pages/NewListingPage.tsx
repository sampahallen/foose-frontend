import { useState, type FormEvent } from 'react'
import { AppShell, ButtonLink, EmptyState, ErrorState, Icon, ImagePreviewInput, LoadingState } from '../components'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { apiPost, apiPut } from '../lib/api'
import type { Listing } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { LISTING_BRANDS, LISTING_CATEGORIES, LISTING_CONDITIONS, sizePlaceholderForCategory } from '../utils/listingTaxonomy'
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
  const [submitting, setSubmitting] = useState(false)
  const [submittingAction, setSubmittingAction] = useState<'active' | 'draft' | ''>('')
  const listingType = selectedListingType || listing?.type || 'retail'
  const categoryValue = selectedCategory || listing?.category || ''
  const sizePlaceholder = sizePlaceholderForCategory(categoryValue)

  async function createListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const requestedStatus = submitter?.dataset.status === 'draft' ? 'draft' : 'active'
    const sourceData = new FormData(form)
    const uploadData = new FormData()
    const price = parseGhsToPesewas(readFormText(sourceData, 'price'))
    const bulkQuantity = optionalNumber(readFormText(sourceData, 'quantity'))
    const minimumOrderQuantity = optionalNumber(readFormText(sourceData, 'bulkMinQty'))

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

    appendText(uploadData, 'currency', 'GHS')
    appendText(uploadData, 'price', price)
    appendText(uploadData, 'status', requestedStatus)
    appendText(uploadData, 'title', readFormText(sourceData, 'title'))
    appendText(uploadData, 'type', listingType)
    appendText(uploadData, 'visibility', eventId && !editId ? 'event' : undefined)
    sourceData.getAll('keptImages').forEach((image) => appendText(uploadData, 'keptImages', String(image)))
    if (sourceData.has('keptImagesTouched')) appendText(uploadData, 'keptImagesTouched', '1')

    ;['description', 'category', 'brand', 'condition'].forEach((field) => {
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

    const imageInput = form.elements.namedItem('images') as HTMLInputElement | null
    Array.from(imageInput?.files || [])
      .slice(0, 6)
      .forEach((file) => uploadData.append('images', file))

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

      <section className="form-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-foose-text [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_input]:w-full [&_input]:px-3 [&_input]:py-3 [&_select]:w-full [&_select]:px-3 [&_select]:py-3 [&_textarea]:w-full [&_textarea]:px-3 [&_textarea]:py-3 max-lg:rounded-lg max-lg:p-3 large listing-form-card">
        <form encType="multipart/form-data" onSubmit={(event) => void createListing(event)}>
          <div className="listing-form-grid grid gap-6 [&_.wide]:sm:col-span-2 gap-5 lg:grid-cols-2">
            <label className="wide">
              Title
              <input defaultValue={listing?.title || ''} name="title" placeholder="Vintage bomber jacket" required />
            </label>
            <label className="wide">
              Description
              <textarea defaultValue={listing?.description || ''} name="description" placeholder="Condition, fit, measurements, and pickup notes" rows={5} />
            </label>
            <label>
              Listing type
              <select
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
              {listingType === 'wholesale' ? 'Unit price (GHS)' : 'Price (GHS)'}
              <input defaultValue={priceInputValue(listing?.price)} inputMode="decimal" name="price" placeholder="240.00" required />
              <span className="muted-copy text-sm leading-6 text-foose-muted md:text-base">Use up to two decimal places. The API stores the exact pesewa amount.</span>
            </label>
            <label>
              Category
              <select
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
              <input defaultValue={listing?.brand || ''} list="listing-brands" name="brand" placeholder="Unbranded, Nike, Adidas..." />
              <datalist id="listing-brands">
                {LISTING_BRANDS.map((brand) => (
                  <option key={brand} value={brand} />
                ))}
              </datalist>
            </label>
            {listingType === 'retail' && (
              <>
                <label>
                  Size
                  <input defaultValue={listing?.size || ''} name="size" placeholder={sizePlaceholder} />
                </label>
                <label>
                  Gender
                  <select defaultValue={listing?.gender || ''} name="gender">
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
              <select defaultValue={listing?.condition || ''} name="condition">
                <option value="">Select condition</option>
                {LISTING_CONDITIONS.map((condition) => (
                  <option key={condition} value={condition}>
                    {condition === 'new' ? 'New' : 'Used'}
                  </option>
                ))}
              </select>
            </label>
            {listingType === 'wholesale' && (
              <>
                <label>
                  Total available quantity
                  <input defaultValue={listing?.quantity || ''} min="1" name="quantity" placeholder="100" required step="1" type="number" />
                </label>
                <label>
                  Minimum order quantity
                  <input defaultValue={listing?.bulkMinQty || ''} min="1" name="bulkMinQty" placeholder="10" required step="1" type="number" />
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
            <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" data-status="draft" disabled={submitting} type="submit">
              {submitting && submittingAction === 'draft' ? 'Saving draft...' : 'Save as draft'}
            </button>
            <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover" disabled={submitting} type="submit">
              {submitting && submittingAction === 'active' ? 'Saving...' : editId ? 'Save item' : 'Post item'} <Icon name="plus" />
            </button>
          </div>
        </form>
      </section>
    </AppShell>
  )
}
