import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { AppShell, EmptyState, ErrorState, Icon, LoadingState, Message } from '../components'
import { getAppName } from '../config/env'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { useInfiniteApiResource } from '../hooks/useInfiniteApiResource'
import { useMessaging } from '../hooks/useMessaging'
import { apiPost, apiPut } from '../lib/api'
import { useImagePreviewStore } from '../stores/imagePreviewStore'
import type { ChatAttachment, ChatConversation, ChatMessagePreview, ChatReaction, ChatReactionName, Listing, Notification, User } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { formatDateTime, formatMoney, getListingImage, initials } from '../utils/format'
import { navigateTo, withBasePath } from '../utils/navigation'

type ChatMessage = {
  _id: string
  attachments?: ChatAttachment[]
  content: string
  createdAt?: string
  isRead?: boolean
  reactions?: ChatReaction[]
  replyTo?: ChatMessagePreview | string
  senderId?: User | string
  receiverId?: User | string
  listingId?: Listing | string
}

type DraftAttachment = {
  file: File
  id: string
  type: 'image' | 'video'
  url: string
}

type PaginatedMessages = {
  contactVisible?: boolean
  messages: ChatMessage[]
  page: number
  pages: number
  total: number
}

type PaginatedConversations = {
  conversations: ChatConversation[]
  page: number
  pages: number
  total: number
}

function senderIdValue(sender: User | string | undefined): string {
  if (!sender) return ''
  return typeof sender === 'string' ? sender : sender._id
}

function userIdValue(user: User | string | undefined): string {
  if (!user) return ''
  return typeof user === 'string' ? user : user._id
}

function displayUser(user: User | string | undefined) {
  if (!user) return 'Foose member'
  if (typeof user === 'string') return 'Foose member'
  return user.name || user.username || 'Foose member'
}

function userPhoto(user: User | string | undefined) {
  return typeof user === 'object' ? user.profilePhoto : undefined
}

function listingTitle(listing: Listing | string | undefined) {
  if (!listing) return ''
  return typeof listing === 'string' ? '' : listing.title
}

function listingImage(listing: Listing | string | undefined) {
  if (!listing || typeof listing === 'string') return undefined
  return getListingImage(listing)
}

function listingPrice(listing: Listing | string | undefined) {
  if (!listing || typeof listing === 'string') return ''
  return formatMoney(listing.price, listing.currency)
}

function attachmentLabel(count = 0) {
  if (!count) return ''
  return `${count} attachment${count === 1 ? '' : 's'}`
}

function draftAttachmentType(file: File): DraftAttachment['type'] {
  return file.type.startsWith('video/') ? 'video' : 'image'
}

function draftAttachmentId(file: File, index: number) {
  return `${file.name}-${file.lastModified}-${file.size}-${Date.now()}-${index}`
}

function conversationPreview(message: ChatConversation['latestMessage']) {
  const text = message.content?.trim() || attachmentLabel(message.attachments?.length || 0) || 'Message'
  const preview = text.length > 46 ? text.slice(0, 43).trimEnd() : text
  return `${preview}...`
}

function inboxParams() {
  const params = new URLSearchParams(window.location.search)
  return {
    conversationId: params.get('conversationId') || '',
    listingId: params.get('listingId') || '',
    receiverId: params.get('receiverId') || '',
  }
}

function ListingContextBand({ listing, onDismiss }: { listing?: Listing | string; onDismiss?: () => void }) {
  const title = listingTitle(listing)
  if (!title) return null

  return (
    <div className="relative mx-3 mb-2 grid grid-cols-[52px_minmax(0,1fr)] items-center gap-3 rounded-xl border border-foose-border bg-foose-surface-low p-2 pr-10 text-sm">
      {listingImage(listing) ? <img alt="" className="size-12 rounded-lg object-cover" src={listingImage(listing)} /> : <span className="size-12 rounded-lg bg-foose-surface-mid" />}
      <div className="min-w-0">
        <span className="block text-xs font-bold uppercase tracking-wider text-foose-faint">Question about</span>
        <strong className="block truncate text-foose-text">{title}</strong>
        {listingPrice(listing) && <small className="font-bold text-accent">{listingPrice(listing)}</small>}
      </div>
      {onDismiss && (
        <button
          aria-label="Remove item from this message"
          className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full border border-foose-border bg-white text-foose-muted transition hover:border-accent hover:text-accent"
          onClick={onDismiss}
          type="button"
        >
          x
        </button>
      )}
    </div>
  )
}

