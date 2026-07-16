import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { AppShell, EmptyState, ErrorState, Icon, LoadingState, Message } from '../components'
import { getAppName } from '../config/env'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { useInfiniteApiResource } from '../hooks/useInfiniteApiResource'
import { useMessaging } from '../hooks/useMessaging'
import { apiPost, apiPut } from '../lib/api'
import { useImagePreviewStore } from '../stores/imagePreviewStore'
import type { ChatConversation, ChatMessage, ChatReactionName, Listing, Notification, User } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { formatDateTime, formatMoney, getListingImage, initials } from '../utils/format'
import { navigateTo, withBasePath } from '../utils/navigation'

type InboxChatMessage = ChatMessage & {
  clientMessageId?: string
  deliveryStatus?: 'failed' | 'sending' | 'sent'
}

type DraftAttachment = {
  file: File
  id: string
  type: 'image' | 'video'
  url: string
}

type PaginatedMessages = {
  contactVisible?: boolean
  messages: InboxChatMessage[]
  page: number
  pages: number
  participant?: User | string | null
  total: number
}

type InboxSection = 'inbox' | 'system'

function senderIdValue(sender: User | string | null | undefined): string {
  if (!sender) return ''
  return typeof sender === 'string' ? sender : sender._id
}

function userIdValue(user: User | string | null | undefined): string {
  if (!user) return ''
  return typeof user === 'string' ? user : user._id
}

function isUserProfile(user: User | string | null | undefined): user is User {
  return Boolean(user) && typeof user === 'object'
}

function displayUser(user: User | string | null | undefined) {
  if (!user) return 'Foose member'
  if (typeof user === 'string') return 'Foose member'
  return user.name || user.username || 'Foose member'
}

function displayUsername(user: User | string | null | undefined) {
  if (!user || typeof user === 'string' || !user.username) return ''
  return `@${user.username}`
}

function userPhoto(user: User | string | null | undefined) {
  return user && typeof user === 'object' ? user.profilePhoto : undefined
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
  return text.length > 46 ? `${text.slice(0, 43).trimEnd()}...` : text
}

