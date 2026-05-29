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
    setMyAnswerCorrect,
    setPhase,
    setLeaderboard,
    setTotalScore,
    setCurrentQuestion,
  } = useGameStore()

  const [answered, setAnswered] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [textInput, setTextInput] = useState('')
  const [localScore, setLocalScore] = useState(0)
  const [localSpeedBonus, setLocalSpeedBonus] = useState(0)
  const [localCorrect, setLocalCorrect] = useState<boolean | null>(null)

  const secondsLeft = useServerTimer(
    currentQuestion?.expiresAt ?? null,
    currentQuestion?.timerSec ?? 30,
  )
  const totalSec = currentQuestion?.timerSec ?? 30
  const progress = totalSec > 0 ? secondsLeft / totalSec : 0

  const isMulti = currentQuestion?.type === 'MULTI'
  const isTrueFalse = currentQuestion?.type === 'TRUE_FALSE'
  const isText = currentQuestion?.type === 'TEXT'

  // Reset per question
  useEffect(() => {
    setAnswered(false)
    setSelectedIds([])
    setTextInput('')
    setLocalScore(0)
    setLocalSpeedBonus(0)
    setLocalCorrect(null)
  }, [currentQuestion?.id])

  useEffect(() => {
    const socket = getSocket()

    socket.on('answer_result', (data: { isCorrect: boolean; scoreEarned: number; speedBonus: number }) => {
      setLocalScore(data.scoreEarned)
      setLocalSpeedBonus(data.speedBonus ?? 0)
      setLocalCorrect(data.isCorrect)
      setMyAnswerCorrect(data.isCorrect)
    })

    socket.on('show_answer', (data: { correctOptionIds: string[]; correctText?: string[]; explanation?: string | null }) => {
      setCorrectAnswer(data.correctOptionIds ?? [], localScore, data.explanation ?? null, data.correctText ?? [])
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
      setSelectedIds([])
      setTextInput('')
      setLocalScore(0)
      setLocalSpeedBonus(0)
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

  // SINGLE / TRUE_FALSE: instant submit on click
  const handleSingleAnswer = (optionId: string) => {
    if (answered) return
    setAnswered(true)
    setMyAnswer([optionId])
    getSocket().emit('submit_answer', { optionIds: [optionId] })
  }

  // MULTI: toggle selection
  const toggleOption = (optionId: string) => {
    if (answered) return
    setSelectedIds((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId],
    )
  }

  // MULTI: confirm button
  const confirmMultiAnswer = () => {
    if (answered || selectedIds.length === 0) return
    setAnswered(true)
    setMyAnswer(selectedIds)
    getSocket().emit('submit_answer', { optionIds: selectedIds })
  }

  // TEXT: submit typed answer
  const submitTextAnswer = () => {
    if (answered || !textInput.trim()) return
    setAnswered(true)
    getSocket().emit('submit_answer', { text: textInput.trim() })
  }

  if (!currentQuestion) return null

  // Timer color
  const timerColor =
    secondsLeft <= 5
      ? 'text-red-400 animate-pulse'
      : secondsLeft <= 10
      ? 'text-orange-400'
      : 'text-white'

  // Progress bar color
  const barColor =
    secondsLeft <= 5 ? '#ef4444' : secondsLeft <= 10 ? '#f59e0b' : '#7c6ded'

  return (
    <div className="flex flex-col min-h-screen px-4 py-6">
      {/* Header: progress + timer */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[#5a6b8a] text-sm">
          {currentQuestion.roundName && `${currentQuestion.roundName} · `}
          Вопрос {currentQuestion.index}/{currentQuestion.total}
        </span>
        <span className={`text-lg font-bold ${timerColor}`}>{secondsLeft}с</span>
      </div>

      <div className="h-1.5 rounded-full bg-white/10 mb-5">
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{ width: `${progress * 100}%`, background: barColor }}
        />
      </div>

      {/* Question text */}
      <div className="bg-[#141e33] rounded-2xl px-5 py-6 mb-5">
        <p className="text-white text-lg font-semibold leading-relaxed text-center">
          {currentQuestion.text}
        </p>
        {isMulti && !answered && (
          <p className="text-[#5a6b8a] text-xs text-center mt-2">
            Выбери все правильные варианты, затем нажми «Подтвердить»
          </p>
        )}
      </div>

      {/* Options */}
      {isText ? (
        <div className="space-y-3 flex-1">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            disabled={answered}
            autoFocus
            placeholder="Напиши свой ответ..."
            maxLength={120}
            onKeyDown={(e) => e.key === 'Enter' && submitTextAnswer()}
            className="w-full px-4 py-4 rounded-2xl bg-[#141e33] border-2 border-white/10 text-white text-lg text-center focus:outline-none focus:border-[#7c6ded] transition disabled:opacity-60"
          />
          {!answered && (
            <button
              onClick={submitTextAnswer}
              disabled={!textInput.trim()}
              className="w-full py-4 rounded-2xl bg-[#7c6ded] hover:bg-[#6a5bd4] text-white font-bold text-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Ответить
            </button>
          )}
          <p className="text-[#5a6b8a] text-xs text-center">
            Можно с опечатками — засчитаем близкий ответ
          </p>
        </div>
      ) : isTrueFalse ? (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { id: currentQuestion.options[0]?.id ?? 'true', text: '✅ ДА' },
            { id: currentQuestion.options[1]?.id ?? 'false', text: '❌ НЕТ' },
          ].map((opt, i) => (
            <button
              key={opt.id}
              onClick={() => handleSingleAnswer(opt.id)}
              disabled={answered}
              className="py-6 rounded-2xl text-white font-bold text-xl transition disabled:opacity-60"
              style={{ background: COLORS[i] }}
            >
              {opt.text}
            </button>
          ))}
        </div>
      ) : isMulti ? (
        <div className="space-y-2 mb-4 flex-1">
          {currentQuestion.options.map((opt, i) => {
            const isSelected = selectedIds.includes(opt.id)
            return (
              <button
                key={opt.id}
                onClick={() => toggleOption(opt.id)}
                disabled={answered}
                className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-white font-medium text-left transition disabled:opacity-60"
                style={{
                  background: isSelected ? COLORS[i % COLORS.length] + '33' : '#141e33',
                  border: `2px solid ${isSelected ? COLORS[i % COLORS.length] : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                <span
                  className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition"
                  style={{
                    borderColor: isSelected ? COLORS[i % COLORS.length] : 'rgba(255,255,255,0.3)',
                    background: isSelected ? COLORS[i % COLORS.length] : 'transparent',
                  }}
                >
                  {isSelected && <span className="text-white text-xs">✓</span>}
                </span>
                <span className="text-xl">{SHAPES[i % SHAPES.length]}</span>
                <span>{opt.text}</span>
              </button>
            )
          })}
          {!answered && (
            <button
              onClick={confirmMultiAnswer}
              disabled={selectedIds.length === 0}
              className="w-full py-3 mt-2 rounded-2xl bg-[#7c6ded] hover:bg-[#6a5bd4] text-white font-bold transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ✓ Подтвердить выбор ({selectedIds.length})
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2 flex-1">
          {currentQuestion.options.map((opt, i) => {
            const isSelected = myAnswerIds.includes(opt.id)
            return (
              <button
                key={opt.id}
                onClick={() => handleSingleAnswer(opt.id)}
                disabled={answered}
                className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-white font-medium text-left transition disabled:opacity-60"
                style={{
                  background: isSelected ? COLORS[i % COLORS.length] : '#141e33',
                  border: `2px solid ${isSelected ? COLORS[i % COLORS.length] : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                <span className="text-xl">{SHAPES[i % SHAPES.length]}</span>
                <span>{opt.text}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Feedback after answering — НЕ раскрываем правильность до экрана результатов */}
      {answered && (
        <div className="mt-4 text-center">
          <p className="text-2xl mb-1">✅</p>
          <p className="text-white font-semibold">Ответ принят!</p>
          <p className="text-[#5a6b8a] text-sm mt-0.5">Результат покажем, когда время выйдет</p>
        </div>
      )}
    </div>
  )
}
