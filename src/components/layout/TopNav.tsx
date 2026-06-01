import { useEffect, useState, type FormEvent } from 'react'
import { getAppName } from '../../config/env'
import { useAuth } from '../../hooks/useAuth'
import { authHref, currentRedirectTarget } from '../../utils/authRedirect'
import { initials } from '../../utils/format'
import { navigateTo, withBasePath } from '../../utils/navigation'
import { Icon } from '../icons/Icon'
import whiteLogo from '../../assets/foose-logo-white.png'

export function TopNav({
  active,
  searchPlaceholder,
}: {
  active?: 'home' | 'browse' | 'community' | 'profile' | 'saved'
  searchPlaceholder?: string
}) {
  const { logout, status, user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [drawerReady, setDrawerReady] = useState(false)
  const brand = getAppName()
  const placeholder = searchPlaceholder ?? `Search ${brand}`
  const redirectTarget = currentRedirectTarget()

  useEffect(() => {
    if (!menuOpen) return undefined

    const timer = window.setTimeout(() => setDrawerReady(true), 20)
    return () => window.clearTimeout(timer)
  }, [menuOpen])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const query = String(formData.get('q') || '').trim()
    navigateTo(query ? `/browse?q=${encodeURIComponent(query)}` : '/browse')
  }

  function openMenu() {
    setDrawerReady(false)
    setMenuOpen(true)
  }

  function closeMenu() {
    setDrawerReady(false)
    setMenuOpen(false)
  }

  function handleLogout() {
    closeMenu()
    void logout()
  }

  return (
    <>
      <header className="top-nav">
        <div className="nav-inner">
          <a aria-label={`${brand} home`} className="brand-logo" href={withBasePath('/')}>
            <img src={whiteLogo} alt="" />
          </a>
          <button
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            className="icon-button mobile-menu-button max-lg:!inline-flex lg:!hidden"
            onClick={menuOpen ? closeMenu : openMenu}
            type="button"
          >
            <Icon name="menu" />
          </button>
          <nav className="nav-links" aria-label="Primary navigation">
            <a className={active === 'home' ? 'active' : ''} href={withBasePath('/')}>
              Home
            </a>
            <a className={active === 'browse' ? 'active' : ''} href={withBasePath('/browse')}>
              Browse
            </a>
            <a className={active === 'community' ? 'active' : ''} href={withBasePath('/community')}>
              Community
            </a>
          </nav>
          <form className="nav-actions" onSubmit={handleSearch}>
            <label className="nav-search">
              <Icon name="search" />
              <input aria-label="Search" name="q" placeholder={placeholder} />
            </label>
            <a aria-label="Saved" className={`icon-button nav-icon ${active === 'saved' ? 'active' : ''}`} href={withBasePath('/saved')}>
              <Icon name="heart" />
            </a>
            <a aria-label="Cart" className="icon-button nav-icon" href={withBasePath('/cart')}>
              <Icon name="cart" />
            </a>
            {user ? (
              <>
                <a aria-label="Inbox" className="icon-button nav-icon" href={withBasePath('/inbox')}>
                  <Icon name="mail" />
                </a>
                <a className={`avatar-link ${active === 'profile' ? 'active' : ''}`} href={withBasePath('/profile')}>
                  {user.profilePhoto ? <img alt="" src={user.profilePhoto} /> : <span aria-hidden>{initials(user.name)}</span>}
                </a>
                <button className="nav-logout" onClick={handleLogout} type="button">
                  Log out
                </button>
              </>
            ) : status === 'checking' ? null : (
              <div className="auth-links">
                <a href={authHref('/login', redirectTarget)}>Log in</a>
                <a className="button button-primary" href={authHref('/register', redirectTarget)}>
                  Sign up
                </a>
              </div>
            )}
          </form>
        </div>
      </header>
      {menuOpen && (
        <button
          aria-label="Close navigation"
          className="mobile-nav-backdrop open max-lg:!block lg:!hidden"
          onClick={closeMenu}
          type="button"
        />
      )}
      {menuOpen && (
        <nav className={`mobile-nav-panel ${drawerReady ? 'open' : ''} max-lg:!flex lg:!hidden`} aria-label="Mobile navigation menu">
          <a className={active === 'home' ? 'active' : ''} href={withBasePath('/')} onClick={closeMenu}>
            Home
          </a>
          <a className={active === 'browse' ? 'active' : ''} href={withBasePath('/browse')} onClick={closeMenu}>
            Browse
          </a>
          <a className={active === 'community' ? 'active' : ''} href={withBasePath('/community')} onClick={closeMenu}>
            Community
          </a>
          {user ? (
            <button className="nav-link-button" onClick={handleLogout} type="button">
              Log out
            </button>
          ) : status === 'checking' ? (
            <span className="mobile-nav-status">Checking session...</span>
          ) : (
            <>
              <a href={authHref('/login', redirectTarget)} onClick={closeMenu}>
                Log in
              </a>
              <a href={authHref('/register', redirectTarget)} onClick={closeMenu}>
                Sign up
              </a>
            </>
          )}
        </nav>
      )}
    </>
  )
}
