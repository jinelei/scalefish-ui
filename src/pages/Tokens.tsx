import { useEffect, useState } from 'react'
import { FiPlus, FiCopy, FiCheck, FiTrash2, FiKey } from 'react-icons/fi'
import { listTokens, createToken, revokeToken } from '../api/tokens'
import type { ApiTokenResponse } from '../types'

export default function Tokens() {
  const [tokens, setTokens] = useState<ApiTokenResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [expiresIn, setExpiresIn] = useState('never')
  const [creating, setCreating] = useState(false)
  const [newToken, setNewToken] = useState<ApiTokenResponse | null>(null)
  const [copied, setCopied] = useState(false)

  const load = () => {
    setLoading(true)
    listTokens()
      .then((res) => setTokens(res.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!name.trim()) return
    setCreating(true)
    try {
      const res = await createToken({ name: name.trim(), expiresIn: expiresIn === 'never' ? undefined : expiresIn })
      setNewToken(res.data)
      setName('')
      setExpiresIn('never')
      setShowForm(false)
      load()
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (id: number) => {
    await revokeToken(id)
    load()
  }

  const copyToken = () => {
    if (newToken?.token) {
      navigator.clipboard.writeText(newToken.token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatDate = (s: string | null) => s ? new Date(s).toLocaleString('zh-CN') : '-'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300">API Token 管理</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent-600 hover:bg-accent-500 text-white transition-colors"
        >
          <FiPlus size={13} />
          创建 Token
        </button>
      </div>

      {showForm && (
        <div className="glass rounded-xl p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">名称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如: Chrome 扩展"
              className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-500 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-accent-500/70"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">有效期</label>
            <select
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-500 text-sm text-gray-300 focus:outline-none focus:border-accent-500/70"
            >
              <option value="never">永不过期</option>
              <option value="7d">7 天</option>
              <option value="30d">30 天</option>
              <option value="1y">1 年</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              disabled={creating || !name.trim()}
              className="text-xs px-4 py-2 rounded-lg bg-accent-600 hover:bg-accent-500 disabled:opacity-40 text-white transition-colors"
            >
              {creating ? '创建中...' : '创建'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-xs px-4 py-2 rounded-lg bg-surface-700 hover:bg-surface-600 text-gray-300 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {newToken && (
        <div className="glass rounded-xl p-5 space-y-3 border border-neon-500/20">
          <div className="flex items-center gap-2 text-neon-400 text-xs font-medium">
            <FiCheck size={14} />
            Token 创建成功！请立即复制，关闭后将不再显示。
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg bg-black/30 text-xs text-neon-300 font-mono break-all select-all">
              {newToken.token}
            </code>
            <button
              onClick={copyToken}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-xs"
            >
              {copied ? <FiCheck size={14} className="text-neon-400" /> : <FiCopy size={14} />}
              {copied ? '已复制' : '复制'}
            </button>
          </div>
          <button
            onClick={() => setNewToken(null)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            关闭
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="glass rounded-xl p-4 animate-pulse">
              <div className="bg-white/10 h-4 w-48 rounded mb-2" />
              <div className="bg-white/5 h-3 w-32 rounded" />
            </div>
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <FiKey size={32} className="mx-auto text-gray-600 mb-3" />
          <p className="text-sm text-gray-500">还没有 API Token</p>
          <p className="text-xs text-gray-600 mt-1">创建一个 Token 用于第三方工具集成</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tokens.map((t) => (
            <div key={t.id} className="glass rounded-xl p-4 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-200 truncate">{t.name}</div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>{t.tokenPrefix}...</span>
                  <span>创建于 {formatDate(t.createdAt)}</span>
                  {t.expiresAt && <span>过期于 {formatDate(t.expiresAt)}</span>}
                  {t.lastUsedAt && <span>最后使用 {formatDate(t.lastUsedAt)}</span>}
                  {!t.expiresAt && <span className="text-gray-600">永不过期</span>}
                </div>
              </div>
              <button
                onClick={() => handleRevoke(t.id)}
                className="shrink-0 p-2 text-gray-500 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-colors"
                title="撤销"
              >
                <FiTrash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
