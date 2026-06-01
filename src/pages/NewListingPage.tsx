import { useState, type FormEvent } from 'react'
import { AppShell, ButtonLink, EmptyState, ErrorState, Icon, ImagePreviewInput, LoadingState } from '../components'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { apiPost, apiPut } from '../lib/api'
import type { Listing } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { LISTING_BRANDS, LISTING_CATEGORIES, LISTING_CONDITIONS, sizePlaceholderForCategory } from '../utils/listingTaxonomy'
import { navigateTo } from '../utils/navigation'

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
  const match = window.location.pathname.match(/^\/listings\/([^/]+)\/edit/)
  return match ? decodeURIComponent(match[1]).trim() : ''
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
      <div className="dashboard-head">
        <div>
          <a className="back-link" href="/manage-shop">
            <Icon name="arrow" /> Back to shop
          </a>
          <h1>{editId ? 'Edit listing' : 'Add listing'}</h1>
          <p>{editId ? 'Update the listing details buyers see.' : 'Create a listing from your shop inventory.'}</p>
        </div>
      </div>

      <section className="form-card large listing-form-card">
        <form encType="multipart/form-data" onSubmit={(event) => void createListing(event)}>
          <div className="listing-form-grid">
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
              <span className="muted-copy">
                {listingType === 'retail'
                  ? 'Retail listings are single items. Upload a separate listing for each extra piece.'
                  : 'Wholesale listings use bulk quantities and minimum order quantities.'}
              </span>
            </label>
            <label>
              {listingType === 'wholesale' ? 'Unit price (GHS)' : 'Price (GHS)'}
              <input defaultValue={priceInputValue(listing?.price)} inputMode="decimal" name="price" placeholder="240.00" required />
              <span className="muted-copy">Use up to two decimal places. The API stores the exact pesewa amount.</span>
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
              <span className="muted-copy">
                {editId ? 'Add or remove images one at a time, up to six total.' : 'Upload up to six JPEG, PNG, or WebP files. You can add them one at a time.'}
              </span>
            </label>
          </div>

          {error && <ErrorState message={error} />}

          <div className="form-actions">
            <ButtonLink to="/manage-shop" variant="secondary">
              Cancel
            </ButtonLink>
            <button className="button button-secondary" data-status="draft" disabled={submitting} type="submit">
              {submitting && submittingAction === 'draft' ? 'Saving draft...' : 'Save as draft'}
            </button>
            <button className="button button-primary" disabled={submitting} type="submit">
              {submitting && submittingAction === 'active' ? 'Saving...' : editId ? 'Save item' : 'Post item'} <Icon name="plus" />
            </button>
          </div>
        </form>
      </section>
    </AppShell>
  )
}
