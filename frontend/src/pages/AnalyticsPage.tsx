import { useEffect, useState } from 'react'
import axios from 'axios'
import { useHostStore } from '../store/hostStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface SessionSummary {
  id: string
  code: string
  quizTitle: string
  status: string
  participantCount: number
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
}

interface QuestionStat {
  id: string
  text: string
  type: string
  totalAnswers: number
  correctAnswers: number
  pctCorrect: number
  avgTimeTakenMs: number
  difficulty: 'easy' | 'medium' | 'hard'
}

interface SessionDetail {
  id: string
  code: string
  quizTitle: string
  status: string
  startedAt: string | null
  finishedAt: string | null
  participantCount: number
  leaderboard: { rank: number; displayName: string; score: number; correctCount: number; avgAnswerMs: number }[]
  questionStats: QuestionStat[]
}

const difficultyLabel = (d: string) =>
  d === 'easy' ? '🟢 Лёгкий' : d === 'medium' ? '🟡 Средний' : '🔴 Сложный'

const formatDate = (s: string | null) => {
  if (!s) return '—'
  return new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function AnalyticsPage() {
  const { token, setPhase } = useHostStore()
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [detail, setDetail] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    axios
      .get(`${API_URL}/api/analytics/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => {
        setSessions(r.data)
        setLoading(false)
      })
      .catch(() => {
        setError('Не удалось загрузить историю')
        setLoading(false)
      })
  }, [token])

  const openDetail = async (id: string) => {
    if (!token) return
    try {
      const r = await axios.get(`${API_URL}/api/analytics/sessions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setDetail(r.data)
    } catch {
      setError('Не удалось загрузить детали')
    }
  }

  if (detail) {
    return (
      <div className="min-h-screen px-4 py-6">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => setDetail(null)}
            className="text-white/40 hover:text-white text-sm mb-4 transition"
          >
            ← Назад
          </button>

          <h1 className="text-2xl font-bold text-white mb-1">{detail.quizTitle}</h1>
          <p className="text-white/40 text-sm mb-5">
            Код {detail.code} · {detail.participantCount} участников · {formatDate(detail.finishedAt)}
          </p>

          {/* CSV download */}
          <a
            href={`${API_URL}/api/analytics/sessions/${detail.id}/export/csv`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white/70 text-sm hover:bg-white/20 transition mb-5"
          >
            📥 Скачать CSV
          </a>

          {/* Leaderboard */}
          <h2 className="text-lg font-bold text-white mb-2">Итоговый рейтинг</h2>
          <div className="space-y-2 mb-6">
            {detail.leaderboard.slice(0, 10).map((p) => (
              <div
                key={p.rank}
                className="flex items-center gap-3 bg-[#141e33] rounded-xl px-4 py-3 border border-white/5"
              >
                <span className="text-white/40 w-6 text-center font-mono text-sm">{p.rank}</span>
                <span className="flex-1 text-white font-medium truncate">{p.displayName}</span>
                <span className="text-white/30 text-xs mr-3">{p.correctCount} верных</span>
                <span className="text-[#7c6ded] font-bold">{p.score}</span>
              </div>
            ))}
          </div>

          {/* Question stats */}
          <h2 className="text-lg font-bold text-white mb-2">Статистика по вопросам</h2>
          <div className="space-y-3">
            {detail.questionStats.map((q, i) => (
              <div
                key={q.id}
                className="bg-[#141e33] rounded-xl px-4 py-3 border border-white/5"
              >
                <p className="text-white/80 text-sm font-medium mb-2">
                  {i + 1}. {q.text.length > 80 ? q.text.slice(0, 80) + '…' : q.text}
                </p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="text-white/40">{difficultyLabel(q.difficulty)}</span>
                  <span className="text-white/40">
                    ✓ {q.pctCorrect}% правильных ({q.correctAnswers}/{q.totalAnswers})
                  </span>
                  <span className="text-white/40">
                    ⏱ {(q.avgTimeTakenMs / 1000).toFixed(1)}с среднее
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-1 rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${q.pctCorrect}%`,
                      background:
                        q.pctCorrect >= 70
                          ? '#84cc16'
                          : q.pctCorrect >= 40
                          ? '#f59e0b'
                          : '#ef4444',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setPhase('dashboard')}
            className="text-white/40 hover:text-white transition text-sm"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold text-white">История игр</h1>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-white/30">Загрузка...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-white/40">Проведённых игр пока нет</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => openDetail(s.id)}
                className="w-full bg-[#141e33] rounded-2xl p-4 border border-white/10 text-left hover:border-[#7c6ded]/40 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-white font-bold truncate">{s.quizTitle}</h2>
                    <p className="text-white/40 text-xs mt-0.5">
                      Код {s.code} · {formatDate(s.createdAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[#7c6ded] font-bold text-lg">{s.participantCount}</p>
                    <p className="text-white/30 text-xs">участников</p>
                  </div>
                </div>
                <div className="mt-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      s.status === 'FINISHED'
                        ? 'bg-green-500/15 text-green-400'
                        : s.status === 'WAITING'
                        ? 'bg-yellow-500/15 text-yellow-400'
                        : 'bg-white/10 text-white/40'
                    }`}
                  >
                    {s.status === 'FINISHED'
                      ? 'Завершена'
                      : s.status === 'WAITING'
                      ? 'Ожидание'
                      : s.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