function conversationTimestamp(value?: string) {
  if (!value) return ''

  const date = new Date(value)
  const today = new Date()
  const sameDay = date.toDateString() === today.toDateString()

  return new Intl.DateTimeFormat('en-GH', sameDay
    ? { hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short' }).format(date)
}

function inboxParams() {
  const params = new URLSearchParams(window.location.search)
  return {
    conversationId: params.get('conversationId') || '',
    listingId: params.get('listingId') || '',
    receiverId: params.get('receiverId') || '',
    section: (params.get('view') === 'system' ? 'system' : 'inbox') as InboxSection,
  }
}

function conversationIdFor(userA?: string, userB?: string) {
  if (!userA || !userB || userA === userB) return ''
  return `${[userA, userB].sort().join('_')}_general`
}

function messageIdentity(message: InboxChatMessage) {
  return message._id || message.clientMessageId || ''
}

function mergeMessageList(current: InboxChatMessage[], incoming: InboxChatMessage) {
  const incomingId = messageIdentity(incoming)
  const incomingClientId = incoming.clientMessageId
  const index = current.findIndex((message) => {
    if (incomingClientId && message.clientMessageId === incomingClientId) return true
    return incomingId && messageIdentity(message) === incomingId
  })

  if (index === -1) return [...current, incoming]

  const next = [...current]
  next[index] = {
    ...next[index],
    ...incoming,
    deliveryStatus: incoming.deliveryStatus || 'sent',
  }
  return next
}

function mergeMessagePage(current: InboxChatMessage[], pageMessages: InboxChatMessage[]) {
  return pageMessages.reduce((nextMessages, message) => mergeMessageList(nextMessages, message), current)
}

function tempMessageId() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
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

function ReplyContextBand({ message, onDismiss }: { message: InboxChatMessage; onDismiss: () => void }) {
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
  const {
    conversations: conversationItems,
    joinConversation,
    markConversationRead,
    markNotificationRead,
    messageConfirmedEvent,
    messageEvent,
    messagesReadEvent,
    notificationError,
    notificationLoading,
    notifications,
    sendMessage: sendSocketMessage,
  } = useMessaging()
  const brand = getAppName()
  const params = inboxParams()
  const messagePath = useCallback(
    (page: number) => (params.conversationId ? `/chat/${encodeURIComponent(params.conversationId)}?page=${page}&limit=30` : null),
    [params.conversationId],
  )
  const extractMessages = useCallback((data: PaginatedMessages) => data.messages || [], [])
  const messages = useInfiniteApiResource(messagePath, extractMessages, [params.conversationId])
  const listingContext = useApiResource<{ listing: Listing }>(params.listingId ? `/listings/${encodeURIComponent(params.listingId)}` : null, Boolean(params.listingId))
  const [sendError, setSendError] = useState('')
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [liveMessages, setLiveMessages] = useState<InboxChatMessage[]>([])
  const [olderMessagesEnabled, setOlderMessagesEnabled] = useState(false)
  const [selectedAttachments, setSelectedAttachments] = useState<DraftAttachment[]>([])
  const [dismissedListingId, setDismissedListingId] = useState('')
  const [replyTarget, setReplyTarget] = useState<InboxChatMessage | null>(null)
  const selectedAttachmentsRef = useRef<DraftAttachment[]>([])
  const messageInputRef = useRef<HTMLInputElement | null>(null)
  const messagesRef = useRef<HTMLDivElement | null>(null)
  const lastConversationRef = useRef('')
  const lastNewestMessageRef = useRef('')
  const openPreview = useImagePreviewStore((store) => store.openPreview)
  const myId = user?._id || ''
  const orderedConversations = [...conversationItems].sort((first, second) => {
    const firstDate = Date.parse(first.latestMessage.createdAt || '') || 0
    const secondDate = Date.parse(second.latestMessage.createdAt || '') || 0
    return secondDate - firstDate
  })
  const activeConversation = orderedConversations.find((conversation) => conversation.conversationId === params.conversationId)
  const canCompose = Boolean(params.conversationId || params.receiverId)
  const compactThreadOpen = params.section === 'inbox' && canCompose
  const unreadConversationCount = orderedConversations.reduce((total, conversation) => total + (conversation.unreadCount || 0), 0)
  const notificationItems = notifications
  const productMessages = liveMessages
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
  const activeParticipant = activeConversation?.participant || messages.data?.participant || activeContact
  const activeParticipantProfile = isUserProfile(activeParticipant) ? activeParticipant : undefined
  const hasActiveThreadTarget = Boolean(params.conversationId || params.receiverId)
  const activeThreadTitle = activeParticipantProfile ? displayUser(activeParticipantProfile) : hasActiveThreadTarget ? 'Starting chat' : 'Select a conversation'
  const activeThreadSubtitle = activeParticipantProfile
    ? displayUsername(activeParticipantProfile) || 'Username unavailable'
    : canCompose
      ? 'Loading seller profile...'
      : 'Open a thread or message a seller from a listing.'
  const contactPhone = productChat ? activeContact?.phone : ''

  const scrollToLatestMessage = useCallback(() => {
    const node = messagesRef.current
    if (!node) return

    node.scrollTop = node.scrollHeight
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
    setLiveMessages([])
  }, [params.conversationId])

  useEffect(() => {
    setLiveMessages((current) => mergeMessagePage(current, messages.items))
  }, [messages.items])

  useEffect(() => {
    if (!params.conversationId) return
    joinConversation(params.conversationId)
  }, [joinConversation, params.conversationId])

  useEffect(() => {
    if (!messageEvent || messageEvent.conversationId !== params.conversationId) return

    const incoming = senderIdValue(messageEvent.message.senderId) !== myId && senderIdValue(messageEvent.message.receiverId) === myId
    setLiveMessages((current) => mergeMessageList(current, { ...messageEvent.message, deliveryStatus: 'sent' }))

    if (incoming) {
      markConversationRead(messageEvent.conversationId)
    }
  }, [markConversationRead, messageEvent, myId, params.conversationId])

  useEffect(() => {
    if (!messageConfirmedEvent || messageConfirmedEvent.conversationId !== params.conversationId) return
    setLiveMessages((current) =>
      mergeMessageList(current, {
        ...messageConfirmedEvent.message,
        clientMessageId: messageConfirmedEvent.clientMessageId,
        deliveryStatus: 'sent',
      }),
    )
  }, [messageConfirmedEvent, params.conversationId])

  useEffect(() => {
    if (!messagesReadEvent || messagesReadEvent.conversationId !== params.conversationId || messagesReadEvent.readBy === myId) return
    setLiveMessages((current) =>
      current.map((message) =>
        senderIdValue(message.senderId) === myId ? { ...message, isRead: true } : message,
      ),
    )
  }, [messagesReadEvent, myId, params.conversationId])

  useEffect(() => {
    setDismissedListingId('')
  }, [params.listingId])

  useEffect(() => {
    if (!params.conversationId || messages.loading) return undefined

    const node = messagesRef.current
    if (!node) return undefined
    const conversationChanged = lastConversationRef.current !== params.conversationId
    const initialMessagesArrived = !lastNewestMessageRef.current && Boolean(newestMessageId)
    const newestChanged = Boolean(lastNewestMessageRef.current && newestMessageId && lastNewestMessageRef.current !== newestMessageId)
    lastConversationRef.current = params.conversationId
    lastNewestMessageRef.current = newestMessageId

    if (!conversationChanged && !initialMessagesArrived && !newestChanged) return undefined

    scrollToLatestMessage()

    const timer = window.setTimeout(() => {
      scrollToLatestMessage()
      setOlderMessagesEnabled(true)
    }, 80)
    return () => window.clearTimeout(timer)
  }, [messages.loading, newestMessageId, params.conversationId, scrollToLatestMessage])

  useEffect(() => {
    if (!params.conversationId || !activeConversation?.unreadCount) return
    markConversationRead(params.conversationId)
  }, [activeConversation?.unreadCount, markConversationRead, params.conversationId])

  useEffect(() => {
    if (!params.receiverId || params.conversationId || !myId) return
    const existingConversation = orderedConversations.find((conversation) => userIdValue(conversation.participant) === params.receiverId)
    const conversationId = existingConversation?.conversationId || conversationIdFor(myId, params.receiverId)
    if (!conversationId) return

    const query = new URLSearchParams()
    query.set('conversationId', conversationId)
    query.set('receiverId', params.receiverId)
    if (params.listingId) query.set('listingId', params.listingId)
    navigateTo(`/inbox?${query.toString()}`)
  }, [myId, orderedConversations, params.conversationId, params.listingId, params.receiverId])

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
    const receiverId = params.receiverId || userIdValue(activeParticipant) || fallbackReceiverId

    if ((!content && !selectedAttachments.length) || (!params.conversationId && !receiverId)) return

    setSendError('')
    try {
      const listingId = activeComposerListing && params.listingId && dismissedListingId !== params.listingId ? params.listingId : ''

      if (selectedAttachments.length) {
        const payload = new FormData()
        if (content) payload.append('content', content)
        if (params.conversationId) payload.append('conversationId', params.conversationId)
        if (listingId) payload.append('listingId', listingId)
        if (replyTarget?._id) payload.append('replyTo', replyTarget._id)
        if (!params.conversationId && receiverId) payload.append('receiverId', receiverId)
        selectedAttachments.forEach((attachment) => payload.append('attachments', attachment.file))

        const result = await apiPost<{ conversationId: string; message: InboxChatMessage }>('/chat', payload)
        setLiveMessages((current) => mergeMessageList(current, { ...result.message, deliveryStatus: 'sent' }))
        if (!params.conversationId) {
          const query = new URLSearchParams()
          query.set('conversationId', result.conversationId)
          if (receiverId) query.set('receiverId', receiverId)
          if (listingId) query.set('listingId', listingId)
          navigateTo(`/inbox?${query.toString()}`)
        }
      } else {
        const clientMessageId = tempMessageId()
        const conversationId = params.conversationId || conversationIdFor(myId, receiverId)
        const optimisticMessage: InboxChatMessage = {
          _id: clientMessageId,
          clientMessageId,
          content,
          conversationId,
          createdAt: new Date().toISOString(),
          deliveryStatus: 'sending',
          listingId: activeComposerListing,
          receiverId: activeParticipantProfile || receiverId,
          replyTo: replyTarget || undefined,
          senderId: user || myId,
        }

        setLiveMessages((current) => mergeMessageList(current, optimisticMessage))

        const ack = await sendSocketMessage({
          clientMessageId,
          content,
          conversationId: params.conversationId || undefined,
          listingId: listingId || undefined,
          receiverId: receiverId || undefined,
          replyTo: replyTarget?._id,
        })

        if (!ack.success || !ack.message || !ack.conversationId) {
          setLiveMessages((current) =>
            current.map((message) =>
              message.clientMessageId === clientMessageId ? { ...message, deliveryStatus: 'failed' } : message,
            ),
          )
          setSendError(ack.error || 'Could not send message')
          return
        }

        const confirmedMessage = ack.message
        setLiveMessages((current) =>
          mergeMessageList(current, {
            ...confirmedMessage,
            clientMessageId,
            deliveryStatus: 'sent',
          }),
        )

        if (!params.conversationId) {
          const query = new URLSearchParams()
          query.set('conversationId', ack.conversationId)
          if (receiverId) query.set('receiverId', receiverId)
          if (listingId) query.set('listingId', listingId)
          navigateTo(`/inbox?${query.toString()}`)
        }
      }

      form.reset()
      selectedAttachments.forEach((attachment) => URL.revokeObjectURL(attachment.url))
      setSelectedAttachments([])
      setReplyTarget(null)
      if (listingId) setDismissedListingId(listingId)
    } catch (err) {
      setSendError(getErrorMessage(err, 'Could not send message'))
    }
  }

  async function reactToMessage(messageId: string, reaction: ChatReactionName) {
    try {
      const result = await apiPut<{ message: InboxChatMessage }>(`/chat/messages/${encodeURIComponent(messageId)}/reaction`, { reaction })
      setLiveMessages((current) => mergeMessageList(current, result.message))
    } catch (err) {
      setSendError(getErrorMessage(err, 'Could not save reaction'))
    }
  }

  function startReply(message: InboxChatMessage) {
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

    void markNotificationRead(notification._id)
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
    <AppShell compactImmersive={compactThreadOpen} searchPlaceholder="Search messages..." flush showFooter={false}>
      <main className={`inbox-shell grid min-h-[calc(100dvh-4rem)] border-x border-foose-border bg-foose-surface xl:h-[calc(100dvh-4rem)] xl:min-h-0 xl:grid-cols-[360px_minmax(0,1fr)] xl:overflow-hidden ${compactThreadOpen ? 'max-xl:h-dvh max-xl:min-h-0 max-xl:overflow-hidden' : 'max-lg:pb-20'}`}>
        <aside className={`conversation-list flex min-h-0 flex-col border-b border-foose-border xl:h-full xl:border-b-0 xl:border-r ${compactThreadOpen ? 'max-xl:hidden' : ''}`}>
          <div className="inbox-heading shrink-0 border-b border-foose-border bg-foose-surface px-4 pb-3 pt-4">
            <h1 className="text-2xl font-bold">Messages</h1>
            <nav className="mt-3 grid grid-cols-2 gap-2" aria-label="Message sections">
              <a
                aria-current={params.section === 'inbox' ? 'page' : undefined}
                className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full border px-4 text-sm font-bold transition ${params.section === 'inbox' ? 'border-accent bg-accent text-white' : 'border-foose-border bg-foose-surface-low text-foose-muted hover:border-accent hover:text-accent'}`}
                href={withBasePath('/inbox')}
              >
                Inbox
                {unreadConversationCount > 0 && (
                  <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none ${params.section === 'inbox' ? 'bg-white text-accent' : 'bg-red-500 text-white'}`}>
                    {unreadConversationCount > 99 ? '99+' : unreadConversationCount}
                  </span>
                )}
              </a>
              <a
                aria-current={params.section === 'system' ? 'page' : undefined}
                className={`relative inline-flex min-h-10 items-center justify-center gap-2 rounded-full border px-4 text-sm font-bold transition ${params.section === 'system' ? 'border-accent bg-accent text-white' : 'border-foose-border bg-foose-surface-low text-foose-muted hover:border-accent hover:text-accent'}`}
                href={withBasePath('/inbox?view=system')}
              >
                System
                {notificationItems.some((notification) => !notification.isRead) && (
                  <span aria-label="Unread system notification" className={`size-2.5 rounded-full ${params.section === 'system' ? 'bg-white' : 'bg-red-500'}`} />
                )}
              </a>
            </nav>
          </div>
          {params.section === 'inbox' && (
          <section className="conversation-stack flex min-h-0 flex-1 flex-col overflow-y-auto" aria-label="Inbox conversations">
            <h2 className="sr-only">Inbox</h2>
            {notificationLoading && <LoadingState label="Loading conversations..." />}
            {notificationError && <ErrorState message={notificationError} />}
            {!notificationLoading && !notificationError && !orderedConversations.length && (
              <EmptyState body="Message a seller from any listing page to start a thread." title="No conversations yet" />
            )}
            {!!orderedConversations.length &&
              orderedConversations.map((conversation) => {
                const participant = conversation.participant
                const active = conversation.conversationId === params.conversationId
                const image = userPhoto(participant)

                return (
                  <a
                    className={`conversation grid min-h-[76px] grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 border-b border-foose-border px-4 py-3 text-left transition hover:bg-foose-surface-low ${active ? 'bg-accent-light' : ''}`}
                    href={withBasePath(`/inbox?conversationId=${encodeURIComponent(conversation.conversationId)}`)}
                    key={conversation.conversationId}
                    onClick={prepareConversationOpen}
                  >
                    {image ? <img alt="" className="size-13 rounded-full object-cover" src={image} /> : <span className="conversation-avatar inline-flex size-13 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent">{initials(displayUser(participant))}</span>}
                    <span className="min-w-0">
                      <strong className="block truncate text-sm font-bold text-foose-text">{displayUser(participant)}</strong>
                      <p className={`truncate text-sm ${conversation.unreadCount > 0 ? 'font-semibold text-foose-text' : 'text-foose-muted'}`} title={conversation.latestMessage.content || attachmentLabel(conversation.latestMessage.attachments?.length || 0)}>
                        {conversationPreview(conversation.latestMessage)}
                      </p>
                    </span>
                    <span className="flex min-w-12 flex-col items-end gap-1">
                      {conversation.latestMessage.createdAt && <time className={`whitespace-nowrap text-xs ${conversation.unreadCount > 0 ? 'font-bold text-accent' : 'text-foose-faint'}`}>{conversationTimestamp(conversation.latestMessage.createdAt)}</time>}
                      {conversation.unreadCount > 0 && <b className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-black leading-none text-white">{conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}</b>}
                    </span>
                  </a>
                )
              })}
          </section>
          )}
          {params.section === 'system' && (
          <section className="system-notifications flex min-h-0 flex-1 flex-col overflow-y-auto" aria-label="System notifications">
            <h2 className="sr-only">System notifications</h2>
            {notificationLoading && <LoadingState label="Loading notifications..." />}
            {notificationError && <ErrorState message={notificationError} />}
            {!notificationLoading && !notificationError && !notificationItems.length && (
              <EmptyState body={`${brand} will show follows, reviews, orders, and other alerts here.`} title="No notifications" />
            )}
            {notificationItems.map((notification) => (
              <button className={`notification-item grid min-h-[76px] w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 border-b border-foose-border px-4 py-3 text-left transition hover:bg-foose-surface-low ${notification.isRead ? 'bg-foose-surface' : 'bg-accent-light/55'}`} key={notification._id} onClick={() => openNotificationDetails(notification)} type="button">
                <span className="inline-flex size-11 items-center justify-center rounded-full bg-accent-light text-accent">
                  <Icon name="bell" />
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-sm font-bold text-foose-text">{notification.title}</strong>
                  <p className="line-clamp-2 text-sm leading-5 text-foose-muted">{notification.body || 'System update'}</p>
                  {notification.createdAt && <time className="mt-1 block text-xs text-foose-faint">{conversationTimestamp(notification.createdAt)}</time>}
                </span>
                {!notification.isRead && <span aria-label="Unread" className="size-2.5 rounded-full bg-red-500" />}
              </button>
            ))}
          </section>
          )}
        </aside>
        <section className={`thread flex min-h-0 flex-col bg-foose-bg xl:h-full xl:overflow-hidden ${compactThreadOpen ? 'max-xl:h-dvh' : 'max-xl:hidden'}`}>
          {!canCompose ? (
            <div className="flex min-h-[70dvh] flex-1 items-center justify-center p-6 text-center xl:min-h-0">
              <p className="max-w-sm text-sm font-semibold leading-6 text-foose-muted">
                Choose a conversation or message someone to start chatting.
              </p>
            </div>
          ) : (
            <>
          <header className="thread-header sticky top-0 z-20 flex min-h-16 shrink-0 items-center gap-3 border-b border-foose-border bg-foose-surface px-4 py-2 shadow-sm max-xl:px-3 [&_img]:size-10 [&_img]:shrink-0 [&_img]:rounded-full [&_img]:object-cover [&_h2]:truncate [&_h2]:text-sm [&_h2]:font-bold [&_p]:truncate [&_p]:text-xs [&_p]:text-foose-muted">
            <a aria-label="Back to inbox" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-foose-text transition hover:bg-foose-surface-low xl:hidden" href={withBasePath('/inbox')}>
              <span className="rotate-180"><Icon name="arrow" /></span>
            </a>
            {userPhoto(activeParticipantProfile) ? <img alt="" src={userPhoto(activeParticipantProfile)} /> : <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent">{initials(activeThreadTitle)}</span>}
            <div className="min-w-0 flex-1">
              <h2>{activeThreadTitle}</h2>
              <p>{activeThreadSubtitle}</p>
              {contactPhone && (
                <a className="chat-contact-phone text-xs font-semibold text-accent" href={`tel:${contactPhone}`}>
                  {contactPhone}
                </a>
              )}
            </div>
          </header>
          <div className="messages flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-4 pb-6 max-md:px-3" ref={messagesRef}>
            {params.conversationId && olderMessagesEnabled && (
              <div ref={messages.sentinelRef} className="flex min-h-10 items-center justify-center py-2">
                {messages.loadingMore && <span className="size-5 animate-spin rounded-full border-2 border-foose-border border-t-accent" aria-label="Loading older messages" />}
              </div>
            )}
            {messages.loading && <LoadingState label="Loading conversation..." />}
            {messages.error && <ErrorState message={messages.error} retry={messages.refetch} />}
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
          {sendError && <p className="danger-text px-3 py-2 text-sm font-semibold text-foose-danger inbox-send-error">{sendError}</p>}
          {replyTarget && <ReplyContextBand message={replyTarget} onDismiss={() => setReplyTarget(null)} />}
          <ListingContextBand listing={activeComposerListing} onDismiss={() => setDismissedListingId(params.listingId)} />
          <form className={`message-composer sticky bottom-0 flex shrink-0 items-end gap-2 border-t border-foose-border bg-foose-surface p-3 max-md:gap-1.5 max-md:pb-[calc(0.75rem+env(safe-area-inset-bottom))] [&_input]:h-12 [&_input]:w-full [&_input]:px-4 ${canCompose ? 'single-line' : ''} `} onSubmit={(event) => void sendMessage(event)}>
            {!params.conversationId && !params.receiverId && <input aria-label="Receiver user ID" name="receiverId" placeholder="Receiver user ID" />}
            <div className="composer-main min-w-0 flex-1 [&_input]:h-12 [&_input]:w-full [&_input]:rounded-full [&_input]:border [&_input]:border-foose-border [&_input]:bg-foose-surface-low [&_input]:px-4 [&_input]:outline-none [&_input]:transition [&_input]:focus:border-accent [&_input]:focus:bg-white">
              <input aria-label="Write message" autoComplete="off" name="content" placeholder={activeComposerListing ? 'Ask a question about this product...' : 'Message'} ref={messageInputRef} />
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
            <label className="attachment-button inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-foose-border bg-foose-surface text-accent hover:bg-accent-light [&_input]:sr-only" title="Attach images or videos">
              <Icon name="upload" />
              <input accept="image/*,video/*" multiple name="attachments" onChange={handleAttachmentChange} type="file" />
            </label>
            <label className="attachment-button inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-foose-border bg-foose-surface text-accent hover:bg-accent-light max-sm:hidden [&_input]:sr-only" title="Open camera">
              <Icon name="camera" />
              <input accept="image/*,video/*" capture="environment" multiple onChange={handleAttachmentChange} type="file" />
            </label>
            <button aria-label="Send message" className="message-send-button inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-accent bg-accent text-white transition hover:bg-accent-hover" type="submit">
              <Icon name="send" />
            </button>
          </form>
            </>
          )}
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
