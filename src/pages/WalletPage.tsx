import { AppShell, EmptyState, SectionHeader } from '../components'
import { useAuth } from '../hooks/useAuth'
import { formatMoney } from '../utils/format'

export function WalletPage() {
  const { user } = useAuth()
  const wallet = user?.wallet || { balance: 0, escrow: 0 }

  return (
    <AppShell searchPlaceholder="Search Foose">
      <div className="wallet-head">
        <div>
          <h1>Wallet</h1>
          <p>Wallet balance is loaded from the authenticated user profile.</p>
        </div>
        <div className="button-row">
          <button className="button button-secondary" type="button">
            Withdraw Funds
          </button>
        </div>
      </div>
      <div className="wallet-grid">
        <section className="balance-card">
          <span>Available Balance</span>
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
          <EmptyState body="A transaction ledger endpoint is not exposed yet, so no fake wallet rows are shown." title="No wallet insights yet" />
        </aside>
      </div>
      <section className="home-section">
        <SectionHeader title="Transaction History" />
        <EmptyState body="Transactions will appear once the backend exposes a wallet history endpoint." title="No transaction history" />
      </section>
    </AppShell>
  )
}
