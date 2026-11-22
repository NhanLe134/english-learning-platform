import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { authApi, getAuthApiErrorStatus, type AuthSession } from './auth-api'
import { AuthContext } from './auth-context'

const AUTH_SESSION_STORAGE_KEY = 'your-voice-auth-session'
const AUTH_SESSION_PROFILE_VERSION = 2
const LOGOUT_HISTORY_LOCK_KEY = 'your-voice-logout-history-lock'
let refreshInFlight: Promise<AuthSession> | undefined

function getTokenExpiryMs(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const unpadded = payload.replace(/-/g, '+').replace(/_/g, '/')
    const base64 = unpadded + '='.repeat((4 - unpadded.length % 4) % 4)
    const claims = JSON.parse(atob(base64)) as { exp?: unknown }
    return typeof claims.exp === 'number' ? claims.exp * 1000 : null
  } catch {
    return null
  }
}

function accessTokenIsUsable(token: string): boolean {
  const expiryMs = getTokenExpiryMs(token)
  return expiryMs !== null && expiryMs > Date.now() + 15000
}

function readStoredSession(): AuthSession | null {
  try {
    const value = localStorage.getItem(AUTH_SESSION_STORAGE_KEY)
    if (!value) return null
    const parsed = JSON.parse(value) as Partial<AuthSession> & { profileVersion?: unknown }
    const user = parsed.user
    if (
      typeof parsed.accessToken !== 'string' ||
      parsed.profileVersion !== AUTH_SESSION_PROFILE_VERSION ||
      !user || typeof user !== 'object' ||
      typeof user.id !== 'string' || typeof user.email !== 'string' ||
      typeof user.fullName !== 'string' ||
      (user.nickname !== null && typeof user.nickname !== 'string') ||
      (user.phoneNumber !== null && typeof user.phoneNumber !== 'string') ||
      (user.avatarUrl !== null && typeof user.avatarUrl !== 'string') ||
      (user.role !== 'STUDENT' && user.role !== 'TEACHER' && user.role !== 'ADMIN') ||
      (user.status !== 'active' && user.status !== 'locked' && user.status !== 'pending' && user.status !== 'deactivated') ||
      typeof user.isVerified !== 'boolean'
    ) {
      localStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
      return null
    }
    if (accessTokenIsUsable(parsed.accessToken)) {
      return parsed as AuthSession
    }
    return null
  } catch {
    return null
  }
}

function storeSession(session: AuthSession | null): void {
  try {
    if (session) {
      localStorage.setItem(
        AUTH_SESSION_STORAGE_KEY,
        JSON.stringify({ ...session, profileVersion: AUTH_SESSION_PROFILE_VERSION })
      )
    }
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
  const isOAuthCallbackRoute =
    typeof window !== 'undefined' && window.location.pathname === '/auth/callback'
  const initialSession = readStoredSession()
  const [session, setCurrentSession] = useState<AuthSession | null>(initialSession)
  const [isInitializing, setIsInitializing] = useState<boolean>(
    () => !isOAuthCallbackRoute && initialSession === null
  )
  const [initializationError, setInitializationError] = useState<string | null>(null)

  // Initial silent refresh on mount if access token is not immediately usable in localStorage.
  // Never run on /auth/callback (which owns the OAuth handoff) and always deduplicate via
  // refreshSessionOnce() so React StrictMode double-mounts never revoke the refresh session.
  useEffect(() => {
    if (isOAuthCallbackRoute) {
      setIsInitializing(false)
      return
    }
    // If access token was already valid from storage, no initial refresh needed
    if (initialSession && accessTokenIsUsable(initialSession.accessToken)) {
      return
    }

    let active = true
    refreshSessionOnce()
      .then((refreshedSession) => {
        if (active) {
          setCurrentSession(refreshedSession)
          storeSession(refreshedSession)
          setInitializationError(null)
        }
      })
      .catch(() => {
        // Refresh token missing, expired (> 7 days), or revoked (401)
        if (active) {
          setCurrentSession(null)
          storeSession(null)
        }
      })
      .finally(() => {
        if (active) {
          setIsInitializing(false)
        }
      })

    return () => {
      active = false
    }
  }, [isOAuthCallbackRoute])

  useEffect(() => {
    const syncSessionAcrossTabs = (event: StorageEvent) => {
      if (event.key !== AUTH_SESSION_STORAGE_KEY) return
      setCurrentSession(event.newValue ? readStoredSession() : null)
    }
    const recheckSessionAfterBackNavigation = (event: PageTransitionEvent) => {
      if (event.persisted) setCurrentSession(readStoredSession())
    }
    window.addEventListener('storage', syncSessionAcrossTabs)
    window.addEventListener('pageshow', recheckSessionAfterBackNavigation)
    return () => {
      window.removeEventListener('storage', syncSessionAcrossTabs)
      window.removeEventListener('pageshow', recheckSessionAfterBackNavigation)
    }
  }, [])

  const setSession = useCallback((nextSession: AuthSession) => {
    setCurrentSession(nextSession)
    storeSession(nextSession)
    try { sessionStorage.removeItem(LOGOUT_HISTORY_LOCK_KEY) } catch { /* Optional browser history protection. */ }
    setInitializationError(null)
  }, [])

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

  // Proactive background auto-refresh before access token expires (2 minutes before expiry)
  useEffect(() => {
    if (!session?.accessToken) return

    const expiryMs = getTokenExpiryMs(session.accessToken)
    if (!expiryMs) return

    const timeUntilExpiry = expiryMs - Date.now()
    // Refresh 2 minutes before expiry (or 10 seconds if already very close)
    const delay = Math.max(10000, timeUntilExpiry - 2 * 60 * 1000)

    const timer = setTimeout(() => {
      void refreshSession().catch((error) => {
        if (getAuthApiErrorStatus(error) === 401) {
          setCurrentSession(null)
          storeSession(null)
        }
      })
    }, delay)

    return () => clearTimeout(timer)
  }, [session?.accessToken, refreshSession])

  const clearSession = useCallback(() => {
    setCurrentSession(null)
    storeSession(null)
  }, [])

  const reportError = useCallback((message: string) => {
    setInitializationError(message)
  }, [])

  const logout = useCallback(async () => {
    try { sessionStorage.setItem(LOGOUT_HISTORY_LOCK_KEY, '1') } catch { /* Optional browser history protection. */ }
    let logoutError: unknown
    try {
      await authApi.logout(session?.accessToken)
    } catch (error) {
      if (getAuthApiErrorStatus(error) !== 401) logoutError = error
    } finally {
      // Always end the local session so a server/network error cannot leave the
      // current protected screen rendered as though the user were still signed in.
      setCurrentSession(null)
      storeSession(null)
      setInitializationError(null)
    }
    if (logoutError) throw logoutError
  }, [session])

  return (
    <AuthContext.Provider
      value={{
        accessToken: session?.accessToken ?? null,
        user: session?.user ?? null,
        isInitializing,
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
