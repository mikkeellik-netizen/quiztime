import { useEffect } from 'react'
import { useHostStore } from '../store/hostStore'
import { getSocket } from '../socket/socket'

export default function HostLobbyPage() {
  const store = useHostStore()
  const { gameCode, quizTitle, participantCount, participantList, setPhase } = store

  useEffect(() => {
    const socket = getSocket()

    socket.on('participant_joined', (data: { displayName: string; count: number }) => {
      store.addParticipant(data.displayName, data.count)
    })

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
      setPhase('game')
    })

    return () => {
      socket.off('participant_joined')
      socket.off('question_start')
    }
  }, [])

  const startGame = () => getSocket().emit('start_game')

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => setPhase('dashboard')}
          className="text-white/40 hover:text-white transition text-sm mb-4"
        >
          ← Отмена
        </button>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">{quizTitle}</h1>
          <p className="text-white/40 mt-1 text-sm">Ожидание участников</p>
        </div>

        {/* Game code */}
        <div className="bg-[#141e33] rounded-2xl p-6 text-center mb-5 border border-[#7c6ded]/30">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Код игры</p>
          <div className="text-5xl font-black text-[#7c6ded] tracking-widest font-mono">
            {gameCode}
          </div>
          <p className="text-white/30 text-xs mt-3">
            Участники вводят этот код на экране входа
          </p>
        </div>

        {/* Participants list */}
        <div className="bg-[#141e33] rounded-2xl p-4 mb-6 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/50 text-sm">Участники</span>
            <span className="text-[#7c6ded] font-bold text-xl">{participantCount}</span>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {participantList.map((name, i) => (
              <div key={i} className="flex items-center gap-2.5 py-1">
                <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                <span className="text-white text-sm">{name}</span>
              </div>
            ))}
            {participantList.length === 0 && (
              <p className="text-white/20 text-sm text-center py-6">
                Ждём участников...
              </p>
            )}
          </div>
        </div>

        <button
          onClick={startGame}
          disabled={participantCount === 0}
          className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-400 disabled:bg-green-500/30 disabled:cursor-not-allowed text-white font-bold text-xl transition"
        >
          🚀 Начать игру
        </button>
      </div>
    </div>
  )
}
