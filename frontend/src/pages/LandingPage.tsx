import { useEffect, useState } from 'react'
import axios from 'axios'
import { useGameStore } from '../store/gameStore'
import { useHostStore } from '../store/hostStore'
import { getToken, persistToken, loadSavedToken } from '../api/auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function LandingPage() {
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const setGamePhase = useGameStore((s) => s.setPhase)
  const { setQuizzes, setPhase: setHostPhase } = useHostStore()

  const goHost = async () => {
    setLoading(true)
    setAuthError('')
    try {
      const token = await getToken()
      if (!token) {
        setAuthError('Не удалось авторизоваться. Открой приложение через Telegram.')
        return
      }
      const quizRes = await axios.get(`${API_URL}/api/quizzes`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setQuizzes(quizRes.data)
      setHostPhase('dashboard')
    } catch (e: any) {
      // 401 = expired token → clear and re-try once
      if (e.response?.status === 401) {
        localStorage.removeItem('auth_token')
        useHostStore.getState().setToken('')
        try {
          const freshToken = await getToken()
          if (freshToken) {
            const quizRes = await axios.get(`${API_URL}/api/quizzes`, {
              headers: { Authorization: `Bearer ${freshToken}` },
            })
            setQuizzes(quizRes.data)
            setHostPhase('dashboard')
            return
          }
        } catch {}
      }
      setAuthError(e.response?.data?.message || e.message || 'Ошибка авторизации')
    } finally {
      setLoading(false)
    }
  }

  const goPlayer = () => setGamePhase('join')

  useEffect(() => {
    // Silent auto-auth: try Telegram initData on first load
    const initData = (window as any).Telegram?.WebApp?.initData || ''
    if (!initData) return

    axios.post(`${API_URL}/api/auth/telegram`, { initData })
      .then((res) => {
        const token = res.data.accessToken
        if (token) {
          persistToken(token)
          return axios.get(`${API_URL}/api/quizzes`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        }
      })
      .then((res: any) => {
        if (res?.data) setQuizzes(res.data)
      })
      .catch(() => {
        // If Telegram auth failed, try loading saved token
        const saved = loadSavedToken()
        if (saved) {
          useHostStore.getState().setToken(saved)
          axios.get(`${API_URL}/api/quizzes`, {
            headers: { Authorization: `Bearer ${saved}` },
          }).then((r) => setQuizzes(r.data)).catch(() => {})
        }
      })
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">🎯</div>
        <h1 className="text-4xl font-bold text-white">QuizTime</h1>
        <p className="text-[#5a6b8a] mt-3">Интерактивные викторины в реальном времени</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {authError && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm text-center">
            {authError}
          </div>
        )}

        <button
          onClick={goHost}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-[#7c6ded] hover:bg-[#6a5bd4] text-white font-bold text-lg transition disabled:opacity-60 flex items-center justify-center gap-3"
        >
          <span>🎮</span>
          <span>{loading ? 'Авторизация...' : 'Провести игру'}</span>
        </button>

        <button
          onClick={goPlayer}
          className="w-full py-4 rounded-2xl bg-[#141e33] hover:bg-[#1a2845] border border-white/10 text-white font-bold text-lg transition flex items-center justify-center gap-3"
        >
          <span>👤</span>
          <span>Войти в игру</span>
        </button>
      </div>
    </div>
  )
}
