import { useEffect, useState } from 'react'
import axios from 'axios'
import { useGameStore } from '../store/gameStore'
import { useHostStore } from '../store/hostStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function LandingPage() {
  const [loading, setLoading] = useState(false)
  const setGamePhase = useGameStore((s) => s.setPhase)
  const { setToken, setQuizzes, setPhase: setHostPhase } = useHostStore()

  const tryAutoAuth = async (): Promise<string | null> => {
    const initData = window.Telegram?.WebApp?.initData || ''
    if (!initData) return null
    try {
      const res = await axios.post(`${API_URL}/api/auth/telegram`, { initData })
      return res.data.accessToken ?? null
    } catch {
      return null
    }
  }

  const goHost = async () => {
    setLoading(true)
    try {
      let token = useHostStore.getState().token
      if (!token) {
        const initData = window.Telegram?.WebApp?.initData || ''
        const res = await axios.post(`${API_URL}/api/auth/telegram`, {
          initData: initData || 'dev',
        })
        token = res.data.accessToken
        if (token) setToken(token)
      }
      if (!token) {
        setGamePhase('join')
        return
      }
      const quizRes = await axios.get(`${API_URL}/api/quizzes`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setQuizzes(quizRes.data)
      setHostPhase('dashboard')
    } catch {
      setHostPhase('dashboard')
    } finally {
      setLoading(false)
    }
  }

  const goPlayer = () => setGamePhase('join')

  useEffect(() => {
    // Silent auto-auth in background
    tryAutoAuth().then((token) => {
      if (token) {
        setToken(token)
        axios
          .get(`${API_URL}/api/quizzes`, { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => setQuizzes(r.data))
          .catch(() => {})
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
        <button
          onClick={goHost}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-[#7c6ded] hover:bg-[#6a5bd4] text-white font-bold text-lg transition disabled:opacity-60 flex items-center justify-center gap-3"
        >
          <span>🎮</span>
          <span>{loading ? 'Загрузка...' : 'Провести игру'}</span>
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
