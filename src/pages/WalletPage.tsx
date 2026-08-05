import { useMemo, useState } from 'react'
import { AppShell, Icon, InlineNotice, SectionHeader, ShopManagementLayout, ShopManagementPageHeader, StatePanel } from '../components'
import { NavigationBackButton } from '../components/navigation'
import { getAppName } from '../config/env'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { useOrderRealtimeRefresh } from '../hooks/useOrderRealtimeRefresh'
import { apiGet } from '../lib/api'
import type {
  WalletLedgerEntry,
  WalletLedgerEntryType,
  WalletLedgerResponse,
} from '../types/api'
import { formatDateTime, formatMoney } from '../utils/format'
import { orderSettlementLabel } from '../utils/orderStatus'
import { withBasePath } from '../utils/navigation'

type ActivityFilter = 'all' | WalletLedgerEntryType

type AdditionalLedgerPage = {
  endpoint: string
  entries: WalletLedgerEntry[]
  nextCursor: string | null
}

const activityFilters: Array<{ label: string; value: ActivityFilter }> = [
  { label: 'All activity', value: 'all' },
  { label: 'Escrow holds', value: 'escrow_hold' },
  { label: 'Released funds', value: 'escrow_release' },
  { label: 'Refunds', value: 'escrow_refund' },
  { label: 'Withdrawals', value: 'withdrawal' },
  { label: 'Adjustments', value: 'adjustment' },
]

const ledgerCopy: Record<WalletLedgerEntryType, {
  fallback: string
  label: string
  tone: string
}> = {
  escrow_hold: {
    fallback: 'An order payment entered protected escrow.',
    label: 'Payment protected',
    tone: 'bg-accent-light text-accent',
  },
  escrow_release: {
    fallback: 'Protected funds became available in your Foose wallet.',
    label: 'Funds released',
    tone: 'bg-foose-success-bg text-foose-success',
  },
  escrow_refund: {
    fallback: 'Protected funds were returned to the buyer.',
    label: 'Payment refunded',
    tone: 'bg-foose-warning-bg text-foose-warning',
  },
  withdrawal: {
    fallback: 'Funds left your available Foose balance.',
    label: 'Withdrawal',
    tone: 'bg-foose-surface-mid text-foose-muted',
  },
  adjustment: {
    fallback: 'An authorized wallet balance adjustment was recorded.',
    label: 'Balance adjustment',
    tone: 'bg-foose-surface-mid text-foose-text',
  },
}

function dedupeEntries(entries: WalletLedgerEntry[]) {
  return Array.from(new Map(entries.map((entry) => [entry.id, entry])).values())
}

function amountPresentation(entry: WalletLedgerEntry) {
  if (entry.entryType === 'escrow_release') return { label: 'Available balance', sign: '+', tone: 'text-foose-success' }
  if (entry.entryType === 'withdrawal' || entry.entryType === 'escrow_refund') {
    return { label: entry.entryType === 'withdrawal' ? 'Available balance' : 'Protected escrow', sign: '−', tone: 'text-foose-text' }
  }
  if (entry.entryType === 'escrow_hold') return { label: 'Protected escrow', sign: '+', tone: 'text-accent' }
  const delta = entry.balanceDelta || entry.escrowDelta
  return {
    label: entry.balanceDelta ? 'Available balance' : 'Protected escrow',
    sign: delta > 0 ? '+' : delta < 0 ? '−' : '',
    tone: delta > 0 ? 'text-foose-success' : 'text-foose-text',
  }
}

