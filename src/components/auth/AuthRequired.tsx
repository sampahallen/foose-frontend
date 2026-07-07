import { useEffect, type ReactNode } from 'react'
import { isStaffRole } from '../../constants/roles'
import { getAppName } from '../../config/env'
import { useAuth } from '../../hooks/useAuth'
import { authHref, currentRedirectTarget } from '../../utils/authRedirect'
import { navigateTo } from '../../utils/navigation'
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
      navigateTo(authHref('/login', redirectTarget))
    }
  }, [redirectTarget, status, user])

  if (status === 'checking') return <LoadingState label="Checking your session..." />

  if (!user) {
    return <LoadingState label="Redirecting to sign in..." />
  }

  if (adminOnly && !isStaffRole(user.roles, user.role)) {
    return (
      <main className="page mx-auto w-full max-w-[1280px] px-4 pb-24 pt-8 md:px-6 lg:px-8 max-md:px-3 max-md:pt-5">
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
