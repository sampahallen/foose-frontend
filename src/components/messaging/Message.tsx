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
    <div className={`message max-w-[82%] space-y-2 rounded-2xl px-4 py-3 text-sm shadow-sm [&.incoming]:self-start [&.incoming]:rounded-bl-sm [&.incoming]:bg-foose-surface-high [&.incoming]:text-foose-text [&.outgoing]:self-end [&.outgoing]:rounded-br-sm [&.outgoing]:bg-accent [&.outgoing]:text-white [&:not(.incoming)]:self-end [&:not(.incoming)]:rounded-br-sm [&:not(.incoming)]:bg-accent [&:not(.incoming)]:text-white [&_time]:block [&_time]:text-xs [&_time]:opacity-70 max-md:max-w-[92%] ${incoming ? 'incoming' : 'outgoing'} `}>
      {children && <p>{children}</p>}
      {!!attachments.length && (
        <div className="message-attachments flex flex-wrap gap-2 [&_img]:max-h-44 [&_img]:rounded-lg [&_img]:object-cover [&_video]:max-h-44 [&_video]:rounded-lg [&_video]:object-cover">
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
