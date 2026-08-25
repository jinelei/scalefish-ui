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

let refreshPromise: Promise<string> | null = null

function doRefresh(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = client
      .post('/auth/refresh')
      .then((res) => {
        const newToken = res.data.data.accessToken
        setAccessToken(newToken)
        log.info('Token refreshed successfully')
        return newToken
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
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

    if ((err.response?.status === 401 || err.response?.status === 403) && !originalRequest._retry) {
      log.warn('Received %d, attempting token refresh', err.response.status)

      try {
        const newToken = await doRefresh()
        originalRequest._retry = true
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return client(originalRequest)
      } catch (e) {
        log.error('Token refresh failed:', e)
        setAccessToken(null)
        window.location.href = '/login'
        return Promise.reject(e)
      }
    }

    const msg = err.response?.data?.message || err.message || 'Network error'
    log.warn('Request failed: %s %s - %s', err.config?.method?.toUpperCase(), err.config?.url, msg)
    return Promise.reject(new Error(msg))
  },
)

export default client
