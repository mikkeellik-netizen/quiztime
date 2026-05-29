import { useEffect, useState } from 'react'
import { useHostStore } from '../store/hostStore'
import { getSocket } from '../socket/socket'
import { useServerTimer } from '../hooks/useServerTimer'

export default function HostGamePage() {
  const store = useHostStore()
  const [paused, setPaused] = useState(false)
  const {
    gamePhase,
    currentQuestion,
    questionIndex,
    totalQuestions,
    correctOptionIds,
    currentCorrectText,
    answerCount,
    participantCount,
    leaderboard,
    currentExplanation,
    setPhase,
  } = store

  const secondsLeft = useServerTimer(currentQuestion?.expiresAt ?? null, currentQuestion?.timerSec ?? 30)

  useEffect(() => {
    const socket = getSocket()

    socket.on('question_start', (data: any) => {
      store.setCurrentQuestion(
        {
          id: data.questionId,
          text: data.question,
          type: data.type,
          options: data.options ?? [],
          timerSec: data.timerSec,
          expiresAt: data.expiresAt,
          startedAt: data.startedAt,
        },
        data.questionIndex,
        data.totalQuestions,
      )
    })

    socket.on('show_answer', (data: any) => {
      store.setShowAnswer(data.correctOptionIds ?? [], data.answerCount ?? 0, data.participantCount ?? 0, data.explanation ?? null, data.correctText ?? [])
    })

    socket.on('show_leaderboard', (data: any) => {
      store.setLeaderboard(data.top ?? [])
    })

    socket.on('game_finished', (data: any) => {
      store.setLeaderboard(data.leaderboard ?? [])
      store.setGamePhase('finished')
      setPhase('finished')
    })

    socket.on('game_paused', () => setPaused(true))
    socket.on('game_resumed', () => setPaused(false))

    return () => {
      socket.off('question_start')
      socket.off('show_answer')
      socket.off('show_leaderboard')
      socket.off('game_finished')
      socket.off('game_paused')
      socket.off('game_resumed')
    }
  }, [])

  const nextQuestion = () => getSocket().emit('next_question')
  const prevQuestion = () => getSocket().emit('host_prev_question')
  const skipPhase = () => getSocket().emit('host_skip')
  const togglePause = () => getSocket().emit(paused ? 'host_resume' : 'host_pause')
  const endGame = () => getSocket().emit('end_game')

  // Панель ручного управления ведущего (доступна на любой фазе)
  const controlBar = (
    <div className="flex items-center gap-2 mb-3">
      <button
        onClick={prevQuestion}
        disabled={questionIndex <= 1}
        className="w-12 h-12 rounded-xl bg-[#141e33] border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition disabled:opacity-30 text-lg"
        title="Предыдущий вопрос"
      >
        ⏮
      </button>
      <button
        onClick={togglePause}
        className={`flex-1 h-12 rounded-xl font-bold text-sm transition border ${
          paused
            ? 'bg-green-500/20 border-green-500/40 text-green-300 hover:bg-green-500/30'
            : 'bg-[#141e33] border-white/10 text-white/70 hover:text-white hover:bg-white/10'
        }`}
        title={paused ? 'Продолжить' : 'Пауза'}
      >
        {paused ? '▶ Продолжить' : '⏸ Пауза'}
      </button>
      <button
        onClick={skipPhase}
        className="w-12 h-12 rounded-xl bg-[#141e33] border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition text-lg"
        title="Дальше"
      >
        ⏭
      </button>
    </div>
  )

  // ── Leaderboard view ──────────────────────────────────────────────────────
  if (gamePhase === 'show_leaderboard') {
    return (
      <div className="min-h-screen px-4 py-6">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-1">🏆 Рейтинг</h2>
          <p className="text-white/30 text-sm text-center mb-6">
            {paused ? '⏸ Пауза — авто-переход остановлен' : 'Авто-переход или управляй сам'}
          </p>
          {controlBar}
          <div className="space-y-2 mb-8">
            {leaderboard.slice(0, 10).map((entry) => (
              <div
                key={entry.rank}
                className="flex items-center gap-3 bg-[#141e33] rounded-xl px-4 py-3 border border-white/5"
              >
                <span className="text-white/40 w-6 text-center font-mono text-sm">{entry.rank}</span>
                <span className="flex-1 text-white font-medium truncate">{entry.name}</span>
                <span className="text-[#7c6ded] font-bold">{entry.score}</span>
              </div>
            ))}
          </div>
          <button
            onClick={nextQuestion}
            className="w-full py-4 rounded-2xl bg-[#7c6ded] hover:bg-[#6a5bd4] text-white font-bold text-xl transition mb-3"
          >
            Следующий вопрос →
          </button>
          <button onClick={endGame} className="w-full py-2 text-white/30 hover:text-white/60 text-sm transition">
            Завершить игру
          </button>
        </div>
      </div>
    )
  }

  // ── Show answer view ──────────────────────────────────────────────────────
  if (gamePhase === 'show_answer') {
    return (
      <div className="min-h-screen px-4 py-6">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <p className="text-white/50 text-sm mb-1">Ответили</p>
            <p className="text-5xl font-black text-white">
              {answerCount}
              <span className="text-white/30 text-2xl font-normal"> / {participantCount}</span>
            </p>
          </div>

          {currentQuestion && (
            <div className="bg-[#141e33] rounded-2xl p-4 border border-white/10 mb-4">
              <p className="text-white/60 text-sm mb-3">{currentQuestion.text}</p>
              {currentQuestion.type === 'TEXT' ? (
                <div className="space-y-2">
                  <p className="text-white/40 text-xs uppercase tracking-widest">Принятые ответы</p>
                  {currentCorrectText.map((t, i) => (
                    <div
                      key={i}
                      className="rounded-xl px-3 py-2.5 text-sm font-medium border bg-green-500/20 border-green-500/40 text-green-400"
                    >
                      ✓ {t}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {currentQuestion.options.map((opt) => {
                    const correct = correctOptionIds.includes(opt.id)
                    return (
                      <div
                        key={opt.id}
                        className={`rounded-xl px-3 py-2.5 text-sm font-medium border ${
                          correct
                            ? 'bg-green-500/20 border-green-500/40 text-green-400'
                            : 'bg-white/5 border-white/10 text-white/40'
                        }`}
                      >
                        {correct && '✓ '}{opt.text}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          {currentExplanation && (
            <div className="bg-[#0d1525] rounded-xl px-4 py-3 mb-3 border border-[#7c6ded]/20">
              <p className="text-[#7c6ded] text-xs mb-1">Пояснение</p>
              <p className="text-white/70 text-sm">{currentExplanation}</p>
            </div>
          )}
          {controlBar}
          <p className="text-white/30 text-xs text-center">
            {paused ? '⏸ Пауза — авто-переход остановлен' : 'Показывается участникам · авто-переход'}
          </p>
        </div>
      </div>
    )
  }

  // ── Active question view ──────────────────────────────────────────────────
  const COLORS = ['bg-red-500/20 border-red-500/40', 'bg-blue-500/20 border-blue-500/40', 'bg-yellow-500/20 border-yellow-500/40', 'bg-green-500/20 border-green-500/40']

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-5">
          <span className="text-white/40 text-sm">
            Вопрос {questionIndex} / {totalQuestions}
          </span>
          <span className={`text-3xl font-black ${secondsLeft <= 5 ? 'text-red-400' : 'text-[#7c6ded]'}`}>
            {secondsLeft}с
          </span>
        </div>

        {currentQuestion && (
          <>
            <div className="bg-[#141e33] rounded-2xl p-5 mb-5 border border-white/10">
              <p className="text-white text-xl font-semibold leading-relaxed text-center">
                {currentQuestion.text}
              </p>
            </div>

            {currentQuestion.type === 'TEXT' ? (
              <div className="bg-[#141e33] rounded-2xl px-4 py-6 mb-6 border border-white/10 text-center">
                <p className="text-3xl mb-2">✍️</p>
                <p className="text-white/50 text-sm">Участники вводят ответ вручную</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 mb-6">
                {currentQuestion.options.map((opt, i) => (
                  <div
                    key={opt.id}
                    className={`rounded-xl px-3 py-3 border text-sm text-white/80 ${COLORS[i] ?? 'bg-white/10 border-white/20'}`}
                  >
                    {opt.text}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <p className="text-white/20 text-xs text-center mb-4">
          {paused
            ? '⏸ Пауза — таймер остановлен'
            : 'Участники отвечают · таймер истекает автоматически'}
        </p>
        {controlBar}
        <button onClick={endGame} className="w-full py-2.5 text-white/20 hover:text-white/50 text-sm transition">
          Завершить игру досрочно
        </button>
      </div>
    </div>
  )
}
