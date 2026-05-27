import axios, { AxiosInstance, AxiosError } from 'axios'
import { loadSavedToken, clearSavedToken } from './auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
})

// Auto-attach Bearer token
apiClient.interceptors.request.use((config) => {
  const token = loadSavedToken()
  if (token && config.headers) {
    ;(config.headers as any).Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-clear token on 401
apiClient.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      clearSavedToken()
    }
    return Promise.reject(err)
  },
)

/** Extract a friendly error message from any axios error. */
export function getErrorMessage(err: unknown, fallback = 'Что-то пошло не так'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as any
    if (typeof data === 'string') return data
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : String(data.message)
    }
    if (err.message) return err.message
  }
  if (err instanceof Error) return err.message
  return fallback
}

/** Always return an array, defensively (protects against unexpected response shapes). */
export function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}
