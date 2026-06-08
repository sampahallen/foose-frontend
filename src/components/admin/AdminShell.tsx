import type { ReactNode } from 'react'
import { getAppName } from '../../config/env'
import { useAuth } from '../../hooks/useAuth'
import { initials } from '../../utils/format'
import { withBasePath } from '../../utils/navigation'
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
    <div className="admin-shell min-h-dvh bg-foose-bg lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="admin-sidebar sticky top-0 z-40 flex min-h-16 items-center justify-between border-b border-foose-border bg-foose-surface p-4 lg:h-dvh lg:flex-col lg:items-stretch lg:border-b-0 lg:border-r [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-accent [&_p]:text-xs [&_p]:uppercase [&_p]:tracking-widest [&_p]:text-foose-muted [&_nav]:hidden [&_nav]:flex-col [&_nav]:gap-2 [&_nav]:lg:flex [&_nav_a]:flex [&_nav_a]:items-center [&_nav_a]:gap-3 [&_nav_a]:rounded-lg [&_nav_a]:px-4 [&_nav_a]:py-3 [&_nav_a]:text-sm [&_nav_a]:font-semibold [&_nav_a]:text-foose-muted [&_nav_a]:hover:bg-accent-light [&_nav_a]:hover:text-accent [&_footer_a]:flex [&_footer_a]:items-center [&_footer_a]:gap-3 [&_footer_a]:rounded-lg [&_footer_a]:px-4 [&_footer_a]:py-3 [&_footer_a]:text-sm [&_footer_a]:font-semibold [&_footer_a]:text-foose-muted [&_footer_a]:hover:bg-accent-light [&_footer_a]:hover:text-accent [&_footer_button.admin-footer-action]:flex [&_footer_button.admin-footer-action]:items-center [&_footer_button.admin-footer-action]:gap-3 [&_footer_button.admin-footer-action]:rounded-lg [&_footer_button.admin-footer-action]:px-4 [&_footer_button.admin-footer-action]:py-3 [&_footer_button.admin-footer-action]:text-sm [&_footer_button.admin-footer-action]:font-semibold [&_footer_button.admin-footer-action]:text-foose-muted [&_footer_button.admin-footer-action]:hover:bg-accent-light [&_footer_button.admin-footer-action]:hover:text-accent [&_nav_a.active]:bg-accent [&_nav_a.active]:text-white [&_.button]:hidden [&_.button]:lg:inline-flex [&_footer]:hidden [&_footer]:border-t [&_footer]:border-foose-border [&_footer]:pt-4 [&_footer]:lg:block">
        <div>
          <h1>{brand} Admin</h1>
          <p>Management Suite</p>
        </div>
        <nav>
          {NAV.map((item) => (
            <a className={section === item.key ? 'active' : ''} href={withBasePath(item.href)} key={item.key}>
              <Icon name={item.icon} /> {item.label}
            </a>
          ))}
        </nav>
        <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover" type="button">
          Generate Report
        </button>
        <footer>
          <a href={withBasePath('/admin')}>
            <Icon name="shield" /> Security
          </a>
          <button className="admin-footer-action" onClick={() => void logout()} type="button">
            <Icon name="arrow" /> Log Out
          </button>
        </footer>
      </aside>
      <main className="admin-main min-w-0">
        <header className="admin-top sticky top-0 z-30 border-b border-foose-border bg-foose-surface/95 p-4 backdrop-blur [&_label]:flex [&_label]:h-11 [&_label]:w-full [&_label]:max-w-md [&_label]:items-center [&_label]:gap-3 [&_label]:rounded-lg [&_label]:bg-foose-surface-mid [&_label]:px-4 [&_input]:flex-1 [&_input]:border-0 [&_input]:bg-transparent [&_input]:p-0 [&_input]:focus:ring-0">
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
              <span className="admin-avatar-fallback inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent">{initials(user?.name)}</span>
            )}
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}
