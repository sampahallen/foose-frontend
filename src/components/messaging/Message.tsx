import type { ReactNode } from 'react'
import { useImagePreviewStore } from '../../stores/imagePreviewStore'
import type { ChatAttachment, ChatMessagePreview, ChatReaction, ChatReactionName, Listing, User } from '../../types/api'
import { formatMoney, getListingImage } from '../../utils/format'
import { LightboxImage } from '../ui/LightboxImage'

const reactionOptions: Array<{ label: string; name: ChatReactionName; symbol: string }> = [
  { label: 'Thumbs up', name: 'thumbs_up', symbol: '👍' },
  { label: 'Heart', name: 'heart', symbol: '❤️' },
  { label: 'Thumbs down', name: 'thumbs_down', symbol: '👎' },
  { label: 'Fire', name: 'fire', symbol: '🔥' },
  { label: 'Sad', name: 'sad', symbol: '😢' },
  { label: 'Laugh', name: 'laugh', symbol: '😂' },
]

function listingTitle(listing: Listing | string | undefined) {
  if (!listing || typeof listing === 'string') return ''
  return listing.title
}

function listingImage(listing: Listing | string | undefined) {
  if (!listing || typeof listing === 'string') return undefined
  return getListingImage(listing)
}

function listingPrice(listing: Listing | string | undefined) {
  if (!listing || typeof listing === 'string') return ''
  return formatMoney(listing.price, listing.currency)
}

function userIdValue(user: User | string | undefined) {
  if (!user) return ''
  return typeof user === 'string' ? user : user._id
}

function userName(user: User | string | undefined) {
  if (!user || typeof user === 'string') return 'Foose member'
  return user.name || user.username || 'Foose member'
}

function replySummary(replyTo: ChatMessagePreview | string | undefined) {
  if (!replyTo || typeof replyTo === 'string') return ''
  return replyTo.content?.trim() || (replyTo.attachments?.length ? 'Attachment' : listingTitle(replyTo.listingId) || 'Message')
}

function reactionCount(reactions: ChatReaction[], reaction: ChatReactionName) {
  return reactions.filter((item) => item.reaction === reaction).length
}

export function Message({
  attachments = [],
  children,
  currentUserId = '',
  incoming = false,
  listing,
  messageId,
  onReact,
  onReply,
  reactions = [],
  replyTo,
  subtitle,
}: {
  attachments?: ChatAttachment[]
  children: ReactNode
  currentUserId?: string
  incoming?: boolean
  listing?: Listing | string
  messageId?: string
  onReact?: (messageId: string, reaction: ChatReactionName) => void
  onReply?: () => void
  reactions?: ChatReaction[]
  replyTo?: ChatMessagePreview | string
  subtitle?: string
}) {
  const openPreview = useImagePreviewStore((store) => store.openPreview)
  const myReaction = reactions.find((reaction) => userIdValue(reaction.userId) === currentUserId)?.reaction
  const replyText = replySummary(replyTo)
  const replySender = typeof replyTo === 'object' ? userName(replyTo.senderId) : ''
  const previewItems = attachments.map((attachment) => ({
    alt: attachment.originalname || 'Message attachment',
    src: attachment.url,
    type: attachment.type === 'video' ? 'video' as const : 'image' as const,
  }))

  return (
    <div className={`message max-w-[82%] space-y-2 rounded-2xl px-4 py-3 text-sm shadow-sm [&.incoming]:self-start [&.incoming]:rounded-bl-sm [&.incoming]:bg-foose-surface-high [&.incoming]:text-foose-text [&.outgoing]:self-end [&.outgoing]:rounded-br-sm [&.outgoing]:bg-accent [&.outgoing]:text-white [&:not(.incoming)]:self-end [&:not(.incoming)]:rounded-br-sm [&:not(.incoming)]:bg-accent [&:not(.incoming)]:text-white [&_time]:block [&_time]:text-xs [&_time]:opacity-70 max-md:max-w-[92%] ${incoming ? 'incoming' : 'outgoing'} `}>
      {replyText && (
        <div className={`rounded-xl border-l-4 px-3 py-2 text-xs ${incoming ? 'border-accent bg-white/80 text-foose-muted' : 'border-white bg-white/15 text-white/85'}`}>
          <strong className="block truncate">{replySender}</strong>
          <span className="line-clamp-2">{replyText}</span>
        </div>
      )}
      {listingTitle(listing) && (
        <div className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-3 rounded-xl bg-white/90 p-2 text-foose-text shadow-sm">
          {listingImage(listing) ? <img alt="" className="size-12 rounded-lg object-cover" src={listingImage(listing)} /> : <span className="size-12 rounded-lg bg-foose-surface-mid" />}
          <span className="min-w-0">
            <strong className="block truncate text-xs font-black">{listingTitle(listing)}</strong>
            <small className="text-xs font-bold text-accent">{listingPrice(listing)}</small>
          </span>
        </div>
      )}
      {children && <p>{children}</p>}
      {!!attachments.length && (
        <div className="message-attachments flex flex-wrap gap-2 [&_img]:max-h-44 [&_img]:rounded-lg [&_img]:object-cover [&_video]:max-h-44 [&_video]:rounded-lg [&_video]:object-cover">
          {attachments.map((attachment, index) =>
            attachment.type === 'video' ? (
              <button
                className="block border-0 bg-transparent p-0"
                key={attachment.url}
                onClick={() => openPreview(previewItems, index)}
                type="button"
              >
                <video muted src={attachment.url} />
              </button>
            ) : (
              <LightboxImage alt={attachment.originalname || 'Message attachment'} index={index} items={previewItems} key={attachment.url} src={attachment.url} />
            ),
          )}
        </div>
      )}
      {subtitle && <time>{subtitle}</time>}
      <div className={`flex flex-wrap items-center gap-1 pt-1 ${incoming ? 'text-foose-muted' : 'text-white/85'}`}>
        {onReply && (
          <button className="mr-1 rounded-full px-2 py-1 text-xs font-bold transition hover:bg-black/10" onClick={onReply} type="button">
            Reply
          </button>
        )}
        {messageId &&
          reactionOptions.map((option) => {
            const count = reactionCount(reactions, option.name)
            const active = myReaction === option.name
            return (
              <button
                aria-label={option.label}
                className={`inline-flex min-h-7 items-center gap-1 rounded-full px-2 text-xs font-bold transition ${active ? 'bg-white text-accent shadow-sm' : incoming ? 'bg-white/70 hover:bg-white' : 'bg-white/15 hover:bg-white/25'}`}
                key={option.name}
                onClick={() => onReact?.(messageId, option.name)}
                type="button"
              >
                <span>{option.symbol}</span>
                {count > 0 && <span>{count}</span>}
              </button>
            )
          })}
      </div>
    </div>
  )
}
