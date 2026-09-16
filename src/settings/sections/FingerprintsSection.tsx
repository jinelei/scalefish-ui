import { useState, useEffect } from 'react'
import { FiSmartphone, FiClock, FiCheck, FiX, FiXCircle, FiTrash2, FiShield } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { listDeviceFingerprints, updateDeviceFingerprintStatus, deleteDeviceFingerprint, type DeviceFingerprintResponse, type DeviceTrustStatus } from '../../api/device-fingerprints'
import { useConfirm } from '../../components/ConfirmDialog'
import { createLogger } from '../../utils/logger'
import SettingsHeader from './SettingsHeader'

const log = createLogger('Settings')

function deviceLabel(d: DeviceFingerprintResponse): string {
  if (d.deviceName) return d.deviceName
  const ua = d.userAgent || ''
  let browser = '未知浏览器'
  if (/Edg\//.test(ua)) browser = 'Edge'
  else if (/Chrome\//.test(ua)) browser = 'Chrome'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'
  else if (/Safari\//.test(ua)) browser = 'Safari'
  const os = d.platform || (/Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iOS/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : '未知系统')
  return `${browser} · ${os}`
}

function formatFingerprintTime(s: string | null): string {
  if (!s) return '从未登录'
  // 后端 LocalDateTime 以 UTC 存储且序列化不带时区偏移，按 UTC 解析后转换为东八区显示
  const d = new Date(s.endsWith('Z') || s.includes('+') ? s : s + 'Z')
  return d.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
}

function shortHash(fp: string): string {
  if (!fp || fp.length < 16) return fp
  return fp.slice(0, 8) + '…' + fp.slice(-6)
}

function FingerprintCard({
  device,
  actions,
}: {
  device: DeviceFingerprintResponse
  actions: { label: string; icon: React.ReactNode; onClick: () => void; tone: 'accent' | 'rose' | 'gray' }[]
}) {
  return (
    <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 p-2.5 sm:p-3 space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-800 dark:text-gray-200">
        <FiSmartphone size={12} className="shrink-0" />
        <span className="truncate" title={device.userAgent || ''}>{deviceLabel(device)}</span>
      </div>
      <div className="text-[10px] text-gray-500 font-mono break-all" title={device.fingerprintSha256}>
        {shortHash(device.fingerprintSha256)}
      </div>
      <div className="flex items-center gap-1 text-[10px] text-gray-500">
        <FiClock size={10} className="shrink-0" />
        <span className="truncate" title={`最近登录：${formatFingerprintTime(device.lastLoginAt)}`}>
          最近登录：{formatFingerprintTime(device.lastLoginAt)}
        </span>
      </div>
      {device.lastIp && (
        <div className="text-[10px] text-gray-500 font-mono break-all">IP：{device.lastIp}</div>
      )}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-1.5 pt-1">
        {actions.map((a, i) => (
          <button
            key={i}
            onClick={a.onClick}
            className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 sm:py-1 rounded text-[11px] sm:text-[10px] font-medium transition-colors ${
              a.tone === 'accent'
                ? 'bg-accent-500/10 text-accent-600 dark:text-accent-400 hover:bg-accent-500/20'
                : a.tone === 'rose'
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                : 'bg-white/5 text-gray-500 hover:bg-white/10'
            }`}
          >
            {a.icon}
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function FingerprintsSection() {
  const [confirm, confirmDialog] = useConfirm()
  const [devices, setDevices] = useState<DeviceFingerprintResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = async () => {
    try {
      const res = await listDeviceFingerprints()
      setDevices(res.data)
    } catch (e) {
      log.warn('Failed to load device fingerprints: %o', e)
      toast.error('加载设备指纹失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const move = async (d: DeviceFingerprintResponse, status: DeviceTrustStatus) => {
    setBusyId(d.id)
    try {
      await updateDeviceFingerprintStatus(d.id, status)
      toast.success(status === 'TRUSTED' ? '已设为信任设备' : status === 'UNTRUSTED' ? '已设为不信任' : '已移回待处理')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (d: DeviceFingerprintResponse) => {
    const ok = await confirm({
      title: '删除设备指纹',
      message: '确定删除该设备指纹吗？删除后该设备再次登录将重新出现在待处理中。',
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    setBusyId(d.id)
    try {
      await deleteDeviceFingerprint(d.id)
      toast.success('已删除')
      await load()
    } catch {
      toast.error('删除失败')
    } finally {
      setBusyId(null)
    }
  }

  const pending = devices.filter(d => d.trustStatus === 'PENDING')
  const trusted = devices.filter(d => d.trustStatus === 'TRUSTED')
  const untrusted = devices.filter(d => d.trustStatus === 'UNTRUSTED')

  const columns: {
    key: DeviceTrustStatus
    title: string
    icon: React.ReactNode
    accent: string
    items: DeviceFingerprintResponse[]
    empty: string
    actions: (d: DeviceFingerprintResponse) => { label: string; icon: React.ReactNode; onClick: () => void; tone: 'accent' | 'rose' | 'gray' }[]
  }[] = [
    {
      key: 'PENDING',
      title: '待处理',
      icon: <FiClock size={13} />,
      accent: 'text-amber-500',
      items: pending,
      empty: '暂无待处理设备',
      actions: (d) => [
        { label: '信任', icon: <FiCheck size={11} />, onClick: () => move(d, 'TRUSTED'), tone: 'accent' as const },
        { label: '不信任', icon: <FiX size={11} />, onClick: () => move(d, 'UNTRUSTED'), tone: 'rose' as const },
      ],
    },
    {
      key: 'TRUSTED',
      title: '信任',
      icon: <FiShield size={13} />,
      accent: 'text-emerald-500',
      items: trusted,
      empty: '暂无信任设备',
      actions: (d) => [
        { label: '不信任', icon: <FiXCircle size={11} />, onClick: () => move(d, 'UNTRUSTED'), tone: 'rose' as const },
      ],
    },
    {
      key: 'UNTRUSTED',
      title: '不信任',
      icon: <FiXCircle size={13} />,
      accent: 'text-rose-500',
      items: untrusted,
      empty: '暂无不信任设备',
      actions: (d) => [
        { label: '信任', icon: <FiCheck size={11} />, onClick: () => move(d, 'TRUSTED'), tone: 'accent' as const },
      ],
    },
  ]

  if (loading) {
    return (
      <div className="glass rounded-xl p-4 sm:p-6 lg:p-8">
        <div className="space-y-4">
          <div className="h-6 w-40 bg-black/5 dark:bg-white/5 rounded animate-pulse" />
          <div className="h-24 w-full bg-black/5 dark:bg-white/5 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="glass rounded-xl p-4 sm:p-6 lg:p-8">
      {confirmDialog}
      <SettingsHeader icon={FiSmartphone} title="指纹管理" desc="根据客户端指纹管理设备信任策略：信任设备可跳过两步验证，不信任设备将被拒绝登录" />
      {/* 移动端：三列纵向堆叠、高度自适应；md 及以上：三等分网格 */}
      <div className="grid grid-cols-1 grid-flow-row gap-3 md:gap-4 md:grid-cols-3">
        {columns.map(col => (
          <div key={col.key} className="rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 p-2.5 sm:p-3">
            <div className={`flex items-center gap-1.5 text-xs font-semibold mb-2.5 sm:mb-3 ${col.accent}`}>
              {col.icon}
              {col.title}
              <span className="ml-auto text-gray-500 font-normal">{col.items.length}</span>
            </div>
            <div className="space-y-2 min-h-[60px]">
              {col.items.length === 0 ? (
                <div className="text-[11px] text-gray-500 text-center py-4">{col.empty}</div>
              ) : (
                col.items.map(d => (
                  <div key={d.id} className={busyId === d.id ? 'opacity-50 pointer-events-none' : ''}>
                    <FingerprintCard
                      device={d}
                      actions={[
                        ...col.actions(d),
                        { label: '删除', icon: <FiTrash2 size={11} />, onClick: () => handleDelete(d), tone: 'gray' as const },
                      ]}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-600 mt-3">
        新设备登录成功后会自动进入「待处理」；在「信任」与「不信任」之间可随时互相移动。
      </p>
    </div>
  )
}
