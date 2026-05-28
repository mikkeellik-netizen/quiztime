import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { useHostStore } from '../store/hostStore'
import { apiClient, asArray, getErrorMessage } from '../api/client'
import { persistToken, loadSavedToken, clearSavedToken } from '../api/auth'
import AuthPage from './AuthPage'

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const setGamePhase = useGameStore((s) => s.setPhase)
  const setQuizzes = useHostStore((s) => s.setQuizzes)
  const setHostPhase = useHostStore((s) => s.setPhase)

  // Silent Telegram auth в фоне — НЕ навигируем, только сохраняем токен,
  // чтобы при нажатии «Провести игру» сразу пустить в дашборд.
  useEffect(() => {
    const tgData = (window as any).Telegram?.WebApp?.initData
    if (!tgData) return
    if (loadSavedToken()) return // токен уже есть — ничего не делаем

    apiClient
      .post('/api/auth/telegram', { initData: tgData })
      .then((res) => {
        const tok = res.data?.accessToken
        if (tok) persistToken(tok)
      })
      .catch(() => {
        // BOT_TOKEN не задан / невалидно — молча, пользователь войдёт вручную
      })
  }, [])

  // «Провести игру» — проверяем токен и идём в дашборд, иначе показываем форму
  const goHost = async () => {
    setError('')
    const token = loadSavedToken()

    if (!token) {
      setShowAuth(true)
      return
    }

    setChecking(true)
    try {
      const res = await apiClient.get('/api/quizzes')
      setQuizzes(asArray(res.data))
      setHostPhase('dashboard')
    } catch (err: any) {
      setChecking(false)
      if (err?.response?.status === 401) {
        clearSavedToken()
        setShowAuth(true)
      } else {
        setError(getErrorMessage(err))
      }
    }
  }

  const goJoin = () => setGamePhase('join')

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

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm text-center max-w-sm w-full mb-4">
          {error}
        </div>
      )}

      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={goHost}
          disabled={checking}
          className="w-full py-4 rounded-2xl bg-[#7c6ded] hover:bg-[#6a5bd4] text-white font-bold text-lg transition flex items-center justify-center gap-3 disabled:opacity-60"
        >
          <span>🎮</span>
          <span>{checking ? 'Загрузка...' : 'Провести игру'}</span>
        </button>

        <button
          onClick={goJoin}
          className="w-full py-4 rounded-2xl bg-[#141e33] hover:bg-[#1a2845] border border-white/10 text-white font-bold text-lg transition flex items-center justify-center gap-3"
        >
          <span>👤</span>
          <span>Войти в игру</span>
        </button>
      </div>
    </div>
  )
}
