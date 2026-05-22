import type { ReactNode } from 'react'

export function SectionHeader({
  title,
  eyebrow,
  action,
}: {
  title: string
  eyebrow?: string
  action?: ReactNode
}) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {eyebrow && <p>{eyebrow}</p>}
      </div>
      {action}
    </div>
  )
}
