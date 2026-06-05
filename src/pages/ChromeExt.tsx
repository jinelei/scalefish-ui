import { FiDownload, FiChrome, FiInfo, FiTool, FiSettings, FiShield } from 'react-icons/fi'
import { motion } from 'framer-motion'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

const steps = [
  { icon: FiDownload, title: '下载插件', desc: '点击下方按钮下载 scalefish-chrome-ext.zip' },
  { icon: FiTool, title: '解压文件', desc: '将压缩包解压到一个本地目录（如 scalefish-chrome-ext）' },
  { icon: FiChrome, title: '打开扩展管理', desc: '在 Chrome 地址栏输入 chrome://extensions/ 并回车' },
  { icon: FiSettings, title: '开启开发者模式', desc: '在扩展管理页面右上角打开「开发者模式」开关' },
  { icon: FiTool, title: '加载已解压的扩展', desc: '点击「加载已解压的扩展程序」，选择解压后的文件夹即可' },
  { icon: FiShield, title: '完成', desc: '插件安装成功，浏览器工具栏会显示 scalefish 图标，点击即可使用' },
]

export default function ChromeExt() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-2xl mx-auto space-y-8">
      <motion.div variants={item} className="glass rounded-xl p-6 sm:p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent-500 to-purple-500 flex items-center justify-center shadow-lg">
          <FiChrome size={32} className="text-white" />
        </div>
        <h1 className="text-xl font-bold gradient-text">Scalefish Chrome 扩展</h1>
        <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
          快速保存和管理书签的浏览器扩展，支持一键添加、分类整理和标签标记。
        </p>
        <a
          href="/scalefish-chrome-ext.zip"
          download
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold transition-all shadow-lg hover:shadow-accent-500/25 active:scale-95"
        >
          <FiDownload size={16} />
          下载扩展 (ZIP)
        </a>
      </motion.div>

      <motion.div variants={item} className="glass rounded-xl p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-6">
          <FiInfo size={16} className="text-accent-400" />
          <h2 className="text-sm font-semibold text-gray-300">安装步骤</h2>
        </div>
        <div className="space-y-0">
          {steps.map((s, i) => (
            <div key={i} className="flex gap-4 pb-6 relative last:pb-0">
              {i < steps.length - 1 && (
                <div className="absolute left-[17px] top-10 bottom-0 w-px bg-white/5" />
              )}
              <div className="w-9 h-9 rounded-lg bg-accent-500/10 border border-accent-500/20 flex items-center justify-center shrink-0">
                <s.icon size={15} className="text-accent-400" />
              </div>
              <div className="min-w-0 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-accent-500">0{i + 1}</span>
                  <h3 className="text-sm font-semibold text-gray-300">{s.title}</h3>
                </div>
                <p className="text-xs text-gray-500 mt-1">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={item} className="glass rounded-xl p-6 sm:p-8">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">注意事项</h2>
        <ul className="space-y-2 text-xs text-gray-500">
          <li className="flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">•</span>
            安装后请先在插件弹窗中配置后端 API 地址（如 https://your-domain.com），确保与书签服务互通。
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">•</span>
            首次使用需要登录 scalefish 账户，插件会自动同步您的书签数据。
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">•</span>
            更新扩展时，只需重新下载并替换解压目录中的文件，然后在扩展管理页面点击「刷新」即可。
          </li>
        </ul>
      </motion.div>
    </motion.div>
  )
}
