import { useState, useEffect, useCallback } from 'react'
import { FiCpu, FiSave } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { getAiTaggingConfig, updateAiTaggingConfig, tagPendingWithAiStream, getAiTaggingStats, type AiTaggingConfig as AiConfig } from '../../api/ai-tagging'
import SettingsHeader from './SettingsHeader'

export default function AiTaggingSection() {
  const [cfg, setCfg] = useState<AiConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [stats, setStats] = useState<{ total: number; tagged: number; pending: number } | null>(null)

  const [enabled, setEnabled] = useState(false)
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [maxTags, setMaxTags] = useState(5)
  const [cron, setCron] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cfgRes, statsRes] = await Promise.all([getAiTaggingConfig(), getAiTaggingStats()])
      setCfg(cfgRes.data)
      setStats(statsRes.data)
      setEnabled(cfgRes.data.enabled)
      setBaseUrl(cfgRes.data.baseUrl)
      setApiKey('')
      setModel(cfgRes.data.model)
      setMaxTags(cfgRes.data.maxTags)
      setCron(cfgRes.data.cron)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '加载 AI 配置失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateAiTaggingConfig({
        enabled,
        baseUrl,
        model,
        maxTags,
        cron,
        ...(apiKey ? { apiKey } : {}),
      })
      toast.success('AI 打标配置已保存')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleRunPending = async () => {
    setRunning(true)
    setProgress(null)
    const outcome: { value: { success: number; failed: number } | null } = { value: null }
    try {
      await tagPendingWithAiStream({
        onStart: (total) => setProgress({ done: 0, total }),
        onProgress: ({ index, total }) => setProgress({ done: index, total }),
        onDone: (e) => {
          if (e.result) outcome.value = { success: e.result.success, failed: e.result.failed }
        },
        onError: (msg) => toast.error(msg),
      })
      if (outcome.value) {
        const { success, failed } = outcome.value
        toast.success(`AI 打标完成：成功 ${success} 个${failed ? `，失败 ${failed} 个` : ''}`)
        await load()
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'AI 打标失败')
    } finally {
      setRunning(false)
      setProgress(null)
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent-500/50 transition-colors'
  const labelCls = 'block text-xs text-gray-400 mb-1'

  return (
    <div className="glass rounded-xl p-6 sm:p-8">
      <SettingsHeader icon={FiCpu} title="AI 智能打标" desc="由大模型根据书签标题、网址和描述自动生成标签；可定时对新书签打标" />
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-9 bg-white/5 rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="space-y-4">
          {stats && (
            <div className="flex flex-wrap gap-4 text-xs text-gray-400 bg-white/5 rounded-lg px-4 py-3">
              <span>待打标：<b className="text-accent-400">{stats.pending}</b> 个</span>
              <span>已打标：<b className="text-neon-400">{stats.tagged}</b> 个</span>
              <span>书签总数：{stats.total} 个</span>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="accent-accent-500 w-4 h-4" />
            启用 AI 打标（含定时任务）
          </label>

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
            <div>
              <label className={labelCls}>定时打标 Cron（秒 分 时 日 月 周）</label>
              <input className={inputCls} value={cron} onChange={e => setCron(e.target.value)} placeholder="0 0 3 * * *" />
              <p className="text-[11px] text-gray-500 mt-1">默认每天凌晨 3 点处理未打标的新书签；仅在启用时生效</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-600 hover:bg-accent-500 disabled:opacity-50 text-white text-xs font-semibold transition-all active:scale-95">
              <FiSave size={14} /> {saving ? '保存中...' : '保存配置'}
            </button>
            <button onClick={handleRunPending} disabled={running}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-600 hover:bg-neon-500 disabled:opacity-50 text-white text-xs font-semibold transition-all active:scale-95">
              <FiCpu size={14} className={running ? 'animate-pulse' : ''} /> {
                running
                  ? (progress ? `打标中 ${progress.done}/${progress.total}` : '启动中...')
                  : '立即打标全部待处理'
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
