import { FiSmartphone, FiCalendar, FiUsers, FiMonitor } from 'react-icons/fi'
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

function caldavSteps(username: string) {
  return [
    { title: '打开设置', desc: '打开 iPhone「设置」应用' },
    { title: '进入日历账户', desc: '进入「日历」→「账户」→「添加账户」' },
    { title: '选择 CalDAV', desc: '选择「其他」→「添加 CalDAV 账户」' },
    {
      title: '输入配置信息',
      desc: null,
      config: [
        { label: '服务器', value: window.location.hostname },
        { label: '用户名', value: username || '你的用户名' },
        { label: '密码', value: '你的登录密码' },
      ],
    },
    { title: '验证并开启同步', desc: '点击「下一步」，验证通过后开启「日历」同步开关' },
    { title: '完成', desc: '返回桌面，打开「日历」app 即可看到同步的日程' },
  ]
}

function carddavSteps(username: string) {
  return [
    { title: '打开设置', desc: '打开 iPhone「设置」应用' },
    { title: '进入通讯录账户', desc: '进入「通讯录」→「账户」→「添加账户」' },
    { title: '选择 CardDAV', desc: '选择「其他」→「添加 CardDAV 账户」' },
    {
      title: '输入配置信息',
      desc: null,
      config: [
        { label: '服务器', value: window.location.hostname },
        { label: '用户名', value: username || '你的用户名' },
        { label: '密码', value: '你的登录密码' },
      ],
    },
    { title: '验证并开启同步', desc: '点击「下一步」，验证通过后开启「通讯录」同步开关' },
    { title: '完成', desc: '打开「通讯录」app 即可看到同步的联系人' },
  ]
}

function StepList({ steps, icon: Icon, title }: {
  steps: ReturnType<typeof caldavSteps>
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className="text-accent-400" />
        <h3 className="text-sm font-semibold text-gray-300">{title}</h3>
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
              {s.config && (
                <div className="mt-2 space-y-1.5">
                  {s.config.map((c, j) => (
                    <div key={j} className="text-xs">
                      <span className="text-gray-500">{c.label}：</span>
                      <span className="text-gray-300 font-mono text-[11px]">{c.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function iOSGuide() {
  const { user } = useAuth()
  const username = user?.username || ''

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-2xl lg:max-w-5xl mx-auto space-y-8">
      <motion.div variants={item} className="glass rounded-xl p-6 sm:p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-600 to-gray-900 flex items-center justify-center shadow-lg">
          <FiSmartphone size={32} className="text-white" />
        </div>
        <h1 className="text-xl font-bold gradient-text">iOS 同步设置</h1>
        <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
          在 iPhone 上同步 scalefish 的日历日程和通讯录联系人
        </p>
      </motion.div>

      <motion.div variants={item} className="glass rounded-xl p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-6">
          <FiMonitor size={16} className="text-accent-400" />
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
          <FiCalendar size={16} className="text-accent-400" />
          <h2 className="text-sm font-semibold text-gray-300">日历同步 (CalDAV)</h2>
        </div>
        <StepList steps={caldavSteps(username)} icon={FiCalendar} title="" />
      </motion.div>

      <motion.div variants={item} className="glass rounded-xl p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-6">
          <FiUsers size={16} className="text-accent-400" />
          <h2 className="text-sm font-semibold text-gray-300">通讯录同步 (CardDAV)</h2>
        </div>
        <StepList steps={carddavSteps(username)} icon={FiUsers} title="" />
      </motion.div>

      <motion.div variants={item} className="glass rounded-xl p-6 sm:p-8">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">注意事项</h2>
        <ul className="space-y-2 text-xs text-gray-500">
          <li className="flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">•</span>
            请确保 iPhone 已连接到互联网，且服务器地址可从外部网络访问。
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">•</span>
            如果验证失败，请检查服务器地址、用户名和密码是否正确。
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">•</span>
            同步频率由 iOS 系统自动管理，通常几分钟内同步完成。
          </li>
        </ul>
      </motion.div>
    </motion.div>
  )
}
