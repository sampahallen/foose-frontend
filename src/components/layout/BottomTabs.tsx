import { useAuth } from '../../hooks/useAuth'
import { useMessaging } from '../../hooks/useMessaging'
import { scrollRevealStateClass, scrollRevealTransitionClass, useScrollRevealBand } from '../../hooks/useScrollRevealBand'
import { authHref } from '../../utils/authRedirect'
import { withBasePath } from '../../utils/navigation'
import { Icon } from '../icons/Icon'

export function BottomTabs({ active }: { active?: 'home' | 'browse' | 'cart' | 'community' | 'explore' | 'inbox' | 'profile' | 'saved' | 'shop' }) {
  const { status, user } = useAuth()
  const { unreadMessageCount, unreadNotificationCount } = useMessaging()
  const scrollVisible = useScrollRevealBand()
  const guardedHref = (target: string) => (user || status === 'checking' ? withBasePath(target) : authHref('/login', target))
  const hasSystemNotificationDot = unreadMessageCount === 0 && unreadNotificationCount > 0

  return (
    <nav className={`bottom-tabs fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 mx-auto grid min-h-[var(--foose-bottom-nav-height)] w-[calc(100%-2rem)] max-w-[560px] grid-cols-5 gap-1 rounded-[24px] border border-white/20 bg-[linear-gradient(105deg,#111a4a_0%,#192a89_56%,#2642fb_100%)] p-2 shadow-[0_16px_40px_rgb(4_10_44_/_32%)] backdrop-blur ${scrollRevealTransitionClass} ${scrollRevealStateClass(scrollVisible, 'down')} lg:hidden [&_a]:flex [&_a]:min-h-12 [&_a]:min-w-0 [&_a]:items-center [&_a]:justify-center [&_a]:rounded-[18px] [&_a]:text-white/75 [&_a]:transition [&_a]:hover:bg-white/10 [&_a]:hover:text-white [&_a.active]:bg-white [&_a.active]:text-[#1d329c] [&_a.active]:shadow-[0_3px_12px_rgb(5_11_42_/_16%)]`} aria-label="Mobile navigation">
      <a className={active === 'home' ? 'active' : ''} href={withBasePath('/')}>
        <Icon name="store" size={22} />
        <span className="sr-only">Home</span>
      </a>
      <a className={active === 'browse' ? 'active' : ''} href={withBasePath('/browse')}>
        <Icon name="bag" size={22} />
        <span className="sr-only">Browse</span>
      </a>
      <a className={active === 'community' ? 'active' : ''} href={withBasePath('/community')}>
        <Icon name="grid" size={22} />
        <span className="sr-only">Community</span>
      </a>
      <a className={active === 'saved' ? 'active' : ''} href={guardedHref('/saved')}>
        <Icon name="heart" size={22} />
        <span className="sr-only">Saved</span>
      </a>
      <a className={`relative ${active === 'inbox' ? 'active' : ''}`} href={guardedHref('/inbox')}>
        <Icon name="mail" size={22} />
        {unreadMessageCount > 0 ? (
          <span aria-label={`${unreadMessageCount} unread messages`} className={`absolute right-2 top-0 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none ring-2 ${active === 'inbox' ? 'bg-[#1d329c] text-white ring-white' : 'bg-white text-[#1d329c] ring-[#192a89]'}`}>
            {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
          </span>
        ) : hasSystemNotificationDot && (
          <span aria-label="Unread system notification" className={`absolute right-4 top-1 size-2.5 rounded-full ring-2 ${active === 'inbox' ? 'bg-[#1d329c] ring-white' : 'bg-white ring-[#192a89]'}`} />
        )}
        <span className="sr-only">Inbox</span>
      </a>
    </nav>
  )
}
