import { useState, useEffect } from 'react'
import { FiGlobe, FiSave } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { getAppConfig, updateAppConfig } from '../../api/app-config'
import SettingsHeader from './SettingsHeader'

export default function BrandSection() {
  const [displayNameInput, setDisplayNameInput] = useState('')
  const [savingBrand, setSavingBrand] = useState(false)

  useEffect(() => {
    getAppConfig().then(res => {
      const name = res.data?.display_name
      if (name) setDisplayNameInput(name)
    }).catch(() => {})
  }, [])

  return (
    <div className="glass rounded-xl p-6 sm:p-8">
      <SettingsHeader icon={FiGlobe} title="品牌" desc="自定义网站显示名称" />
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">应用显示名称</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={displayNameInput}
              onChange={e => setDisplayNameInput(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-accent-500/50 transition-colors"
              placeholder="例如: scalefish"
            />
            <button
              onClick={async () => {
                if (!displayNameInput.trim()) return
                setSavingBrand(true)
                try {
                  await updateAppConfig({ display_name: displayNameInput.trim() })
                  toast.success('显示名称已更新')
                } catch {
                  toast.error('更新失败')
                } finally {
                  setSavingBrand(false)
                }
              }}
              disabled={savingBrand || !displayNameInput.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white text-xs font-semibold transition-all active:scale-95"
            >
              <FiSave size={14} />
              {savingBrand ? '保存中...' : '保存'}
            </button>
          </div>
          <p className="text-[11px] text-gray-600 mt-1.5">修改后在顶部导航和浏览器标签页中显示</p>
        </div>
      </div>
    </div>
  )
}
