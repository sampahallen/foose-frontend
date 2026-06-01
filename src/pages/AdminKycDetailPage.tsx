import { useState } from 'react'
import { AdminShell, Badge, ButtonLink, EmptyState, ErrorState, Icon, LoadingState } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import { apiPut } from '../lib/api'
import type { KycRecord, User } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { formatDateTime, initials } from '../utils/format'
import { getCurrentAppPathname } from '../utils/navigation'

type KycDetail = KycRecord & {
  _id: string
  userId?: User | string
}

const STATUS_TONE = {
  approved: 'success',
  not_submitted: 'neutral',
  pending: 'accent',
  rejected: 'danger',
} as const

function currentKycId() {
  const match = getCurrentAppPathname().match(/^\/admin\/kyc\/([^/]+)/)
  return match ? decodeURIComponent(match[1]).trim() : ''
}

function getUserName(user?: User | string) {
  if (!user) return 'Unknown seller'
  return typeof user === 'string' ? user : user.name
}

function getUserEmail(user?: User | string) {
  return typeof user === 'object' ? user.email : undefined
}

function getUserPhone(user?: User | string) {
  return typeof user === 'object' ? user.phone : undefined
}

function getUserMeta(user?: User | string) {
  if (typeof user !== 'object') return []
  return [user.username ? `@${user.username}` : undefined, user.role].filter(Boolean)
}

function DocumentPreview({ title, url }: { title: string; url?: string }) {
  return (
    <article className="kyc-document-card">
      <header>
        <strong>{title}</strong>
        {url && (
          <a href={url} rel="noreferrer" target="_blank">
            Open image
          </a>
        )}
      </header>
      <div className="kyc-document-image image-frame">
        {url ? <img alt={title} src={url} /> : <span className="image-placeholder">No image submitted</span>}
      </div>
    </article>
  )
}

export function AdminKycDetailPage() {
  const kycId = currentKycId()
  const resource = useApiResource<{ kyc: KycDetail }>(kycId ? `/admin/kyc/${kycId}` : null)
  const [actionError, setActionError] = useState('')
  const [busyAction, setBusyAction] = useState('')

  async function approve() {
    if (!kycId) return
    setActionError('')
    setBusyAction('approve')
    try {
      await apiPut(`/admin/kyc/${kycId}/approve`)
      await resource.refetch()
    } catch (requestError) {
      setActionError(getErrorMessage(requestError, 'Unable to approve KYC submission'))
    } finally {
      setBusyAction('')
    }
  }

  async function reject() {
    if (!kycId) return
    const reason = window.prompt('Reason for rejection')
    if (!reason) return
    setActionError('')
    setBusyAction('reject')
    try {
      await apiPut(`/admin/kyc/${kycId}/reject`, { reason })
      await resource.refetch()
    } catch (requestError) {
      setActionError(getErrorMessage(requestError, 'Unable to reject KYC submission'))
    } finally {
      setBusyAction('')
    }
  }

  const kyc = resource.data?.kyc
  const sellerName = getUserName(kyc?.userId)
  const userMeta = getUserMeta(kyc?.userId)

  return (
    <AdminShell section="kyc">
      <section className="admin-page">
        <a className="back-link" href="/admin/kyc">
          <Icon name="arrow" /> Back to KYC queue
        </a>
        {!kycId && <EmptyState body="Open a KYC record from the admin queue." title="KYC record required" />}
        {resource.loading && <LoadingState label="Loading KYC details..." />}
        {resource.error && <ErrorState message={resource.error} retry={resource.refetch} />}
        {actionError && <ErrorState message={actionError} />}
        {kyc && (
          <>
            <div className="admin-title">
              <div>
                <h1>{sellerName}</h1>
                <p>Review identity documents, card number, selfie, and submission history.</p>
              </div>
              <div className="button-row">
                <Badge tone={STATUS_TONE[kyc.status]}>{kyc.status.replace('_', ' ')}</Badge>
                <button className="button button-primary" disabled={busyAction === 'approve'} onClick={() => void approve()} type="button">
                  {busyAction === 'approve' ? 'Approving...' : 'Approve'}
                </button>
                <button className="button button-secondary" disabled={busyAction === 'reject'} onClick={() => void reject()} type="button">
                  {busyAction === 'reject' ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>

            <div className="kyc-detail-grid">
              <section className="form-card kyc-identity-card">
                <div className="person-heading">
                  <span className="initials">{initials(sellerName)}</span>
                  <div>
                    <h2>Seller details</h2>
                    {getUserEmail(kyc.userId) && <p>{getUserEmail(kyc.userId)}</p>}
                  </div>
                </div>
                <dl className="record-grid">
                  <div>
                    <dt>Account</dt>
                    <dd>{userMeta.join(' / ') || 'Not available'}</dd>
                  </div>
                  <div>
                    <dt>Submitted</dt>
                    <dd>{formatDateTime(kyc.submittedAt)}</dd>
                  </div>
                  <div>
                    <dt>Reviewed</dt>
                    <dd>{formatDateTime(kyc.reviewedAt)}</dd>
                  </div>
                  <div>
                    <dt>Submission count</dt>
                    <dd>{kyc.submissionCount || 0}</dd>
                  </div>
                </dl>
              </section>

              <section className="form-card">
                <h2>
                  <Icon name="shield" /> ID details
                </h2>
                <dl className="record-grid">
                  <div>
                    <dt>ID type</dt>
                    <dd>{kyc.idType || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt>Card / document number</dt>
                    <dd>{kyc.idNo || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt>Phone number</dt>
                    <dd>{kyc.phone || getUserPhone(kyc.userId) || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt>Phone OTP</dt>
                    <dd>{kyc.phoneVerified ? 'Mock verified' : 'Not verified yet'}</dd>
                  </div>
                  <div>
                    <dt>Date of birth</dt>
                    <dd>{kyc.dob || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt>Reviewer</dt>
                    <dd>{getUserName(kyc.reviewedBy)}</dd>
                  </div>
                  {kyc.rejectionReason && (
                    <div className="wide">
                      <dt>Rejection reason</dt>
                      <dd className="danger-text">{kyc.rejectionReason}</dd>
                    </div>
                  )}
                </dl>
              </section>
            </div>

            <section className="kyc-documents">
              <DocumentPreview title="Submitted ID document" url={kyc.idImgUrl} />
              <DocumentPreview title="Submitted selfie" url={kyc.selfieImgUrl} />
            </section>

            <div className="form-actions">
              <ButtonLink to="/admin/kyc" variant="secondary">
                Return to queue
              </ButtonLink>
            </div>
          </>
        )}
      </section>
    </AdminShell>
  )
}
