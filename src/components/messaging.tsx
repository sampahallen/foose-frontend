import type { ReactNode } from 'react'

export function Message({ children, incoming = false }: { children: ReactNode; incoming?: boolean }) {
  return (
    <div className={`message ${incoming ? 'incoming' : 'outgoing'}`}>
      <p>{children}</p>
      <time>{incoming ? 'Just now' : '12:45 PM'}</time>
    </div>
  )
}
