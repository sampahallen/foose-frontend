import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { MdOutlineAddReaction } from 'react-icons/md'
import { LuReply } from 'react-icons/lu'
import { useLongPress } from '../../hooks/useLongPress'
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

const REACTION_PICKER_VIEWPORT_MARGIN = 8

function ReactionPicker({
  anchorRef,
  myReaction,
  onSelect,
}: {
  anchorRef: RefObject<HTMLElement | null>
  myReaction?: ChatReactionName
  onSelect: (reaction: ChatReactionName) => void
}) {
  const pickerRef = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState({ openUpward: true, shiftPx: 0 })

  useLayoutEffect(() => {
    function recalculate() {
      // Measured on the wrapper, not the animated `.message-reaction-picker` element:
      // that element's CSS pop-in animation drives `transform` for its whole duration
      // (and would fight over the same property with the positioning transform below),
      // so positioning lives on this plain, unanimated wrapper instead.
      const wrapper = pickerRef.current
      const anchor = anchorRef.current
      if (!wrapper || !anchor) return

      const anchorRect = anchor.getBoundingClientRect()
      const wrapperWidth = wrapper.offsetWidth
      const wrapperHeight = wrapper.offsetHeight

      const centerX = anchorRect.left + anchorRect.width / 2
      const naturalLeft = centerX - wrapperWidth / 2
      const minLeft = REACTION_PICKER_VIEWPORT_MARGIN
      const maxLeft = window.innerWidth - wrapperWidth - REACTION_PICKER_VIEWPORT_MARGIN
      const clampedLeft = Math.min(Math.max(naturalLeft, minLeft), maxLeft)

      const openUpward = anchorRect.top - wrapperHeight - REACTION_PICKER_VIEWPORT_MARGIN >= 0

      setPosition({ openUpward, shiftPx: clampedLeft - naturalLeft })
    }

    recalculate()
    window.addEventListener('resize', recalculate)
    return () => window.removeEventListener('resize', recalculate)
  }, [anchorRef])

  return (
    <div
      className={`absolute left-1/2 z-10 ${position.openUpward ? 'bottom-full mb-2' : 'top-full mt-2'}`}
      ref={pickerRef}
      style={{ transform: `translateX(calc(-50% + ${position.shiftPx}px))` }}
    >
      <div
        aria-label="Choose a reaction"
        className={`message-reaction-picker flex items-center gap-0.5 rounded-full border border-foose-border bg-foose-surface p-1.5 shadow-xl ${position.openUpward ? 'origin-bottom' : 'origin-top'}`}
        role="menu"
      >
        {reactionOptions.map((option) => {
          const active = myReaction === option.name
          return (
            <button
              aria-label={active ? `Undo ${option.label} reaction` : option.label}
              className={`inline-flex size-9 items-center justify-center rounded-full text-lg transition hover:-translate-y-1 hover:bg-accent-light focus-visible:outline-2 focus-visible:outline-accent motion-reduce:hover:translate-y-0 ${active ? 'bg-accent-light ring-1 ring-accent/25' : ''}`}
              key={option.name}
              onClick={() => onSelect(option.name)}
              role="menuitem"
              type="button"
            >
              <span aria-hidden>{option.symbol}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ReactionSummaryRow({
  myReaction,
  onRemoveMine,
  otherReactions,
}: {
  myReaction?: ChatReactionName
  onRemoveMine: () => void
  otherReactions: ChatReaction[]
}) {
  const mine = myReaction ? reactionOption(myReaction) : undefined
  if (!mine && !otherReactions.length) return null

  return (
    <div className="flex flex-wrap items-center gap-1 px-1">
      {mine && (
        <button
          aria-label={`Your reaction: ${mine.label}. Tap to remove`}
          className="inline-flex items-center gap-1 rounded-full border border-accent/25 bg-accent-light px-2 py-0.5 text-xs font-bold text-accent transition hover:bg-accent-light/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          onClick={onRemoveMine}
          type="button"
        >
          <span aria-hidden>{mine.symbol}</span>
          <span>You</span>
        </button>
      )}
      {otherReactions.map((reaction, index) => {
        const option = reactionOption(reaction.reaction)
        const count = reactionCount(otherReactions, reaction.reaction)
        const duplicate = otherReactions.findIndex((item) => item.reaction === reaction.reaction) !== index
        if (!option || duplicate) return null
        return (
          <span
            aria-label={`${option.label} from ${userName(reaction.userId)}`}
            className="inline-flex items-center gap-1 rounded-full border border-foose-border bg-foose-surface px-2 py-0.5 text-xs font-bold text-foose-muted"
            key={option.name}
            title={`${option.label} from ${userName(reaction.userId)}`}
          >
            <span aria-hidden>{option.symbol}</span>
            <span>{userName(reaction.userId).split(' ')[0]}</span>
            {count > 1 && <span className="text-[10px]">{count}</span>}
          </span>
        )
      })}
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
  const bubbleRef = useRef<HTMLDivElement | null>(null)
  const reactButtonRef = useRef<HTMLButtonElement | null>(null)
  const myReaction = reactions.find((reaction) => userIdValue(reaction.userId) === currentUserId)?.reaction
  const otherReactions = reactions.filter((reaction) => userIdValue(reaction.userId) !== currentUserId)
  const replyText = replySummary(replyTo)
  const replySender = typeof replyTo === 'object' ? userName(replyTo.senderId) : ''
  const canReact = Boolean(messageId && onReact)
  const { pressed, ...longPressHandlers } = useLongPress(() => setReactionPickerOpen(true))
  const previewItems = attachments.map((attachment) => ({
    alt: attachment.originalname || 'Message attachment',
    src: attachment.url,
    type: attachment.type === 'video' ? 'video' as const : 'image' as const,
  }))

  useEffect(() => {
    if (!reactionPickerOpen) return undefined

    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target as Node
      if (bubbleRef.current?.contains(target) || reactButtonRef.current?.contains(target)) return
      setReactionPickerOpen(false)
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

  function selectReaction(reaction: ChatReactionName) {
    if (messageId && onReact) onReact(messageId, reaction)
    setReactionPickerOpen(false)
  }

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

  const reactButton = canReact ? (
    <button
      aria-expanded={reactionPickerOpen}
      aria-haspopup="menu"
      aria-label="React to this message"
      className="inline-flex size-9 shrink-0 items-center justify-center self-center rounded-full text-foose-muted transition hover:bg-foose-surface-high hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      onClick={() => setReactionPickerOpen((open) => !open)}
      ref={reactButtonRef}
      title="React"
      type="button"
    >
      <MdOutlineAddReaction aria-hidden size={18} />
    </button>
  ) : null

  const actionButtons = (canReact || onReply) ? (
    <div className="flex shrink-0 items-center gap-1">
      {reactButton}
      {replyButton}
    </div>
  ) : null

  return (
    <div className={`message-row relative flex w-full items-start gap-1.5 pb-1 sm:gap-2 ${incoming ? 'justify-start' : 'justify-end'}`} id={messageId ? `chat-message-${messageId}` : undefined}>
      {!incoming && actionButtons}
      <div className={`flex min-w-0 max-w-[82%] flex-col gap-1 max-md:max-w-[86%] ${incoming ? 'items-start' : 'items-end'}`}>
        <div
          className={`message relative flex w-full flex-col gap-2 rounded-2xl px-4 py-3 text-sm shadow-sm transition-transform motion-reduce:transition-none [&.incoming]:rounded-bl-sm [&.incoming]:bg-foose-surface-high [&.incoming]:text-foose-text [&.outgoing]:rounded-br-sm [&.outgoing]:bg-accent [&.outgoing]:text-white [&_time]:block [&_time]:text-xs [&_time]:opacity-70 ${incoming ? 'incoming' : 'outgoing'} ${pressed ? 'scale-[0.98]' : ''}`}
          onContextMenu={(event) => { if (canReact) event.preventDefault() }}
          ref={bubbleRef}
          {...(canReact ? longPressHandlers : {})}
        >
          {replyText && (
            <div className={`rounded-xl border-l-4 px-3 py-2 text-xs ${incoming ? 'border-accent bg-foose-surface/80 text-foose-muted' : 'border-white bg-white/15 text-white/85'}`}>
              <strong className="block truncate">{replySender}</strong>
              <span className="line-clamp-2">{replyText}</span>
            </div>
          )}
          {listingTitle(listing) && (
            <div className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-3 rounded-xl bg-foose-surface/90 p-2 text-foose-text shadow-sm">
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
          {reactionPickerOpen && canReact && <ReactionPicker anchorRef={bubbleRef} myReaction={myReaction} onSelect={selectReaction} />}
        </div>
        <ReactionSummaryRow
          myReaction={myReaction}
          onRemoveMine={() => myReaction && selectReaction(myReaction)}
          otherReactions={otherReactions}
        />
      </div>
      {incoming && actionButtons}
    </div>
  )
}
