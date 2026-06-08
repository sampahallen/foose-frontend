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
      <div className="flow-page min-h-dvh bg-foose-bg">
        <header className="flow-top flex h-16 items-center justify-between bg-accent px-4 text-white md:px-8">
          <a href="/">{brand}</a>
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
        <a href="/">{brand}</a>
        <span>Set up your shop</span>
        <a href="/">Close</a>
      </header>
      <main className="flow-content mx-auto w-full max-w-5xl px-4 py-8 [&.narrow]:max-w-3xl narrow">
        <section className="form-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-foose-text [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_input]:w-full [&_input]:px-3 [&_input]:py-3 [&_select]:w-full [&_select]:px-3 [&_select]:py-3 [&_textarea]:w-full [&_textarea]:px-3 [&_textarea]:py-3 max-lg:rounded-lg max-lg:p-3 large">
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
              <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover" disabled={submitting} type="submit">
                {submitting ? 'Creating...' : 'Create DigiShop'} <Icon name="arrow" />
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}
