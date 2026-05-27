import axios from 'axios'
import { useHostStore } from '../store/hostStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const TOKEN_KEY = 'auth_token'

export function loadSavedToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function persistToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
  useHostStore.getState().setToken(token)
}

export function clearSavedToken() {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * Returns a valid JWT token, trying in order:
 * 1. Zustand store (in-memory)
 * 2. localStorage (survived reload)
 * 3. Fresh Telegram auth
 *
 * Returns null if all three fail.
 */
export async function getToken(): Promise<string | null> {
  // 1. In-memory store
  const storeToken = useHostStore.getState().token
  if (storeToken) return storeToken

  // 2. localStorage fallback
  const saved = loadSavedToken()
  if (saved) {
    useHostStore.getState().setToken(saved)
    return saved
  }

  // 3. Fresh auth via Telegram initData
  try {
    const initData = (window as any).Telegram?.WebApp?.initData || ''
    const res = await axios.post(`${API_URL}/api/auth/telegram`, {
      initData: initData || 'dev',
    })
    const token: string = res.data.accessToken
    if (token) persistToken(token)
    return token ?? null
  } catch {
    return null
  }
}
