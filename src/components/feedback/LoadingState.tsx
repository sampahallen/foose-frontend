export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="state-panel">
      <span className="loading-dot" />
      <p>{label}</p>
    </div>
  )
}
