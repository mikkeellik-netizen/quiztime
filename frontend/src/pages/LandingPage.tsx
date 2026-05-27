import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { useHostStore } from '../store/hostStore'
import { apiClient, asArray, getErrorMessage } from '../api/client'
import { persistToken, loadSavedToken, clearSavedToken } from '../api/auth'
import AuthPage from './AuthPage'

type Mode = 'landing' | 'auth' | 'booting'

export default function LandingPage() {
  const [mode, setMode] = useState<Mode>('booting')
  const [bootError, setBootError] = useState('')
  const setGamePhase = useGameStore((s) => s.setPhase)
  const setQuizzes = useHostStore((s) => s.setQuizzes)
  const setHostPhase = useHostStore((s) => s.setPhase)

  // ─── Boot: на старте пробуем восстановить сессию ──────────────────────
  useEffect(() => {
    let cancelled = false

    const boot = async () => {
      // 1. Если мы внутри Telegram WebApp — пробуем silent auth
      const tgData = (window as any).Telegram?.WebApp?.initData
      const existingToken = loadSavedToken()

      try {
        if (tgData && !existingToken) {
          // Silent Telegram auth (только если ещё нет токена)
          const res = await apiClient.post('/api/auth/telegram', { initData: tgData })
          const tok = res.data?.accessToken
          if (tok) persistToken(tok)
        }

        // 2. Если есть токен — проверяем его живость через /auth/me
        const token = loadSavedToken()
        if (token) {
          await apiClient.get('/api/auth/me')
          // токен валиден → загружаем квизы и идём в дашборд
          const quizzes = await apiClient.get('/api/quizzes')
          if (cancelled) return
          setQuizzes(asArray(quizzes.data))
          setHostPhase('dashboard')
          return
        }
      } catch (err: any) {
        // Любая ошибка авторизации — просто чистим токен и показываем landing
        if (err?.response?.status === 401) {
          clearSavedToken()
        }
      }

      if (!cancelled) setMode('landing')
    }

    boot().catch((err) => {
      if (!cancelled) {
        setBootError(getErrorMessage(err))
        setMode('landing')
      }
    })

    return () => {
      cancelled = true
    }
  }, [setQuizzes, setHostPhase])

  // ─── Click handlers ───────────────────────────────────────────────────
  const goHost = async () => {
    setBootError('')
    const token = loadSavedToken()

    if (!token) {
      // Нет токена → сразу показываем форму входа
      setMode('auth')
      return
    }

    // Есть токен → быстро проверяем и идём в дашборд
    setMode('booting')
    try {
      const quizzes = await apiClient.get('/api/quizzes')
      setQuizzes(asArray(quizzes.data))
      setHostPhase('dashboard')
    } catch (err: any) {
      if (err?.response?.status === 401) {
        clearSavedToken()
        setMode('auth')
      } else {
        setBootError(getErrorMessage(err))
        setMode('landing')
      }
    }
  }

  const goJoin = () => setGamePhase('join')

  // ─── Render ───────────────────────────────────────────────────────────

  if (mode === 'auth') {
    return (
      <AuthPage
        onBack={() => setMode('landing')}
        onSuccess={() => {
          // AuthPage установит token + перенесёт в dashboard сам
        }}
      />
    )
  }

  if (mode === 'booting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="text-5xl mb-4 animate-pulse">🎯</div>
        <p className="text-white/50 text-sm">Загрузка...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">🎯</div>
        <h1 className="text-4xl font-bold text-white">QuizTime</h1>
        <p className="text-[#5a6b8a] mt-3">Интерактивные викторины в реальном времени</p>
      </div>

      {bootError && (
        <div className="bg-red-900/20 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm text-center max-w-sm w-full mb-4">
          {bootError}
        </div>
      )}

      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={goHost}
          className="w-full py-4 rounded-2xl bg-[#7c6ded] hover:bg-[#6a5bd4] text-white font-bold text-lg transition flex items-center justify-center gap-3"
        >
          <span>🎮</span>
          <span>Провести игру</span>
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
