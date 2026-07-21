import { useEffect, useRef, useState, type Dispatch, type ReactNode, type RefObject, type SetStateAction } from 'react'
import { MdOutlineAddReaction } from 'react-icons/md'
import { LuReply } from 'react-icons/lu'
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

function reactionOption(reaction: ChatReactionName) {
  return reactionOptions.find((option) => option.name === reaction)
}

function OtherReactions({ reactions }: { reactions: ChatReaction[] }) {
  if (!reactions.length) return null

  return (
    <div
      aria-label={reactions.map((reaction) => {
        const option = reactionOption(reaction.reaction)
        return `${option?.label || 'Reaction'} from ${userName(reaction.userId)}`
      }).join(', ')}
      className="pointer-events-auto inline-flex h-7 items-center gap-0.5 rounded-full border border-foose-border bg-white px-1.5 text-sm shadow-sm"
    >
      {reactions.map((reaction, index) => {
        const option = reactionOption(reaction.reaction)
        const count = reactionCount(reactions, reaction.reaction)
        const duplicate = reactions.findIndex((item) => item.reaction === reaction.reaction) !== index
        if (!option || duplicate) return null
        return (
          <span className="inline-flex items-center gap-0.5" key={option.name} title={`${option.label} from ${userName(reaction.userId)}`}>
            <span aria-hidden>{option.symbol}</span>
            {count > 1 && <span className="text-[10px] font-black text-foose-muted">{count}</span>}
          </span>
        )
      })}
    </div>
  )
}

function ReactionControl({
  currentReaction,
  incoming = false,
  messageId,
  myReaction,
  onReact,
  open,
  setOpen,
  wrapperRef,
}: {
  currentReaction?: ReturnType<typeof reactionOption>
  incoming?: boolean
  messageId: string
  myReaction?: ChatReactionName
  onReact: (messageId: string, reaction: ChatReactionName) => void
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
  wrapperRef: RefObject<HTMLDivElement | null>
}) {
  return (
    <div className="pointer-events-auto relative h-7" ref={wrapperRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={currentReaction ? `${currentReaction.label} reaction. Change or remove reaction` : 'Add reaction'}
        className={`inline-flex size-7 items-center justify-center rounded-full border text-sm shadow-sm transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:hover:translate-y-0 ${currentReaction ? 'border-accent/20 bg-white' : 'border-foose-border bg-white text-foose-muted hover:text-accent'}`}
        onClick={() => setOpen((current) => !current)}
        title={currentReaction ? 'Change or remove reaction' : 'Add reaction'}
        type="button"
      >
        {currentReaction ? <span aria-hidden>{currentReaction.symbol}</span> : <MdOutlineAddReaction aria-hidden size={17} />}
      </button>
      {open && (
        <div
          aria-label="Choose a reaction"
          className={`message-reaction-picker absolute bottom-9 z-30 flex items-center gap-0.5 rounded-full border border-foose-border bg-white p-1.5 shadow-xl ${incoming ? 'left-0 origin-bottom-left' : 'right-0 origin-bottom-right'}`}
          role="menu"
        >
          {reactionOptions.map((option) => {
            const active = myReaction === option.name
            return (
              <button
                aria-label={active ? `Undo ${option.label} reaction` : option.label}
                className={`inline-flex size-9 items-center justify-center rounded-full text-lg transition hover:-translate-y-1 hover:bg-accent-light focus-visible:outline-2 focus-visible:outline-accent motion-reduce:hover:translate-y-0 ${active ? 'bg-accent-light ring-1 ring-accent/25' : ''}`}
                key={option.name}
                onClick={() => {
                  onReact(messageId, option.name)
                  setOpen(false)
                }}
                role="menuitem"
                type="button"
              >
                <span aria-hidden>{option.symbol}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
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
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false)
  const reactionControlRef = useRef<HTMLDivElement | null>(null)
  const myReaction = reactions.find((reaction) => userIdValue(reaction.userId) === currentUserId)?.reaction
  const otherReactions = reactions.filter((reaction) => userIdValue(reaction.userId) !== currentUserId)
  const selectedReaction = myReaction ? reactionOption(myReaction) : undefined
  const replyText = replySummary(replyTo)
  const replySender = typeof replyTo === 'object' ? userName(replyTo.senderId) : ''
  const previewItems = attachments.map((attachment) => ({
    alt: attachment.originalname || 'Message attachment',
    src: attachment.url,
    type: attachment.type === 'video' ? 'video' as const : 'image' as const,
  }))

  useEffect(() => {
    if (!reactionPickerOpen) return undefined

    function closeOnOutsideClick(event: MouseEvent) {
      if (!reactionControlRef.current?.contains(event.target as Node)) setReactionPickerOpen(false)
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setReactionPickerOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [reactionPickerOpen])

  const replyButton = onReply ? (
    <button
      aria-label="Reply to this message"
      className="inline-flex size-9 shrink-0 items-center justify-center self-center rounded-full text-foose-muted transition hover:bg-foose-surface-high hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      onClick={onReply}
      title="Reply"
      type="button"
    >
      <LuReply aria-hidden size={18} />
    </button>
  ) : null

  return (
    <div className={`message-row relative flex w-full items-center gap-1.5 pb-3 sm:gap-2 ${incoming ? 'justify-start' : 'justify-end'}`} id={messageId ? `chat-message-${messageId}` : undefined}>
      {!incoming && replyButton}
      <div className={`message relative flex max-w-[82%] flex-col gap-2 rounded-2xl px-4 py-3 text-sm shadow-sm [&.incoming]:rounded-bl-sm [&.incoming]:bg-foose-surface-high [&.incoming]:text-foose-text [&.outgoing]:rounded-br-sm [&.outgoing]:bg-accent [&.outgoing]:text-white [&_time]:block [&_time]:text-xs [&_time]:opacity-70 max-md:max-w-[86%] ${incoming ? 'incoming' : 'outgoing'}`}>
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
      {(Boolean(messageId && onReact) || otherReactions.length > 0) && (
        <div className="message-reaction-rail pointer-events-none absolute inset-x-2 bottom-0 z-20 flex h-7 translate-y-1/2 items-center justify-between">
          <div className="flex h-7 min-w-7 items-center justify-start">
            {incoming ? (
              messageId && onReact && (
                <ReactionControl currentReaction={selectedReaction} incoming messageId={messageId} myReaction={myReaction} onReact={onReact} open={reactionPickerOpen} setOpen={setReactionPickerOpen} wrapperRef={reactionControlRef} />
              )
            ) : (
              <OtherReactions reactions={otherReactions} />
            )}
          </div>
          <div className="flex h-7 min-w-7 items-center justify-end">
            {incoming ? (
              <OtherReactions reactions={otherReactions} />
            ) : (
              messageId && onReact && (
                <ReactionControl currentReaction={selectedReaction} messageId={messageId} myReaction={myReaction} onReact={onReact} open={reactionPickerOpen} setOpen={setReactionPickerOpen} wrapperRef={reactionControlRef} />
              )
            )}
          </div>
        </div>
      )}
      </div>
      {incoming && replyButton}
    </div>
  )
}
