import { useEffect, useMemo, useState } from 'react'
import { AppShell, ButtonLink, LoadingRegion, SkeletonBlock, StatePanel } from '../components'
import { useAuth } from '../hooks/useAuth'
import type { AuthTokens } from '../types/api'
import { navigateTo } from '../utils/navigation'

function readOAuthTokens(): AuthTokens | null {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, '') || window.location.search.replace(/^\?/, ''))
  const accessToken = params.get('accessToken')
  const refreshToken = params.get('refreshToken')

  if (!accessToken || !refreshToken) return null

  return {
    accessToken,
    expiresIn: params.get('expiresIn') || undefined,
    refreshToken,
  }
}

function readCallbackParams() {
  return new URLSearchParams(window.location.hash.replace(/^#/, '') || window.location.search.replace(/^\?/, ''))
}

export function AuthCallbackPage() {
  const { completeOAuth, refreshUser } = useAuth()
  const [error, setError] = useState('')
  const redirectTarget = useMemo(() => {
    const params = readCallbackParams()
    return params.get('redirect') || '/'
  }, [])

  useEffect(() => {
    async function finish() {
      const params = readCallbackParams()
      const callbackError = params.get('error')
      if (callbackError) {
        setError(callbackError)
        return
      }

      const tokens = readOAuthTokens()
      if (!tokens) {
        setError('This sign-in link did not return usable credentials.')
        return
      }

      try {
        completeOAuth(tokens)
        await refreshUser()
        navigateTo(redirectTarget, { replace: true })
      } catch {
        setError('Sign-in completed, but we could not load your profile.')
      }
    }

    void finish()
  }, [completeOAuth, redirectTarget, refreshUser])

  return (
    <AppShell flush>
      <section className="fixed inset-0 z-100 flex items-center justify-center bg-black/45 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-accent/20 bg-white p-6 text-center shadow-2xl shadow-black/20">
          {error ? (
            <StatePanel
              action={<ButtonLink to="/login">Back to login</ButtonLink>}
              body={error}
              layout="compact"
              title="Sign-in could not finish"
              tone="error"
            />
          ) : (
            <LoadingRegion label="Finishing sign in" layout="compact">
              <div className="flex flex-col items-center gap-4 py-3">
                <SkeletonBlock className="size-12 rounded-full" />
                <SkeletonBlock className="h-5 w-40" />
                <SkeletonBlock className="h-3 w-56 max-w-full" />
              </div>
            </LoadingRegion>
          )}
        </div>
      </section>
    </AppShell>
  )
}
