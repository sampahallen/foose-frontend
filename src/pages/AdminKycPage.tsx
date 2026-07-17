import { useState } from 'react'
import { AdminShell, Badge, Dialog, InlineNotice, StatePanel, StatCard, TextAreaField, useToast } from '../components'
import { AdminTableSkeleton } from '../components/operational/OperationalStates'
import { apiPut } from '../lib/api'
import { useApiResource } from '../hooks/useApiResource'
import type { KycRecord, User } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { formatDateTime, initials } from '../utils/format'
import { navigateTo, withBasePath } from '../utils/navigation'

type PendingKyc = KycRecord & {
  _id: string
  userId: User
}

export function AdminKycPage() {
  const records = useApiResource<{ records: PendingKyc[] }>('/admin/kyc/pending')
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [rejectTarget, setRejectTarget] = useState<PendingKyc | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectionError, setRejectionError] = useState('')
  const { showToast } = useToast()

  async function approve(id: string) {
    setActionError('')
    setBusyId(`approve:${id}`)
    try {
      await apiPut(`/admin/kyc/${id}/approve`)
      await records.refetch()
      showToast({ message: 'The seller can now continue with verified account actions.', title: 'KYC approved', tone: 'success' })
    } catch (requestError) {
      setActionError(getErrorMessage(requestError, 'Unable to approve KYC submission'))
    } finally {
      setBusyId('')
    }
  }

  function requestRejection(record: PendingKyc) {
    setActionError('')
    setRejectionError('')
    setRejectionReason('')
    setRejectTarget(record)
  }

  async function reject() {
    if (!rejectTarget) return
    const reason = rejectionReason.trim()
    if (!reason) {
      setRejectionError('Add a clear reason so the seller knows what to correct.')
      return
    }
    const id = rejectTarget._id
    setRejectionError('')
    setBusyId(`reject:${id}`)
    try {
      await apiPut(`/admin/kyc/${id}/reject`, { reason })
      await records.refetch()
      showToast({ message: 'The seller can review the reason and resubmit.', title: 'KYC rejected', tone: 'info' })
      setRejectTarget(null)
      setRejectionReason('')
    } catch (requestError) {
      setRejectionError(getErrorMessage(requestError, 'Unable to reject KYC submission'))
    } finally {
      setBusyId('')
    }
  }

  function openRecord(id: string) {
    navigateTo(`/admin/kyc/${id}`)
  }

  return (
    <AdminShell section="kyc">
      <section className="admin-page p-4 md:p-6 lg:p-8">
        <div className="admin-title mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base max-md:[&_h1]:text-2xl">
          <div>
            <h1>KYC reviews</h1>
            <p>Pending identity records awaiting admin action.</p>
          </div>
          <div className="admin-mini-stats grid gap-3 sm:grid-cols-2">
            <StatCard icon="shield" label="Pending Verifications" value={String(records.data?.records.length || 0)} note="Awaiting review" />
          </div>
        </div>
        {records.initialLoading && <AdminTableSkeleton label="Loading KYC records" />}
        {records.error && !records.data && <StatePanel action={<button className="button button-secondary min-h-11 px-5" onClick={() => void records.refetch()} type="button">Retry</button>} body={records.error} layout="section" title="KYC records unavailable" tone="error" />}
        {actionError && <InlineNotice title="Review action failed" tone="error">{actionError}</InlineNotice>}
        {!records.loading && !records.error && !records.data?.records.length && (
          <StatePanel body="No pending KYC submissions are waiting for review." layout="section" title="KYC queue is clear" tone="success" />
        )}
        {!!records.data?.records.length && (
          <table className="sharp-table w-full border-collapse overflow-hidden rounded-xl border border-foose-border text-left text-sm [&_th]:border-b [&_th]:border-foose-border [&_th]:px-4 [&_th]:py-3 [&_th]:align-middle [&_td]:border-b [&_td]:border-foose-border [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_th]:bg-foose-surface-mid [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-widest [&_th]:text-foose-muted admin-table [&_td:first-child]:font-bold">
            <thead>
              <tr>
                <th>Seller Name</th>
                <th>Submission Date</th>
                <th>ID Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.data.records.map((record) => (
                <tr
                  className="clickable-row cursor-pointer [&:hover_td]:bg-accent-light"
                  key={record._id}
                  onClick={() => openRecord(record._id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') openRecord(record._id)
                  }}
                  role="link"
                  tabIndex={0}
                >
                  <td>
                    <span className="initials inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent">{initials(record.userId.name)}</span>
                    <span>
                      <strong>{record.userId.name}</strong>
                      <small>{record.userId.email}</small>
                    </span>
                  </td>
                  <td>{formatDateTime(record.submittedAt)}</td>
                  <td>
                    <Badge>{record.idType}</Badge>
                  </td>
                  <td>
                    <Badge tone="accent">{record.status}</Badge>
                  </td>
                  <td onClick={(event) => event.stopPropagation()}>
                    <div className="table-actions flex flex-wrap items-center gap-3 justify-end">
                      <a className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" href={withBasePath(`/admin/kyc/${record._id}`)}>
                        View details
                      </a>
                      <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover" disabled={busyId === `approve:${record._id}`} onClick={() => void approve(record._id)} type="button">
                        {busyId === `approve:${record._id}` ? 'Approving...' : 'Approve'}
                      </button>
                      <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" disabled={Boolean(busyId)} onClick={() => requestRejection(record)} type="button">
                        {busyId === `reject:${record._id}` ? 'Rejecting...' : 'Reject'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <Dialog
          description={rejectTarget ? `Explain what ${rejectTarget.userId.name} needs to correct before resubmitting.` : 'Explain what the seller needs to correct before resubmitting.'}
          dismissible={!busyId}
          footer={(
            <>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-foose-border bg-white px-5 text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
                disabled={Boolean(busyId)}
                onClick={() => setRejectTarget(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                aria-busy={Boolean(busyId) || undefined}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-foose-danger bg-foose-danger px-5 text-sm font-black text-white transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foose-danger disabled:cursor-not-allowed disabled:opacity-60"
                disabled={Boolean(busyId)}
                onClick={() => void reject()}
                type="button"
              >
                {busyId && <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />}
                {busyId ? 'Rejecting...' : 'Reject submission'}
              </button>
            </>
          )}
          onClose={() => {
            if (!busyId) setRejectTarget(null)
          }}
          open={Boolean(rejectTarget)}
          size="sm"
          title="Reject KYC submission?"
        >
          <TextAreaField
            autoFocus
            error={rejectionError}
            hint="This message will be visible to the seller. Be specific and avoid including sensitive information."
            id="admin-kyc-rejection-reason"
            label="Reason for rejection"
            maxLength={500}
            onChange={(event) => {
              setRejectionReason(event.currentTarget.value)
              if (rejectionError) setRejectionError('')
            }}
            placeholder="For example: The ID image is cropped and the document number is not visible."
            required
            rows={5}
            value={rejectionReason}
          />
        </Dialog>
      </section>
    </AdminShell>
  )
}
