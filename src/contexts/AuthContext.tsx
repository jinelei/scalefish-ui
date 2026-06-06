import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { login as loginApi, getMe } from '../api/auth'
import { getStoredRefreshToken } from '../api/client'
import type { UserInfo } from '../types'

interface AuthContextType {
  user: UserInfo | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const res = await getMe()
      setUser(res.data)
    } catch {
      // ignore
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('scalefish_access_token')
    localStorage.removeItem('scalefish_refresh_token')
    window.location.href = '/login'
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('scalefish_access_token')
    const refresh = getStoredRefreshToken()
    if (token && refresh) {
      getMe()
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('scalefish_access_token')
          localStorage.removeItem('scalefish_refresh_token')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const res = await loginApi({ username, password })
    const { accessToken, refreshToken: rt, user: u } = res.data
    localStorage.setItem('scalefish_access_token', accessToken)
    localStorage.setItem('scalefish_refresh_token', rt)
    setUser(u)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
