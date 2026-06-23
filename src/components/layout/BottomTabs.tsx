import { useAuth } from '../../hooks/useAuth'
import { useApiResource } from '../../hooks/useApiResource'
import type { ChatConversation } from '../../types/api'
import { authHref } from '../../utils/authRedirect'
import { withBasePath } from '../../utils/navigation'
import { Icon } from '../icons/Icon'

export function BottomTabs({ active }: { active?: 'home' | 'browse' | 'community' | 'profile' | 'saved' }) {
  const { status, user } = useAuth()
  const guardedHref = (target: string) => (user || status === 'checking' ? withBasePath(target) : authHref('/login', target))
  const conversationPreview = useApiResource<{ conversations: ChatConversation[] }>('/chat?page=1&limit=8', Boolean(user))
  const hasUnreadMessages = Boolean(conversationPreview.data?.conversations.some((conversation) => conversation.unreadCount > 0))

  return (
    <nav className="bottom-tabs fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 gap-1 border-t border-foose-border bg-foose-surface/95 px-2 py-2 text-xs font-semibold shadow-[0_-8px_24px_rgba(15,16,32,0.08)] backdrop-blur lg:hidden [&_a]:flex [&_a]:min-w-0 [&_a]:flex-col [&_a]:items-center [&_a]:gap-1 [&_a]:rounded-lg [&_a]:px-1 [&_a]:py-2 [&_a]:text-foose-faint [&_a.active]:bg-accent [&_a.active]:text-white" aria-label="Mobile navigation">
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
      <a className="relative" href={guardedHref('/inbox')}>
        <Icon name="mail" />
        {hasUnreadMessages && <span aria-hidden className="absolute right-4 top-1 size-2.5 rounded-full bg-red-500 ring-2 ring-white" />}
        Inbox
      </a>
    </nav>
  )
}
