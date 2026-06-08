import { useEffect, useRef, useState, type FormEvent } from 'react'
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const brand = getAppName()
  const placeholder = searchPlaceholder ?? `Search ${brand}`
  const redirectTarget = currentRedirectTarget()

  useEffect(() => {
    if (!menuOpen) return undefined

    const timer = window.setTimeout(() => setDrawerReady(true), 20)
    return () => window.clearTimeout(timer)
  }, [menuOpen])

  useEffect(() => {
    if (!profileMenuOpen) return undefined

    function closeOnOutsideClick(event: MouseEvent) {
      if (profileMenuRef.current?.contains(event.target as Node)) return
      setProfileMenuOpen(false)
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setProfileMenuOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [profileMenuOpen])

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
    setProfileMenuOpen(false)
    void logout()
  }

  return (
    <>
      <header className="top-nav sticky top-0 z-50 h-16 border-b border-white/20 bg-accent/95 text-white backdrop-blur [&_.icon-button]:text-white [&_.icon-button]:hover:bg-white/15 [&_.icon-button]:hover:text-white">
        <div className="nav-inner mx-auto flex h-full w-full max-w-[1280px] items-center justify-between gap-4 px-4 md:px-6 lg:gap-8 max-lg:justify-between">
          <a aria-label={`${brand} home`} className="brand-logo inline-flex min-w-20 items-center font-display text-xl font-bold [&_img]:h-auto [&_img]:w-20 [&_img]:md:w-[86px]" href={withBasePath('/')}>
            <img src={whiteLogo} alt="" />
          </a>
          <button
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            className="icon-button inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-current transition hover:bg-accent-light hover:text-accent mobile-menu-button ml-auto lg:hidden max-lg:!inline-flex lg:!hidden"
            onClick={menuOpen ? closeMenu : openMenu}
            type="button"
          >
            <Icon name="menu" />
          </button>
          <nav className="nav-links hidden items-center gap-6 lg:flex [&_a]:rounded-full [&_a]:px-3 [&_a]:py-2 [&_a]:text-sm [&_a]:font-semibold [&_a]:text-white/85 [&_a]:transition [&_a]:hover:bg-white/10 [&_a]:hover:text-white [&_a.active]:bg-white [&_a.active]:text-accent" aria-label="Primary navigation">
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
          <form className="nav-actions ml-auto hidden items-center gap-2 lg:flex" onSubmit={handleSearch}>
            <label className="nav-search flex h-11 min-w-72 items-center gap-3 rounded-lg border border-white/15 bg-white/10 px-4 text-white [&_input]:h-full [&_input]:flex-1 [&_input]:border-0 [&_input]:bg-transparent [&_input]:p-0 [&_input]:text-sm [&_input]:text-white [&_input]:placeholder:text-white/70 [&_input]:focus:ring-0">
              <Icon name="search" />
              <input aria-label="Search" name="q" placeholder={placeholder} />
            </label>
            <a aria-label="Saved" className={`icon-button inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-current transition hover:bg-accent-light hover:text-accent nav-icon [&.active]:bg-white [&.active]:text-accent ${active === 'saved' ? 'active' : ''} `} href={withBasePath('/saved')}>
              <Icon name="heart" />
            </a>
            <a aria-label="Cart" className="icon-button inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-current transition hover:bg-accent-light hover:text-accent nav-icon [&.active]:bg-white [&.active]:text-accent" href={withBasePath('/cart')}>
              <Icon name="cart" />
            </a>
            {user ? (
              <>
                <a aria-label="Inbox" className="icon-button inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-current transition hover:bg-accent-light hover:text-accent nav-icon [&.active]:bg-white [&.active]:text-accent" href={withBasePath('/inbox')}>
                  <Icon name="mail" />
                </a>
                {user.hasShop && (
                  <a aria-label="Manage shop" className="icon-button inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-current transition hover:bg-accent-light hover:text-accent nav-icon [&.active]:bg-white [&.active]:text-accent" href={withBasePath('/manage-shop')}>
                    <Icon name="store" />
                  </a>
                )}
                <div className="profile-menu-wrap relative" ref={profileMenuRef}>
                  <button
                    aria-expanded={profileMenuOpen}
                    aria-haspopup="menu"
                    aria-label="Open profile menu"
                    className={`avatar-link inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent [&_span]:inline-flex [&_span]:size-10 [&_span]:shrink-0 [&_span]:items-center [&_span]:justify-center [&_span]:rounded-full [&_span]:bg-accent-light [&_span]:text-sm [&_span]:font-bold [&_span]:text-accent [&_img]:inline-flex [&_img]:size-10 [&_img]:shrink-0 [&_img]:items-center [&_img]:justify-center [&_img]:rounded-full [&_img]:bg-accent-light [&_img]:text-sm [&_img]:font-bold [&_img]:text-accent [&_img]:object-cover profile-menu-trigger border border-white/25 bg-white/10 ${active === 'profile' ? 'active' : ''} `}
                    onClick={() => setProfileMenuOpen((open) => !open)}
                    type="button"
                  >
                    {user.profilePhoto ? <img alt="" src={user.profilePhoto} /> : <span aria-hidden>{initials(user.name)}</span>}
                  </button>
                  {profileMenuOpen && (
                    <div className="profile-dropdown absolute right-0 top-12 z-100 w-72 rounded-xl border border-foose-border bg-foose-surface p-3 text-foose-text shadow-2xl [&_hr]:my-2 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-foose-border" role="menu">
                      <div className="profile-dropdown-head [&_img]:object-cover flex items-center gap-3 p-2 [&>span]:size-12 [&>span]:rounded-full [&_img]:size-12 [&_img]:rounded-full [&_div]:flex [&_div]:min-w-0 [&_div]:flex-col [&_strong]:truncate [&_strong]:text-sm [&_strong]:font-bold [&_small]:truncate [&_small]:text-xs [&_small]:text-foose-faint">
                        {user.profilePhoto ? <img alt="" src={user.profilePhoto} /> : <span aria-hidden>{initials(user.name)}</span>}
                        <div>
                          <strong>{user.name}</strong>
                          <small>@{user.username}</small>
                        </div>
                      </div>
                      <hr />
                      <div className="profile-dropdown-links flex flex-col gap-1 [&_a]:rounded-lg [&_a]:px-3 [&_a]:py-2 [&_a]:text-left [&_a]:text-sm [&_a]:font-semibold [&_a]:transition [&_a]:hover:bg-foose-surface-low">
                        <a href={withBasePath('/profile')} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                          Profile settings
                        </a>
                        <a href={withBasePath('/profile?panel=account')} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                          Account settings
                        </a>
                        <a href={withBasePath('/inbox?support=true')} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                          Help and support
                        </a>
                        <span className="profile-dropdown-spacer h-6" />
                        <a href={withBasePath('/profile?panel=settings')} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                          Settings
                        </a>
                      </div>
                      <hr />
                      <button className="profile-dropdown-logout rounded-lg px-3 py-2 text-left text-sm font-semibold transition hover:bg-foose-surface-low w-full border-0 bg-transparent text-foose-danger" onClick={handleLogout} role="menuitem" type="button">
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : status === 'checking' ? null : (
              <div className="auth-links flex items-center gap-2 [&>a:first-child]:rounded-lg [&>a:first-child]:px-3 [&>a:first-child]:py-2 [&>a:first-child]:text-sm [&>a:first-child]:font-semibold [&>a:first-child]:text-white/90 [&>a:first-child]:hover:bg-white/10">
                <a href={authHref('/login', redirectTarget)}>Log in</a>
                <a className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover" href={authHref('/register', redirectTarget)}>
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
          className="mobile-nav-backdrop fixed inset-x-0 top-16 bottom-0 z-80 border-0 bg-black/35 lg:hidden open max-lg:!block lg:!hidden"
          onClick={closeMenu}
          type="button"
        />
      )}
      {menuOpen && (
        <nav className={`mobile-nav-panel [&_a]:rounded-full [&_a]:px-3 [&_a]:py-2 [&_a]:text-sm [&_a]:font-semibold [&_a]:text-white/85 [&_a]:transition [&_a]:hover:bg-white/10 [&_a]:hover:text-white [&_.nav-link-button]:rounded-full [&_.nav-link-button]:px-3 [&_.nav-link-button]:py-2 [&_.nav-link-button]:text-sm [&_.nav-link-button]:font-semibold [&_.nav-link-button]:text-white/85 [&_.nav-link-button]:transition [&_.nav-link-button]:hover:bg-white/10 [&_.nav-link-button]:hover:text-white [&_a.active]:bg-white [&_a.active]:text-accent fixed top-16 right-0 bottom-0 z-90 hidden h-[calc(100dvh-4rem)] w-[min(82vw,320px)] translate-x-full flex-col gap-2 overflow-y-auto border-l border-white/25 bg-accent-strong px-4 py-5 pb-28 text-white shadow-2xl transition-transform duration-200 lg:hidden [&.open]:flex [&.open]:translate-x-0 ${drawerReady ? 'open' : ''} max-lg:!flex lg:!hidden`} aria-label="Mobile navigation menu">
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
            <button className="nav-link-button border-0 bg-transparent text-left" onClick={handleLogout} type="button">
              Log out
            </button>
          ) : status === 'checking' ? (
            <span className="mobile-nav-status rounded-lg bg-white/10 px-3 py-2 text-sm text-white/80">Checking session...</span>
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
