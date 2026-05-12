import type { FormEvent, ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { initials } from '../utils/format'
import { Icon } from './icons/Icon'

export function TopNav({
  active,
  searchPlaceholder = 'Search Foose',
}: {
  active?: 'browse' | 'community'
  searchPlaceholder?: string
}) {
  const { logout, user } = useAuth()

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const query = String(formData.get('q') || '').trim()
    window.location.href = query ? `/browse?q=${encodeURIComponent(query)}` : '/browse'
  }

  return (
    <header className="top-nav">
      <div className="nav-inner">
        <a className="brand" href="/">
          Foose
        </a>
        <nav className="nav-links" aria-label="Primary navigation">
          <a className={active === 'browse' ? 'active' : ''} href="/browse">
            Browse
          </a>
          <a className={active === 'community' ? 'active' : ''} href="/community">
            Community
          </a>
        </nav>
        <form className="nav-actions" onSubmit={handleSearch}>
          <label className="nav-search">
            <Icon name="search" />
            <input aria-label="Search" name="q" placeholder={searchPlaceholder} />
          </label>
          <a aria-label="Cart" className="icon-button nav-icon" href="/cart">
            <Icon name="cart" />
          </a>
          {user ? (
            <>
              <a aria-label="Inbox" className="icon-button nav-icon" href="/inbox">
                <Icon name="mail" />
              </a>
              <a className="avatar-link" href="/dashboard">
                {user.profilePhoto ? <img alt={user.name} src={user.profilePhoto} /> : <span>{initials(user.name)}</span>}
              </a>
              <button className="nav-logout" onClick={() => void logout()} type="button">
                Log out
              </button>
            </>
          ) : (
            <div className="auth-links">
              <a href="/login">Log in</a>
              <a className="button button-primary" href="/register">
                Sign up
              </a>
            </div>
          )}
        </form>
      </div>
    </header>
  )
}

export function AppShell({
  active,
  children,
  searchPlaceholder,
  flush = false,
}: {
  active?: 'browse' | 'community'
  children: ReactNode
  searchPlaceholder?: string
  flush?: boolean
}) {
  return (
    <>
      <TopNav active={active} searchPlaceholder={searchPlaceholder} />
      <main className={flush ? '' : 'page'}>{children}</main>
      <BottomTabs />
    </>
  )
}

export function BottomTabs() {
  const { user } = useAuth()

  return (
    <nav className="bottom-tabs" aria-label="Mobile navigation">
      <a href="/">
        <Icon name="store" />
        Home
      </a>
      <a href="/browse">
        <Icon name="search" />
        Browse
      </a>
      <a href="/community">
        <Icon name="grid" />
        Community
      </a>
      <a href={user ? '/inbox' : '/login'}>
        <Icon name="mail" />
        Inbox
      </a>
      <a href={user ? '/dashboard' : '/login'}>
        <Icon name="user" />
        Profile
      </a>
    </nav>
  )
}

export function Footer() {
  return (
    <footer className="footer">
      <div>
        <h3>Foose</h3>
        <p>The heartbeat of Ghana's second-hand fashion revolution. Curated, authenticated, delivered.</p>
      </div>
      {[
        ['Marketplace', ['Browse All', 'Fresh Drops', 'DigiShops', 'Bale Wholesale']],
        ['Community', ['Events', 'Sellers Hub', 'Style Guide', 'Forum']],
        ['Support', ['Help Center', 'Verification', 'Shipping', 'Returns']],
      ].map(([title, links]) => (
        <nav key={title as string}>
          <h4>{title}</h4>
          {(links as string[]).map((link) => (
            <a href="/browse" key={link}>
              {link}
            </a>
          ))}
        </nav>
      ))}
    </footer>
  )
}
