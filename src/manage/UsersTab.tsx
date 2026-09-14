import { useCallback, useEffect, useState } from 'react'
import { FiUserPlus, FiKey, FiCheckCircle, FiXCircle, FiEdit2, FiTrash2 } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { listAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser, resetUserPassword, setUserEnabled } from '../api/admin-users'
import type { AdminUserResponse } from '../types'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/Modal'
import { useConfirm } from '../components/ConfirmDialog'

type FormMode = 'create' | 'edit'

export default function UsersTab() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<AdminUserResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [formMode, setFormMode] = useState<FormMode>('create')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
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
    setFormMode('create')
    setEditingId(null)
    setUsername(''); setPassword(''); setName(''); setEmail(''); setRole('ROLE_USER')
    setModalOpen(true)
  }

  const openEdit = (u: AdminUserResponse) => {
    setFormMode('edit')
    setEditingId(u.id)
    setUsername(u.username)
    setPassword('')
    setName(u.name || '')
    setEmail(u.email || '')
    setRole(u.role === 'ROLE_ADMIN' ? 'ROLE_ADMIN' : 'ROLE_USER')
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formMode === 'create' && password.length < 6) { toast.error('密码至少 6 位'); return }
    setSaving(true)
    try {
      if (formMode === 'create') {
        await createAdminUser({
          username: username.trim(),
          password,
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          role,
        })
        toast.success('用户已创建')
      } else if (editingId !== null) {
        await updateAdminUser(editingId, {
          username: username.trim(),
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          role,
        })
        toast.success('用户已更新')
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : formMode === 'create' ? '创建失败' : '保存失败')
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

  const handleDelete = async (u: AdminUserResponse) => {
    const ok = await confirm({
      title: '删除用户',
      message: `将永久删除用户「${u.username}」及其全部数据（书签、分类、标签、时刻与附件、设备、AI 配置、会话），不可恢复，且该用户名将可被重新使用。此操作不可撤销。`,
      confirmText: '永久删除',
      danger: true,
    })
    if (!ok) return
    setBusyId(u.id)
    try {
      await deleteAdminUser(u.id)
      toast.success(`已删除 ${u.username}`)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
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
              <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs w-36">用户名</th>
              <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs w-28">昵称</th>
              <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs w-52">邮箱</th>
              <th className="text-center py-3 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs w-20">角色</th>
              <th className="text-center py-3 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs w-20">状态</th>
              <th className="text-center py-3 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs w-52">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i} className="border-b border-black/5 dark:border-white/5">
                  <td colSpan={6} className="py-4 px-3"><div className="h-5 bg-black/5 dark:bg-white/5 rounded animate-pulse" /></td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-sm text-gray-500">暂无用户</td></tr>
            ) : users.map(u => {
              const isSelf = currentUser?.id === u.id
              return (
                <tr key={u.id} className="border-b border-black/5 dark:border-white/5">
                  <td className="py-3 px-3 truncate text-gray-800 dark:text-gray-100" title={u.username}>{u.username}</td>
                  <td className="py-3 px-3 truncate text-gray-500" title={u.name || ''}>{u.name || '-'}</td>
                  <td className="py-3 px-3 truncate text-gray-500" title={u.email || ''}>{u.email || '-'}</td>
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
                      <button onClick={() => openEdit(u)} title="编辑"
                        className="p-1.5 rounded text-gray-500 hover:text-accent-400 hover:bg-white/10">
                        <FiEdit2 size={14} />
                      </button>
                      <button onClick={() => { setResetTarget(u); setNewPassword('') }} title="重置密码"
                        className="p-1.5 rounded text-gray-500 hover:text-accent-400 hover:bg-white/10">
                        <FiKey size={14} />
                      </button>
                      <button disabled={busyId === u.id} onClick={() => toggleEnabled(u)}
                        title={u.enabled ? '禁用' : '启用'}
                        className={`p-1.5 rounded hover:bg-white/10 disabled:opacity-50 ${u.enabled ? 'text-rose-400' : 'text-emerald-500'}`}>
                        {u.enabled ? <FiXCircle size={14} /> : <FiCheckCircle size={14} />}
                      </button>
                      {!isSelf && (
                        <button disabled={busyId === u.id} onClick={() => handleDelete(u)} title="删除"
                          className="p-1.5 rounded text-rose-400 hover:text-rose-300 hover:bg-white/10 disabled:opacity-50">
                          <FiTrash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={formMode === 'create' ? '新建用户' : `编辑用户 - ${username}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">用户名</label>
            <input value={username} onChange={e => setUsername(e.target.value)} required autoFocus
              className="w-full bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500" />
          </div>
          {formMode === 'create' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">初始密码（至少 6 位）</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                className="w-full bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500" />
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">昵称（可选）</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">邮箱（可选）</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com"
              className="w-full bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">角色</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              disabled={formMode === 'edit' && currentUser?.id === editingId}
              className="w-full bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 disabled:opacity-50">
              <option value="ROLE_USER">普通用户</option>
              <option value="ROLE_ADMIN">管理员</option>
            </select>
            {formMode === 'edit' && currentUser?.id === editingId && (
              <p className="mt-1 text-xs text-amber-500">不能修改当前登录账号的角色</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs">取消</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-lg bg-accent-600 hover:bg-accent-500 text-white text-xs font-medium disabled:opacity-50">
              {saving ? '提交中...' : formMode === 'create' ? '创建' : '保存'}
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
