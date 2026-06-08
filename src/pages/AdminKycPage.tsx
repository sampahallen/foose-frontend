import { useState } from 'react'
import { AdminShell, Badge, EmptyState, ErrorState, LoadingState, StatCard } from '../components'
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

  async function approve(id: string) {
    setActionError('')
    setBusyId(`approve:${id}`)
    try {
      await apiPut(`/admin/kyc/${id}/approve`)
      await records.refetch()
    } catch (requestError) {
      setActionError(getErrorMessage(requestError, 'Unable to approve KYC submission'))
    } finally {
      setBusyId('')
    }
  }

  async function reject(id: string) {
    const reason = window.prompt('Reason for rejection')
    if (!reason) return
    setActionError('')
    setBusyId(`reject:${id}`)
    try {
      await apiPut(`/admin/kyc/${id}/reject`, { reason })
      await records.refetch()
    } catch (requestError) {
      setActionError(getErrorMessage(requestError, 'Unable to reject KYC submission'))
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
        {records.loading && <LoadingState label="Loading KYC records..." />}
        {records.error && <ErrorState message={records.error} retry={records.refetch} />}
        {actionError && <ErrorState message={actionError} />}
        {!records.loading && !records.error && !records.data?.records.length && (
          <EmptyState body="No pending KYC submissions are waiting for review." title="KYC queue is clear" />
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
                      <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" disabled={busyId === `reject:${record._id}`} onClick={() => void reject(record._id)} type="button">
                        {busyId === `reject:${record._id}` ? 'Rejecting...' : 'Reject'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AdminShell>
  )
}
