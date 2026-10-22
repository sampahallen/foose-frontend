import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { getAppName } from '../../config/env'
import { useAuth } from '../../hooks/useAuth'
import { useCart } from '../../hooks/useCart'
import { useMessaging } from '../../hooks/useMessaging'
import { scrollRevealStateClass, scrollRevealTransitionClass, useScrollRevealBand } from '../../hooks/useScrollRevealBand'
import { authHref, currentRedirectTarget } from '../../utils/authRedirect'
import { initials } from '../../utils/format'
import { navigateTo, withBasePath } from '../../utils/navigation'
import { Icon } from '../icons/Icon'
import whiteLogo from '../../assets/foose-logo-white.png'

export function TopNav({
  active,
  className = '',
}: {
  active?: 'home' | 'browse' | 'cart' | 'community' | 'explore' | 'inbox' | 'profile' | 'saved' | 'shop'
  className?: string
  searchPlaceholder?: string
}) {
  const { logout, status, user } = useAuth()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const desktopProfileMenuRef = useRef<HTMLDivElement | null>(null)
  const mobileProfileMenuRef = useRef<HTMLDivElement | null>(null)
  const brand = getAppName()
  const { items: cartItems } = useCart()
  const { unreadMessageCount, unreadNotificationCount } = useMessaging()
  const scrollVisible = useScrollRevealBand()
  const redirectTarget = currentRedirectTarget()
  const shopHref = user?.hasShop ? '/manage-shop' : '/open-shop'
  const shopLabel = user?.hasShop ? 'Manage shop' : 'Open shop'
  const publicProfileHref = user?.username ? `/profile/${encodeURIComponent(user.username)}` : '/profile'
  const hasSystemNotificationDot = unreadMessageCount === 0 && unreadNotificationCount > 0
  const cartCount = cartItems.length
  const cartCountLabel = cartCount > 99 ? '99+' : String(cartCount)
  const cartLabel = `Cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`

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

  function handleLogout() {
    setProfileMenuOpen(false)
    void logout()
  }

  function openExplore(event: ReactMouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    event.preventDefault()
    navigateTo('/search', { state: { focusSearch: true } })
  }

  return (
    <>
      <header className={`top-nav sticky top-0 z-50 h-16 border-b border-white/[0.13] bg-[linear-gradient(105deg,#111a4a_0%,#192a89_56%,#2642fb_100%)] text-white shadow-[0_12px_28px_rgb(15_24_82_/_13%)] backdrop-blur lg:h-[78px] ${scrollRevealTransitionClass} ${scrollRevealStateClass(active === 'profile' || profileMenuOpen || scrollVisible)} [&_.icon-button]:text-white [&_.icon-button]:hover:bg-white/15 [&_.icon-button]:hover:text-white ${className}`}>
        <div className="nav-inner mx-auto flex h-full w-full max-w-[1280px] items-center justify-between gap-2 px-4 md:px-6 lg:max-w-[1440px] lg:gap-[30px] lg:px-9 max-lg:justify-between">
          <a aria-label={`${brand} home`} className="brand-logo inline-flex min-w-16 items-center font-display text-xl font-bold sm:min-w-20 [&_img]:h-auto [&_img]:w-16 [&_img]:sm:w-20 [&_img]:md:w-[86px] lg:[&_img]:w-[102px]" href={withBasePath('/')}>
            <img src={whiteLogo} alt="" />
          </a>
          <div className="mobile-nav-actions ml-auto flex items-center gap-0.5 lg:hidden">
            <a
              aria-current={active === 'explore' ? 'page' : undefined}
              aria-label="Explore Foose"
              className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border px-3 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-white/30 ${active === 'explore' ? 'border-white bg-white text-[#1d329c]' : 'border-white/30 bg-white/10 text-white hover:border-white/65 hover:bg-white/20'}`}
              href={withBasePath('/search')}
              onClick={openExplore}
            >
              <Icon name="search" size={18} /> Explore
            </a>
            <a aria-current={active === 'cart' ? 'page' : undefined} aria-label={cartLabel} className={`icon-button relative inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.08] text-current transition hover:border-white/50 hover:bg-white/[0.18] ${active === 'cart' ? '!border-white !bg-white !text-[#1d329c] hover:!bg-white hover:!text-[#1d329c]' : ''}`} href={withBasePath('/cart')}>
              <Icon name="cart" />
              {cartCount > 0 && (
                <span aria-hidden className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-accent-light px-1.5 py-0.5 text-[10px] font-black leading-none text-accent ring-2 ring-accent">
                  {cartCountLabel}
                </span>
              )}
            </a>
            {user ? (
              <div className="profile-menu-wrap relative" ref={mobileProfileMenuRef}>
                <button
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Open profile menu"
                  className={`avatar-link inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-sm font-bold text-white [&_span]:inline-flex [&_span]:size-10 [&_span]:shrink-0 [&_span]:items-center [&_span]:justify-center [&_span]:rounded-full [&_span]:bg-white/10 [&_span]:text-sm [&_span]:font-bold [&_span]:text-white [&_img]:inline-flex [&_img]:size-10 [&_img]:shrink-0 [&_img]:items-center [&_img]:justify-center [&_img]:rounded-full [&_img]:bg-white/10 [&_img]:text-sm [&_img]:font-bold [&_img]:text-white [&_img]:object-cover profile-menu-trigger border border-white/20 hover:border-white/50 hover:bg-white/[0.18] ${active === 'profile' || active === 'shop' ? 'active' : ''} `}
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
                      <a aria-current={active === 'shop' ? 'page' : undefined} href={withBasePath(shopHref)} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                        {shopLabel}
                      </a>
                      <span className="profile-dropdown-spacer h-3" />
                      <a href={withBasePath('/profile/settings')} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                        Profile
                      </a>
                      <a href={withBasePath('/settings')} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                        Settings
                      </a>
                      <a href={withBasePath('/inbox?support=true')} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                        Help and support
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
              <a aria-label="Log in" className="icon-button inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.08] text-current transition hover:border-white/50 hover:bg-white/[0.18]" href={authHref('/login', redirectTarget)}>
                <Icon name="user" />
              </a>
            )}
          </div>
          <nav className="nav-links hidden items-center lg:flex lg:gap-0.5 lg:rounded-full lg:border lg:border-white/20 lg:bg-white/[0.08] lg:p-[5px]" aria-label="Primary navigation">
            <a className={`rounded-full px-4 py-2.5 text-center text-[13px] font-bold tracking-[0.01em] text-white/85 transition hover:bg-white/15 hover:text-white ${active === 'home' ? '!bg-white !text-[#1d329c] shadow-[0_3px_12px_rgb(5_11_42_/_16%)] hover:!bg-white hover:!text-[#1d329c]' : ''}`} href={withBasePath('/')}>
              Home
            </a>
            <a className={`rounded-full px-4 py-2.5 text-center text-[13px] font-bold tracking-[0.01em] text-white/85 transition hover:bg-white/15 hover:text-white ${active === 'browse' ? '!bg-white !text-[#1d329c] shadow-[0_3px_12px_rgb(5_11_42_/_16%)] hover:!bg-white hover:!text-[#1d329c]' : ''}`} href={withBasePath('/browse')}>
              Browse
            </a>
            <a className={`rounded-full px-4 py-2.5 text-center text-[13px] font-bold tracking-[0.01em] text-white/85 transition hover:bg-white/15 hover:text-white ${active === 'community' ? '!bg-white !text-[#1d329c] shadow-[0_3px_12px_rgb(5_11_42_/_16%)] hover:!bg-white hover:!text-[#1d329c]' : ''}`} href={withBasePath('/community')}>
              Community
            </a>
          </nav>
          <div className="nav-actions ml-auto hidden items-center gap-2 lg:flex lg:gap-[7px]">
            <a
              aria-current={active === 'explore' ? 'page' : undefined}
              className={`inline-flex min-h-[42px] items-center gap-2 rounded-full border px-[18px] text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-white/30 ${active === 'explore' ? 'border-white bg-white text-[#1d329c]' : 'border-white/30 bg-white/10 text-white hover:border-white/65 hover:bg-white/20'}`}
              href={withBasePath('/search')}
              onClick={openExplore}
            >
              <Icon name="search" size={18} /> Explore
            </a>
            <a aria-label="Saved" className={`icon-button inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.08] text-current transition hover:border-white/50 hover:bg-white/[0.18] nav-icon ${active === 'saved' ? '!border-white !bg-white !text-[#1d329c] hover:!bg-white hover:!text-[#1d329c]' : ''}`} href={withBasePath('/saved')}>
              <Icon name="heart" />
            </a>
            <a aria-current={active === 'cart' ? 'page' : undefined} aria-label={cartLabel} className={`icon-button relative inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.08] text-current transition hover:border-white/50 hover:bg-white/[0.18] nav-icon ${active === 'cart' ? '!border-white !bg-white !text-[#1d329c] hover:!bg-white hover:!text-[#1d329c]' : ''}`} href={withBasePath('/cart')}>
              <Icon name="cart" />
              {cartCount > 0 && (
                <span aria-hidden className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-accent-light px-1.5 py-0.5 text-[10px] font-black leading-none text-accent ring-2 ring-accent">
                  {cartCountLabel}
                </span>
              )}
            </a>
            {user ? (
              <>
                <a aria-label="Inbox" className="icon-button relative inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.08] text-current transition hover:border-white/50 hover:bg-white/[0.18] nav-icon" href={withBasePath('/inbox')}>
                  <Icon name="mail" />
                  {unreadMessageCount > 0 ? (
                    <span aria-label={`${unreadMessageCount} unread messages`} className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-accent-light px-1.5 py-0.5 text-[10px] font-black leading-none text-accent ring-2 ring-accent">
                      {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                    </span>
                  ) : hasSystemNotificationDot && (
                    <span aria-label="Unread system notification" className="absolute right-2 top-2 size-2.5 rounded-full bg-accent-light ring-2 ring-accent" />
                  )}
                </a>
                <div className="profile-menu-wrap relative" ref={desktopProfileMenuRef}>
                  <button
                    aria-expanded={profileMenuOpen}
                    aria-haspopup="menu"
                    aria-label="Open profile menu"
                    className={`avatar-link inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent [&_span]:inline-flex [&_span]:size-10 [&_span]:shrink-0 [&_span]:items-center [&_span]:justify-center [&_span]:rounded-full [&_span]:bg-accent-light [&_span]:text-sm [&_span]:font-bold [&_span]:text-accent [&_img]:inline-flex [&_img]:size-10 [&_img]:shrink-0 [&_img]:items-center [&_img]:justify-center [&_img]:rounded-full [&_img]:bg-accent-light [&_img]:text-sm [&_img]:font-bold [&_img]:text-accent [&_img]:object-cover profile-menu-trigger border border-white/20 bg-white/[0.08] hover:border-white/50 hover:bg-white/[0.18] ${active === 'profile' || active === 'shop' ? 'active' : ''} `}
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
                        <a aria-current={active === 'shop' ? 'page' : undefined} href={withBasePath(shopHref)} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                          {shopLabel}
                        </a>
                        <span className="profile-dropdown-spacer h-3" />
                        <a href={withBasePath('/profile/settings')} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                          Profile
                        </a>
                        <a href={withBasePath('/settings')} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                          Settings
                        </a>
                        <a href={withBasePath('/inbox?support=true')} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                          Help and support
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
              <div className="auth-links flex items-center gap-2 [&>a:first-child]:rounded-full [&>a:first-child]:px-4 [&>a:first-child]:py-2 [&>a:first-child]:text-sm [&>a:first-child]:font-semibold [&>a:first-child]:text-white/90 [&>a:first-child]:hover:bg-white/10">
                <a href={authHref('/login', redirectTarget)}>Log in</a>
                <a className="button inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full border border-white bg-white px-5 py-2.5 text-center text-sm font-bold text-[#1d329c] shadow-[0_5px_14px_rgb(4_10_44_/_13%)] transition hover:bg-[#e8ebff] hover:text-[#14267e] disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full" href={authHref('/register', redirectTarget)}>
                  Sign up
                </a>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  )
}
