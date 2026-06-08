import { useAuth } from '../../hooks/useAuth'
import { authHref } from '../../utils/authRedirect'
import { withBasePath } from '../../utils/navigation'
import { Icon } from '../icons/Icon'

export function BottomTabs({ active }: { active?: 'home' | 'browse' | 'community' | 'profile' | 'saved' }) {
  const { status, user } = useAuth()
  const guardedHref = (target: string) => (user || status === 'checking' ? withBasePath(target) : authHref('/register', target))

  return (
    <nav className="bottom-tabs fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 gap-1 border-t border-foose-border bg-foose-surface/95 px-2 py-2 text-xs font-semibold shadow-[0_-8px_24px_rgba(15,16,32,0.08)] backdrop-blur md:grid-cols-6 lg:hidden [&_a]:flex [&_a]:min-w-0 [&_a]:flex-col [&_a]:items-center [&_a]:gap-1 [&_a]:rounded-lg [&_a]:px-1 [&_a]:py-2 [&_a]:text-foose-faint [&_a.active]:bg-accent [&_a.active]:text-white" aria-label="Mobile navigation">
      <a className={active === 'home' ? 'active' : ''} href={withBasePath('/')}>
        <Icon name="store" />
        Home
      </a>
      <a className={active === 'browse' ? 'active' : ''} href={withBasePath('/browse')}>
        <Icon name="search" />
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
      <a href={guardedHref('/inbox')}>
        <Icon name="mail" />
        Inbox
      </a>
      {user?.hasShop && (
        <a href={guardedHref('/manage-shop')}>
          <Icon name="store" />
          Shop
        </a>
      )}
      <a className={active === 'profile' ? 'active' : ''} href={guardedHref('/profile')}>
        <Icon name="user" />
        Profile
      </a>
    </nav>
  )
}
