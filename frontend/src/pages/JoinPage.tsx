import { useState, useEffect } from 'react'
import axios from 'axios'
import { useGameStore } from '../store/gameStore'
import { resetSocket } from '../socket/socket'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function JoinPage() {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { setGameCode, setParticipantName, setPhase, setReconnectToken, setGameTitle } = useGameStore()

  useEffect(() => {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
    if (tgUser) {
      setName(tgUser.first_name ?? '')
    }
  }, [])

  const handleJoin = async () => {
    if (!code.trim() || !name.trim()) {
      setError('Введи код игры и своё имя')
      return
    }
    setLoading(true)
    setError('')

    try {
      let token = ''
      try {
        const initData = window.Telegram?.WebApp?.initData || ''
        const resp = await axios.post(`${API_URL}/api/auth/telegram`, {
          initData: initData || 'dev',
        })
        token = resp.data.accessToken ?? ''
      } catch {
        // continue without token
      }

      const socket = resetSocket(token)

      socket.emit('join_game', {
        gameCode: code.trim().toUpperCase(),
        displayName: name.trim(),
        token,
      })

      socket.once('joined', (data: any) => {
        setReconnectToken(data.reconnectToken)
        setGameCode(code.trim().toUpperCase())
        setParticipantName(name.trim())
        setGameTitle(data.gameTitle || 'QuizTime')
        setPhase('lobby')
        localStorage.setItem('reconnect_token', data.reconnectToken)
        localStorage.setItem('game_code', code.trim().toUpperCase())
        setLoading(false)
      })

      socket.once('error', (err: any) => {
        setError(err.message || 'Ошибка подключения')
        setLoading(false)
      })

      socket.once('connect_error', () => {
        setError('Не удалось подключиться к серверу')
        setLoading(false)
      })
    } catch (e: any) {
      setError(e.message || 'Ошибка')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="w-full max-w-sm">
        <button
          onClick={() => setPhase('landing')}
          className="text-white/30 hover:text-white/70 text-sm mb-8 transition"
        >
          ← Назад
        </button>

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">👤</div>
          <h1 className="text-2xl font-bold text-white">Войти в игру</h1>
          <p className="text-[#5a6b8a] mt-2 text-sm">Введи код от ведущего</p>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Код игры (напр. ABC123)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={10}
            className="w-full px-4 py-3 rounded-xl bg-[#141e33] border border-white/10 text-white text-center text-xl font-bold tracking-widest focus:outline-none focus:border-[#7c6ded] transition"
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />

          <input
            type="text"
            placeholder="Твоё имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            className="w-full px-4 py-3 rounded-xl bg-[#141e33] border border-white/10 text-white focus:outline-none focus:border-[#7c6ded] transition"
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />

          {error && (
            <div className="text-red-400 text-sm text-center bg-red-900/20 rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#7c6ded] hover:bg-[#6a5bd4] text-white font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Подключение...' : 'Войти в игру'}
          </button>
        </div>
      </div>
    </div>
  )
}
