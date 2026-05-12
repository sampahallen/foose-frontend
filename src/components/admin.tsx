import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { initials } from '../utils/format'
import { Icon, type IconName } from './icons/Icon'

export function AdminShell({ section, children }: { section: 'overview' | 'kyc' | 'disputes'; children: ReactNode }) {
  const { logout, user } = useAuth()
  const links = [
    ['overview', 'Dashboard', '/admin', 'grid'],
    ['kyc', 'KYC Reviews', '/admin/kyc', 'shield'],
    ['disputes', 'Dispute Center', '/admin/disputes', 'alert'],
    ['health', 'System Health', '/admin', 'chart'],
  ]
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div>
          <h1>Foose Admin</h1>
          <p>Management Suite</p>
        </div>
        <nav>
          {links.map(([key, label, href, icon]) => (
            <a className={section === key ? 'active' : ''} href={href} key={key}>
              <Icon name={icon as IconName} /> {label}
            </a>
          ))}
        </nav>
        <button className="button button-primary" type="button">
          Generate Report
        </button>
        <footer>
          <a href="/admin">
            <Icon name="shield" /> Security
          </a>
          <a href="/" onClick={() => void logout()}>
            <Icon name="arrow" /> Log Out
          </a>
        </footer>
      </aside>
      <main className="admin-main">
        <header className="admin-top">
          <label>
            <Icon name="search" />
            <input placeholder={section === 'disputes' ? 'Search disputes...' : 'Search marketplace...'} />
          </label>
          <div>
            <Icon name="bell" />
            <Icon name="info" />
            {user?.profilePhoto ? <img alt={user.name} src={user.profilePhoto} /> : <span className="admin-avatar-fallback">{initials(user?.name)}</span>}
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}
