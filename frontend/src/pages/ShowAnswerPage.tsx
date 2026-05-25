import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { getSocket } from '../socket/socket'

export default function ShowAnswerPage() {
  const { correctAnswerIds, myAnswerIds, scoreEarned, currentQuestion, setPhase, setLeaderboard, setTotalScore, setCurrentQuestion } = useGameStore()

  const isCorrect = myAnswerIds.length > 0 && myAnswerIds.every(id => correctAnswerIds.includes(id))

  useEffect(() => {
    const socket = getSocket()

    socket.on('show_leaderboard', (data: any) => {
      setLeaderboard(data.top || [])
      setTotalScore(data.myScore || 0)
      setPhase('leaderboard')
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
      socket.off('show_leaderboard')
      socket.off('question_start')
      socket.off('game_finished')
    }
  }, [])

  const correctOptions = currentQuestion?.options.filter(o => correctAnswerIds.includes(o.id)) || []

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="text-center">
        <div className="text-6xl mb-4">
          {myAnswerIds.length === 0 ? '⏱️' : isCorrect ? '🎉' : '😔'}
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          {myAnswerIds.length === 0 ? 'Время вышло' : isCorrect ? 'Правильно!' : 'Неправильно'}
        </h2>

        {scoreEarned > 0 && (
          <p className="text-[#7c6ded] text-xl font-bold mb-4">+{scoreEarned} очков</p>
        )}

        <div className="bg-[#141e33] rounded-2xl px-6 py-4 mb-4">
          <p className="text-[#5a6b8a] text-sm mb-2">Правильный ответ:</p>
          {correctOptions.map(opt => (
            <p key={opt.id} className="text-white font-semibold text-lg">{opt.text}</p>
          ))}
          {correctAnswerIds.includes('true') && <p className="text-white font-semibold text-lg">✅ ДА</p>}
          {correctAnswerIds.includes('false') && <p className="text-white font-semibold text-lg">❌ НЕТ</p>}
        </div>

        <p className="text-[#5a6b8a] text-sm">Ждём следующий вопрос...</p>
      </div>
    </div>
  )
}
