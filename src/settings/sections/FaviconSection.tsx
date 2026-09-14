import { useState } from 'react'
import { FiRefreshCw } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { batchRefreshFavicons } from '../../api/bookmarks'
import SettingsHeader from './SettingsHeader'

export default function FaviconSection() {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<number | null>(null)

  const handleRefresh = async () => {
    setRunning(true)
    setResult(null)
    try {
      const res = await batchRefreshFavicons()
      setResult(res.data)
      toast.success(`已刷新 ${res.data} 个书签图标`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '刷新图标失败')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="glass rounded-xl p-6 sm:p-8">
      <SettingsHeader icon={FiRefreshCw} title="书签图标刷新" desc="为所有没有图标的书签自动获取网站图标" />
      <div className="space-y-3">
        <p className="text-xs text-gray-500">自动为所有没有图标的书签获取网站图标</p>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-600 hover:bg-accent-500 disabled:opacity-50 text-white text-xs font-semibold transition-all active:scale-95"
          >
            <FiRefreshCw size={14} className={running ? 'animate-spin' : ''} />
            {running ? '刷新中...' : '开始刷新'}
          </button>
          {result !== null && (
            <span className="text-xs text-gray-400">
              共处理 {result} 个书签
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
