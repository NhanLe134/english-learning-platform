import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { authApi, getAuthApiErrorStatus, type AuthSession } from './auth-api'
import { AuthContext } from './auth-context'
let refreshInFlight: Promise<AuthSession> | undefined

function refreshSessionOnce(): Promise<AuthSession> {
  if (!refreshInFlight) {
    refreshInFlight = authApi.refresh().finally(() => {
      refreshInFlight = undefined
    })
  }
  return refreshInFlight
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setCurrentSession] = useState<AuthSession | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [initializationError, setInitializationError] = useState<string | null>(null)
  const sessionRevision = useRef(0)

  useEffect(() => {
    let active = true
    const revisionAtStart = sessionRevision.current

    refreshSessionOnce()
      .then((refreshedSession) => {
        if (active && revisionAtStart === sessionRevision.current) {
          setCurrentSession(refreshedSession)
        }
      })
      .catch((error: unknown) => {
        if (active && getAuthApiErrorStatus(error) !== 401) {
          setInitializationError(
            error instanceof Error ? error.message : 'Không thể khôi phục phiên đăng nhập.'
          )
        }
      })
      .finally(() => {
        if (active) setIsInitializing(false)
      })

    return () => {
      active = false
    }
  }, [])

  const setSession = useCallback((nextSession: AuthSession) => {
    sessionRevision.current += 1
    setCurrentSession(nextSession)
    setIsInitializing(false)
    setInitializationError(null)
  }, [])

  const refreshSession = useCallback(async () => {
    try {
      const refreshedSession = await refreshSessionOnce()
      sessionRevision.current += 1
      setCurrentSession(refreshedSession)
      setIsInitializing(false)
      setInitializationError(null)
      return refreshedSession
    } catch (error) {
      if (getAuthApiErrorStatus(error) === 401) {
        sessionRevision.current += 1
        setCurrentSession(null)
        setIsInitializing(false)
      }
      throw error
    }
  }, [])

  const clearSession = useCallback(() => {
    sessionRevision.current += 1
    setCurrentSession(null)
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
    sessionRevision.current += 1
    setCurrentSession(null)
    setInitializationError(null)
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
