import { useEffect, useRef, useState, type FormEvent } from 'react'
import { getAppName } from '../../config/env'
import { useAuth } from '../../hooks/useAuth'
import { useMessaging } from '../../hooks/useMessaging'
import { authHref, currentRedirectTarget } from '../../utils/authRedirect'
import { initials } from '../../utils/format'
import { navigateTo, withBasePath } from '../../utils/navigation'
import { Icon } from '../icons/Icon'
import whiteLogo from '../../assets/foose-logo-white.png'

export function TopNav({
  active,
  className = '',
  searchPlaceholder,
}: {
  active?: 'home' | 'browse' | 'community' | 'profile' | 'saved'
  className?: string
  searchPlaceholder?: string
}) {
  const { logout, status, user } = useAuth()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const desktopProfileMenuRef = useRef<HTMLDivElement | null>(null)
  const mobileProfileMenuRef = useRef<HTMLDivElement | null>(null)
  const brand = getAppName()
  const { unreadMessageCount, unreadNotificationCount } = useMessaging()
  const placeholder = searchPlaceholder ?? `Search ${brand}`
  const redirectTarget = currentRedirectTarget()
  const shopHref = user?.hasShop ? '/manage-shop' : '/open-shop'
  const shopLabel = user?.hasShop ? 'Manage shop' : 'Open shop'
  const publicProfileHref = user?.username ? `/profile/${encodeURIComponent(user.username)}` : '/profile'
  const hasSystemNotificationDot = unreadMessageCount === 0 && unreadNotificationCount > 0

  useEffect(() => {
    if (!profileMenuOpen) return undefined

    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target as Node
      if (desktopProfileMenuRef.current?.contains(target) || mobileProfileMenuRef.current?.contains(target)) return
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

  function handleLogout() {
    setProfileMenuOpen(false)
    void logout()
  }

  return (
    <>
      <header className={`top-nav sticky top-0 z-50 h-16 border-b border-white/20 bg-accent/95 text-white backdrop-blur [&_.icon-button]:text-white [&_.icon-button]:hover:bg-white/15 [&_.icon-button]:hover:text-white ${className}`}>
        <div className="nav-inner mx-auto flex h-full w-full max-w-[1280px] items-center justify-between gap-4 px-4 md:px-6 lg:gap-8 max-lg:justify-between">
          <a aria-label={`${brand} home`} className="brand-logo inline-flex min-w-20 items-center font-display text-xl font-bold [&_img]:h-auto [&_img]:w-20 [&_img]:md:w-[86px]" href={withBasePath('/')}>
            <img src={whiteLogo} alt="" />
          </a>
          <div className="mobile-nav-actions ml-auto flex items-center gap-1 lg:hidden">
            {user && (
              <a aria-label={shopLabel} className="icon-button inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-current transition hover:bg-white/15 hover:text-white" href={withBasePath(shopHref)}>
                <Icon name="store" />
              </a>
            )}
            {user ? (
              <div className="profile-menu-wrap relative" ref={mobileProfileMenuRef}>
                <button
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Open profile menu"
                  className={`avatar-link inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white [&_span]:inline-flex [&_span]:size-10 [&_span]:shrink-0 [&_span]:items-center [&_span]:justify-center [&_span]:rounded-full [&_span]:bg-white/10 [&_span]:text-sm [&_span]:font-bold [&_span]:text-white [&_img]:inline-flex [&_img]:size-10 [&_img]:shrink-0 [&_img]:items-center [&_img]:justify-center [&_img]:rounded-full [&_img]:bg-white/10 [&_img]:text-sm [&_img]:font-bold [&_img]:text-white [&_img]:object-cover profile-menu-trigger border border-white/25 ${active === 'profile' ? 'active' : ''} `}
                  onClick={() => setProfileMenuOpen((open) => !open)}
                  type="button"
                >
                  {user.profilePhoto ? <img alt="" src={user.profilePhoto} /> : <span aria-hidden>{initials(user.name)}</span>}
                </button>
                {profileMenuOpen && (
                  <div className="profile-dropdown fixed right-4 top-16 z-[95] w-[min(90vw,18rem)] rounded-xl border border-foose-border bg-foose-surface p-3 text-foose-text shadow-2xl [&_hr]:my-2 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-foose-border" role="menu">
                    <a
                      aria-label="View your public profile"
                      className="profile-dropdown-head flex items-center gap-3 rounded-lg p-2 transition hover:bg-foose-surface-low focus:outline-none focus:ring-2 focus:ring-accent/25 [&>span]:size-12 [&>span]:rounded-full [&_div]:flex [&_div]:min-w-0 [&_div]:flex-col [&_img]:size-12 [&_img]:rounded-full [&_img]:object-cover [&_small]:truncate [&_small]:text-xs [&_small]:text-foose-faint [&_strong]:truncate [&_strong]:text-sm [&_strong]:font-bold"
                      href={withBasePath(publicProfileHref)}
                      onClick={() => setProfileMenuOpen(false)}
                      role="menuitem"
                    >
                      {user.profilePhoto ? <img alt="" src={user.profilePhoto} /> : <span aria-hidden>{initials(user.name)}</span>}
                      <div>
                        <strong>{user.name}</strong>
                        <small>@{user.username}</small>
                      </div>
                    </a>
                    <hr />
                    <div className="profile-dropdown-links flex flex-col gap-1 [&_a]:rounded-lg [&_a]:px-3 [&_a]:py-2 [&_a]:text-left [&_a]:text-sm [&_a]:font-semibold [&_a]:transition [&_a]:hover:bg-foose-surface-low">
                      <a className="!bg-accent-light !text-accent hover:!bg-accent hover:!text-white" href={withBasePath('/orders')} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                        My orders
                      </a>
                      <a href={withBasePath('/wallet')} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                        Wallet
                      </a>
                      <span className="profile-dropdown-spacer h-3" />
                      <a href={withBasePath('/profile/settings')} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                        Profile settings
                      </a>
                      <a href={withBasePath('/account/settings')} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                        Account settings
                      </a>
                      <a href={withBasePath('/inbox?support=true')} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                        Help and support
                      </a>
                      <span className="profile-dropdown-spacer h-6" />
                      <a href={withBasePath('/account/settings')} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                        Account settings
                      </a>
                    </div>
                    <hr />
                    <button className="profile-dropdown-logout w-full rounded-lg border-0 bg-transparent px-3 py-2 text-left text-sm font-semibold text-foose-danger transition hover:bg-foose-surface-low" onClick={handleLogout} role="menuitem" type="button">
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : status === 'checking' ? null : (
              <a aria-label="Log in" className="icon-button inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-current transition hover:bg-white/15 hover:text-white" href={authHref('/login', redirectTarget)}>
                <Icon name="user" />
              </a>
            )}
          </div>
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
                <a aria-label="Inbox" className="icon-button relative inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-current transition hover:bg-accent-light hover:text-accent nav-icon [&.active]:bg-white [&.active]:text-accent" href={withBasePath('/inbox')}>
                  <Icon name="mail" />
                  {unreadMessageCount > 0 ? (
                    <span aria-label={`${unreadMessageCount} unread messages`} className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-white ring-2 ring-accent">
                      {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                    </span>
                  ) : hasSystemNotificationDot && (
                    <span aria-label="Unread system notification" className="absolute right-2 top-2 size-2.5 rounded-full bg-red-500 ring-2 ring-accent" />
                  )}
                </a>
                <a aria-label={shopLabel} className="icon-button inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-current transition hover:bg-accent-light hover:text-accent nav-icon [&.active]:bg-white [&.active]:text-accent" href={withBasePath(shopHref)}>
                  <Icon name="store" />
                </a>
                <div className="profile-menu-wrap relative" ref={desktopProfileMenuRef}>
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
                      <a
                        aria-label="View your public profile"
                        className="profile-dropdown-head flex items-center gap-3 rounded-lg p-2 transition hover:bg-foose-surface-low focus:outline-none focus:ring-2 focus:ring-accent/25 [&>span]:size-12 [&>span]:rounded-full [&_div]:flex [&_div]:min-w-0 [&_div]:flex-col [&_img]:size-12 [&_img]:rounded-full [&_img]:object-cover [&_small]:truncate [&_small]:text-xs [&_small]:text-foose-faint [&_strong]:truncate [&_strong]:text-sm [&_strong]:font-bold"
                        href={withBasePath(publicProfileHref)}
                        onClick={() => setProfileMenuOpen(false)}
                        role="menuitem"
                      >
                        {user.profilePhoto ? <img alt="" src={user.profilePhoto} /> : <span aria-hidden>{initials(user.name)}</span>}
                        <div>
                          <strong>{user.name}</strong>
                          <small>@{user.username}</small>
                        </div>
                      </a>
                      <hr />
                      <div className="profile-dropdown-links flex flex-col gap-1 [&_a]:rounded-lg [&_a]:px-3 [&_a]:py-2 [&_a]:text-left [&_a]:text-sm [&_a]:font-semibold [&_a]:transition [&_a]:hover:bg-foose-surface-low">
                        <a className="!bg-accent-light !text-accent hover:!bg-accent hover:!text-white" href={withBasePath('/orders')} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                          My orders
                        </a>
                        <a href={withBasePath('/wallet')} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                          Wallet
                        </a>
                        <span className="profile-dropdown-spacer h-3" />
                        <a href={withBasePath('/profile/settings')} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                          Profile settings
                        </a>
                        <a href={withBasePath('/account/settings')} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                          Account settings
                        </a>
                        <a href={withBasePath('/inbox?support=true')} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                          Help and support
                        </a>
                        <span className="profile-dropdown-spacer h-6" />
                        <a href={withBasePath('/account/settings')} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                          Account settings
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
    </>
  )
}
