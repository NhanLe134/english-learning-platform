import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { authApi, getAuthApiErrorStatus, type AuthSession } from './auth-api'
import { AuthContext } from './auth-context'

const AUTH_SESSION_STORAGE_KEY = 'your-voice-auth-session'
let refreshInFlight: Promise<AuthSession> | undefined

function accessTokenIsUsable(token: string): boolean {
  try {
    const payload = token.split('.')[1]
    if (!payload) return false
    const unpadded = payload.replace(/-/g, '+').replace(/_/g, '/')
    const base64 = unpadded + '='.repeat((4 - unpadded.length % 4) % 4)
    const claims = JSON.parse(atob(base64)) as { exp?: unknown }
    return typeof claims.exp === 'number' && claims.exp > Math.floor(Date.now() / 1000) + 15
  } catch {
    return false
  }
}

function readStoredSession(): AuthSession | null {
  try {
    const value = localStorage.getItem(AUTH_SESSION_STORAGE_KEY)
    if (!value) return null
    const parsed = JSON.parse(value) as Partial<AuthSession>
    const user = parsed.user
    if (
      typeof parsed.accessToken !== 'string' ||
      !user || typeof user !== 'object' ||
      typeof user.id !== 'string' || typeof user.email !== 'string' ||
      typeof user.fullName !== 'string' ||
      (user.phoneNumber !== null && typeof user.phoneNumber !== 'string') ||
      (user.role !== 'STUDENT' && user.role !== 'TEACHER' && user.role !== 'ADMIN') ||
      !accessTokenIsUsable(parsed.accessToken)
    ) {
      localStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
      return null
    }
    return parsed as AuthSession
  } catch {
    return null
  }
}

function storeSession(session: AuthSession | null): void {
  try {
    if (session) localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
  } catch {
    // The in-memory session remains available if browser storage is blocked.
  }
}

function refreshSessionOnce(): Promise<AuthSession> {
  if (!refreshInFlight) {
    refreshInFlight = authApi.refresh().finally(() => {
      refreshInFlight = undefined
    })
  }
  return refreshInFlight
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setCurrentSession] = useState<AuthSession | null>(() => readStoredSession())
  const [initializationError, setInitializationError] = useState<string | null>(null)

  useEffect(() => {
    const syncSessionAcrossTabs = (event: StorageEvent) => {
      if (event.key !== AUTH_SESSION_STORAGE_KEY) return
      setCurrentSession(event.newValue ? readStoredSession() : null)
    }
    window.addEventListener('storage', syncSessionAcrossTabs)
    return () => window.removeEventListener('storage', syncSessionAcrossTabs)
  }, [])

  const setSession = useCallback((nextSession: AuthSession) => {
    setCurrentSession(nextSession)
    storeSession(nextSession)
    setInitializationError(null)
  }, [])

  // Refresh is only called by explicit authenticated recovery flows. Merely
  // opening a public page or returning from payment never rotates tokens.
  const refreshSession = useCallback(async () => {
    try {
      const refreshedSession = await refreshSessionOnce()
      setCurrentSession(refreshedSession)
      storeSession(refreshedSession)
      setInitializationError(null)
      return refreshedSession
    } catch (error) {
      if (getAuthApiErrorStatus(error) === 401) {
        setCurrentSession(null)
        storeSession(null)
      }
      throw error
    }
  }, [])

  const clearSession = useCallback(() => {
    setCurrentSession(null)
    storeSession(null)
  }, [])

  const reportError = useCallback((message: string) => {
    setInitializationError(message)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout(session?.accessToken)
    } catch (error) {
      if (getAuthApiErrorStatus(error) !== 401) throw error
    }
    setCurrentSession(null)
    storeSession(null)
    setInitializationError(null)
  }, [session])

  return (
    <AuthContext.Provider
      value={{
        accessToken: session?.accessToken ?? null,
        user: session?.user ?? null,
        isInitializing: false,
        initializationError,
        setSession,
        refreshSession,
        clearSession,
        reportError,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
