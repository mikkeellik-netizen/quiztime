import { useState } from 'react'
import axios from 'axios'
import { useHostStore } from '../store/hostStore'
import { resetSocket } from '../socket/socket'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function HostDashboardPage() {
  const { token, quizzes, setPhase, setGame, setQuizzes } = useHostStore()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const createSession = async (quizId: string, quizTitle: string) => {
    if (!token) return
    setLoading(quizId)
    setError('')
    try {
      const res = await axios.post(
        `${API_URL}/api/quizzes/${quizId}/sessions`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const { code } = res.data
      setGame(code, quizTitle)

      // Connect as host
      const socket = resetSocket()
      socket.emit('join_as_host', { code, token })

      socket.once('host_joined', () => {
        setPhase('lobby')
        setLoading(null)
      })

      socket.once('error', (e: any) => {
        setError(e.message || 'Ошибка подключения')
        setLoading(null)
      })

      setTimeout(() => {
        if (loading === quizId) {
          setPhase('lobby')
          setLoading(null)
        }
      }, 3000)
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || 'Ошибка')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setPhase('idle')}
            className="text-white/40 hover:text-white transition text-sm"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold text-white flex-1">Мои квизы</h1>
          <button
            onClick={() => setPhase('analytics')}
            className="text-white/40 hover:text-white transition text-sm"
            title="История игр"
          >
            📊
          </button>
          <button
            onClick={() => setPhase('builder')}
            className="px-4 py-2 rounded-xl bg-[#7c6ded] hover:bg-[#6a5bd4] text-white font-bold text-sm transition"
          >
            + Создать
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {quizzes.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-white/50 text-lg">Квизов пока нет</p>
            <p className="text-white/30 text-sm mt-2 max-w-xs mx-auto">
              Нажми «+ Создать» чтобы составить первый квиз
            </p>
            <button
              onClick={() => setPhase('builder')}
              className="mt-6 px-6 py-3 rounded-xl bg-[#7c6ded] hover:bg-[#6a5bd4] text-white font-bold transition"
            >
              + Создать квиз
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-[#141e33] rounded-2xl p-4 border border-white/10"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-white font-bold text-lg truncate">{quiz.title}</h2>
                    <p className="text-white/40 text-sm mt-0.5">
                      {quiz.questionCount} вопр. · {quiz.roundCount} раунд
                      {quiz.roundCount !== 1 ? 'а' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => createSession(quiz.id, quiz.title)}
                    disabled={loading !== null}
                    className="shrink-0 px-5 py-2.5 rounded-xl bg-[#7c6ded] hover:bg-[#6a5bd4] text-white font-bold text-sm transition disabled:opacity-50"
                  >
                    {loading === quiz.id ? '...' : '▶ Играть'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
