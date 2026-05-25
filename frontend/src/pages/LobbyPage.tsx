import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { getSocket } from '../socket/socket'

export default function LobbyPage() {
  const { gameCode, participantName, participants, setParticipants, setPhase, setCurrentQuestion, gameTitle } = useGameStore()

  useEffect(() => {
    const socket = getSocket()

    socket.on('participant_joined', (data: any) => {
      setParticipants(data.count)
    })

    socket.on('participant_left', (data: any) => {
      setParticipants(data.count)
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

    return () => {
      socket.off('participant_joined')
      socket.off('participant_left')
      socket.off('question_start')
    }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="text-center">
        <div className="text-5xl mb-4">⏳</div>
        <h2 className="text-2xl font-bold text-white mb-2">{gameTitle}</h2>
        <p className="text-[#5a6b8a] mb-8">Ждём начала игры...</p>

        <div className="bg-[#141e33] rounded-2xl px-8 py-6 mb-6 inline-block">
          <p className="text-[#5a6b8a] text-sm mb-1">Код игры</p>
          <p className="text-3xl font-bold tracking-widest text-[#7c6ded]">{gameCode}</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-[#141e33] rounded-xl px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-[#7c6ded] flex items-center justify-center text-sm font-bold">
              {participantName[0]?.toUpperCase()}
            </div>
            <span className="text-white font-medium">{participantName}</span>
            <span className="text-[#5a6b8a] text-sm ml-auto">Ты</span>
          </div>
        </div>

        {participants > 0 && (
          <p className="text-[#5a6b8a] text-sm mt-6">
            Участников в лобби: <span className="text-white font-bold">{participants}</span>
          </p>
        )}

        <div className="mt-8 flex gap-2 justify-center">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-[#7c6ded] animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
