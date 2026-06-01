import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { AppShell, EmptyState, ErrorState, Icon, LoadingState, Message } from '../components'
import { getAppName } from '../config/env'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { apiPost, apiPut } from '../lib/api'
import type { ChatAttachment, ChatConversation, Listing, Notification, User } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { formatDateTime, getListingImage, initials } from '../utils/format'
import { navigateTo } from '../utils/navigation'

type ChatMessage = {
  _id: string
  attachments?: ChatAttachment[]
  content: string
  createdAt?: string
  isRead?: boolean
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

function senderIdValue(sender: User | string | undefined): string {
  if (!sender) return ''
  return typeof sender === 'string' ? sender : sender._id
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

export function InboxPage() {
  const { user } = useAuth()
  const brand = getAppName()
  const params = inboxParams()
  const messages = useApiResource<{ messages: ChatMessage[] }>(
    params.conversationId ? `/chat/${encodeURIComponent(params.conversationId)}` : null,
    Boolean(params.conversationId),
  )
  const conversations = useApiResource<{ conversations: ChatConversation[] }>('/chat')
  const notifications = useApiResource<{ notifications: Notification[] }>('/notifications?limit=20')
  const refetchConversations = conversations.refetch
  const refetchMessages = messages.refetch
  const refetchNotifications = notifications.refetch
  const [sendError, setSendError] = useState('')
  const [selectedAttachments, setSelectedAttachments] = useState<DraftAttachment[]>([])
  const [previewAttachment, setPreviewAttachment] = useState<DraftAttachment | null>(null)
  const selectedAttachmentsRef = useRef<DraftAttachment[]>([])
  const myId = user?._id || ''
  const conversationItems = conversations.data?.conversations || []
  const orderedConversations = [...conversationItems].sort((first, second) => {
    const firstDate = Date.parse(first.latestMessage.createdAt || '') || 0
    const secondDate = Date.parse(second.latestMessage.createdAt || '') || 0
    return secondDate - firstDate
  })
  const activeConversation = orderedConversations.find((conversation) => conversation.conversationId === params.conversationId)
  const activeParticipant = activeConversation?.participant
  const activeListing = activeConversation?.listing || activeConversation?.latestMessage.listingId
  const canCompose = Boolean(params.conversationId || params.receiverId)
  const notificationItems = notifications.data?.notifications || []
  const unreadNotifications = notificationItems.filter((notification) => !notification.isRead)
  const seenNotifications = notificationItems.filter((notification) => notification.isRead)
  const productMessages = messages.data?.messages || []
  const productChat = Boolean(activeListing || productMessages.some((message) => Boolean(message.listingId)))
  const activeContact = productMessages
    .flatMap((message) => [message.senderId, message.receiverId])
    .find((participant) => typeof participant === 'object' && participant._id !== myId) as User | undefined
  const contactPhone = productChat ? activeContact?.phone : ''

  useEffect(() => {
    if (!params.conversationId || !activeConversation?.unreadCount) return

    let mounted = true
    void apiPut(`/chat/${encodeURIComponent(params.conversationId)}/read`)
      .then(async () => {
        if (mounted) await refetchConversations()
      })
      .catch(() => undefined)

    return () => {
      mounted = false
    }
  }, [activeConversation?.unreadCount, params.conversationId, refetchConversations])

  useEffect(() => {
    if (!unreadNotifications.length) return undefined

    const timer = window.setTimeout(() => {
      void apiPut('/notifications/read-all')
        .then(() => refetchNotifications())
        .catch(() => undefined)
    }, 1200)

    return () => window.clearTimeout(timer)
  }, [refetchNotifications, unreadNotifications.length])

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
    setPreviewAttachment((current) => (current?.id === id ? null : current))
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
      if (params.listingId) payload.append('listingId', params.listingId)
      if (!params.conversationId && receiverId) payload.append('receiverId', receiverId)
      selectedAttachments.forEach((attachment) => payload.append('attachments', attachment.file))

      const result = await apiPost<{ conversationId: string; message: ChatMessage }>('/chat', payload)
      form.reset()
      selectedAttachments.forEach((attachment) => URL.revokeObjectURL(attachment.url))
      setSelectedAttachments([])
      setPreviewAttachment(null)
      await refetchConversations()
      if (params.conversationId) {
        await refetchMessages()
      } else {
        navigateTo(`/inbox?conversationId=${encodeURIComponent(result.conversationId)}`)
      }
    } catch (err) {
      setSendError(getErrorMessage(err, 'Could not send message'))
    }
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
    <AppShell searchPlaceholder="Search messages..." flush>
      <main className="inbox-shell">
        <aside className="conversation-list">
          <div className="inbox-heading">
            <h1>Messages</h1>
          </div>
          <section className="conversation-stack">
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
                const previewListing = conversation.listing || conversation.latestMessage.listingId
                const image = userPhoto(participant) || listingImage(previewListing)

                return (
                  <a
                    className={`conversation ${active ? 'active' : ''}`}
                    href={`/inbox?conversationId=${encodeURIComponent(conversation.conversationId)}`}
                    key={conversation.conversationId}
                  >
                    {image ? <img alt="" src={image} /> : <span className="conversation-avatar">{initials(displayUser(participant))}</span>}
                    <span>
                      <strong>{displayUser(participant)}</strong>
                      <p title={conversation.latestMessage.content || attachmentLabel(conversation.latestMessage.attachments?.length || 0)}>
                        {conversationPreview(conversation.latestMessage)}
                      </p>
                      {listingTitle(previewListing) && <small>{listingTitle(previewListing)}</small>}
                    </span>
                    {conversation.latestMessage.createdAt && <time>{formatDateTime(conversation.latestMessage.createdAt)}</time>}
                    {conversation.unreadCount > 0 && <b>{conversation.unreadCount}</b>}
                  </a>
                )
              })}
          </section>
          <section className="system-notifications">
            <h2>System notifications</h2>
            {notifications.loading && <LoadingState label="Loading notifications..." />}
            {notifications.error && <ErrorState message={notifications.error} retry={notifications.refetch} />}
            {!notifications.loading && !notifications.error && !notifications.data?.notifications.length && (
              <EmptyState body={`${brand} will show follows, reviews, orders, and other alerts here.`} title="No notifications" />
            )}
            {!!unreadNotifications.length &&
              unreadNotifications.map((notification) => (
                <article className="notification-item unread" key={notification._id}>
                  <strong>{notification.title}</strong>
                  <p>{notification.body || 'System update'}</p>
                  {notification.createdAt && <span>{formatDateTime(notification.createdAt)}</span>}
                </article>
              ))}
            {!!seenNotifications.length && (
              <details className="seen-notifications">
                <summary>Seen notifications ({seenNotifications.length})</summary>
                <div>
                  {seenNotifications.map((notification) => (
                    <article className="notification-item seen" key={notification._id}>
                      <strong>{notification.title}</strong>
                      <p>{notification.body || 'System update'}</p>
                      {notification.createdAt && <span>{formatDateTime(notification.createdAt)}</span>}
                    </article>
                  ))}
                </div>
              </details>
            )}
          </section>
        </aside>
        <section className="thread">
          <header>
            {activeListing && listingImage(activeListing) && <img alt="" src={listingImage(activeListing)} />}
            <div>
              <h2>{params.conversationId ? displayUser(activeParticipant) : params.receiverId ? 'New seller message' : 'Select a conversation'}</h2>
              <p>{listingTitle(activeListing) || (canCompose ? 'Write your message below' : 'Open a thread or message a seller from a listing.')}</p>
              {contactPhone && (
                <a className="chat-contact-phone" href={`tel:${contactPhone}`}>
                  {contactPhone}
                </a>
              )}
            </div>
          </header>
          <div className="messages">
            {messages.loading && <LoadingState label="Loading conversation..." />}
            {messages.error && <ErrorState message={messages.error} retry={messages.refetch} />}
            {!params.conversationId && !params.receiverId && (
              <EmptyState body="Choose a conversation on the left, or open a listing and message its seller." title="No thread selected" />
            )}
            {!params.conversationId && params.receiverId && (
              <EmptyState body="Send the first message to start this seller conversation." title="Ready to message" />
            )}
            {!!messages.data?.messages.length &&
              messages.data.messages.map((message) => {
                const incoming = Boolean(myId) && senderIdValue(message.senderId) !== myId
                const subtitle = message.createdAt ? formatDateTime(message.createdAt) : undefined
                return (
                  <Message attachments={message.attachments || []} incoming={incoming} key={message._id} subtitle={subtitle}>
                    {message.content}
                  </Message>
                )
              })}
          </div>
          {sendError && <p className="danger-text inbox-send-error">{sendError}</p>}
          <form className={`message-composer ${canCompose ? 'single-line' : ''}`} onSubmit={(event) => void sendMessage(event)}>
            {!params.conversationId && !params.receiverId && <input aria-label="Receiver user ID" name="receiverId" placeholder="Receiver user ID" />}
            <div className="composer-main">
              <input aria-label="Write message" name="content" placeholder="Ask a question about this product..." />
              {!!selectedAttachments.length && (
                <div className="composer-media-previews">
                  {selectedAttachments.map((attachment, index) => (
                    <div className="composer-media-preview" key={attachment.id}>
                      <button
                        aria-label={`Preview ${attachment.file.name}`}
                        onClick={() => setPreviewAttachment(attachment)}
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
            <label className="attachment-button" title="Attach images or videos">
              <Icon name="upload" />
              <input accept="image/*,video/*" multiple name="attachments" onChange={handleAttachmentChange} type="file" />
            </label>
            <label className="attachment-button" title="Open camera">
              <Icon name="camera" />
              <input accept="image/*,video/*" capture="environment" multiple onChange={handleAttachmentChange} type="file" />
            </label>
            <button aria-label="Send message" className="message-send-button" type="submit">
              <Icon name="send" />
            </button>
          </form>
          {previewAttachment && (
            <div className="image-lightbox" role="dialog" aria-label="Attachment preview" aria-modal="true">
              <button className="image-lightbox-close" onClick={() => setPreviewAttachment(null)} type="button" aria-label="Close attachment preview">
                <Icon name="plus" />
              </button>
              {previewAttachment.type === 'video' ? (
                <video controls src={previewAttachment.url} />
              ) : (
                <img alt={previewAttachment.file.name} src={previewAttachment.url} />
              )}
            </div>
          )}
        </section>
      </main>
    </AppShell>
  )
}
