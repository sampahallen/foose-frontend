import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AppShell,
  ButtonLink,
  LoadingRegion,
  SkeletonBlock,
  StatePanel,
} from '../components'
import { useAuth } from '../hooks/useAuth'
import { ApiError, apiPost } from '../lib/api'
import { getErrorMessage } from '../utils/errorMessage'
import { getCurrentAppPathname, withBasePath } from '../utils/navigation'

type VerificationState = 'processing' | 'success' | 'invalid' | 'network-error'

const TOKEN_PATTERN = /^[a-f0-9]{64}$/i

function normalizedEmail(value: string | undefined) {
  return String(value || '').trim().toLowerCase()
}

function currentVerificationToken() {
  const match = getCurrentAppPathname().match(/^\/verify-email\/([^/?#]+)/)
  if (!match) return ''
  try {
    return decodeURIComponent(match[1]).trim()
  } catch {
    return ''
  }
}

function clearVerificationTokenFromUrl() {
  const cleanUrl = window.location.hash.startsWith('#/')
    ? `${window.location.pathname}#/verify-email`
    : withBasePath('/verify-email')
  window.history.replaceState(window.history.state, '', cleanUrl)
}

export function VerifyEmailPage() {
  const { refreshUser, user } = useAuth()
  const tokenRef = useRef(currentVerificationToken())
  const startedRef = useRef(false)
  const [error, setError] = useState('')
  const [sessionUnlocked, setSessionUnlocked] = useState(false)
  const [state, setState] = useState<VerificationState>('processing')
  const [verifiedEmail, setVerifiedEmail] = useState('')

  const verify = useCallback(async () => {
    const token = tokenRef.current
    if (!TOKEN_PATTERN.test(token)) {
      setState('invalid')
      return
    }

    setError('')
    setState('processing')
    try {
      const result = await apiPost<{ email: string }>('/auth/verify-email', { token }, { auth: false })
      const resultEmail = normalizedEmail(result.email)
      const currentEmail = normalizedEmail(user?.email)
      setVerifiedEmail(resultEmail)
      setSessionUnlocked(false)

      if (user && resultEmail && resultEmail === currentEmail) {
        try {
          const refreshedUser = await refreshUser()
          setSessionUnlocked(
            Boolean(refreshedUser.isEmailVerified)
            && normalizedEmail(refreshedUser.email) === resultEmail,
          )
        } catch {
          // Verification succeeded. The member can sign in again if this session cannot refresh.
          setSessionUnlocked(false)
        }
      }
      setState('success')
    } catch (requestError) {
      if (requestError instanceof ApiError && (requestError.status === 400 || requestError.status === 422)) {
        setState('invalid')
        return
      }
      setError(getErrorMessage(requestError, 'We could not reach Foose to verify your email.'))
      setState('network-error')
    }
  }, [refreshUser, user])

  useEffect(() => {
    clearVerificationTokenFromUrl()
    if (startedRef.current) return
    startedRef.current = true
    void verify()
  }, [verify])

  return (
    <AppShell flush>
      <section className="fixed inset-0 z-100 flex items-center justify-center bg-black/45 p-4">
        <div className="w-full max-w-md rounded-2xl border border-accent/20 bg-white p-6 shadow-2xl shadow-black/20 sm:p-8">
          {state === 'processing' && (
            <LoadingRegion className="grid gap-4" label="Verifying your email" layout="immersive">
              <SkeletonBlock className="mx-auto size-14 rounded-full" />
              <SkeletonBlock className="mx-auto h-7 w-52" />
              <SkeletonBlock className="mx-auto h-4 w-full max-w-xs" />
            </LoadingRegion>
          )}
          {state === 'success' && (
            <StatePanel
              action={sessionUnlocked ? <ButtonLink to="/browse">Continue to Foose</ButtonLink> : <ButtonLink to="/login">Continue to login</ButtonLink>}
              body={sessionUnlocked
                ? 'Your email address is verified and this session is ready to use messaging, checkout, and seller features.'
                : `${verifiedEmail || 'Your email address'} is verified. Log in to that account to use messaging, checkout, and seller features.`}
              layout="immersive"
              title="Email verified"
              tone="success"
            />
          )}
          {state === 'invalid' && (
            <StatePanel
              action={<ButtonLink to="/login">Back to login</ButtonLink>}
              body="This verification link is invalid, expired, or has already been used. Log in with your account details to request a fresh link."
              layout="immersive"
              title="Verification link unavailable"
              tone="error"
            />
          )}
          {state === 'network-error' && (
            <StatePanel
              actions={(
                <>
                  <button className="button button-primary" onClick={() => void verify()} type="button">Try again</button>
                  <ButtonLink to="/login" variant="secondary">Back to login</ButtonLink>
                </>
              )}
              body={error}
              layout="immersive"
              title="Email verification could not finish"
              tone="error"
            />
          )}
        </div>
      </section>
    </AppShell>
  )
}
