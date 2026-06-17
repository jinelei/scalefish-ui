import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiUser, FiKey, FiDownload, FiUpload, FiChrome, FiSave, FiPlus, FiCopy, FiCheck, FiTrash2, FiArchive, FiServer, FiMonitor } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { changePassword, updateProfile } from '../api/auth'
import { listTokens, createToken, revokeToken } from '../api/tokens'
import { exportBackup, importBackup } from '../utils/backup'
import { useAuth } from '../contexts/AuthContext'
import type { ApiTokenResponse } from '../types'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
}

function SectionHeader({ icon: Icon, title, desc }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
        <Icon size={18} className="text-accent-400" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-gray-300">{title}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

function TokenSection() {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">用于第三方工具集成</p>
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
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-accent-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">有效期</label>
            <select
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 focus:outline-none focus:border-accent-500/50 transition-colors"
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
              className="text-xs px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
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
          {[1,2].map(i => (
            <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs text-gray-500">还没有 API Token</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tokens.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
              <div className="min-w-0">
                <div className="text-xs font-medium text-gray-200 truncate">{t.name}</div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                  <span>{t.tokenPrefix}...</span>
                  <span>创建于 {formatDate(t.createdAt)}</span>
                </div>
              </div>
              <button
                onClick={() => handleRevoke(t.id)}
                className="shrink-0 p-1.5 text-gray-500 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-colors"
                title="撤销"
              >
                <FiTrash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Settings() {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changing, setChanging] = useState(false)
  const [nickname, setNickname] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [activeSection, setActiveSection] = useState('account')
  const fileRef = useRef<HTMLInputElement>(null)
  const { user, logout, refreshUser } = useAuth()

  const sections = [
    { id: 'account', label: '账户', icon: FiUser },
    { id: 'password', label: '密码', icon: FiKey },
    { id: 'token', label: 'Token', icon: FiKey },
    { id: 'data', label: '数据', icon: FiArchive },
    { id: 'plugin', label: '插件', icon: FiChrome },
    { id: 'webdav', label: '同步', icon: FiServer },
  ]

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        }
      },
      { rootMargin: '0px 0px -60% 0px' }
    )
    for (const s of sections) {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (user?.name) setNickname(user.name)
  }, [user?.name])

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的新密码不一致')
      return
    }
    if (newPassword.length < 6) {
      toast.error('新密码至少 6 位')
      return
    }
    setChanging(true)
    try {
      await changePassword(oldPassword, newPassword)
      toast.success('密码修改成功，请重新登录')
      logout()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '修改失败'
      toast.error(msg)
    } finally {
      setChanging(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nickname.trim()) {
      toast.error('昵称不能为空')
      return
    }
    setSavingProfile(true)
    try {
      await updateProfile({ name: nickname.trim() })
      await refreshUser()
      toast.success('昵称已更新')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '更新失败'
      toast.error(msg)
    } finally {
      setSavingProfile(false)
    }
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      importBackup(file)
      e.target.value = ''
    }
  }

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="max-w-2xl lg:max-w-5xl mx-auto lg:grid lg:grid-cols-[1fr_auto] lg:gap-10">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 min-w-0">
        {/* 账户 */}
      <motion.div variants={item} id="account" className="glass rounded-xl p-6 sm:p-8">
        <SectionHeader icon={FiUser} title="账户" desc="用户名和显示名称" />

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">用户名</label>
            <div className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-400 select-all">
              {user?.username}
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">显示名称（昵称）</label>
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-accent-500/50 transition-colors"
                placeholder="输入昵称"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white text-xs font-semibold transition-all active:scale-95"
            >
              <FiSave size={14} />
              {savingProfile ? '保存中...' : '保存'}
            </button>
          </form>
        </div>
      </motion.div>

      {/* 密码 */}
      <motion.div variants={item} id="password" className="glass rounded-xl p-6 sm:p-8">
        <SectionHeader icon={FiKey} title="密码" desc="修改后将自动退出，请重新登录" />

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">当前密码</label>
            <input
              type="password"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-accent-500/50 transition-colors"
              placeholder="输入当前密码"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">新密码</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-accent-500/50 transition-colors"
              placeholder="至少 6 位"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">确认新密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-accent-500/50 transition-colors"
              placeholder="再次输入新密码"
              required
            />
          </div>
          <button
            type="submit"
            disabled={changing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white text-xs font-semibold transition-all active:scale-95"
          >
            <FiSave size={14} />
            {changing ? '修改中...' : '保存密码'}
          </button>
        </form>
      </motion.div>

      {/* Token */}
      <motion.div variants={item} id="token" className="glass rounded-xl p-6 sm:p-8">
        <SectionHeader icon={FiKey} title="Token" desc="API Token 管理" />
        <TokenSection />
      </motion.div>

      {/* 数据 */}
      <motion.div variants={item} id="data" className="glass rounded-xl p-6 sm:p-8">
        <SectionHeader icon={FiArchive} title="数据" desc="JSON 格式备份和恢复书签数据" />

        <div className="flex items-center gap-3">
          <button
            onClick={exportBackup}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition-all active:scale-95"
          >
            <FiDownload size={14} />
            导出备份
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition-all active:scale-95"
          >
            <FiUpload size={14} />
            导入备份
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>
      </motion.div>

      {/* 插件 */}
      <motion.div variants={item} id="plugin" className="glass rounded-xl p-6 sm:p-8">
        <SectionHeader icon={FiChrome} title="插件" desc="Chrome 扩展" />

        <div className="flex items-center gap-3">
          <a
            href="/scalefish-chrome-ext.zip"
            download
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-500 hover:bg-accent-600 text-white text-xs font-semibold transition-all active:scale-95"
          >
            <FiDownload size={14} />
            下载扩展 (ZIP)
          </a>
          <a
            href="/chrome-ext"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-xs transition-all active:scale-95"
          >
            查看安装步骤
          </a>
        </div>
      </motion.div>

      {/* WebDAV 同步 */}
      <motion.div variants={item} id="webdav" className="glass rounded-xl p-6 sm:p-8">
        <SectionHeader icon={FiServer} title="WebDAV 同步" desc="在手机日历和通讯录中同步日程和联系人" />

        <div className="space-y-6">
          {/* 服务器信息 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">服务器地址</label>
            <div className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-accent-300 font-mono select-all">
              {window.location.origin}/webdav/
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5">
              使用此系统的用户名和密码进行登录认证
            </p>
          </div>

          {/* iOS */}
          <a
            href="/ios-guide"
            className="block rounded-xl bg-white/[0.03] border border-white/5 p-5 hover:bg-white/[0.06] transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <FiMonitor size={18} className="text-gray-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-200 group-hover:text-accent-400 transition-colors">iOS</h3>
                  <p className="text-xs text-gray-500 mt-0.5">日历同步 (CalDAV) + 通讯录同步 (CardDAV)</p>
                </div>
              </div>
              <span className="text-xs text-accent-400 opacity-0 group-hover:opacity-100 transition-opacity">
                查看详细教程 →
              </span>
            </div>
          </a>

          {/* HarmonyOS */}
          <a
            href="/harmonyos-guide"
            className="block rounded-xl bg-white/[0.03] border border-white/5 p-5 hover:bg-white/[0.06] transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <FiMonitor size={18} className="text-gray-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-200 group-hover:text-accent-400 transition-colors">鸿蒙（HarmonyOS）</h3>
                  <p className="text-xs text-gray-500 mt-0.5">通过 DAVx⁵ 同步日历和通讯录</p>
                </div>
              </div>
              <span className="text-xs text-accent-400 opacity-0 group-hover:opacity-100 transition-opacity">
                查看详细教程 →
              </span>
            </div>
          </a>
        </div>
      </motion.div>
        <div className="text-center text-[10px] text-gray-600 uppercase tracking-widest pt-4">
          v1.0.0
        </div>
      </motion.div>

      {/* 右侧锚点导航 */}
      <motion.aside
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="hidden lg:block"
      >
        <nav className="sticky top-24 w-36 space-y-0.5">
          {sections.map((s) => {
            const active = activeSection === s.id
            return (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  active
                    ? 'text-accent-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <s.icon size={14} className={active ? 'text-accent-400' : 'text-gray-500'} />
                {s.label}
              </button>
            )
          })}
        </nav>
      </motion.aside>
    </div>
  )
}
