import { useState } from 'react'
import axios from 'axios'
import { useHostStore } from '../store/hostStore'
import { persistToken } from '../api/auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

type Tab = 'login' | 'register'

export default function AuthPage({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('login')
  const [loginUsername, setLoginUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { setQuizzes, setPhase } = useHostStore()

  const handleSubmit = async () => {
    setError('')
    if (!loginUsername.trim() || !password.trim()) {
      setError('Заполни все поля')
      return
    }
    if (tab === 'register' && !displayName.trim()) {
      setError('Введи своё имя')
      return
    }
    setLoading(true)
    try {
      const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = tab === 'login'
        ? { loginUsername: loginUsername.trim(), password }
        : { loginUsername: loginUsername.trim(), password, displayName: displayName.trim() }

      const res = await axios.post(`${API_URL}${endpoint}`, body)
      const token: string = res.data.accessToken
      persistToken(token)

      const quizRes = await axios.get(`${API_URL}/api/quizzes`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setQuizzes(quizRes.data)
      setPhase('dashboard')
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || 'Ошибка')
    } finally {
      setLoading(false)
    }
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
            {tab === 'login' ? 'Войти' : 'Создать аккаунт'}
          </h1>
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
              placeholder="Твоё имя (будет видно участникам)"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={50}
              className="w-full px-4 py-3 rounded-xl bg-[#141e33] border border-white/10 text-white focus:outline-none focus:border-[#7c6ded] transition"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          )}

          <input
            type="text"
            placeholder="Логин"
            value={loginUsername}
            onChange={e => setLoginUsername(e.target.value)}
            maxLength={30}
            autoCapitalize="none"
            className="w-full px-4 py-3 rounded-xl bg-[#141e33] border border-white/10 text-white focus:outline-none focus:border-[#7c6ded] transition"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />

          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={e => setPassword(e.target.value)}
            maxLength={100}
            className="w-full px-4 py-3 rounded-xl bg-[#141e33] border border-white/10 text-white focus:outline-none focus:border-[#7c6ded] transition"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
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
        </div>
      </div>
    </div>
  )
}
