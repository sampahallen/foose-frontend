export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="state-panel mx-auto my-10 flex max-w-xl flex-col items-center gap-4 rounded-xl border border-foose-border bg-foose-surface p-8 text-center">
      <span className="loading-dot size-8 animate-spin rounded-full border-4 border-foose-surface-high border-t-accent" />
      <p>{label}</p>
    </div>
  )
}
