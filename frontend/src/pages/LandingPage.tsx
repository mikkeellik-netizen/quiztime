import { useEffect, useState } from 'react'
import axios from 'axios'
import { useGameStore } from '../store/gameStore'
import { useHostStore } from '../store/hostStore'
import { persistToken, loadSavedToken } from '../api/auth'
import AuthPage from './AuthPage'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false)
  const setGamePhase = useGameStore((s) => s.setPhase)
  const { setQuizzes, setPhase: setHostPhase } = useHostStore()

  // Try silent Telegram auth on load
  useEffect(() => {
    const tgData = (window as any).Telegram?.WebApp?.initData
    if (!tgData) return

    axios.post(`${API_URL}/api/auth/telegram`, { initData: tgData })
      .then(res => {
        const tok = res.data?.accessToken
        if (!tok) return
        persistToken(tok)
        return axios.get(`${API_URL}/api/quizzes`, {
          headers: { Authorization: `Bearer ${tok}` },
        }).then(r => setQuizzes(r.data))
      })
      .catch(() => {})
  }, [])

  const goHost = () => {
    // Check if already logged in (store or localStorage)
    const token = useHostStore.getState().token || loadSavedToken()
    if (token) {
      // Try to enter dashboard with existing token
      axios.get(`${API_URL}/api/quizzes`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => {
          setQuizzes(r.data)
          if (token !== useHostStore.getState().token) {
            useHostStore.getState().setToken(token)
          }
          setHostPhase('dashboard')
        })
        .catch(e => {
          if (e.response?.status === 401) {
            // Token expired — clear and show login form
            localStorage.removeItem('auth_token')
            useHostStore.getState().setToken('')
          }
          setShowAuth(true)
        })
    } else {
      setShowAuth(true)
    }
  }

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
          className="w-full py-4 rounded-2xl bg-[#7c6ded] hover:bg-[#6a5bd4] text-white font-bold text-lg transition flex items-center justify-center gap-3"
        >
          <span>🎮</span>
          <span>Провести игру</span>
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
