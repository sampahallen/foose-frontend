import { useEffect, type ReactNode } from 'react'
import { isStaffRole } from '../../constants/roles'
import { getAppName } from '../../config/env'
import { useAuth } from '../../hooks/useAuth'
import { authHref, currentRedirectTarget } from '../../utils/authRedirect'
import { navigateTo } from '../../utils/navigation'
import { LoadingRegion, SkeletonBlock, StatePanel } from '../feedback'
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
      navigateTo(authHref('/login', redirectTarget, { closeToHome: true }), { replace: true })
    }
  }, [redirectTarget, status, user])

  const sessionLoading = (label: string) => (
    <main className="page mx-auto w-full max-w-[1280px] px-4 pb-24 pt-8 md:px-6 lg:px-8">
      <LoadingRegion className="mx-auto max-w-xl" label={label} layout="compact">
        <div className="flex items-center gap-3 rounded-xl border border-foose-border bg-foose-surface p-4">
          <SkeletonBlock className="size-10 shrink-0 rounded-full" />
          <div className="grid flex-1 gap-2">
            <SkeletonBlock className="h-3 w-36" />
            <SkeletonBlock className="h-3 w-52 max-w-full" />
          </div>
        </div>
      </LoadingRegion>
    </main>
  )

  if (status === 'checking') return sessionLoading('Checking your session...')

  if (!user) {
    return sessionLoading('Redirecting to sign in...')
  }

  if (adminOnly && !isStaffRole(user.roles, user.role)) {
    return (
      <main className="page mx-auto w-full max-w-[1280px] px-4 pb-24 pt-8 md:px-6 lg:px-8 max-md:px-3 max-md:pt-5">
        <StatePanel
          actions={(
            <>
              <ButtonLink to="/">Back to marketplace</ButtonLink>
              <ButtonLink to={authHref('/login', redirectTarget, { closeToHome: true })} variant="secondary">
                Sign in with another account
              </ButtonLink>
            </>
          )}
          body={`This area is limited to ${brand} administrators.`}
          layout="page"
          title="Admin access required"
          tone="permission"
        />
      </main>
    )
  }

  return children
}
