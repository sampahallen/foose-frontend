import { useState } from 'react'
import { AdminShell, Badge, EmptyState, ErrorState, LoadingState, StatCard } from '../components'
import { apiPut } from '../lib/api'
import { useApiResource } from '../hooks/useApiResource'
import type { KycRecord, User } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { formatDateTime, initials } from '../utils/format'
import { navigateTo } from '../utils/navigation'

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
      <section className="admin-page">
        <div className="admin-title">
          <div>
            <h1>KYC reviews</h1>
            <p>Pending identity records awaiting admin action.</p>
          </div>
          <div className="admin-mini-stats">
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
          <table className="sharp-table admin-table">
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
                  className="clickable-row"
                  key={record._id}
                  onClick={() => openRecord(record._id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') openRecord(record._id)
                  }}
                  role="link"
                  tabIndex={0}
                >
                  <td>
                    <span className="initials">{initials(record.userId.name)}</span>
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
                    <div className="table-actions">
                      <a className="button button-secondary" href={`/admin/kyc/${record._id}`}>
                        View details
                      </a>
                      <button className="button button-primary" disabled={busyId === `approve:${record._id}`} onClick={() => void approve(record._id)} type="button">
                        {busyId === `approve:${record._id}` ? 'Approving...' : 'Approve'}
                      </button>
                      <button className="button button-secondary" disabled={busyId === `reject:${record._id}`} onClick={() => void reject(record._id)} type="button">
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
