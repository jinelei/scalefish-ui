import { useCallback, useEffect, useState } from 'react'
import { FiUserPlus, FiKey, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { listAdminUsers, createAdminUser, resetUserPassword, setUserEnabled } from '../api/admin-users'
import type { AdminUserResponse } from '../types'
import Modal from '../components/Modal'
import { useConfirm } from '../components/ConfirmDialog'

export default function UsersTab() {
  const [users, setUsers] = useState<AdminUserResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('ROLE_USER')
  const [saving, setSaving] = useState(false)

  const [resetTarget, setResetTarget] = useState<AdminUserResponse | null>(null)
  const [newPassword, setNewPassword] = useState('')

  const [confirm, confirmDialog] = useConfirm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listAdminUsers()
      setUsers(res.data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '加载用户失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setUsername(''); setPassword(''); setName(''); setRole('ROLE_USER')
    setModalOpen(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { toast.error('密码至少 6 位'); return }
    setSaving(true)
    try {
      await createAdminUser({ username: username.trim(), password, name: name.trim() || undefined, role })
      toast.success('用户已创建')
      setModalOpen(false)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '创建失败')
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetTarget) return
    if (newPassword.length < 6) { toast.error('密码至少 6 位'); return }
    setSaving(true)
    try {
      await resetUserPassword(resetTarget.id, newPassword)
      toast.success('密码已重置')
      setResetTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '重置失败')
    } finally {
      setSaving(false)
    }
  }

  const toggleEnabled = async (u: AdminUserResponse) => {
    if (!u.enabled) {
      setBusyId(u.id)
      try {
        await setUserEnabled(u.id, true)
        toast.success(`已启用 ${u.username}`)
        await load()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '操作失败')
      } finally {
        setBusyId(null)
      }
      return
    }
    const ok = await confirm({
      title: '禁用用户',
      message: `确定禁用「${u.username}」吗？禁用后该用户立即退出登录且无法再登录，数据保留。`,
      confirmText: '禁用',
      danger: true,
    })
    if (!ok) return
    setBusyId(u.id)
    try {
      await setUserEnabled(u.id, false)
      toast.success(`已禁用 ${u.username}`)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      {confirmDialog}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">用户管理</h2>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-500 hover:bg-accent-600 text-white text-xs font-semibold transition-colors">
          <FiUserPlus size={13} /> 新建用户
        </button>
      </div>

      <div className="rounded-lg border border-black/5 dark:border-white/5 overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
              <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs w-40">用户名</th>
              <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs w-40">昵称</th>
              <th className="text-center py-3 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs w-24">角色</th>
              <th className="text-center py-3 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs w-24">状态</th>
              <th className="text-center py-3 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs w-40">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i} className="border-b border-black/5 dark:border-white/5">
                  <td colSpan={5} className="py-4 px-3"><div className="h-5 bg-black/5 dark:bg-white/5 rounded animate-pulse" /></td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-sm text-gray-500">暂无用户</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="border-b border-black/5 dark:border-white/5">
                <td className="py-3 px-3 truncate text-gray-800 dark:text-gray-100" title={u.username}>{u.username}</td>
                <td className="py-3 px-3 truncate text-gray-500" title={u.name || ''}>{u.name || '-'}</td>
                <td className="py-3 px-3 text-center text-xs">
                  <span className={u.role === 'ROLE_ADMIN'
                    ? 'px-2 py-0.5 rounded bg-accent-500/10 text-accent-600 dark:text-accent-400'
                    : 'px-2 py-0.5 rounded bg-white/10 text-gray-400'}>
                    {u.role === 'ROLE_ADMIN' ? '管理员' : '普通用户'}
                  </span>
                </td>
                <td className="py-3 px-3 text-center text-xs">
                  <span className={`inline-flex items-center gap-1 ${u.enabled ? 'text-emerald-500' : 'text-gray-500'}`}>
                    {u.enabled ? <FiCheckCircle size={12} /> : <FiXCircle size={12} />}
                    {u.enabled ? '启用' : '禁用'}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => { setResetTarget(u); setNewPassword('') }} title="重置密码"
                      className="p-1.5 rounded text-gray-500 hover:text-accent-400 hover:bg-white/10">
                      <FiKey size={14} />
                    </button>
                    <button disabled={busyId === u.id} onClick={() => toggleEnabled(u)}
                      title={u.enabled ? '禁用' : '启用'}
                      className={`p-1.5 rounded hover:bg-white/10 disabled:opacity-50 ${u.enabled ? 'text-rose-400' : 'text-emerald-500'}`}>
                      {u.enabled ? <FiXCircle size={14} /> : <FiCheckCircle size={14} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="新建用户">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">用户名</label>
            <input value={username} onChange={e => setUsername(e.target.value)} required autoFocus
              className="w-full bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">初始密码（至少 6 位）</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              className="w-full bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">昵称（可选）</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">角色</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="w-full bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500">
              <option value="ROLE_USER">普通用户</option>
              <option value="ROLE_ADMIN">管理员</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs">取消</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-lg bg-accent-600 hover:bg-accent-500 text-white text-xs font-medium disabled:opacity-50">
              {saving ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title={`重置密码 - ${resetTarget?.username ?? ''}`}>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">新密码（至少 6 位，重置后该用户全部会话失效）</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} autoFocus
              className="w-full bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setResetTarget(null)}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs">取消</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-lg bg-accent-600 hover:bg-accent-500 text-white text-xs font-medium disabled:opacity-50">
              {saving ? '提交中...' : '重置密码'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
