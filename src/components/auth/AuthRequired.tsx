import { useEffect, type ReactNode } from 'react'
import { getAppName } from '../../config/env'
import { useAuth } from '../../hooks/useAuth'
import { authHref, currentRedirectTarget } from '../../utils/authRedirect'
import { EmptyState, LoadingState } from '../feedback'
import { ButtonLink } from '../ui/ButtonLink'

export function AuthRequired({
  adminOnly = false,
  children,
}: {
  adminOnly?: boolean
  children: ReactNode
}) {
  const { status, user } = useAuth()
  const brand = getAppName()
  const redirectTarget = currentRedirectTarget()

  useEffect(() => {
    if (status === 'guest' && !user) {
      window.location.replace(authHref('/register', redirectTarget))
    }
  }, [redirectTarget, status, user])

  if (status === 'checking') return <LoadingState label="Checking your session..." />

  if (!user) {
    return <LoadingState label="Redirecting to sign up..." />
  }

  if (adminOnly && user.role !== 'admin') {
    return (
      <main className="page">
        <EmptyState
          action={<ButtonLink to="/">Back to marketplace</ButtonLink>}
          body={`This area is limited to ${brand} administrators.`}
          icon="alert"
          title="Admin access required"
        />
      </main>
    )
  }

  return children
}
