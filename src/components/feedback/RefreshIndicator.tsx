export function RefreshIndicator({
  active,
  className = '',
  label = 'Refreshing content',
}: {
  active: boolean
  className?: string
  label?: string
}) {
  if (!active) return null

  return (
    <div aria-atomic="true" aria-live="polite" className={`w-full ${className}`} role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="h-0.5 w-full overflow-hidden rounded-full bg-accent-light">
        <span className="refresh-indicator-bar block h-full w-1/3 rounded-full bg-accent motion-reduce:w-full" />
      </div>
    </div>
  )
}
