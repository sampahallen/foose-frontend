import { Icon } from '../icons/Icon'

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="state-panel error-state">
      <Icon name="alert" size={32} />
      <h2>Unable to load this view</h2>
      <p>{message}</p>
      {retry && (
        <button className="button button-secondary" onClick={retry} type="button">
          Retry
        </button>
      )}
    </div>
  )
}
