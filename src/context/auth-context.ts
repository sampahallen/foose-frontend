import { createContext } from 'react'
import type { AuthTokens, User } from '../types/api'

export type AuthStatus = 'checking' | 'guest' | 'authenticated'

export type AuthContextValue = {
  status: AuthStatus
  user: User | null
  login: (payload: { identifier: string; password: string }) => Promise<void>
  register: (payload: {
    name: string
    email: string
    username: string
    password: string
    phone?: string
    location?: { region?: string; city?: string }
  }) => Promise<void>
  completeOAuth: (tokens: AuthTokens) => void
  logout: () => Promise<void>
  refreshUser: () => Promise<User>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
