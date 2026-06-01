import { useAuth } from '../../hooks/useAuth'
import { authHref } from '../../utils/authRedirect'
import { withBasePath } from '../../utils/navigation'
import { Icon } from '../icons/Icon'

export function BottomTabs({ active }: { active?: 'home' | 'browse' | 'community' | 'profile' | 'saved' }) {
  const { status, user } = useAuth()
  const guardedHref = (target: string) => (user || status === 'checking' ? withBasePath(target) : authHref('/register', target))

  return (
    <nav className="bottom-tabs" aria-label="Mobile navigation">
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
      <a className={active === 'profile' ? 'active' : ''} href={guardedHref('/profile')}>
        <Icon name="user" />
        Profile
      </a>
    </nav>
  )
}
