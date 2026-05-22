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
      <div className="wallet-head">
        <div>
          <h1>Wallet</h1>
          <p>Balances come from your authenticated profile.</p>
        </div>
        <div className="button-row">
          <button className="button button-secondary" type="button">
            Withdraw funds
          </button>
        </div>
      </div>
      <div className="wallet-grid">
        <section className="balance-card">
          <span>Available balance</span>
          <h2>{formatMoney(wallet.balance)}</h2>
          <div>
            <p>
              <span>Escrow</span>
              <strong>{formatMoney(wallet.escrow)}</strong>
            </p>
          </div>
        </section>
        <aside className="insights-card">
          <h2>Insights</h2>
          <EmptyState body="Wallet analytics will appear when the API exposes them." title="No insights yet" />
        </aside>
      </div>
      <section className="home-section">
        <SectionHeader title="Transaction history" />
        <EmptyState body="Transactions will list here when a wallet history endpoint is available." title="No transactions" />
      </section>
    </AppShell>
  )
}
