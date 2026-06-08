import { FiSmartphone, FiDownload } from 'react-icons/fi'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

const steps = [
  { title: '安装 DAVx⁵', desc: '从「华为应用市场」搜索并安装 DAVx⁵ 应用' },
  { title: '添加账户', desc: '打开 DAVx⁵，点击右下角「+」添加账户' },
  { title: '选择登录方式', desc: '选择「使用 URL 和用户名/密码登录」' },
  {
    title: '输入配置信息',
    desc: null,
  },
  { title: '登录', desc: '点击「登录」，选择需要同步的日历和通讯录' },
  { title: '设置同步间隔', desc: '建议设置为 30 分钟或手动同步' },
  { title: '完成', desc: '打开系统「日历」和「通讯录」app 查看同步数据' },
]

export default function HarmonyOSGuide() {
  const { user } = useAuth()
  const username = user?.username || ''

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-2xl lg:max-w-5xl mx-auto space-y-8">
      <motion.div variants={item} className="glass rounded-xl p-6 sm:p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg">
          <FiSmartphone size={32} className="text-white" />
        </div>
        <h1 className="text-xl font-bold gradient-text">鸿蒙（HarmonyOS）同步设置</h1>
        <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
          通过 DAVx⁵ 应用在鸿蒙设备上同步 scalefish 的日历和通讯录
        </p>
      </motion.div>

      <motion.div variants={item} className="glass rounded-xl p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-6">
          <FiSmartphone size={16} className="text-accent-400" />
          <h2 className="text-sm font-semibold text-gray-300">服务器地址</h2>
        </div>
        <div className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-accent-300 font-mono select-all">
          {window.location.origin}/webdav/
        </div>
        <p className="text-xs text-gray-500 mt-2">
          使用此系统的用户名和密码进行登录认证
        </p>
      </motion.div>

      <motion.div variants={item} className="glass rounded-xl p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-6">
          <FiDownload size={16} className="text-accent-400" />
          <h2 className="text-sm font-semibold text-gray-300">安装步骤</h2>
        </div>
        <div className="space-y-0">
          {steps.map((s, i) => (
            <div key={i} className="flex gap-4 pb-6 relative last:pb-0">
              {i < steps.length - 1 && (
                <div className="absolute left-[17px] top-10 bottom-0 w-px bg-white/5" />
              )}
              <div className="w-9 h-9 rounded-lg bg-accent-500/10 border border-accent-500/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-accent-400">{i + 1}</span>
              </div>
              <div className="min-w-0 pt-1">
                <h4 className="text-sm font-semibold text-gray-300">{s.title}</h4>
                {s.desc && <p className="text-xs text-gray-500 mt-1">{s.desc}</p>}
                {i === 3 && (
                  <div className="mt-2 space-y-1.5">
                    <div className="text-xs">
                      <span className="text-gray-500">URL：</span>
                      <span className="text-gray-300 font-mono text-[11px] break-all">{window.location.origin}/webdav/</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-gray-500">用户名：</span>
                      <span className="text-gray-300 font-mono text-[11px]">{username || '你的用户名'}</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-gray-500">密码：</span>
                      <span className="text-gray-300 font-mono text-[11px]">你的登录密码</span>
                    </div>
                  </div>
                )}
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
            DAVx⁵ 也可从 Google Play 或 F-Droid 下载安装，但华为设备推荐使用应用市场版本。
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">•</span>
            如果登录失败，请检查 URL、用户名和密码是否正确，以及服务器是否可从外部访问。
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">•</span>
            DAVx⁵ 支持设置同步间隔，建议选择 30 分钟以平衡实时性和电量消耗。
          </li>
        </ul>
      </motion.div>
    </motion.div>
  )
}
