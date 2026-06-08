import { Icon } from '../icons/Icon'

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="state-panel mx-auto my-10 flex max-w-xl flex-col items-center gap-4 rounded-xl border border-foose-border bg-foose-surface p-8 text-center error-state border-foose-danger-bg">
      <Icon name="alert" size={32} />
      <h2>Unable to load this view</h2>
      <p>{message}</p>
      {retry && (
        <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={retry} type="button">
          Retry
        </button>
      )}
    </div>
  )
}
