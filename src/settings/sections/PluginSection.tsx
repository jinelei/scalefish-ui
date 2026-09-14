import { FiChrome, FiDownload } from 'react-icons/fi'
import SettingsHeader from './SettingsHeader'

export default function PluginSection() {
  return (
    <div className="glass rounded-xl p-6 sm:p-8">
      <SettingsHeader icon={FiChrome} title="插件" desc="Chrome 扩展" />
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
    </div>
  )
}
