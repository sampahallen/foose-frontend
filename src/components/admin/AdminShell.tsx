import type { ReactNode } from 'react'
import { getAppName } from '../../config/env'
import { useAuth } from '../../hooks/useAuth'
import { initials } from '../../utils/format'
import { Icon, type IconName } from '../icons/Icon'

const NAV: Array<{ key: 'overview' | 'kyc' | 'disputes'; label: string; href: string; icon: IconName }> = [
  { href: '/admin', icon: 'grid', key: 'overview', label: 'Dashboard' },
  { href: '/admin/kyc', icon: 'shield', key: 'kyc', label: 'KYC Reviews' },
  { href: '/admin/disputes', icon: 'alert', key: 'disputes', label: 'Dispute Center' },
]

export function AdminShell({ section, children }: { section: 'overview' | 'kyc' | 'disputes'; children: ReactNode }) {
  const { logout, user } = useAuth()
  const brand = getAppName()

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div>
          <h1>{brand} Admin</h1>
          <p>Management Suite</p>
        </div>
        <nav>
          {NAV.map((item) => (
            <a className={section === item.key ? 'active' : ''} href={item.href} key={item.key}>
              <Icon name={item.icon} /> {item.label}
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
          <button className="admin-footer-action" onClick={() => void logout()} type="button">
            <Icon name="arrow" /> Log Out
          </button>
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
            {user?.profilePhoto ? (
              <img alt="" src={user.profilePhoto} />
            ) : (
              <span className="admin-avatar-fallback">{initials(user?.name)}</span>
            )}
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}
