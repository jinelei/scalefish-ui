import { API_BASE_URL } from '../config'
import { createLogger } from '../utils/logger'
import { getAccessToken } from './client'

const log = createLogger('sse-client')

export interface SseHandlers<T> {
  onEvent?: (event: string, data: T) => void
  onError?: (message: string) => void
  onClose?: () => void
}

/**
 * 发起 POST 请求并消费 text/event-stream 响应。
 * 相比原生 EventSource，支持 POST 方法与 Authorization 请求头。
 */
export async function postSse<T = unknown>(
  path: string,
  body: unknown,
  handlers: SseHandlers<T>,
  signal?: AbortSignal,
): Promise<void> {
  const token = getAccessToken()
  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') return
    handlers.onError?.(e instanceof Error ? e.message : '网络错误')
    return
  }

  if (!res.ok || !res.body) {
    let message = `请求失败（${res.status}）`
    try {
      const errBody = await res.json()
      if (errBody?.message) message = errBody.message as string
    } catch {
      /* 非 JSON 错误体，保留默认消息 */
    }
    handlers.onError?.(message)
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const dispatch = (rawEvent: string, rawDataLines: string[]) => {
    if (rawDataLines.length === 0) return
    const dataStr = rawDataLines.join('\n')
    let data: unknown = dataStr
    try {
      data = JSON.parse(dataStr)
    } catch {
      /* 非 JSON 数据（如心跳），保留原始字符串 */
    }
    handlers.onEvent?.(rawEvent || 'message', data as T)
  }

  const drainFrames = () => {
    const frames = buffer.split(/\r?\n\r?\n/)
    buffer = frames.pop() ?? ''
    for (const rawFrame of frames) {
      if (!rawFrame.trim()) continue
      let eventName = 'message'
      const dataLines: string[] = []
      for (const line of rawFrame.split(/\r?\n/)) {
        if (line.startsWith(':')) continue
        if (line.startsWith('event:')) eventName = line.slice(6).trim()
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''))
      }
      dispatch(eventName, dataLines)
    }
  }

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      drainFrames()
    }
    log.debug('SSE stream closed: %s', path)
    handlers.onClose?.()
  } catch (e) {
    if ((e as Error).name === 'AbortError') return
    handlers.onError?.(e instanceof Error ? e.message : '流读取失败')
  }
}
