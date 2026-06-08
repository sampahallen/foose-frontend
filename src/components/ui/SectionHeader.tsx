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
    <div className="section-header mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base [&_a]:font-bold [&_a]:text-accent max-md:[&_h2]:text-2xl">
      <div>
        <h2>{title}</h2>
        {eyebrow && <p>{eyebrow}</p>}
      </div>
      {action}
    </div>
  )
}
