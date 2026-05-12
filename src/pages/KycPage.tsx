import { useState } from 'react'
import { ButtonLink, EmptyState, ErrorState, Icon, LoadingState } from '../components'
import { apiPost, apiPut } from '../lib/api'
import { useApiResource } from '../hooks/useApiResource'
import type { KycRecord } from '../types/api'

export function KycPage() {
  const kyc = useApiResource<{ kyc: KycRecord }>('/kyc/me')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submitKyc(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const body = {
      dob: String(formData.get('dob') || ''),
      idImgUrl: String(formData.get('idImgUrl') || ''),
      idNo: String(formData.get('idNo') || ''),
      idType: String(formData.get('idType') || ''),
      selfieImgUrl: String(formData.get('selfieImgUrl') || ''),
    }

    setSubmitting(true)
    setError('')

    try {
      if (kyc.data?.kyc.status === 'rejected') {
        await apiPut('/kyc', body)
      } else {
        await apiPost('/kyc', body)
      }
      await kyc.refetch()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to submit KYC')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flow-page">
      <header className="flow-top">
        <a href="/dashboard">Foose</a>
        <span>Identity verification</span>
        <Icon name="info" />
      </header>
      <main className="flow-content">
        <section className="kyc-intro">
          <Icon name="shield" size={48} />
          <div>
            <h1>Identity Verification</h1>
            <p>Submit the fields required by the KYC API. Uploaded file support can be layered onto these URL fields later.</p>
          </div>
        </section>
        {kyc.loading && <LoadingState label="Loading KYC status..." />}
        {kyc.error && <ErrorState message={kyc.error} retry={kyc.refetch} />}
        {kyc.data?.kyc.status === 'approved' && (
          <EmptyState
            action={<ButtonLink to="/open-shop">Open DigiShop</ButtonLink>}
            body="Your KYC is approved. You can now create and manage a DigiShop."
            icon="check"
            title="Verification approved"
          />
        )}
        {kyc.data?.kyc.status === 'pending' && (
          <EmptyState body="Your current submission is waiting for admin review." icon="shield" title="KYC pending" />
        )}
        {kyc.data && ['not_submitted', 'rejected'].includes(kyc.data.kyc.status) && (
          <form className="kyc-grid" onSubmit={(event) => void submitKyc(event)}>
            <section className="form-card">
              <h2>
                <Icon name="user" /> Personal Information
              </h2>
              <label>
                ID Type
                <select defaultValue={kyc.data.kyc.idType || 'Ghana Card'} name="idType">
                  <option>Ghana Card</option>
                  <option>Passport</option>
                  <option>Driving License</option>
                </select>
              </label>
              <label>
                ID Number
                <input defaultValue={kyc.data.kyc.idNo || ''} name="idNo" placeholder="GHA-000000000-0" required />
              </label>
              <div className="form-grid">
                <label>
                  Date of Birth
                  <input defaultValue={kyc.data.kyc.dob || ''} name="dob" required type="date" />
                </label>
              </div>
              {kyc.data.kyc.rejectionReason && <p className="danger-text">{kyc.data.kyc.rejectionReason}</p>}
            </section>
            <section className="form-card">
              <h2>
                <Icon name="camera" /> Documents
              </h2>
              <label>
                ID image URL
                <input defaultValue={kyc.data.kyc.idImgUrl || ''} name="idImgUrl" placeholder="https://..." required />
              </label>
              <label>
                Selfie image URL
                <input defaultValue={kyc.data.kyc.selfieImgUrl || ''} name="selfieImgUrl" placeholder="https://..." required />
              </label>
            </section>
            <section className="requirements">
              <Icon name="info" />
              <div>
                <strong>Verification Requirements:</strong>
                <ul>
                  <li>Document must be valid and not expired.</li>
                  <li>All 4 corners of the ID must be visible.</li>
                  <li>Details must match your profile name.</li>
                </ul>
              </div>
            </section>
            {error && <ErrorState message={error} />}
            <div className="flow-actions">
              <p>By submitting, you agree to our seller terms and data processing policies.</p>
              <button className="button button-primary" disabled={submitting} type="submit">
                {submitting ? 'Submitting...' : 'Submit Verification'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