function ReplyContextBand({ message, onDismiss }: { message: ChatMessage; onDismiss: () => void }) {
  const text = message.content?.trim() || attachmentLabel(message.attachments?.length || 0) || listingTitle(message.listingId) || 'Message'
  return (
    <div className="relative mx-3 mb-2 rounded-xl border-l-4 border-accent bg-accent-light p-3 pr-10 text-sm">
      <span className="block text-xs font-bold uppercase tracking-wider text-accent">Replying to</span>
      <p className="line-clamp-2 text-foose-text">{text}</p>
      <button
        aria-label="Cancel reply"
        className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full border border-foose-border bg-white text-foose-muted transition hover:border-accent hover:text-accent"
        onClick={onDismiss}
        type="button"
      >
        x
      </button>
    </div>
  )
}

export function InboxPage() {
  const { user } = useAuth()
  const { joinConversation, refreshSignal, triggerMessagingRefresh } = useMessaging()
  const brand = getAppName()
  const params = inboxParams()
  const conversationPath = useCallback((page: number) => `/chat?page=${page}&limit=40`, [])
  const messagePath = useCallback(
    (page: number) => (params.conversationId ? `/chat/${encodeURIComponent(params.conversationId)}?page=${page}&limit=30` : null),
    [params.conversationId],
  )
  const extractConversations = useCallback((data: PaginatedConversations) => data.conversations || [], [])
  const extractMessages = useCallback((data: PaginatedMessages) => data.messages || [], [])
  const messages = useInfiniteApiResource(messagePath, extractMessages, [params.conversationId])
  const conversations = useInfiniteApiResource(conversationPath, extractConversations, [])
  const listingContext = useApiResource<{ listing: Listing }>(params.listingId ? `/listings/${encodeURIComponent(params.listingId)}` : null, Boolean(params.listingId))
  const notifications = useApiResource<{ notifications: Notification[] }>('/notifications?limit=20')
  const refetchConversations = conversations.refetch
  const refetchMessages = messages.refetch
  const refetchNotifications = notifications.refetch
  const [sendError, setSendError] = useState('')
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [olderMessagesEnabled, setOlderMessagesEnabled] = useState(false)
  const [selectedAttachments, setSelectedAttachments] = useState<DraftAttachment[]>([])
  const [dismissedListingId, setDismissedListingId] = useState('')
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null)
  const selectedAttachmentsRef = useRef<DraftAttachment[]>([])
  const messageInputRef = useRef<HTMLInputElement | null>(null)
  const messagesRef = useRef<HTMLDivElement | null>(null)
  const lastConversationRef = useRef('')
  const lastNewestMessageRef = useRef('')
  const openPreview = useImagePreviewStore((store) => store.openPreview)
  const myId = user?._id || ''
  const conversationItems = conversations.items
  const orderedConversations = [...conversationItems].sort((first, second) => {
    const firstDate = Date.parse(first.latestMessage.createdAt || '') || 0
    const secondDate = Date.parse(second.latestMessage.createdAt || '') || 0
    return secondDate - firstDate
  })
  const activeConversation = orderedConversations.find((conversation) => conversation.conversationId === params.conversationId)
  const activeParticipant = activeConversation?.participant
  const canCompose = Boolean(params.conversationId || params.receiverId)
  const notificationItems = notifications.data?.notifications || []
  const unreadNotifications = notificationItems.filter((notification) => !notification.isRead)
  const seenNotifications = notificationItems.filter((notification) => notification.isRead)
  const productMessages = messages.items
  const orderedMessages = [...productMessages].sort((first, second) => {
    const firstDate = Date.parse(first.createdAt || '') || 0
    const secondDate = Date.parse(second.createdAt || '') || 0
    return firstDate - secondDate
  })
  const newestMessageId = orderedMessages.at(-1)?._id || ''
  const activeComposerListing = params.listingId && dismissedListingId !== params.listingId ? listingContext.data?.listing : undefined
  const productChat = Boolean(activeComposerListing || orderedMessages.some((message) => Boolean(message.listingId)))
  const activeContact = productMessages
    .flatMap((message) => [message.senderId, message.receiverId])
    .find((participant) => typeof participant === 'object' && participant._id !== myId) as User | undefined
  const contactPhone = productChat ? activeContact?.phone : ''

  const scrollToLatestMessage = useCallback(() => {
    const node = messagesRef.current
    if (!node) return

    window.requestAnimationFrame(() => {
      node.scrollTo({ top: node.scrollHeight })
      window.requestAnimationFrame(() => {
        node.scrollTo({ top: node.scrollHeight })
      })
    })
  }, [])

  function prepareConversationOpen() {
    setOlderMessagesEnabled(false)
    lastConversationRef.current = ''
    lastNewestMessageRef.current = ''
    window.setTimeout(scrollToLatestMessage, 0)
  }

  useEffect(() => {
    setOlderMessagesEnabled(false)
    setReplyTarget(null)
  }, [params.conversationId])

  useEffect(() => {
    if (!params.conversationId) return
    joinConversation(params.conversationId)
  }, [joinConversation, params.conversationId])

  useEffect(() => {
    if (!refreshSignal) return
    void refetchConversations()
    void refetchNotifications()
    if (params.conversationId) void refetchMessages()
  }, [params.conversationId, refetchConversations, refetchMessages, refetchNotifications, refreshSignal])

  useEffect(() => {
    setDismissedListingId('')
  }, [params.listingId])

  useEffect(() => {
    if (!params.conversationId || messages.loading) return undefined

    const node = messagesRef.current
    if (!node) return undefined
    const conversationChanged = lastConversationRef.current !== params.conversationId
    const newestChanged = Boolean(lastNewestMessageRef.current && newestMessageId && lastNewestMessageRef.current !== newestMessageId)
    lastConversationRef.current = params.conversationId
    lastNewestMessageRef.current = newestMessageId

    if (!conversationChanged && !newestChanged) return undefined

    scrollToLatestMessage()

    const timer = window.setTimeout(() => {
      scrollToLatestMessage()
      setOlderMessagesEnabled(true)
    }, 80)
    return () => window.clearTimeout(timer)
  }, [messages.loading, newestMessageId, params.conversationId, scrollToLatestMessage])

  useEffect(() => {
    if (!params.conversationId || !activeConversation?.unreadCount) return

    let mounted = true
    void apiPut(`/chat/${encodeURIComponent(params.conversationId)}/read`)
      .then(async () => {
        if (mounted) {
          await refetchConversations()
          triggerMessagingRefresh()
        }
      })
      .catch(() => undefined)

    return () => {
      mounted = false
    }
  }, [activeConversation?.unreadCount, params.conversationId, refetchConversations, triggerMessagingRefresh])

  useEffect(() => {
    if (!params.receiverId || params.conversationId || conversations.loading) return
    const existingConversation = orderedConversations.find((conversation) => userIdValue(conversation.participant) === params.receiverId)
    if (!existingConversation) return

    const query = new URLSearchParams()
    query.set('conversationId', existingConversation.conversationId)
    if (params.listingId) query.set('listingId', params.listingId)
    navigateTo(`/inbox?${query.toString()}`)
  }, [conversations.loading, orderedConversations, params.conversationId, params.listingId, params.receiverId])

  function handleAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    const nextAttachments = files.map((file, index) => ({
      file,
      id: draftAttachmentId(file, index),
      type: draftAttachmentType(file),
      url: URL.createObjectURL(file),
    }))
    setSelectedAttachments((current) => [...current, ...nextAttachments].slice(0, 8))
    event.target.value = ''
  }

  function removeSelectedFile(id: string) {
    setSelectedAttachments((current) =>
      current.filter((attachment) => {
        if (attachment.id !== id) return true
        URL.revokeObjectURL(attachment.url)
        return false
      }),
    )
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const content = String(formData.get('content') || '').trim()
    const fallbackReceiverId = String(formData.get('receiverId') || '').trim()
    const receiverId = params.receiverId || fallbackReceiverId

    if ((!content && !selectedAttachments.length) || (!params.conversationId && !receiverId)) return

    setSendError('')
    try {
      const payload = new FormData()
      if (content) payload.append('content', content)
      if (params.conversationId) payload.append('conversationId', params.conversationId)
      if (activeComposerListing && params.listingId && dismissedListingId !== params.listingId) {
        payload.append('listingId', params.listingId)
      }
      if (replyTarget?._id) payload.append('replyTo', replyTarget._id)
      if (!params.conversationId && receiverId) payload.append('receiverId', receiverId)
      selectedAttachments.forEach((attachment) => payload.append('attachments', attachment.file))

      const result = await apiPost<{ conversationId: string; message: ChatMessage }>('/chat', payload)
      form.reset()
      selectedAttachments.forEach((attachment) => URL.revokeObjectURL(attachment.url))
      setSelectedAttachments([])
      setReplyTarget(null)
      if (params.listingId) setDismissedListingId(params.listingId)
      await refetchConversations()
      if (params.conversationId) {
        await refetchMessages()
      } else {
        navigateTo(`/inbox?conversationId=${encodeURIComponent(result.conversationId)}`)
      }
      triggerMessagingRefresh()
    } catch (err) {
      setSendError(getErrorMessage(err, 'Could not send message'))
    }
  }

  async function reactToMessage(messageId: string, reaction: ChatReactionName) {
    try {
      await apiPut(`/chat/messages/${encodeURIComponent(messageId)}/reaction`, { reaction })
      await refetchMessages()
      await refetchConversations()
      triggerMessagingRefresh()
    } catch (err) {
      setSendError(getErrorMessage(err, 'Could not save reaction'))
    }
  }

  function startReply(message: ChatMessage) {
    setReplyTarget(message)
    window.requestAnimationFrame(() => {
      messageInputRef.current?.focus()
    })
  }

  function openNotificationTarget(notification: Notification) {
    if (!notification.link) return
    setSelectedNotification(null)
    navigateTo(notification.link)
  }

  function openNotificationDetails(notification: Notification) {
    setSelectedNotification(notification)
    if (notification.isRead) return

    void apiPut(`/notifications/${notification._id}/read`)
      .then(() => refetchNotifications())
      .catch(() => undefined)
  }

  useEffect(() => {
    selectedAttachmentsRef.current = selectedAttachments
  }, [selectedAttachments])

  useEffect(() => {
    return () => {
      selectedAttachmentsRef.current.forEach((attachment) => URL.revokeObjectURL(attachment.url))
    }
  }, [])

  return (
    <AppShell searchPlaceholder="Search messages..." flush showFooter={false}>
      <main className="inbox-shell grid min-h-[calc(100dvh-4rem)] border-x border-foose-border bg-foose-surface lg:h-[calc(100dvh-4rem)] lg:min-h-0 lg:grid-cols-[340px_minmax(0,1fr)] lg:overflow-hidden max-md:grid-cols-1">
        <aside className="conversation-list flex min-h-0 flex-col overflow-y-auto border-b border-foose-border lg:h-full lg:border-b-0 lg:border-r">
          <div className="inbox-heading flex shrink-0 flex-col gap-2 border-b border-foose-border p-4 md:flex-row md:items-center md:justify-between [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-3xl">
            <h1>Messages</h1>
          </div>
          <section className="conversation-stack flex flex-col">
            <h2>Conversations</h2>
            {conversations.loading && <LoadingState label="Loading conversations..." />}
            {conversations.error && <ErrorState message={conversations.error} retry={conversations.refetch} />}
            {!conversations.loading && !conversations.error && !orderedConversations.length && (
              <EmptyState body="Message a seller from any listing page to start a thread." title="No conversations yet" />
            )}
            {!!orderedConversations.length &&
              orderedConversations.map((conversation) => {
                const participant = conversation.participant
                const active = conversation.conversationId === params.conversationId
                const image = userPhoto(participant)

                return (
                  <a
                    className={`conversation grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 border-b border-foose-border px-4 py-3 text-left transition hover:bg-foose-surface-low [&.active]:bg-accent-light [&_img]:size-11 [&_img]:rounded-lg [&_img]:object-cover [&_p]:truncate [&_p]:text-sm [&_p]:text-foose-muted [&_small]:truncate [&_small]:text-sm [&_small]:text-foose-muted [&_strong]:truncate [&_strong]:text-sm [&_strong]:font-bold [&_time]:text-xs [&_time]:text-foose-faint [&_b]:inline-flex [&_b]:size-5 [&_b]:items-center [&_b]:justify-center [&_b]:rounded-full [&_b]:bg-accent [&_b]:text-xs [&_b]:text-white ${active ? 'active' : ''} `}
                    href={withBasePath(`/inbox?conversationId=${encodeURIComponent(conversation.conversationId)}`)}
                    key={conversation.conversationId}
                    onClick={prepareConversationOpen}
                  >
                    {image ? <img alt="" src={image} /> : <span className="conversation-avatar inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent">{initials(displayUser(participant))}</span>}
                    <span>
                      <strong>{displayUser(participant)}</strong>
                      <p title={conversation.latestMessage.content || attachmentLabel(conversation.latestMessage.attachments?.length || 0)}>
                        {conversationPreview(conversation.latestMessage)}
                      </p>
                    </span>
                    {conversation.latestMessage.createdAt && <time>{formatDateTime(conversation.latestMessage.createdAt)}</time>}
                    {conversation.unreadCount > 0 && <b>{conversation.unreadCount}</b>}
                  </a>
                )
              })}
            <div ref={conversations.sentinelRef} className="flex min-h-12 items-center justify-center py-2">
              {conversations.loadingMore && <span className="size-5 animate-spin rounded-full border-2 border-foose-border border-t-accent" aria-label="Loading more conversations" />}
            </div>
          </section>
          <section className="system-notifications border-t border-foose-border p-4">
            <h2>System notifications</h2>
            {notifications.loading && <LoadingState label="Loading notifications..." />}
            {notifications.error && <ErrorState message={notifications.error} retry={notifications.refetch} />}
            {!notifications.loading && !notifications.error && !notifications.data?.notifications.length && (
              <EmptyState body={`${brand} will show follows, reviews, orders, and other alerts here.`} title="No notifications" />
            )}
            {!!unreadNotifications.length &&
              unreadNotifications.map((notification) => (
                <button className="notification-item unread mb-2 w-full rounded-lg border border-accent bg-accent-light p-3 text-left text-sm transition hover:border-accent-hover hover:bg-white" key={notification._id} onClick={() => openNotificationDetails(notification)} type="button">
                  <strong>{notification.title}</strong>
                  <p>{notification.body || 'System update'}</p>
                  {notification.createdAt && <span>{formatDateTime(notification.createdAt)}</span>}
                </button>
              ))}
            {!!seenNotifications.length && (
              <details className="seen-notifications [&_summary]:cursor-pointer [&_summary]:text-sm [&_summary]:font-semibold [&_summary]:text-foose-muted">
                <summary>Seen notifications ({seenNotifications.length})</summary>
                <div>
                  {seenNotifications.map((notification) => (
                    <button className="notification-item seen mb-2 w-full rounded-lg border border-foose-border bg-foose-surface p-3 text-left text-sm opacity-75 transition hover:border-accent hover:opacity-100" key={notification._id} onClick={() => openNotificationDetails(notification)} type="button">
                      <strong>{notification.title}</strong>
                      <p>{notification.body || 'System update'}</p>
                      {notification.createdAt && <span>{formatDateTime(notification.createdAt)}</span>}
                    </button>
                  ))}
                </div>
              </details>
            )}
          </section>
        </aside>
        <section className="thread flex min-h-[70dvh] flex-col bg-foose-bg lg:h-full lg:min-h-0 lg:overflow-hidden">
          <header className="thread-header sticky top-0 z-20 flex min-h-14 shrink-0 items-center gap-3 border-b border-foose-border bg-foose-surface px-4 py-2 shadow-sm [&_img]:size-10 [&_img]:shrink-0 [&_img]:rounded-lg [&_img]:object-cover [&_h2]:truncate [&_h2]:text-sm [&_h2]:font-bold [&_p]:truncate [&_p]:text-xs [&_p]:text-foose-muted [&_a]:text-xs [&_a]:font-semibold [&_a]:text-accent">
            {userPhoto(activeParticipant) ? <img alt="" src={userPhoto(activeParticipant)} /> : <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent">{initials(displayUser(activeParticipant))}</span>}
            <div className="min-w-0 flex-1">
              <h2>{params.conversationId ? displayUser(activeParticipant) : params.receiverId ? 'New seller message' : 'Select a conversation'}</h2>
              <p>{canCompose ? 'Write your message below' : 'Open a thread or message a seller from a listing.'}</p>
              {contactPhone && (
                <a className="chat-contact-phone" href={`tel:${contactPhone}`}>
                  {contactPhone}
                </a>
              )}
            </div>
          </header>
          <div className="messages flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 pb-6" ref={messagesRef}>
            {params.conversationId && olderMessagesEnabled && (
              <div ref={messages.sentinelRef} className="flex min-h-10 items-center justify-center py-2">
                {messages.loadingMore && <span className="size-5 animate-spin rounded-full border-2 border-foose-border border-t-accent" aria-label="Loading older messages" />}
              </div>
            )}
            {messages.loading && <LoadingState label="Loading conversation..." />}
            {messages.error && <ErrorState message={messages.error} retry={messages.refetch} />}
            {!params.conversationId && !params.receiverId && (
              <EmptyState body="Choose a conversation on the left, or open a listing and message its seller." title="No thread selected" />
            )}
            {!params.conversationId && params.receiverId && (
              <EmptyState body="Send the first message to start this seller conversation." title="Ready to message" />
            )}
            {!!orderedMessages.length &&
              orderedMessages.map((message) => {
                const incoming = Boolean(myId) && senderIdValue(message.senderId) !== myId
                const subtitle = message.createdAt ? formatDateTime(message.createdAt) : undefined
                return (
                  <Message
                    attachments={message.attachments || []}
                    currentUserId={myId}
                    incoming={incoming}
                    key={message._id}
                    listing={message.listingId}
                    messageId={message._id}
                    onReact={(messageId, reaction) => void reactToMessage(messageId, reaction)}
                    onReply={() => startReply(message)}
                    reactions={message.reactions || []}
                    replyTo={message.replyTo}
                    subtitle={subtitle}
                  >
                    {message.content}
                  </Message>
                )
              })}
          </div>
          {sendError && <p className="danger-text font-semibold text-foose-danger inbox-send-error">{sendError}</p>}
          {replyTarget && <ReplyContextBand message={replyTarget} onDismiss={() => setReplyTarget(null)} />}
          <ListingContextBand listing={activeComposerListing} onDismiss={() => setDismissedListingId(params.listingId)} />
          <form className={`message-composer sticky bottom-0 flex items-end gap-2 bg-foose-surface p-3 [&_input]:h-12 [&_input]:w-full [&_input]:px-4 ${canCompose ? 'single-line' : ''} `} onSubmit={(event) => void sendMessage(event)}>
            {!params.conversationId && !params.receiverId && <input aria-label="Receiver user ID" name="receiverId" placeholder="Receiver user ID" />}
            <div className="composer-main flex-1 [&_input]:h-12 [&_input]:w-full [&_input]:px-4">
              <input aria-label="Write message" autoComplete="off" name="content" placeholder={activeComposerListing ? 'Ask a question about this product...' : 'Write a message...'} ref={messageInputRef} />
              {!!selectedAttachments.length && (
                <div className="composer-media-previews flex flex-wrap gap-2">
                  {selectedAttachments.map((attachment, index) => (
                    <div className="composer-media-preview [&_img]:max-h-44 [&_img]:rounded-lg [&_img]:object-cover [&_video]:max-h-44 [&_video]:rounded-lg [&_video]:object-cover relative overflow-hidden rounded-lg border border-foose-border bg-foose-surface-low p-1 [&>button:first-child]:block [&>button:first-child]:border-0 [&>button:first-child]:bg-transparent [&>button:first-child]:p-0 [&_small]:block [&_small]:max-w-28 [&_small]:truncate [&_small]:text-xs [&_small]:text-foose-muted" key={attachment.id}>
                      <button
                        aria-label={`Preview ${attachment.file.name}`}
                        onClick={() =>
                          openPreview(
                            selectedAttachments.map((item) => ({
                              alt: item.file.name,
                              src: item.url,
                              type: item.type,
                            })),
                            index,
                          )
                        }
                        type="button"
                      >
                        {attachment.type === 'video' ? (
                          <video muted src={attachment.url} />
                        ) : (
                          <img alt={attachment.file.name} src={attachment.url} />
                        )}
                      </button>
                      <span>{attachment.file.name}</span>
                      <button aria-label={`Remove ${attachment.file.name}`} onClick={() => removeSelectedFile(attachment.id)} type="button">
                        x
                      </button>
                      <small>{index + 1}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <label className="attachment-button inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-foose-border bg-foose-surface text-accent hover:bg-accent-light [&_input]:sr-only" title="Attach images or videos">
              <Icon name="upload" />
              <input accept="image/*,video/*" multiple name="attachments" onChange={handleAttachmentChange} type="file" />
            </label>
            <label className="attachment-button inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-foose-border bg-foose-surface text-accent hover:bg-accent-light [&_input]:sr-only" title="Open camera">
              <Icon name="camera" />
              <input accept="image/*,video/*" capture="environment" multiple onChange={handleAttachmentChange} type="file" />
            </label>
            <button aria-label="Send message" className="message-send-button inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-foose-border bg-foose-surface text-accent hover:bg-accent-light border-accent bg-accent text-white hover:bg-accent-hover" type="submit">
              <Icon name="send" />
            </button>
          </form>
        </section>
        {selectedNotification && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <button aria-label="Close notification details" className="absolute inset-0 bg-black/45" onClick={() => setSelectedNotification(null)} type="button" />
            <article className="relative z-10 w-full max-w-md rounded-2xl border border-accent/20 bg-white p-5 shadow-2xl shadow-black/20 sm:p-6">
              <button aria-label="Close notification details" className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full border border-foose-border bg-foose-surface text-foose-text transition hover:border-accent hover:text-accent" onClick={() => setSelectedNotification(null)} type="button">
                <Icon name="close" size={18} />
              </button>
              <span className="mb-3 inline-flex rounded-full bg-accent-light px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent">
                {selectedNotification.type}
              </span>
              <h2 className="pr-10 text-xl font-bold text-foose-text">{selectedNotification.title}</h2>
              <p className="mt-3 text-sm leading-6 text-foose-muted">{selectedNotification.body || 'System update'}</p>
              {selectedNotification.createdAt && (
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-foose-faint">{formatDateTime(selectedNotification.createdAt)}</p>
              )}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button className="inline-flex min-h-11 items-center justify-center rounded-lg border border-foose-border bg-white px-4 text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent" onClick={() => setSelectedNotification(null)} type="button">
                  Close
                </button>
                {selectedNotification.link && (
                  <button className="inline-flex min-h-11 items-center justify-center rounded-lg border border-accent bg-accent px-4 text-sm font-bold text-white transition hover:bg-accent-hover" onClick={() => openNotificationTarget(selectedNotification)} type="button">
                    Open related page
                  </button>
                )}
              </div>
            </article>
          </div>
        )}
      </main>
    </AppShell>
  )
}
