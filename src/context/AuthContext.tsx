import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { clearLocalDrafts } from '../components/forms/useLocalDraft'
import { apiGet, apiPost, clearStoredTokens, getStoredTokens, storeTokens } from '../lib/api'
import type { AuthPayload, AuthTokens, User } from '../types/api'
import { clearNavigationSession } from '../utils/navigation'
import { AuthContext, type AuthStatus } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking')
  const [user, setUser] = useState<User | null>(null)

  const applyAuth = useCallback((payload: AuthPayload) => {
    storeTokens(payload.tokens)
    setUser(payload.user)
    setStatus('authenticated')
  }, [])

  const becomeGuest = useCallback(() => {
    clearStoredTokens()
    setUser(null)
    setStatus('guest')
  }, [])

  const refreshUser = useCallback(async () => {
    const data = await apiGet<{ user: User }>('/users/me')
    setUser(data.user)
    setStatus('authenticated')
  }, [])

  useEffect(() => {
    async function boot() {
      const tokens = getStoredTokens()

      if (!tokens?.accessToken) {
        becomeGuest()
        return
      }

      try {
        await refreshUser()
      } catch {
        if (!tokens.refreshToken) {
          becomeGuest()
          return
        }

        try {
          applyAuth(await apiPost<AuthPayload>('/auth/refresh', { refreshToken: tokens.refreshToken }, { auth: false }))
        } catch {
          becomeGuest()
        }
      }
    }

    void boot()
  }, [applyAuth, becomeGuest, refreshUser])

  const login = useCallback(
    async (payload: { identifier: string; password: string }) => {
      applyAuth(await apiPost<AuthPayload>('/auth/login', payload, { auth: false }))
    },
    [applyAuth],
  )

  const register = useCallback(
    async (payload: {
      name: string
      email: string
      username: string
      password: string
      phone?: string
      location?: { region?: string; city?: string }
    }) => {
      await apiPost('/auth/register', payload, { auth: false })
    },
    [],
  )

  const completeOAuth = useCallback(
    (tokens: AuthTokens) => {
      storeTokens(tokens)
      setStatus('checking')
    },
    [],
  )

  const logout = useCallback(async () => {
    const refreshToken = getStoredTokens()?.refreshToken

    try {
      await apiPost('/auth/logout', { refreshToken })
    } catch {
      // Local logout still wins if the server cannot be reached.
    } finally {
      clearLocalDrafts(user?._id)
      clearNavigationSession()
      becomeGuest()
    }
  }, [becomeGuest, user?._id])

  const value = useMemo(
    () => ({ completeOAuth, login, logout, refreshUser, register, status, user }),
    [completeOAuth, login, logout, refreshUser, register, status, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
