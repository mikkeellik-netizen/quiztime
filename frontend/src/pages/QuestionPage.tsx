import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { getSocket } from '../socket/socket'
import { useServerTimer } from '../hooks/useServerTimer'

const COLORS = ['#7c6ded', '#22d3ee', '#84cc16', '#f59e0b']
const SHAPES = ['🔷', '⭕', '⬡', '⭐']

export default function QuestionPage() {
  const {
    currentQuestion,
    myAnswerIds,
    setMyAnswer,
    setCorrectAnswer,
    setPhase,
    setLeaderboard,
    setTotalScore,
    setCurrentQuestion,
  } = useGameStore()

  const [answered, setAnswered] = useState(false)
  const [localScore, setLocalScore] = useState(0)
  const [localCorrect, setLocalCorrect] = useState<boolean | null>(null)

  const secondsLeft = useServerTimer(
    currentQuestion?.expiresAt ?? null,
    currentQuestion?.timerSec ?? 30,
  )
  const totalSec = currentQuestion?.timerSec ?? 30
  const progress = totalSec > 0 ? secondsLeft / totalSec : 0

  useEffect(() => {
    setAnswered(false)
    setLocalScore(0)
    setLocalCorrect(null)
  }, [currentQuestion?.id])

  useEffect(() => {
    const socket = getSocket()

    socket.on('answer_result', (data: { isCorrect: boolean; scoreEarned: number }) => {
      setLocalScore(data.scoreEarned)
      setLocalCorrect(data.isCorrect)
    })

    socket.on('show_answer', (data: { correctOptionIds: string[] }) => {
      setCorrectAnswer(data.correctOptionIds ?? [], localScore)
      setPhase('show_answer')
    })

    socket.on('show_leaderboard', (data: any) => {
      setLeaderboard(data.top ?? [])
      setTotalScore(data.myScore ?? 0)
      setPhase('leaderboard')
    })

    socket.on('question_start', (data: any) => {
      setCurrentQuestion({
        id: data.questionId,
        text: data.question,
        type: data.type,
        options: data.options ?? [],
        timerSec: data.timerSec,
        expiresAt: data.expiresAt,
        startedAt: data.startedAt,
        index: data.questionIndex,
        total: data.totalQuestions,
        roundName: data.roundName ?? '',
      })
      setAnswered(false)
      setLocalScore(0)
      setLocalCorrect(null)
    })

    socket.on('game_finished', (data: any) => {
      setLeaderboard(data.leaderboard ?? [])
      setPhase('finished')
    })

    return () => {
      socket.off('answer_result')
      socket.off('show_answer')
      socket.off('show_leaderboard')
      socket.off('question_start')
      socket.off('game_finished')
    }
  }, [localScore])

  const handleAnswer = (optionId: string) => {
    if (answered) return
    setAnswered(true)
    setMyAnswer([optionId])
    getSocket().emit('submit_answer', { optionIds: [optionId] })
  }

  if (!currentQuestion) return null

  const isTrueFalse = currentQuestion.type === 'TRUE_FALSE'

  return (
    <div className="flex flex-col min-h-screen px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[#5a6b8a] text-sm">
          {currentQuestion.roundName && `${currentQuestion.roundName} · `}
          Вопрос {currentQuestion.index}/{currentQuestion.total}
        </span>
        <span className={`text-lg font-bold ${secondsLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
          {secondsLeft}с
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-white/10 mb-6">
        <div
          className="h-full rounded-full bg-[#7c6ded] transition-all duration-200"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col">
        <div className="bg-[#141e33] rounded-2xl px-5 py-6 mb-6">
          <p className="text-white text-lg font-semibold leading-relaxed text-center">
            {currentQuestion.text}
          </p>
        </div>

        <div className={`grid gap-3 ${isTrueFalse ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {isTrueFalse ? (
            [
              { id: currentQuestion.options[0]?.id ?? 'true', text: '✅ ДА' },
              { id: currentQuestion.options[1]?.id ?? 'false', text: '❌ НЕТ' },
            ].map((opt, i) => (
              <button
                key={opt.id}
                onClick={() => handleAnswer(opt.id)}
                disabled={answered}
                className="py-6 rounded-2xl text-white font-bold text-xl transition disabled:opacity-60"
                style={{ background: COLORS[i] }}
              >
                {opt.text}
              </button>
            ))
          ) : (
            currentQuestion.options.map((opt, i) => {
              const isSelected = myAnswerIds.includes(opt.id)
              return (
                <button
                  key={opt.id}
                  onClick={() => handleAnswer(opt.id)}
                  disabled={answered}
                  className="flex items-center gap-3 px-4 py-4 rounded-2xl text-white font-medium text-left transition disabled:opacity-60"
                  style={{
                    background: isSelected ? COLORS[i % COLORS.length] : '#141e33',
                    border: `2px solid ${isSelected ? COLORS[i % COLORS.length] : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  <span className="text-xl">{SHAPES[i % SHAPES.length]}</span>
                  <span>{opt.text}</span>
                </button>
              )
            })
          )}
        </div>

        {answered && (
          <div className="mt-6 text-center">
            {localCorrect !== null ? (
              <p className={`text-lg font-bold ${localCorrect ? 'text-green-400' : 'text-red-400'}`}>
                {localCorrect ? '✓ Правильно!' : '✗ Неправильно'}
                {localCorrect && localScore > 0 && (
                  <span className="text-[#7c6ded] ml-2">+{localScore}</span>
                )}
              </p>
            ) : (
              <p className="text-[#5a6b8a]">Ответ принят! Ждём остальных...</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
