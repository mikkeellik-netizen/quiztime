import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { getSocket } from '../socket/socket'
import { useServerTimer } from '../hooks/useServerTimer'

const COLORS = ['#7c6ded', '#22d3ee', '#84cc16', '#f59e0b']
const SHAPES = ['🔷', '⭕', '⬡', '⭐']

export default function QuestionPage() {
  const {
    currentQuestion, myAnswerIds, setMyAnswer,
    setCorrectAnswer, setPhase, setLeaderboard, setTotalScore
  } = useGameStore()

  const [answered, setAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)

  const secondsLeft = useServerTimer(
    currentQuestion?.expiresAt || null,
    currentQuestion?.timerSec || 30
  )

  const totalSec = currentQuestion?.timerSec || 30
  const progress = totalSec > 0 ? secondsLeft / totalSec : 0

  useEffect(() => {
    const socket = getSocket()

    socket.on('show_answer', (data: any) => {
      setCorrectAnswer(data.correctOptionIds || [], data.scoreEarned || 0)
      setIsCorrect(data.isCorrect)
      setPhase('show_answer')
    })

    socket.on('show_leaderboard', (data: any) => {
      setLeaderboard(data.top || [])
      setTotalScore(data.myScore || 0)
      setPhase('leaderboard')
    })

    socket.on('question_start', (data: any) => {
      // Следующий вопрос
      const { setCurrentQuestion } = useGameStore.getState()
      setCurrentQuestion({
        id: data.questionId,
        text: data.question,
        type: data.type,
        options: data.options || [],
        timerSec: data.timerSec,
        expiresAt: data.expiresAt,
        startedAt: data.startedAt,
        index: data.questionIndex,
        total: data.totalQuestions,
        roundName: data.roundName || '',
      })
      setAnswered(false)
      setIsCorrect(null)
    })

    socket.on('game_finished', (data: any) => {
      setLeaderboard(data.leaderboard || [])
      setTotalScore(data.myScore || 0)
      setPhase('finished')
    })

    return () => {
      socket.off('show_answer')
      socket.off('show_leaderboard')
      socket.off('question_start')
      socket.off('game_finished')
    }
  }, [])

  const handleAnswer = (optionId: string) => {
    if (answered) return
    setAnswered(true)
    setMyAnswer([optionId])

    const socket = getSocket()
    socket.emit('submit_answer', {
      questionId: currentQuestion?.id,
      selectedOptionIds: [optionId],
    })
  }

  if (!currentQuestion) return null

  const isTrueFalse = currentQuestion.type === 'TRUE_FALSE'

  return (
    <div className="flex flex-col min-h-screen px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[#5a6b8a] text-sm">
          {currentQuestion.roundName && `${currentQuestion.roundName} · `}
          Вопрос {currentQuestion.index}/{currentQuestion.total}
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${secondsLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
            {secondsLeft}с
          </span>
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-1.5 rounded-full bg-white/10 mb-6">
        <div
          className="h-full rounded-full bg-[#7c6ded] transition-all duration-200"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col">
        <div className="bg-[#141e33] rounded-2xl px-5 py-6 mb-6">
          <p className="text-white text-lg font-semibold leading-relaxed text-center">
            {currentQuestion.text}
          </p>
        </div>

        {/* Options */}
        <div className={`grid gap-3 ${isTrueFalse ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {isTrueFalse ? (
            <>
              {[{ id: 'true', text: '✅ ДА' }, { id: 'false', text: '❌ НЕТ' }].map((opt, i) => (
                <button
                  key={opt.id}
                  onClick={() => handleAnswer(opt.id)}
                  disabled={answered}
                  className="py-6 rounded-2xl text-white font-bold text-xl transition disabled:opacity-60"
                  style={{ background: COLORS[i] }}
                >
                  {opt.text}
                </button>
              ))}
            </>
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
            <p className="text-[#5a6b8a]">Ответ принят! Ждём остальных...</p>
          </div>
        )}
      </div>
    </div>
  )
}
