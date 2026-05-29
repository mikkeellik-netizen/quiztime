import { useState, useEffect, useRef } from 'react'
import { useHostStore } from '../store/hostStore'
import { resetSocket } from '../socket/socket'
import { apiClient, asArray, getErrorMessage } from '../api/client'
import { clearSavedToken } from '../api/auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function HostDashboardPage() {
  const { token, quizzes: rawQuizzes, setPhase, setGame, setQuizzes, setEditingQuizId } = useHostStore()
  const quizzes = Array.isArray(rawQuizzes) ? rawQuizzes : []
  const [loading, setLoading] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(true)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const loadQuizzes = async (): Promise<boolean> => {
    setRefreshing(true)
    try {
      const res = await apiClient.get('/api/quizzes')
      setQuizzes(asArray(res.data))
      return true
    } catch (err: any) {
      if (err?.response?.status === 401) {
        clearSavedToken()
        setPhase('idle')
      } else {
        setError(getErrorMessage(err, 'Не удалось загрузить квизы'))
      }
      return false
    } finally {
      setRefreshing(false)
    }
  }

  // Всегда подтягиваем свежий список квизов при входе в дашборд
  useEffect(() => {
    loadQuizzes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Импорт квиза из файла (.xlsx / .txt)
  const handleImportFile = async (file: File) => {
    setError('')
    setImporting(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const parsed = await apiClient.post('/api/import/upload', form)
      const data = parsed.data

      if (Array.isArray(data?.errors) && data.errors.length > 0) {
        const msgs = data.errors
          .slice(0, 3)
          .map((e: any) => (e.row ? `Стр. ${e.row}: ${e.message}` : e.message))
          .join('; ')
        setError(`Ошибки в файле: ${msgs}`)
        return
      }
      if (!Array.isArray(data?.rounds) || data.rounds.length === 0) {
        setError('В файле не найдено ни одного вопроса')
        return
      }

      await apiClient.post('/api/quizzes/import', {
        title: (data.title || '').trim() || 'Импортированный квиз',
        data,
      })
      await loadQuizzes()
    } catch (err: any) {
      if (err?.response?.status === 401) {
        clearSavedToken()
        setPhase('idle')
      } else {
        setError(getErrorMessage(err, 'Не удалось загрузить файл'))
      }
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const createSession = async (quizId: string, quizTitle: string) => {
    if (!token) return
    setLoading(quizId)
    setError('')
    try {
      const res = await apiClient.post(
        `/api/quizzes/${quizId}/sessions`,
        {},
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
      setError(getErrorMessage(e))
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
            onClick={() => { setEditingQuizId(null); setPhase('builder') }}
            className="px-4 py-2 rounded-xl bg-[#7c6ded] hover:bg-[#6a5bd4] text-white font-bold text-sm transition"
          >
            + Создать
          </button>
        </div>

        {/* Импорт из файла */}
        <div className="bg-[#141e33] rounded-2xl p-4 border border-white/10 mb-4">
          <p className="text-white/70 text-sm font-semibold mb-1">📄 Создать из файла</p>
          <p className="text-white/35 text-xs mb-3">
            Скачай шаблон, заполни вопросы и загрузи обратно — квиз создастся автоматически.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={`${API_URL}/api/import/template/xlsx`}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium transition"
            >
              ⬇️ Шаблон Excel
            </a>
            <a
              href={`${API_URL}/api/import/template/txt`}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium transition"
            >
              ⬇️ Шаблон TXT
            </a>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="px-3 py-2 rounded-xl bg-[#7c6ded] hover:bg-[#6a5bd4] text-white text-xs font-bold transition disabled:opacity-50"
            >
              {importing ? 'Загрузка...' : '⬆️ Загрузить файл'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleImportFile(f)
              }}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {refreshing && quizzes.length === 0 ? (
          <div className="text-center py-16 text-white/30">Загрузка...</div>
        ) : quizzes.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-white/50 text-lg">Квизов пока нет</p>
            <p className="text-white/30 text-sm mt-2 max-w-xs mx-auto">
              Нажми «+ Создать» чтобы составить первый квиз
            </p>
            <button
              onClick={() => { setEditingQuizId(null); setPhase('builder') }}
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
                    onClick={() => { setEditingQuizId(quiz.id); setPhase('builder') }}
                    disabled={loading !== null}
                    className="shrink-0 w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition disabled:opacity-50"
                    title="Редактировать"
                  >
                    ✏️
                  </button>
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
