import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ButtonLink } from '../ui/ButtonLink'
import { StatePanel } from './StatePanel'

type Props = {
  children: ReactNode
  resetKey: string
}

type State = {
  hasError: boolean
}

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Route render failed', error, info.componentStack)
  }

  componentDidUpdate(previousProps: Props) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="mx-auto min-h-dvh w-full max-w-4xl px-4 py-8 sm:px-6">
        <StatePanel
          actions={(
            <>
              <button
                className="button button-primary inline-flex min-h-11 items-center justify-center rounded-lg border border-accent bg-accent px-5 py-2.5 text-sm font-bold text-white"
                onClick={() => window.location.reload()}
                type="button"
              >
                Reload page
              </button>
              <ButtonLink to="/" variant="secondary">Go home</ButtonLink>
            </>
          )}
          body="Your information is safe. Reload this page, or return home and try again."
          layout="immersive"
          title="This page stopped responding"
          tone="error"
        />
      </main>
    )
  }
}
