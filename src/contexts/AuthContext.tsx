import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { login as loginApi, getMe, logout as logoutApi } from '../api/auth'
import { createLogger } from '../utils/logger'
import type { UserInfo } from '../types'
import { setAuthTokenAccessor } from '../api/client'

const log = createLogger('AuthContext')

interface AuthContextType {
  user: UserInfo | null
  accessToken: string | null
  loading: boolean
  login: (username?: string, password?: string, totpCode?: string, rememberMe?: boolean, fingerprint?: Record<string, string>) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setAuthTokenAccessor(
      () => accessToken,
      (token) => setAccessToken(token)
    )
  }, [accessToken])

  const refreshUser = useCallback(async () => {
    try {
      const res = await getMe()
      setUser(res.data)
      log.debug('User refreshed: userId=%d', res.data.id)
    } catch {
      log.warn('Failed to refresh user')
    }
  }, [])

  const clearSession = useCallback(() => {
    setUser(null)
    setAccessToken(null)
  }, [])

  const logout = useCallback(async () => {
    log.info('User logged out')
    try {
      await logoutApi()
    } catch {
      log.warn('Logout API call failed')
    }
    clearSession()
    window.location.href = '/login'
  }, [clearSession])

  useEffect(() => {
    if (accessToken) {
      const restore = async () => {
        try {
          const res = await getMe()
          setUser(res.data)
          log.info('Session restored: userId=%d', res.data.id)
        } catch {
          log.warn('getMe() failed - no valid session')
          clearSession()
        } finally {
          setLoading(false)
        }
      }
      restore()
    } else {
      setLoading(false)
    }
  }, [accessToken, clearSession])

  const setAuthData = useCallback((data: { accessToken: string; user: UserInfo }) => {
    setAccessToken(data.accessToken)
    setUser(data.user)
  }, [])

  const login = useCallback(async (username?: string, password?: string, totpCode?: string, rememberMe?: boolean, fingerprint?: Record<string, string>) => {
    const isCertLogin = !username && !password
    log.info('Logging in: %s', isCertLogin ? 'certificate' : 'username=' + username)
    const res = await loginApi({ username: username || '', password: password || '', totpCode, rememberMe, fingerprint })
    const { accessToken: at, user: u } = res.data
    setAuthData({ accessToken: at, user: u })
    log.info('Login success: userId=%d', u.id)
  }, [setAuthData])

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
