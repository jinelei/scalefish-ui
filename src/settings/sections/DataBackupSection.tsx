import { useRef } from 'react'
import { FiArchive, FiDownload, FiUpload } from 'react-icons/fi'
import { exportBackup, importBackup } from '../../utils/backup'
import SettingsHeader from './SettingsHeader'

export default function DataBackupSection() {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      importBackup(file)
      e.target.value = ''
    }
  }

  return (
    <div className="glass rounded-xl p-6 sm:p-8">
      <SettingsHeader icon={FiArchive} title="数据备份" desc="ZIP 格式备份和恢复完整网站数据（书签、时刻、账户、配置等）" />
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
        <input ref={fileRef} type="file" accept=".zip" onChange={handleImport} className="hidden" />
      </div>
    </div>
  )
}
