import { AppShell, SectionHeader, StatePanel } from '../components'
import { NavigationBackButton } from '../components/navigation'
import { getAppName } from '../config/env'
import { useAuth } from '../hooks/useAuth'
import { formatMoney } from '../utils/format'

export function WalletPage() {
  const { user } = useAuth()
  const brand = getAppName()
  const wallet = user?.wallet || { balance: 0, escrow: 0 }

  return (
    <AppShell searchPlaceholder={`Search ${brand}`}>
      <NavigationBackButton className="mb-4" fallback={{ href: '/profile', label: 'Profile' }} />
      <div className="wallet-head mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base">
        <div>
          <h1>Wallet</h1>
          <p>Balances come from your authenticated profile.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button aria-disabled="true" className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-foose-border bg-foose-surface-mid px-5 py-2.5 text-center text-sm font-bold text-foose-faint" disabled title="Withdrawals are coming soon" type="button">
            Withdraw funds
          </button>
        </div>
      </div>

      <div className="wallet-grid mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="flex min-h-64 flex-col justify-between rounded-xl border border-foose-border bg-accent p-6 text-white shadow-sm">
          <span className="text-xs font-black uppercase tracking-[0.25em] text-white/70">Available balance</span>
          <h2 className="text-5xl font-black tracking-tight md:text-7xl">{formatMoney(wallet.balance)}</h2>
          <p className="flex flex-col gap-1">
            <span className="text-xs font-black uppercase tracking-widest text-white/70">Escrow</span>
            <strong className="text-2xl">{formatMoney(wallet.escrow)}</strong>
          </p>
        </section>

        <aside className="rounded-xl border border-foose-border bg-foose-surface p-4 shadow-sm md:p-5">
          <h2 className="mb-4 text-xl font-bold text-foose-text">Insights</h2>
          <StatePanel body="Wallet analytics will appear when insights are available." layout="compact" title="Insights are coming soon" tone="info" />
        </aside>
      </div>

      <section className="my-8 rounded-xl border border-foose-border bg-foose-surface p-4 md:p-6">
        <SectionHeader title="Transaction history" />
        <StatePanel body="Your balance is live, but transaction history is not available yet." layout="section" title="Transaction history is coming soon" tone="info" />
      </section>
    </AppShell>
  )
}
