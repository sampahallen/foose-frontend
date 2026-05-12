import { AdminShell, Badge, EmptyState, ErrorState, LoadingState, StatCard } from '../components'
import { apiPut } from '../lib/api'
import { useApiResource } from '../hooks/useApiResource'
import type { KycRecord, User } from '../types/api'
import { formatDateTime, initials } from '../utils/format'

type PendingKyc = KycRecord & {
  _id: string
  userId: User
}

export function AdminKycPage() {
  const records = useApiResource<{ records: PendingKyc[] }>('/admin/kyc/pending')

  async function approve(id: string) {
    await apiPut(`/admin/kyc/${id}/approve`)
    await records.refetch()
  }

  async function reject(id: string) {
    const reason = window.prompt('Reason for rejection')
    if (!reason) return
    await apiPut(`/admin/kyc/${id}/reject`, { reason })
    await records.refetch()
  }

  return (
    <AdminShell section="kyc">
      <section className="admin-page">
        <div className="admin-title">
          <div>
            <h1>KYC Reviews</h1>
            <p>Pending seller identity records from the KYC API.</p>
          </div>
          <div className="admin-mini-stats">
            <StatCard icon="shield" label="Pending Verifications" value={String(records.data?.records.length || 0)} note="Awaiting review" />
          </div>
        </div>
        {records.loading && <LoadingState label="Loading KYC records..." />}
        {records.error && <ErrorState message={records.error} retry={records.refetch} />}
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
                <tr key={record._id}>
                  <td>
                    <span className="initials">{initials(record.userId.name)}</span>
                    <strong>{record.userId.name}</strong>
                  </td>
                  <td>{formatDateTime(record.submittedAt)}</td>
                  <td>
                    <Badge>{record.idType}</Badge>
                  </td>
                  <td>
                    <Badge tone="accent">{record.status}</Badge>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="button button-primary" onClick={() => void approve(record._id)} type="button">
                        Approve
                      </button>
                      <button className="button button-secondary" onClick={() => void reject(record._id)} type="button">
                        Reject
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
