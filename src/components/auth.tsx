import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { EmptyState, LoadingState } from './state'
import { ButtonLink } from './ui'

export function AuthRequired({
  adminOnly = false,
  children,
}: {
  adminOnly?: boolean
  children: ReactNode
}) {
  const { status, user } = useAuth()

  if (status === 'checking') return <LoadingState label="Checking your session..." />

  if (!user) {
    return (
      <main className="page">
        <EmptyState
          action={<ButtonLink to="/login">Log in</ButtonLink>}
          body="You need to log in before you can use this part of Foose."
          icon="shield"
          title="Authentication required"
        />
      </main>
    )
  }

  if (adminOnly && user.role !== 'admin') {
    return (
      <main className="page">
        <EmptyState
          action={<ButtonLink to="/">Back to marketplace</ButtonLink>}
          body="This area is limited to Foose administrators."
          icon="alert"
          title="Admin access required"
        />
      </main>
    )
  }

  return children
}
