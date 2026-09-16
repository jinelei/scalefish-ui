import { useState, useEffect, useCallback } from 'react'
import { FiCpu, FiSave } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { getAiSystemConfig, updateAiSystemConfig, type AiSystemConfig } from '../../api/ai-system-config'
import SettingsHeader from './SettingsHeader'

export default function AISettingsSection() {
  const [cfg, setCfg] = useState<AiSystemConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [maxTags, setMaxTags] = useState(5)
  const [schedulerEnabled, setSchedulerEnabled] = useState(false)
  const [forceDeviceVerification, setForceDeviceVerification] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getAiSystemConfig()
      setCfg(res.data)
      setBaseUrl(res.data.baseUrl)
      setModel(res.data.model)
      setMaxTags(res.data.maxTags)
      setSchedulerEnabled(res.data.schedulerEnabled)
      setForceDeviceVerification(res.data.forceDeviceVerification)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '加载系统 AI 配置失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateAiSystemConfig({
        baseUrl,
        apiKey: apiKey || undefined,
        model,
        maxTags,
        schedulerEnabled,
        forceDeviceVerification,
      })
      toast.success('系统 AI 配置已保存')
      await load()
      setApiKey('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent-500/50 transition-colors'
  const labelCls = 'block text-xs text-gray-400 mb-1'

  return (
    <div className="glass rounded-xl p-6 sm:p-8">
      <SettingsHeader icon={FiCpu} title="AI 系统配置" desc="管理员维护的全局参数：服务地址、API Key、模型、定时主开关与强制设备验证" />
      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-9 bg-white/5 rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>服务地址 Base URL（OpenAI 兼容接口）</label>
              <input className={inputCls} value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://api.openai.com" />
            </div>
            <div>
              <label className={labelCls}>API Key {cfg?.apiKeySet ? '（已配置，留空表示不修改）' : ''}</label>
              <input type="password" className={inputCls} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={cfg?.apiKeySet ? '********' : 'sk-...'} autoComplete="off" />
            </div>
            <div>
              <label className={labelCls}>模型名称</label>
              <input className={inputCls} value={model} onChange={e => setModel(e.target.value)} placeholder="gpt-4o-mini / deepseek-chat / doubao-..." />
            </div>
            <div>
              <label className={labelCls}>每个书签最多标签数</label>
              <input type="number" min={1} max={20} className={inputCls} value={maxTags} onChange={e => setMaxTags(Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
              <input type="checkbox" checked={schedulerEnabled} onChange={e => setSchedulerEnabled(e.target.checked)} className="accent-accent-500 w-4 h-4" />
              AI 定时打标全局主开关（关闭后所有用户的定时任务均暂停）
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
              <input type="checkbox" checked={forceDeviceVerification} onChange={e => setForceDeviceVerification(e.target.checked)} className="accent-accent-500 w-4 h-4" />
              强制设备验证（开启后所有设备登录一律要求两步验证码）
            </label>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-600 hover:bg-accent-500 disabled:opacity-50 text-white text-xs font-semibold transition-all active:scale-95">
              <FiSave size={14} /> {saving ? '保存中...' : '保存配置'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
