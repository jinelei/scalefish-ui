import { createLogger } from './logger'

const log = createLogger('fingerprint')

type FeatureMap = Record<string, string>

function getWebglInfo(): { vendor: string; renderer: string } {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null
    if (!gl) return { vendor: '', renderer: '' }
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    if (!debugInfo) return { vendor: '', renderer: '' }
    return {
      vendor: String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || ''),
      renderer: String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || ''),
    }
  } catch (e) {
    log.warn('WebGL fingerprint collection failed: %o', e)
    return { vendor: '', renderer: '' }
  }
}

let cached: FeatureMap | null = null

export function collectFingerprintFeatures(): FeatureMap {
  if (cached) return cached

  const features: FeatureMap = {}
  const nav = navigator as Navigator & { deviceMemory?: number; userAgentData?: { platform?: string; mobile?: boolean } }

  const ua = nav.userAgent || ''
  features.userAgent = ua

  const uaPlatform = nav.userAgentData?.platform
  features.platform = uaPlatform || nav.platform || ''
  features.language = nav.language || (nav.languages || []).join(',')
  features.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  features.timezoneOffset = String(new Date().getTimezoneOffset())

  features.screenResolution = `${window.screen.width}x${window.screen.height}x${window.devicePixelRatio || 1}`
  features.colorDepth = String(window.screen.colorDepth || '')
  features.cpuCores = String(nav.hardwareConcurrency || '')
  features.hardwareConcurrency = String(nav.hardwareConcurrency || '')
  features.deviceMemory = nav.deviceMemory !== undefined ? String(nav.deviceMemory) : ''

  features.touchSupport = (('ontouchstart' in window) || nav.maxTouchPoints > 0)
    ? `touch:${nav.maxTouchPoints || 0}`
    : 'no-touch'

  const webgl = getWebglInfo()
  features.webglVendor = webgl.vendor
  features.webglRenderer = webgl.renderer

  cached = features
  log.debug('Fingerprint features collected: %d fields', Object.keys(features).length)
  return features
}

/** 设备名：由 userAgent 派生的可读名称，用于设备凭证信任判定与设备列表展示（如 "Chrome on Windows"） */
export function getDeviceName(): string {
  const nav = navigator as Navigator & { userAgentData?: { brands?: Array<{ brand: string; version: string }>; platform?: string } }
  const ua = nav.userAgent || ''

  let browser = ''
  const brands = nav.userAgentData?.brands
  if (brands && brands.length > 0) {
    const chrome = brands.find((b) => b.brand.includes('Chrome'))
    const edge = brands.find((b) => b.brand.includes('Edge'))
    const safari = brands.find((b) => b.brand.includes('Safari'))
    const chosen = edge || chrome || safari || brands[0]
    if (chosen) browser = chosen.brand.replace(/\bChromium\b/, 'Chrome')
  }
  if (!browser) {
    if (/Edg\//.test(ua)) browser = 'Edge'
    else if (/Chrome\//.test(ua)) browser = 'Chrome'
    else if (/Firefox\//.test(ua)) browser = 'Firefox'
    else if (/Safari\//.test(ua)) browser = 'Safari'
  }

  let os = ''
  const platform = typeof nav.userAgentData !== 'undefined' ? nav.userAgentData.platform : undefined
  if (platform) {
    os = platform
  } else if (/Windows/.test(ua)) os = 'Windows'
  else if (/Mac OS X/.test(ua)) os = 'macOS'
  else if (/Android/.test(ua)) os = 'Android'
  else if (/iPhone|iPad|iOS/.test(ua)) os = 'iOS'
  else if (/Linux/.test(ua)) os = 'Linux'

  const name = [browser, os].filter(Boolean).join(' on ') || 'Unknown Device'
  return name.length > 100 ? name.slice(0, 100) : name
}
