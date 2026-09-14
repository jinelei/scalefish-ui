import { useState, useEffect } from 'react'
import { FiUser, FiSave } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { updateProfile } from '../../api/auth'
import { useAuth } from '../../contexts/AuthContext'
import SettingsHeader from './SettingsHeader'

export default function AccountSection() {
  const [nickname, setNickname] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const { user, refreshUser } = useAuth()

  useEffect(() => {
    if (user?.name) setNickname(user.name)
  }, [user?.name])

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

  return (
    <div className="glass rounded-xl p-6 sm:p-8">
      <SettingsHeader icon={FiUser} title="账户" desc="用户名和显示名称" />
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
    </div>
  )
}
