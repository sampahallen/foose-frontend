import { useAuth } from '../../hooks/useAuth'
import { useMessaging } from '../../hooks/useMessaging'
import { authHref } from '../../utils/authRedirect'
import { withBasePath } from '../../utils/navigation'
import { Icon } from '../icons/Icon'

export function BottomTabs({ active }: { active?: 'home' | 'browse' | 'cart' | 'community' | 'explore' | 'profile' | 'saved' | 'shop' }) {
  const { status, user } = useAuth()
  const { unreadMessageCount, unreadNotificationCount } = useMessaging()
  const guardedHref = (target: string) => (user || status === 'checking' ? withBasePath(target) : authHref('/login', target))
  const hasSystemNotificationDot = unreadMessageCount === 0 && unreadNotificationCount > 0

  return (
    <nav className="bottom-tabs fixed inset-x-0 bottom-0 z-50 grid min-h-[var(--foose-bottom-nav-inset)] grid-cols-5 gap-1 border-t border-foose-border bg-foose-surface/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 text-[10px] font-semibold shadow-[0_-8px_24px_rgba(15,16,32,0.08)] backdrop-blur min-[360px]:text-xs lg:hidden [&_a]:flex [&_a]:min-h-12 [&_a]:min-w-0 [&_a]:flex-col [&_a]:items-center [&_a]:gap-1 [&_a]:rounded-lg [&_a]:px-1 [&_a]:py-1.5 [&_a]:text-foose-faint [&_a.active]:bg-accent [&_a.active]:text-white" aria-label="Mobile navigation">
      <a className={active === 'home' ? 'active' : ''} href={withBasePath('/')}>
        <Icon name="store" />
        Home
      </a>
      <a className={active === 'browse' ? 'active' : ''} href={withBasePath('/browse')}>
        <Icon name="bag" />
        Browse
      </a>
      <a className={active === 'community' ? 'active' : ''} href={withBasePath('/community')}>
        <Icon name="grid" />
        Community
      </a>
      <a className={active === 'saved' ? 'active' : ''} href={guardedHref('/saved')}>
        <Icon name="heart" />
        Saved
      </a>
      <a className="relative" href={guardedHref('/inbox')}>
        <Icon name="mail" />
        {unreadMessageCount > 0 ? (
          <span aria-label={`${unreadMessageCount} unread messages`} className="absolute right-2 top-0 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-white ring-2 ring-white">
            {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
          </span>
        ) : hasSystemNotificationDot && (
          <span aria-label="Unread system notification" className="absolute right-4 top-1 size-2.5 rounded-full bg-red-500 ring-2 ring-white" />
        )}
        Inbox
      </a>
    </nav>
  )
}
