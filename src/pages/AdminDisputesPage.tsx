import { AdminShell, Badge, InlineNotice, StatePanel, StatCard } from '../components'
import { AdminTableSkeleton } from '../components/operational/OperationalStates'
import { useApiResource } from '../hooks/useApiResource'
import type { Order, Shop, User } from '../types/api'
import { formatDateTime, formatMoney } from '../utils/format'

type DisputeOrder = Order & {
  activeReportId?: ReportRecord | string
  buyerId?: User
  disputeReason?: string
  shopId?: Shop
}

type ReportRecord = {
  _id: string
  category?: string
  createdAt?: string
  detailedAccount?: string
  details?: string
  evidence?: unknown[]
  frozenAt?: string
  order?: DisputeOrder
  orderId?: DisputeOrder | string
  requestedOutcome?: string
  status?: string
  submittedAt?: string
  summary?: string
}

type QueueItem = {
  order?: DisputeOrder
  report?: ReportRecord
}

const reportLabels: Record<string, string> = {
  damaged_or_not_as_described: 'Damaged or not as described',
  invalid_transit_details: 'Invalid transit details',
  missing_item: 'Missing item',
  not_received: 'Parcel not received',
  other: 'Other issue',
  safety_or_fraud: 'Safety or fraud concern',
  seller_unreachable: 'Seller or driver unreachable',
  wrong_item: 'Wrong item',
}

function queueItems(data: { orders?: DisputeOrder[]; reports?: ReportRecord[] } | null): QueueItem[] {
  if (data?.reports?.length) {
    return data.reports.map((report) => ({
      order: report.order || (report.orderId && typeof report.orderId === 'object' ? report.orderId : undefined),
      report,
    }))
  }

  return (data?.orders || []).map((order) => ({
    order,
    report: order.activeReportId && typeof order.activeReportId === 'object' ? order.activeReportId : undefined,
  }))
}

function participantName(value: User | string | undefined, fallback: string) {
  if (!value || typeof value === 'string') return fallback
  return value.name || value.username || fallback
}

function sellerName(value: Shop | string | undefined) {
  return value && typeof value === 'object' ? value.shopName : 'Shop'
}

export function AdminDisputesPage() {
  const queue = useApiResource<{ orders?: DisputeOrder[]; reports?: ReportRecord[] }>('/admin/disputes')
  const items = queueItems(queue.data)
  const evidenceCount = items.reduce((total, item) => total + (item.report?.evidence?.length || 0), 0)

  return (
    <AdminShell section="disputes">
      <section className="admin-page p-4 md:p-6 lg:p-8">
        <div className="admin-title mb-5 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:mt-2 [&_p]:max-w-3xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base">
          <h1>Order report queue</h1>
          <p>Submitted buyer reports stay frozen here until the dedicated review workspace can record an auditable decision.</p>
        </div>

        <div className="stats-row grid gap-4 sm:grid-cols-2">
          <StatCard icon="alert" label="Awaiting review" value={String(items.length)} note="Frozen order reports" />
          <StatCard icon="camera" label="Evidence files" value={String(evidenceCount)} note="Private buyer uploads" />
        </div>

        <InlineNotice className="my-6" title="Read-only safety mode" tone="info">
          Refund and seller-release controls are intentionally unavailable during this phase. Automatic settlement remains suspended for every reported order.
        </InlineNotice>

        {queue.initialLoading && <AdminTableSkeleton label="Loading order reports" />}
        {queue.error && !queue.data && <StatePanel action={<button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={() => void queue.refetch()} type="button">Retry</button>} body={queue.error} layout="section" title="Reports unavailable" tone="error" />}
        {!queue.loading && !queue.error && !items.length && (
          <StatePanel body="Submitted buyer reports will appear here with their order and evidence summary." layout="section" title="The report queue is clear" tone="success" />
        )}

        {!!items.length && (
          <div className="grid gap-4">
            {items.map(({ order, report }, index) => {
              const category = report?.category ? reportLabels[report.category] || report.category.replaceAll('_', ' ') : order?.disputeReason || 'Legacy order report'
              const status = report?.status || 'submitted'

              return (
                <article className="rounded-2xl border border-foose-border bg-foose-surface p-4 shadow-sm md:p-5" key={report?._id || order?._id || index}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap gap-2">
                        <Badge tone="warning">{status.replaceAll('_', ' ')}</Badge>
                        <Badge>{order?.delivery?.method || 'order'}</Badge>
                        <Badge tone="accent">Funds frozen</Badge>
                      </div>
                      <h2 className="text-lg font-black capitalize text-foose-text">{category}</h2>
                      <p className="mt-1 break-words text-sm text-foose-muted">
                        {order?._id ? `Order #${order._id.slice(-8)}` : 'Order not populated'} · {order?.items.map((item) => item.title).join(', ') || 'Details unavailable'}
                      </p>
                    </div>
                    <div className="md:text-right">
                      <strong className="block text-lg text-accent">{formatMoney(order?.totalAmount, order?.currency)}</strong>
                      <span className="text-xs text-foose-muted">{formatDateTime(report?.createdAt || report?.frozenAt || order?.updatedAt)}</span>
                    </div>
                  </div>

                  <dl className="mt-5 grid gap-3 rounded-xl bg-foose-surface-low p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div><dt className="font-bold text-foose-muted">Buyer</dt><dd className="mt-1">{participantName(order?.buyerId, 'Buyer')}</dd></div>
                    <div><dt className="font-bold text-foose-muted">Seller</dt><dd className="mt-1">{sellerName(order?.shopId)}</dd></div>
                    <div><dt className="font-bold text-foose-muted">Requested outcome</dt><dd className="mt-1 capitalize">{report?.requestedOutcome?.replaceAll('_', ' ') || 'Not recorded'}</dd></div>
                    <div><dt className="font-bold text-foose-muted">Evidence</dt><dd className="mt-1">{report?.evidence?.length || 0} private files</dd></div>
                  </dl>

                  {(report?.summary || report?.detailedAccount || report?.details) && (
                    <div className="mt-4 rounded-xl border border-foose-border bg-white p-4 text-sm leading-6">
                      {report.summary && <strong className="mb-1 block">{report.summary}</strong>}
                      {(report.detailedAccount || report.details) && (
                        <p className="whitespace-pre-wrap text-foose-muted">{report.detailedAccount || report.details}</p>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </AdminShell>
  )
}
