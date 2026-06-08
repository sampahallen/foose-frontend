import { AppShell, EmptyState, SectionHeader } from '../components'
import { getAppName } from '../config/env'
import { useAuth } from '../hooks/useAuth'
import { formatMoney } from '../utils/format'

export function WalletPage() {
  const { user } = useAuth()
  const brand = getAppName()
  const wallet = user?.wallet || { balance: 0, escrow: 0 }

  return (
    <AppShell searchPlaceholder={`Search ${brand}`}>
      <div className="wallet-head mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base flex-wrap items-center gap-3 max-md:[&_h1]:text-2xl">
        <div>
          <h1>Wallet</h1>
          <p>Balances come from your authenticated profile.</p>
        </div>
        <div className="button-row flex flex-wrap items-center gap-3">
          <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" type="button">
            Withdraw funds
          </button>
        </div>
      </div>
      <div className="wallet-grid grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] mb-8 max-lg:grid-cols-1">
        <section className="balance-card rounded-xl border border-foose-border bg-foose-surface shadow-sm [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-accent [&_h2]:md:text-2xl flex min-h-64 flex-col justify-between bg-accent p-6 text-white [&_h2]:text-5xl [&_h2]:text-white [&_h2]:md:text-7xl">
          <span>Available balance</span>
          <h2>{formatMoney(wallet.balance)}</h2>
          <div>
            <p>
              <span>Escrow</span>
              <strong>{formatMoney(wallet.escrow)}</strong>
            </p>
          </div>
        </section>
        <aside className="insights-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 [&_div]:mb-3 [&_div]:flex [&_div]:items-center [&_div]:justify-between [&_div]:rounded-lg [&_div]:bg-foose-surface [&_div]:p-4">
          <h2>Insights</h2>
          <EmptyState body="Wallet analytics will appear when the API exposes them." title="No insights yet" />
        </aside>
      </div>
      <section className="home-section mx-auto w-full max-w-[1280px] my-8 rounded-xl border border-foose-border bg-foose-surface p-4 md:p-6 [&.no-pad]:p-0 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:md:text-4xl [&_a]:font-bold [&_a]:text-accent max-lg:rounded-lg max-lg:p-3 max-md:[&>h2]:text-2xl">
        <SectionHeader title="Transaction history" />
        <EmptyState body="Transactions will list here when a wallet history endpoint is available." title="No transactions" />
      </section>
    </AppShell>
  )
}