function WalletActivityCard({ entry }: { entry: WalletLedgerEntry }) {
  const copy = ledgerCopy[entry.entryType]
  const amount = amountPresentation(entry)
  const order = entry.order

  return (
    <article className="rounded-2xl border border-foose-border bg-white p-4 shadow-sm sm:p-5">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-black ${copy.tone}`}>
              {copy.label}
            </span>
            <time className="text-xs font-semibold text-foose-faint" dateTime={entry.createdAt}>
              {formatDateTime(entry.createdAt)}
            </time>
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-foose-text">
            {entry.description?.trim() || copy.fallback}
          </p>
          {order && (
            <div className="mt-3 rounded-xl bg-foose-surface-low p-3">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-foose-text">{order.itemSummary || `${order.itemCount} order items`}</p>
                  <p className="mt-0.5 text-xs font-semibold text-foose-muted">
                    Order {order.shortReference} · {orderSettlementLabel(order.settlementStatus)}
                  </p>
                </div>
                <a
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-xl border border-foose-border bg-white px-3 text-xs font-black text-accent transition hover:border-accent"
                  href={withBasePath(`/orders/${order.id}`)}
                >
                  View order
                  <Icon name="arrow" size={14} />
                </a>
              </div>
              {order.workflow?.settlementExplanation && (
                <p className="mt-2 border-t border-foose-border pt-2 text-xs leading-5 text-foose-muted">
                  {order.workflow.settlementExplanation}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="shrink-0 sm:text-right">
          <strong className={`font-display text-xl font-semibold ${amount.tone}`}>
            {amount.sign}{formatMoney(entry.amount, entry.currency)}
          </strong>
          <p className="mt-0.5 text-xs font-semibold text-foose-faint">{amount.label}</p>
        </div>
      </div>
    </article>
  )
}

function WalletPageBody() {
  const { user } = useAuth()
  const wallet = user?.wallet || { balance: 0, escrow: 0 }
  const [filter, setFilter] = useState<ActivityFilter>('all')
  const endpoint = useMemo(() => {
    const parameters = new URLSearchParams({ limit: '20' })
    if (filter !== 'all') parameters.set('type', filter)
    return `/payments/wallet/ledger?${parameters.toString()}`
  }, [filter])
  const ledger = useApiResource<WalletLedgerResponse>(user?.hasShop ? endpoint : null, Boolean(user?.hasShop))
  useOrderRealtimeRefresh(ledger.refetch, Boolean(user?.hasShop && ledger.data))
  const [additionalPage, setAdditionalPage] = useState<AdditionalLedgerPage>({
    endpoint: '',
    entries: [],
    nextCursor: null,
  })
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState('')
  const currentAdditionalPage = additionalPage.endpoint === endpoint ? additionalPage : null
  const entries = useMemo(
    () => dedupeEntries([...(ledger.data?.entries || []), ...(currentAdditionalPage?.entries || [])]),
    [currentAdditionalPage?.entries, ledger.data?.entries],
  )
  const nextCursor = currentAdditionalPage ? currentAdditionalPage.nextCursor : ledger.data?.nextCursor
  const latestEntry = filter === 'all' ? entries[0] : undefined
  const displayedBalance = latestEntry?.balanceAfter ?? wallet.balance
  const displayedEscrow = latestEntry?.escrowAfter ?? wallet.escrow

  async function loadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    setLoadMoreError('')
    try {
      const response = await apiGet<WalletLedgerResponse>(
        `${endpoint}&cursor=${encodeURIComponent(nextCursor)}`,
      )
      setAdditionalPage((current) => {
        const prior = current.endpoint === endpoint ? current.entries : []
        return {
          endpoint,
          entries: dedupeEntries([...prior, ...(response.entries || [])]),
          nextCursor: response.nextCursor || null,
        }
      })
    } catch (error) {
      setLoadMoreError(error instanceof Error ? error.message : 'Unable to load more wallet activity')
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <>
      <ShopManagementPageHeader
        actions={(
          <button aria-disabled="true" className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-foose-border bg-foose-surface-mid px-5 py-2.5 text-center text-sm font-bold text-foose-faint" disabled title="Withdrawals are coming soon" type="button">
            Withdraw funds
          </button>
        )}
        description="Your available balance and protected order funds, backed by an immutable activity record."
        title="Wallet"
      />

      <div className="wallet-grid mb-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="flex min-h-64 flex-col justify-between rounded-2xl border border-accent bg-accent p-6 text-white shadow-sm">
          <span className="text-xs font-black uppercase tracking-[0.25em] text-white/70">Available balance</span>
          <h2 className="text-5xl font-black tracking-tight md:text-7xl">{formatMoney(displayedBalance)}</h2>
          <p className="flex flex-col gap-1">
            <span className="text-xs font-black uppercase tracking-widest text-white/70">Protected in escrow</span>
            <strong className="text-2xl">{formatMoney(displayedEscrow)}</strong>
          </p>
        </section>

        <aside className="rounded-2xl border border-foose-border bg-foose-surface p-5 shadow-sm">
          <span className="grid size-11 place-items-center rounded-full bg-accent-light text-accent"><Icon name="shield" size={22} /></span>
          <h2 className="mt-4 font-display text-xl font-semibold text-foose-text">How order money moves</h2>
          <p className="mt-2 text-sm leading-6 text-foose-muted">
            Online payments stay protected until the buyer confirms, the delivery window completes, or a future resolver decides an active report.
          </p>
          <p className="mt-3 text-sm leading-6 text-foose-muted">
            Released money moves to your available balance. Withdrawals remain separate.
          </p>
        </aside>
      </div>

      <section className="my-8 rounded-2xl border border-foose-border bg-foose-surface p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader eyebrow="Append-only ledger" title="Wallet activity" />
          {user?.hasShop && (
            <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-foose-faint">
              Activity type
              <select
                className="min-h-11 rounded-xl border border-foose-border bg-white px-3 text-sm font-bold normal-case tracking-normal text-foose-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                onChange={(event) => setFilter(event.target.value as ActivityFilter)}
                value={filter}
              >
                {activityFilters.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          )}
        </div>

        {!user?.hasShop && (
          <StatePanel body="Order escrow and seller releases appear here after you open a shop." layout="section" title="Seller activity starts with a shop" tone="info" />
        )}
        {user?.hasShop && ledger.initialLoading && (
          <div aria-label="Loading wallet activity" className="mt-4 grid gap-3" role="status">
            {[0, 1, 2].map((item) => <div className="h-32 animate-pulse rounded-2xl bg-foose-surface-mid motion-reduce:animate-none" key={item} />)}
          </div>
        )}
        {user?.hasShop && ledger.error && !ledger.data && (
          <StatePanel
            action={<button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={() => void ledger.refetch()} type="button">Retry</button>}
            body={ledger.error}
            layout="section"
            title="Wallet activity is unavailable"
            tone="error"
          />
        )}
        {user?.hasShop && ledger.data && !entries.length && (
          <StatePanel
            body={filter === 'all' ? 'Escrow holds, releases, refunds, and withdrawals will appear here.' : 'No wallet entries match this activity type.'}
            layout="section"
            title={filter === 'all' ? 'No wallet activity yet' : 'No matching activity'}
            tone="empty"
          />
        )}
        {user?.hasShop && entries.length > 0 && (
          <div className="mt-4 grid gap-3">
            {entries.map((entry) => <WalletActivityCard entry={entry} key={entry.id} />)}
          </div>
        )}
        {loadMoreError && <InlineNotice className="mt-4" tone="error">{loadMoreError}</InlineNotice>}
        {user?.hasShop && nextCursor && (
          <div className="mt-5 flex justify-center">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-foose-border bg-white px-5 text-sm font-black text-foose-text transition hover:border-accent hover:text-accent disabled:opacity-60"
              disabled={loadingMore}
              onClick={() => void loadMore()}
              type="button"
            >
              {loadingMore ? 'Loading more…' : 'Load more activity'}
            </button>
          </div>
        )}
      </section>
    </>
  )
}

export function WalletPage() {
  const { user } = useAuth()
  const brand = getAppName()

  if (user?.hasShop) {
    return (
      <ShopManagementLayout activePanel="wallet">
        <WalletPageBody />
      </ShopManagementLayout>
    )
  }

  return (
    <AppShell searchPlaceholder={`Search ${brand}`}>
      <NavigationBackButton className="mb-4" fallback={{ href: '/profile', label: 'Profile' }} />
      <WalletPageBody />
    </AppShell>
  )
}
