import { useEffect, useMemo, useState } from 'react'
import { AppShell, ErrorState, LoadingState } from '../components'
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
        window.history.replaceState(null, '', window.location.pathname)
        navigateTo(redirectTarget)
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
          {error ? <ErrorState message={error} /> : <LoadingState label="Finishing sign in..." />}
        </div>
      </section>
    </AppShell>
  )
}
