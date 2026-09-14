import { useState } from 'react'
import { FiShield, FiCheck, FiTrash2 } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { setupTotp, verifyTotpSetup, disableTotp } from '../../api/auth'
import { useAuth } from '../../contexts/AuthContext'
import SettingsHeader from './SettingsHeader'

export default function TotpSection() {
  const { user, refreshUser } = useAuth()
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'idle' | 'setup' | 'verify'>('idle')
  const [saving, setSaving] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')

  const handleSetup = async () => {
    try {
      const res = await setupTotp()
      setSecret(res.data.secret)
      const QRCode = (await import('qrcode')).default
      const url = await QRCode.toDataURL(res.data.otpauthUri, { width: 200, margin: 2 })
      setQrDataUrl(url)
      setStep('setup')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '设置失败')
    }
  }

  const handleVerify = async () => {
    if (!code.trim()) return
    setSaving(true)
    try {
      await verifyTotpSetup(code.trim())
      await refreshUser()
      setStep('idle')
      setCode('')
      setSecret('')
      setQrDataUrl('')
      toast.success('两步验证已启用')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '验证失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDisable = async () => {
    try {
      await disableTotp()
      await refreshUser()
      toast.success('两步验证已关闭')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '关闭失败')
    }
  }

  return (
    <div className="glass rounded-xl p-6 sm:p-8">
      <SettingsHeader icon={FiShield} title="两步验证" desc="TOTP 二次验证提高账户安全性" />
      {user?.totpEnabled ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-neon-400">
            <FiCheck size={14} />
            两步验证已启用
          </div>
          <button
            onClick={handleDisable}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition-all active:scale-95"
          >
            <FiTrash2 size={14} />
            关闭两步验证
          </button>
        </div>
      ) : step === 'setup' ? (
        <div className="space-y-4">
          {qrDataUrl && (
            <div className="flex justify-center">
              <img src={qrDataUrl} alt="TOTP QR Code" className="rounded-lg" />
            </div>
          )}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">或手动输入密钥</label>
            <code className="block w-full px-3 py-2 rounded-lg bg-black/30 text-xs text-neon-300 font-mono break-all select-all">
              {secret}
            </code>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">输入应用中的验证码确认</label>
            <input
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 text-center tracking-[0.5em] focus:outline-none focus:border-accent-500/50 transition-colors"
              placeholder="000000"
              maxLength={6}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleVerify}
              disabled={saving || code.trim().length !== 6}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white text-xs font-semibold transition-all active:scale-95"
            >
              {saving ? '验证中...' : '确认并启用'}
            </button>
            <button
              onClick={() => setStep('idle')}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">使用 Google Authenticator 等 TOTP 应用生成一次性验证码</p>
          <button
            onClick={handleSetup}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-500 hover:bg-accent-600 text-white text-xs font-semibold transition-all active:scale-95"
          >
            <FiShield size={14} />
            设置两步验证
          </button>
        </div>
      )}
    </div>
  )
}
