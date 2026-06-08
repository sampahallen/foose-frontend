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
    <article className="kyc-document-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5">
      <header>
        <strong>{title}</strong>
        {url && (
          <a href={url} rel="noreferrer" target="_blank">
            Open image
          </a>
        )}
      </header>
      <div className="kyc-document-image overflow-hidden rounded-lg bg-foose-surface-mid [&_img]:h-full [&_img]:w-full [&_img]:object-cover image-frame">
        {url ? <img alt={title} src={url} /> : <span className="image-placeholder flex min-h-32 items-center justify-center bg-foose-surface-mid text-sm font-semibold text-foose-faint">No image submitted</span>}
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
      <section className="admin-page p-4 md:p-6 lg:p-8">
        <a className="back-link mb-6 inline-flex items-center gap-2 text-sm font-semibold text-foose-muted hover:text-accent" href="/admin/kyc">
          <Icon name="arrow" /> Back to KYC queue
        </a>
        {!kycId && <EmptyState body="Open a KYC record from the admin queue." title="KYC record required" />}
        {resource.loading && <LoadingState label="Loading KYC details..." />}
        {resource.error && <ErrorState message={resource.error} retry={resource.refetch} />}
        {actionError && <ErrorState message={actionError} />}
        {kyc && (
          <>
            <div className="admin-title mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base max-md:[&_h1]:text-2xl">
              <div>
                <h1>{sellerName}</h1>
                <p>Review identity documents, card number, selfie, and submission history.</p>
              </div>
              <div className="button-row flex flex-wrap items-center gap-3">
                <Badge tone={STATUS_TONE[kyc.status]}>{kyc.status.replace('_', ' ')}</Badge>
                <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover" disabled={busyAction === 'approve'} onClick={() => void approve()} type="button">
                  {busyAction === 'approve' ? 'Approving...' : 'Approve'}
                </button>
                <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" disabled={busyAction === 'reject'} onClick={() => void reject()} type="button">
                  {busyAction === 'reject' ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>

            <div className="kyc-detail-grid grid gap-6">
              <section className="form-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-foose-text [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_input]:w-full [&_input]:px-3 [&_input]:py-3 [&_select]:w-full [&_select]:px-3 [&_select]:py-3 [&_textarea]:w-full [&_textarea]:px-3 [&_textarea]:py-3 max-lg:rounded-lg max-lg:p-3 kyc-identity-card">
                <div className="person-heading">
                  <span className="initials inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent">{initials(sellerName)}</span>
                  <div>
                    <h2>Seller details</h2>
                    {getUserEmail(kyc.userId) && <p>{getUserEmail(kyc.userId)}</p>}
                  </div>
                </div>
                <dl className="record-grid grid gap-3 sm:grid-cols-2 [&_div]:rounded-lg [&_div]:bg-foose-surface-low [&_div]:p-3 [&_dt]:text-xs [&_dt]:font-bold [&_dt]:uppercase [&_dt]:tracking-widest [&_dt]:text-foose-faint [&_dd]:mt-1 [&_dd]:text-sm [&_dd]:font-semibold [&_dd]:text-foose-text [&_.wide]:sm:col-span-2">
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

              <section className="form-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-foose-text [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_input]:w-full [&_input]:px-3 [&_input]:py-3 [&_select]:w-full [&_select]:px-3 [&_select]:py-3 [&_textarea]:w-full [&_textarea]:px-3 [&_textarea]:py-3 max-lg:rounded-lg max-lg:p-3">
                <h2>
                  <Icon name="shield" /> ID details
                </h2>
                <dl className="record-grid grid gap-3 sm:grid-cols-2 [&_div]:rounded-lg [&_div]:bg-foose-surface-low [&_div]:p-3 [&_dt]:text-xs [&_dt]:font-bold [&_dt]:uppercase [&_dt]:tracking-widest [&_dt]:text-foose-faint [&_dd]:mt-1 [&_dd]:text-sm [&_dd]:font-semibold [&_dd]:text-foose-text [&_.wide]:sm:col-span-2">
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
                      <dd className="danger-text font-semibold text-foose-danger">{kyc.rejectionReason}</dd>
                    </div>
                  )}
                </dl>
              </section>
            </div>

            <section className="kyc-documents grid gap-6">
              <DocumentPreview title="Submitted ID document" url={kyc.idImgUrl} />
              <DocumentPreview title="Submitted selfie" url={kyc.selfieImgUrl} />
            </section>

            <div className="form-actions flex flex-wrap items-center gap-3">
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
