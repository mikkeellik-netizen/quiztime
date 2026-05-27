import { useState } from 'react'
import { useHostStore } from '../store/hostStore'
import { apiClient, asArray, getErrorMessage } from '../api/client'
import { persistToken } from '../api/auth'

type Tab = 'login' | 'register'

interface Props {
  onBack: () => void
  onSuccess?: () => void
}

export default function AuthPage({ onBack, onSuccess }: Props) {
  const [tab, setTab] = useState<Tab>('login')
  const [loginUsername, setLoginUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const setQuizzes = useHostStore((s) => s.setQuizzes)
  const setHostPhase = useHostStore((s) => s.setPhase)

  const handleSubmit = async () => {
    setError('')

    const u = loginUsername.trim()
    const p = password
    const dn = displayName.trim()

    if (!u || !p) {
      setError('Заполни логин и пароль')
      return
    }
    if (u.length < 3) {
      setError('Логин минимум 3 символа')
      return
    }
    if (p.length < 4) {
      setError('Пароль минимум 4 символа')
      return
    }
    if (tab === 'register' && !dn) {
      setError('Введи своё имя')
      return
    }

    setLoading(true)
    try {
      const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = tab === 'login'
        ? { loginUsername: u, password: p }
        : { loginUsername: u, password: p, displayName: dn }

      const res = await apiClient.post(endpoint, body)
      const token: string | undefined = res.data?.accessToken
      if (!token) {
        setError('Ответ сервера без токена')
        setLoading(false)
        return
      }
      persistToken(token)

      // Сразу подтягиваем квизы
      try {
        const q = await apiClient.get('/api/quizzes')
        setQuizzes(asArray(q.data))
      } catch {
        setQuizzes([])
      }

      onSuccess?.()
      setHostPhase('dashboard')
    } catch (err) {
      setError(getErrorMessage(err, 'Ошибка авторизации'))
      setLoading(false)
    }
  }

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) handleSubmit()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="w-full max-w-sm">
        <button
          onClick={onBack}
          className="text-white/30 hover:text-white/70 text-sm mb-8 transition"
        >
          ← Назад
        </button>

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎮</div>
          <h1 className="text-2xl font-bold text-white">
            {tab === 'login' ? 'Войти в аккаунт' : 'Создать аккаунт'}
          </h1>
          <p className="text-white/40 text-sm mt-2">
            {tab === 'login'
              ? 'Введи свой логин и пароль'
              : 'Придумай логин и пароль для будущих входов'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-[#141e33] rounded-xl p-1">
          <button
            onClick={() => { setTab('login'); setError('') }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
              tab === 'login' ? 'bg-[#7c6ded] text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            Войти
          </button>
          <button
            onClick={() => { setTab('register'); setError('') }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
              tab === 'register' ? 'bg-[#7c6ded] text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            Регистрация
          </button>
        </div>

        <div className="space-y-3">
          {tab === 'register' && (
            <input
              type="text"
              placeholder="Твоё имя (видно участникам)"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={50}
              className="w-full px-4 py-3 rounded-xl bg-[#141e33] border border-white/10 text-white focus:outline-none focus:border-[#7c6ded] transition"
              onKeyDown={onEnter}
            />
          )}

          <input
            type="text"
            placeholder="Логин"
            value={loginUsername}
            onChange={e => setLoginUsername(e.target.value)}
            maxLength={30}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full px-4 py-3 rounded-xl bg-[#141e33] border border-white/10 text-white focus:outline-none focus:border-[#7c6ded] transition"
            onKeyDown={onEnter}
          />

          <input
            type="password"
            placeholder="Пароль (минимум 4 символа)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            maxLength={100}
            className="w-full px-4 py-3 rounded-xl bg-[#141e33] border border-white/10 text-white focus:outline-none focus:border-[#7c6ded] transition"
            onKeyDown={onEnter}
          />

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#7c6ded] hover:bg-[#6a5bd4] text-white font-bold text-lg transition disabled:opacity-50"
          >
            {loading ? '...' : tab === 'login' ? 'Войти' : 'Создать аккаунт'}
          </button>

          <p className="text-center text-white/30 text-xs mt-4">
            {tab === 'login'
              ? 'Ещё нет аккаунта? Нажми «Регистрация» выше'
              : 'Уже есть аккаунт? Нажми «Войти» выше'}
          </p>
        </div>
      </div>
    </div>
  )
}
