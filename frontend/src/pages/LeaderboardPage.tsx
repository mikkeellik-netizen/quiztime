import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { getSocket } from '../socket/socket'

export default function LeaderboardPage() {
  const { leaderboard, totalScore, participantName, setPhase, setCurrentQuestion } = useGameStore()

  const myRank = leaderboard.findIndex(e => e.name === participantName) + 1

  useEffect(() => {
    const socket = getSocket()

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
      const { setLeaderboard, setTotalScore } = useGameStore.getState()
      setLeaderboard(data.leaderboard || [])
      setTotalScore(data.myScore || 0)
      setPhase('finished')
    })

    return () => {
      socket.off('question_start')
      socket.off('game_finished')
    }
  }, [])

  const medalEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `${rank}`
  }

  return (
    <div className="flex flex-col min-h-screen px-4 py-6">
      <h2 className="text-xl font-bold text-white text-center mb-2">Таблица лидеров</h2>
      {myRank > 0 && (
        <p className="text-[#5a6b8a] text-center text-sm mb-4">
          Твоё место: <span className="text-white font-bold">#{myRank}</span> · {totalScore} очков
        </p>
      )}

      <div className="space-y-2 flex-1">
        {leaderboard.map((entry, i) => {
          const isMe = entry.name === participantName
          return (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                background: isMe ? 'rgba(124,109,237,0.15)' : '#141e33',
                border: isMe ? '1px solid rgba(124,109,237,0.4)' : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span className="w-8 text-center font-bold text-lg">
                {medalEmoji(entry.rank)}
              </span>
              <span className="flex-1 text-white font-medium">
                {entry.name} {isMe && <span className="text-[#7c6ded] text-xs">(ты)</span>}
              </span>
              <span className="text-[#7c6ded] font-bold">{entry.score}</span>
            </div>
          )
        })}
      </div>

      <p className="text-[#5a6b8a] text-center text-sm mt-4">Ждём следующий вопрос...</p>
    </div>
  )
}
