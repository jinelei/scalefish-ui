import axios from 'axios'
import { createLogger } from '../utils/logger'
import { API_BASE_URL } from '../config'

const log = createLogger('api-client')

let accessTokenGetter: () => string | null = () => null
let setAccessToken: (token: string | null) => void = () => {}

export function setAuthTokenAccessor(getter: () => string | null, setter: (token: string | null) => void) {
  accessTokenGetter = getter
  setAccessToken = setter
}

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  paramsSerializer: { indexes: null },
  withCredentials: true,
})

client.interceptors.request.use((config) => {
  const token = accessTokenGetter()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  log.debug('Request: %s %s', config.method?.toUpperCase(), config.url)
  return config
})

let isRefreshing = false
let pendingQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

function processQueue(error: unknown, token: string | null) {
  pendingQueue.forEach((p) => {
    if (error) {
      p.reject(error)
    } else {
      p.resolve(token!)
    }
  })
  pendingQueue = []
}

client.interceptors.response.use(
  (res) => {
    log.debug('Response: %d %s %s', res.status, res.config.method?.toUpperCase(), res.config.url)
    return res
  },
  async (err) => {
    const originalRequest = err.config
    if (originalRequest.url === '/auth/refresh') {
      return Promise.reject(err)
    }

    if (err.response?.status === 401 && !originalRequest._retry) {
      log.warn('Received 401, attempting token refresh')

      if (isRefreshing) {
        log.debug('Token refresh already in progress, queueing request')
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(client(originalRequest))
            },
            reject,
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const res = await client.post('/auth/refresh')
        const { accessToken: newAccessToken } = res.data.data
        setAccessToken(newAccessToken)
        log.info('Token refreshed successfully')
        processQueue(null, newAccessToken)
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return client(originalRequest)
      } catch (e) {
        log.error('Token refresh failed:', e)
        processQueue(e, null)
        setAccessToken(null)
        window.location.href = '/login'
        return Promise.reject(e)
      } finally {
        isRefreshing = false
      }
    }

    const msg = err.response?.data?.message || err.message || 'Network error'
    log.warn('Request failed: %s %s - %s', err.config?.method?.toUpperCase(), err.config?.url, msg)
    return Promise.reject(new Error(msg))
  },
)

export default client