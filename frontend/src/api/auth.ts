import { useHostStore } from '../store/hostStore'

const TOKEN_KEY = 'auth_token'

export interface AuthUser {
  id: string
  displayName: string
  username: string | null
}

/** Read token from localStorage (sync, safe). */
export function loadSavedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

/** Save token to localStorage and sync to store. */
export function persistToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {}
  useHostStore.getState().setToken(token)
}

/** Clear token from localStorage and store. */
export function clearSavedToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {}
  useHostStore.getState().setToken('')
}

/** Returns token from store or localStorage (no HTTP requests). */
export function getToken(): string | null {
  const storeToken = useHostStore.getState().token
  if (storeToken) return storeToken

  const saved = loadSavedToken()
  if (saved) {
    useHostStore.getState().setToken(saved)
    return saved
  }

  return null
}
