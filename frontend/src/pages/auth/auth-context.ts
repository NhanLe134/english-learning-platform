import { createContext, useContext } from 'react'
import type { AuthSession, AuthUser } from './auth-api'

export interface AuthContextValue {
  accessToken: string | null
  user: AuthUser | null
  isInitializing: boolean
  initializationError: string | null
  setSession: (session: AuthSession) => void
  refreshSession: () => Promise<AuthSession>
  clearSession: () => void
  reportError: (message: string) => void
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
