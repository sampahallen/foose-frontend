import { AppShell, EmptyState, ErrorState, Icon, LoadingState, Message } from '../components'
import { apiPost } from '../lib/api'
import { useApiResource } from '../hooks/useApiResource'
import type { User } from '../types/api'
import { formatDateTime } from '../utils/format'

type ChatMessage = {
  _id: string
  content: string
  createdAt?: string
  isRead?: boolean
  senderId?: User | string
}

function conversationId() {
  return new URLSearchParams(window.location.search).get('conversationId')
}

export function InboxPage() {
  const id = conversationId()
  const messages = useApiResource<{ messages: ChatMessage[] }>(id ? `/chat/${id}` : null, Boolean(id))

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const content = String(formData.get('content') || '').trim()
    const receiverId = String(formData.get('receiverId') || '').trim()
    const currentConversationId = id || String(formData.get('conversationId') || '').trim()

    if (!content || (!currentConversationId && !receiverId)) return

    await apiPost('/chat', {
      content,
      conversationId: currentConversationId || undefined,
      receiverId: receiverId || undefined,
    })
    event.currentTarget.reset()
    if (id) await messages.refetch()
  }

  return (
    <AppShell searchPlaceholder="Search messages..." flush>
      <main className="inbox-shell">
        <aside className="conversation-list">
          <div className="inbox-heading">
            <h1>Messages</h1>
          </div>
          <EmptyState
            body="The API currently exposes conversation detail by ID. Open a conversation with ?conversationId=..."
            title="No conversation list endpoint yet"
          />
        </aside>
        <section className="thread">
          <header>
            <div>
              <h2>{id ? 'Conversation' : 'Start a conversation'}</h2>
              <p>{id || 'Enter a receiver ID to send the first message.'}</p>
            </div>
          </header>
          <div className="messages">
            {messages.loading && <LoadingState label="Loading conversation..." />}
            {messages.error && <ErrorState message={messages.error} retry={messages.refetch} />}
            {!id && <EmptyState body="No account is preloaded. Messages only appear after a real login and API conversation." title="No thread selected" />}
            {!!messages.data?.messages.length &&
              messages.data.messages.map((message) => (
                <Message incoming={false} key={message._id}>
                  {message.content}
                  {message.createdAt && <span className="message-date">{formatDateTime(message.createdAt)}</span>}
                </Message>
              ))}
          </div>
          <form className="message-composer" onSubmit={(event) => void sendMessage(event)}>
            {!id && <input aria-label="Receiver ID" name="receiverId" placeholder="Receiver user ID" />}
            <input aria-label="Write message" name="content" placeholder="Write a message..." />
            <button aria-label="Send message" type="submit">
              <Icon name="send" />
            </button>
          </form>
        </section>
      </main>
    </AppShell>
  )
}
