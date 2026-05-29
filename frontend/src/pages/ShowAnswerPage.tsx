import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { getSocket } from '../socket/socket'

export default function ShowAnswerPage() {
  const {
    correctAnswerIds,
    correctTextAnswers,
    myAnswerIds,
    myAnswerCorrect,
    scoreEarned,
    currentQuestion,
    currentExplanation,
    leaderboard,
    totalPlayers,
    myStanding,
    participantName,
    setPhase,
    setLeaderboard,
    setTotalPlayers,
    setMyStanding,
    setTotalScore,
    setCurrentQuestion,
  } = useGameStore()

  const isText = currentQuestion?.type === 'TEXT'
  const answeredSomething = isText ? myAnswerCorrect !== null : myAnswerIds.length > 0
  const isCorrect = isText
    ? myAnswerCorrect === true
    : myAnswerIds.length > 0 && myAnswerIds.every((id) => correctAnswerIds.includes(id))

  useEffect(() => {
    const socket = getSocket()

    socket.on('your_standing', (data: { rank: number; score: number }) => {
      setMyStanding(data)
    })

    // Совмещённый экран: рейтинг обновляется, но остаёмся здесь же
    socket.on('show_leaderboard', (data: any) => {
      setLeaderboard(data.top ?? [])
      setTotalPlayers(data.totalPlayers ?? 0)
    })

    socket.on('question_start', (data: any) => {
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
      setPhase('question')
    })

    socket.on('game_finished', (data: any) => {
      setLeaderboard(data.leaderboard || [])
      setTotalScore(data.myScore || 0)
      setPhase('finished')
    })

    return () => {
      socket.off('your_standing')
      socket.off('show_leaderboard')
      socket.off('question_start')
      socket.off('game_finished')
    }
  }, [])

  const correctOptions =
    currentQuestion?.options.filter((o) => correctAnswerIds.includes(o.id)) || []

  // ─── Логика отображения рейтинга ───────────────────────────────────────────
  // ≤4 игроков — показываем всех; иначе топ-3, затем «…» и своё место (если ≥4).
  const small = totalPlayers > 0 && totalPlayers <= 4
  const topRows = small ? leaderboard.slice(0, 4) : leaderboard.slice(0, 3)
  const myRank = myStanding?.rank ?? null
  const showOwnRow = !small && myRank !== null && myRank > 3

  const Row = ({
    rank,
    name,
    score,
    mine,
  }: {
    rank: number
    name: string
    score: number
    mine: boolean
  }) => (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 py-2.5 border ${
        mine
          ? 'bg-[#7c6ded]/20 border-[#7c6ded]/50'
          : 'bg-[#141e33] border-white/5'
      }`}
    >
      <span
        className={`w-6 text-center font-bold text-sm ${
          rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-amber-600' : 'text-white/40'
        }`}
      >
        {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
      </span>
      <span className="flex-1 text-white font-medium truncate">
        {name}
        {mine && <span className="text-[#9b8ff5] text-xs ml-1">(вы)</span>}
      </span>
      <span className="text-[#7c6ded] font-bold">{score}</span>
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen px-4 py-6">
      <div className="w-full max-w-sm mx-auto">
        {/* ── Небольшой блок результата ── */}
        <div className="text-center mb-4">
          <div className="text-4xl mb-1">
            {!answeredSomething ? '⏱️' : isCorrect ? '🎉' : '😔'}
          </div>
          <h2 className="text-xl font-bold text-white">
            {!answeredSomething ? 'Время вышло' : isCorrect ? 'Правильно!' : 'Неправильно'}
          </h2>
          {scoreEarned > 0 && (
            <p className="text-[#7c6ded] text-lg font-bold mt-0.5">+{scoreEarned} очков</p>
          )}
        </div>

        {/* Правильный ответ — компактно */}
        <div className="bg-[#141e33] rounded-xl px-4 py-3 mb-2 border border-green-500/20 text-center">
          <p className="text-[#5a6b8a] text-xs mb-1">
            {isText && correctTextAnswers.length > 1 ? 'Принятые ответы' : 'Правильный ответ'}
          </p>
          {isText ? (
            <p className="text-green-400 font-semibold text-sm">
              {correctTextAnswers.map((t) => `✓ ${t}`).join('   ')}
            </p>
          ) : (
            <p className="text-green-400 font-semibold text-sm">
              {correctOptions.map((o) => o.text).join(', ')}
              {correctAnswerIds.includes('true') && '✅ ДА'}
              {correctAnswerIds.includes('false') && '❌ НЕТ'}
            </p>
          )}
        </div>

        {/* Пояснение — компактно */}
        {currentExplanation && (
          <div className="bg-[#0d1525] rounded-xl px-4 py-2.5 mb-2 border border-[#7c6ded]/20 text-left">
            <p className="text-white/70 text-xs leading-relaxed">{currentExplanation}</p>
          </div>
        )}

        {/* ── Рейтинг ── */}
        <div className="mt-4">
          <p className="text-white/40 text-xs uppercase tracking-widest text-center mb-2">
            🏆 Рейтинг
          </p>
          <div className="space-y-1.5">
            {topRows.map((e) => (
              <Row
                key={e.rank}
                rank={e.rank}
                name={e.name}
                score={e.score}
                mine={e.name === participantName}
              />
            ))}

            {showOwnRow && (
              <>
                <p className="text-white/30 text-center text-sm leading-none py-1">···</p>
                <Row
                  rank={myRank!}
                  name={participantName}
                  score={myStanding?.score ?? 0}
                  mine
                />
              </>
            )}
          </div>
        </div>

        <p className="text-[#5a6b8a] text-sm text-center mt-5">Ждём следующий вопрос...</p>
      </div>
    </div>
  )
}
