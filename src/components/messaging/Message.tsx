import type { ReactNode } from 'react'
import type { ChatAttachment } from '../../types/api'
import { LightboxImage } from '../ui/LightboxImage'

export function Message({
  attachments = [],
  children,
  incoming = false,
  subtitle,
}: {
  attachments?: ChatAttachment[]
  children: ReactNode
  incoming?: boolean
  subtitle?: string
}) {
  return (
    <div className={`message ${incoming ? 'incoming' : 'outgoing'}`}>
      {children && <p>{children}</p>}
      {!!attachments.length && (
        <div className="message-attachments">
          {attachments.map((attachment) =>
            attachment.type === 'video' ? (
              <video controls key={attachment.url} src={attachment.url} />
            ) : (
              <LightboxImage alt={attachment.originalname || 'Message attachment'} key={attachment.url} src={attachment.url} />
            ),
          )}
        </div>
      )}
      {subtitle && <time>{subtitle}</time>}
    </div>
  )
}
