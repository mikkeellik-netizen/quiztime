import { useEffect, useState } from 'react'
import axios from 'axios'
import { useGameStore } from '../store/gameStore'
import { useHostStore } from '../store/hostStore'
import { getToken, persistToken } from '../api/auth'
import AuthPage from './AuthPage'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false)
  const [loading, setLoading] = useState(false)
  const setGamePhase = useGameStore((s) => s.setPhase)
  const { setQuizzes, setPhase: setHostPhase } = useHostStore()

  const goHost = async () => {
    // If we already have a token — go straight to dashboard
    const existingToken = await getToken()
    if (existingToken) {
      setLoading(true)
      try {
        const quizRes = await axios.get(`${API_URL}/api/quizzes`, {
          headers: { Authorization: `Bearer ${existingToken}` },
        })
        setQuizzes(quizRes.data)
        setHostPhase('dashboard')
        return
      } catch (e: any) {
        if (e.response?.status === 401) {
          // Token expired — clear it and show auth form
          localStorage.removeItem('auth_token')
          useHostStore.getState().setToken('')
        }
      } finally {
        setLoading(false)
      }
    }
    // Show login/register form
    setShowAuth(true)
  }

  // Silent Telegram auto-auth on first load
  useEffect(() => {
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
      .catch(() => {})
  }, [])

  if (showAuth) {
    return <AuthPage onBack={() => setShowAuth(false)} />
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">🎯</div>
        <h1 className="text-4xl font-bold text-white">QuizTime</h1>
        <p className="text-[#5a6b8a] mt-3">Интерактивные викторины в реальном времени</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={goHost}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-[#7c6ded] hover:bg-[#6a5bd4] text-white font-bold text-lg transition disabled:opacity-60 flex items-center justify-center gap-3"
        >
          <span>🎮</span>
          <span>{loading ? 'Загрузка...' : 'Провести игру'}</span>
        </button>

        <button
          onClick={() => setGamePhase('join')}
          className="w-full py-4 rounded-2xl bg-[#141e33] hover:bg-[#1a2845] border border-white/10 text-white font-bold text-lg transition flex items-center justify-center gap-3"
        >
          <span>👤</span>
          <span>Войти в игру</span>
        </button>
      </div>
    </div>
  )
}
