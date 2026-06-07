import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getRegistrationStatus } from '../api/auth'

export default function Login() {
  const { user, login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [allowRegister, setAllowRegister] = useState(true)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    getRegistrationStatus()
      .then(res => setAllowRegister(res.data.allowRegistration))
      .catch(() => setAllowRegister(false))
      .finally(() => setChecking(false))
  }, [])

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) { setError('请填写用户名和密码'); return }
    setSubmitting(true)
    setError('')
    try {
      await login(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-900 px-4">
      <div className="w-full max-w-sm glass rounded-xl p-6 sm:p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold">Scalefish</h1>
          <p className="text-sm text-gray-500 mt-1">登录以继续</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">用户名</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors"
              placeholder="请输入用户名"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors"
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-accent-600 hover:bg-accent-500 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {submitting ? '登录中...' : '登录'}
          </button>
        </form>
        {!checking && allowRegister && (
          <p className="text-xs text-center text-gray-500">
            没有账号？
            <Link to="/register" className="text-accent-400 hover:text-accent-300 ml-1">注册</Link>
          </p>
        )}
      </div>
    </div>
  )
}
