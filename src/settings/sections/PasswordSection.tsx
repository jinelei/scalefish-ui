import { useState } from 'react'
import { FiKey, FiSave } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { changePassword } from '../../api/auth'
import { useAuth } from '../../contexts/AuthContext'
import SettingsHeader from './SettingsHeader'

export default function PasswordSection() {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changing, setChanging] = useState(false)
  const { logout } = useAuth()

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

  return (
    <div className="glass rounded-xl p-6 sm:p-8">
      <SettingsHeader icon={FiKey} title="密码" desc="修改后将自动退出，请重新登录" />
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
    </div>
  )
}
