import { useState, type FormEvent } from 'react'
import { ButtonLink, EmptyState, ErrorState, Icon, ImagePreviewInput } from '../components'
import { getAppName } from '../config/env'
import { useAuth } from '../hooks/useAuth'
import { apiPost } from '../lib/api'
import type { Shop } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
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

export function OpenShopPage() {
  const { refreshUser, user } = useAuth()
  const brand = getAppName()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function createShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const sourceData = new FormData(form)
    const formData = new FormData()
    appendText(formData, 'shopName', sourceData.get('shopName'))
    appendText(formData, 'bio', sourceData.get('bio'))
    appendText(formData, 'category', sourceData.get('category'))
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
      <div className="flow-page">
        <header className="flow-top">
          <a href="/">{brand}</a>
          <span>Set up your shop</span>
          <a href="/">Close</a>
        </header>
        <main className="flow-content narrow">
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
    <div className="flow-page">
      <header className="flow-top">
        <a href="/">{brand}</a>
        <span>Set up your shop</span>
        <a href="/">Close</a>
      </header>
      <main className="flow-content narrow">
        <section className="form-card large">
          <h1>Basic information</h1>
          <p>Create your DigiShop record, then add listings from your profile.</p>
          <form encType="multipart/form-data" onSubmit={(event) => void createShop(event)}>
            <label>
              Shop name
              <input name="shopName" placeholder="e.g. Accra Vintage Finds" required />
            </label>
            <label>
              Shop bio
              <textarea name="bio" placeholder="Tell buyers what you curate..." rows={5} />
            </label>
            <label>
              Primary category
              <select defaultValue="both" name="category">
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="both">Both</option>
              </select>
            </label>
            <fieldset className="field-section">
              <legend>Primary funds collection method</legend>
              <p className="muted-copy">Foose will use this as the default payout destination after escrow releases.</p>
              <div className="form-grid">
                <label>
                  Method
                  <select defaultValue="mobile_money" name="payoutMethodType">
                    <option value="mobile_money">Mobile money</option>
                    <option value="bank_transfer">Bank transfer</option>
                  </select>
                </label>
                <label>
                  Account name
                  <input name="payoutAccountName" placeholder="Registered account name" />
                </label>
                <label>
                  Provider
                  <input name="payoutProvider" placeholder="MTN, Telecel, AirtelTigo, bank..." />
                </label>
                <label>
                  Account / phone number
                  <input autoComplete="tel" name="payoutAccountNumber" placeholder="024 000 0000" />
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
              <span className="muted-copy">Upload a square JPEG, PNG, or WebP image.</span>
            </label>
            <label>
              Shop banner
              <ImagePreviewInput accept={ACCEPT_IMAGES} maxFiles={1} name="banner" />
              <span className="muted-copy">Upload a wide JPEG, PNG, or WebP image.</span>
            </label>
            {error && <ErrorState message={error} />}
            <div className="form-actions">
              <ButtonLink to="/" variant="secondary">
                Cancel
              </ButtonLink>
              <button className="button button-primary" disabled={submitting} type="submit">
                {submitting ? 'Creating...' : 'Create DigiShop'} <Icon name="arrow" />
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}
