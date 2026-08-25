import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { login as loginApi, getMe, heartbeat as heartbeatApi, logout as logoutApi } from '../api/auth'
import { createLogger } from '../utils/logger'
import type { UserInfo } from '../types'
import { setAuthTokenAccessor } from '../api/client'

const log = createLogger('AuthContext')

const HEARTBEAT_INTERVAL = 10000

interface AuthContextType {
  user: UserInfo | null
  accessToken: string | null
  loading: boolean
  login: (username?: string, password?: string, totpCode?: string, rememberMe?: boolean) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Initialize axios client with token accessor
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
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current)
      heartbeatTimerRef.current = null
    }
    try {
      await logoutApi()
    } catch {
      log.warn('Logout API call failed')
    }
    clearSession()
    window.location.href = '/login'
  }, [clearSession])

  // Session restore — works for both JWT and certificate-based auth
  // With HttpOnly cookie, we validate session if we have an access token
  // On first visit before login, skip /me call to avoid 403
  useEffect(() => {
    // Only restore session if we already have an access token
    // (e.g., from a previous login that persisted in memory, or rehydration)
    if (accessToken) {
      const restore = async () => {
        try {
          const res = await getMe()
          setUser(res.data)
          log.info('Session restored: userId=%d', res.data.id)
          setLoading(false)
          return
        } catch {
          log.warn('getMe() failed - no valid session')
          clearSession()
          setLoading(false)
        }
      }
      restore()
    } else {
      // No access token yet (first visit before login)
      // Just set loading to false, don't call /me to avoid 403
      setLoading(false)
    }
  }, [accessToken, clearSession])

  // HTTP heartbeat polling — only runs when user is authenticated
  useEffect(() => {
    if (!user) {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current)
        heartbeatTimerRef.current = null
      }
      return
    }

    const ping = async () => {
      try {
        const res = await heartbeatApi()
        const data = res.data.data
        if (data?.accessToken) {
          setAccessToken(data.accessToken)
          log.debug('Heartbeat: access token refreshed')
        }
      } catch (e) {
        // ⚠️ 心跳失败不自动登出，仅记录警告
        // 真正的认证失败会通过 401/403 拦截器处理
        log.warn('Heartbeat failed, will retry next interval')
      }
    }

    ping()
    heartbeatTimerRef.current = setInterval(ping, HEARTBEAT_INTERVAL)
    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current)
        heartbeatTimerRef.current = null
      }
    }
  }, [clearSession, user, accessToken])

  const setAuthData = useCallback((data: { accessToken: string; user: UserInfo }) => {
    setAccessToken(data.accessToken)
    setUser(data.user)
  }, [])

  const login = useCallback(async (username?: string, password?: string, totpCode?: string, rememberMe?: boolean) => {
    const isCertLogin = !username && !password
    log.info('Logging in: %s', isCertLogin ? 'certificate' : 'username=' + username)
    const res = await loginApi({ username: username || '', password: password || '', totpCode, rememberMe })
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