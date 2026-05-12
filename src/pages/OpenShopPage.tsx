import { useState } from 'react'
import { ButtonLink, EmptyState, ErrorState, Icon } from '../components'
import { useAuth } from '../hooks/useAuth'
import { apiPost } from '../lib/api'
import type { Shop } from '../types/api'

export function OpenShopPage() {
  const { refreshUser, user } = useAuth()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function createShop(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setSubmitting(true)
    setError('')

    try {
      const data = await apiPost<{ shop: Shop }>('/digishops', {
        bannerUrl: String(formData.get('bannerUrl') || ''),
        bio: String(formData.get('bio') || ''),
        category: String(formData.get('category') || 'both'),
        logoUrl: String(formData.get('logoUrl') || ''),
        shopName: String(formData.get('shopName') || ''),
      })
      await refreshUser()
      window.location.href = `/dashboard?view=shop&shop=${data.shop.slug}`
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create shop')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user?.isKycVerified) {
    return (
      <div className="flow-page">
        <header className="flow-top">
          <a href="/">Foose</a>
          <span>Setup Your Shop</span>
          <a href="/dashboard">Close</a>
        </header>
        <main className="flow-content narrow">
          <EmptyState
            action={<ButtonLink to="/kyc">Complete KYC</ButtonLink>}
            body="The backend protects DigiShop creation until KYC is approved."
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
        <a href="/">Foose</a>
        <span>Setup Your Shop</span>
        <a href="/dashboard">Close</a>
      </header>
      <main className="flow-content narrow">
        <section className="form-card large">
          <h1>Basic Information</h1>
          <p>Create the DigiShop record through the API. Listings can be added after the shop exists.</p>
          <form onSubmit={(event) => void createShop(event)}>
            <label>
              Shop Name
              <input name="shopName" placeholder="e.g. Accra Vintage Finds" required />
            </label>
            <label>
              Shop Bio
              <textarea name="bio" placeholder="Share the story behind your collection..." rows={5} />
            </label>
            <label>
              Primary Business Category
              <select defaultValue="both" name="category">
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="both">Both</option>
              </select>
            </label>
            <label>
              Logo URL
              <input name="logoUrl" placeholder="https://..." />
            </label>
            <label>
              Banner URL
              <input name="bannerUrl" placeholder="https://..." />
            </label>
            {error && <ErrorState message={error} />}
            <div className="form-actions">
              <ButtonLink to="/dashboard" variant="secondary">
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
