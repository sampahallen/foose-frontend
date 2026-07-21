import { useEffect, useState, type ReactNode } from 'react'
import { isStaffRole } from '../../constants/roles'
import { getAppName } from '../../config/env'
import { useAuth } from '../../hooks/useAuth'
import { apiPost } from '../../lib/api'
import { authHref, currentRedirectTarget } from '../../utils/authRedirect'
import { getErrorMessage } from '../../utils/errorMessage'
import { navigateTo } from '../../utils/navigation'
import { LoadingRegion, SkeletonBlock, StatePanel } from '../feedback'
import { AppShell } from '../layout/AppShell'
import { ButtonLink } from '../ui/ButtonLink'

export type EmailVerificationPurpose = 'checkout' | 'listing' | 'messaging' | 'shop'

const verificationCopy: Record<EmailVerificationPurpose, { active?: 'cart' | 'inbox' | 'shop'; title: string }> = {
  checkout: { active: 'cart', title: 'Verify your email to check out' },
  listing: { active: 'shop', title: 'Verify your email to list an item' },
  messaging: { active: 'inbox', title: 'Verify your email to message members' },
  shop: { active: 'shop', title: 'Verify your email to open a DigiShop' },
}

export function AuthRequired({
  adminOnly = false,
  children,
  verifiedOnly,
}: {
  adminOnly?: boolean
  children: ReactNode
  verifiedOnly?: EmailVerificationPurpose
}) {
  const { status, user } = useAuth()
  const brand = getAppName()
  const redirectTarget = currentRedirectTarget()
  const [resending, setResending] = useState(false)
  const [resendError, setResendError] = useState('')
  const [resendMessage, setResendMessage] = useState('')

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

  const verificationEmail = user.email

  async function resendVerificationEmail() {
    setResending(true)
    setResendError('')
    setResendMessage('')

    try {
      await apiPost('/auth/resend-verification', {})
      setResendMessage(`A new verification email was sent to ${verificationEmail}.`)
    } catch (requestError) {
      setResendError(getErrorMessage(requestError, 'A new verification email could not be sent. Please try again.'))
    } finally {
      setResending(false)
    }
  }

  if (verifiedOnly && !user.isEmailVerified) {
    const copy = verificationCopy[verifiedOnly]

    return (
      <AppShell active={copy.active}>
        <StatePanel
          actions={(
            <>
              <button className="button button-primary" disabled={resending} onClick={() => void resendVerificationEmail()} type="button">
                {resending ? 'Sending verification email...' : 'Send new verification email'}
              </button>
              {verifiedOnly === 'messaging' && <ButtonLink to="/inbox?view=system" variant="secondary">View system notifications</ButtonLink>}
              <ButtonLink to="/browse" variant="secondary">Keep browsing</ButtonLink>
            </>
          )}
          body={(
            <div className="grid gap-3">
              <p>
                Open the one-time verification link sent to <strong className="text-foose-text">{user.email}</strong>.
                {' '}You can still browse, save favorites, and add items to your cart while you verify.
              </p>
              {resendMessage && <p className="font-semibold text-foose-success" role="status">{resendMessage}</p>}
              {resendError && <p className="font-semibold text-foose-danger" role="alert">{resendError}</p>}
            </div>
          )}
          layout="page"
          title={copy.title}
          tone="permission"
        />
      </AppShell>
    )
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
