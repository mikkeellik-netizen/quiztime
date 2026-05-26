import { useEffect, useState } from 'react'
import { useHostStore } from '../store/hostStore'
import { getSocket } from '../socket/socket'

export default function HostLobbyPage() {
  const store = useHostStore()
  const { gameCode, quizTitle, participantCount, participantList, setPhase } = store

  const [showSettings, setShowSettings] = useState(false)
  const [showAnswerSec, setShowAnswerSec] = useState(5)
  const [showLeaderboardSec, setShowLeaderboardSec] = useState(5)
  const [speedBonus, setSpeedBonus] = useState(true)

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

  const startGame = () => {
    getSocket().emit('start_game', {
      showAnswerSec,
      showLeaderboardSec,
      speedBonus,
    })
  }

  // QR code URL (без сторонних библиотек)
  const joinUrl = `${window.location.origin}?code=${gameCode}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(joinUrl)}&bgcolor=141e33&color=ffffff&margin=2`

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => setPhase('dashboard')}
          className="text-white/40 hover:text-white transition text-sm mb-4"
        >
          ← Отмена
        </button>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">{quizTitle}</h1>
          <p className="text-white/40 mt-1 text-sm">Ожидание участников</p>
        </div>

        {/* Game code + QR */}
        <div className="bg-[#141e33] rounded-2xl p-5 mb-4 border border-[#7c6ded]/30">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-2 text-center">Код игры</p>
          <div className="text-5xl font-black text-[#7c6ded] tracking-widest font-mono text-center mb-4">
            {gameCode}
          </div>
          <div className="flex justify-center">
            <img
              src={qrUrl}
              alt="QR"
              width={140}
              height={140}
              className="rounded-xl"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </div>
          <p className="text-white/30 text-xs text-center mt-3">
            Участники вводят код или сканируют QR
          </p>
        </div>

        {/* Participants */}
        <div className="bg-[#141e33] rounded-2xl p-4 mb-4 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/50 text-sm">Участники</span>
            <span className="text-[#7c6ded] font-bold text-xl">{participantCount}</span>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1.5">
            {participantList.map((name, i) => (
              <div key={i} className="flex items-center gap-2.5 py-1">
                <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                <span className="text-white text-sm">{name}</span>
              </div>
            ))}
            {participantList.length === 0 && (
              <p className="text-white/20 text-sm text-center py-4">Ждём участников...</p>
            )}
          </div>
        </div>

        {/* Settings panel */}
        <div className="mb-4">
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#141e33] border border-white/10 text-white/50 text-sm hover:text-white transition"
          >
            <span>⚙️ Настройки игры</span>
            <span>{showSettings ? '▲' : '▼'}</span>
          </button>

          {showSettings && (
            <div className="bg-[#0d1525] border border-white/10 rounded-xl px-4 py-4 mt-2 space-y-4">
              {/* Show answer duration */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/60">Показ ответа</span>
                  <span className="text-white font-bold">{showAnswerSec} сек</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={15}
                  value={showAnswerSec}
                  onChange={(e) => setShowAnswerSec(Number(e.target.value))}
                  className="w-full accent-[#7c6ded]"
                />
              </div>

              {/* Show leaderboard duration */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/60">Показ рейтинга</span>
                  <span className="text-white font-bold">{showLeaderboardSec} сек</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={15}
                  value={showLeaderboardSec}
                  onChange={(e) => setShowLeaderboardSec(Number(e.target.value))}
                  className="w-full accent-[#7c6ded]"
                />
              </div>

              {/* Speed bonus toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Бонус за скорость</p>
                  <p className="text-white/30 text-xs">+50% от базового за быстрый ответ</p>
                </div>
                <button
                  onClick={() => setSpeedBonus((v) => !v)}
                  className={`relative w-12 h-6 rounded-full transition ${
                    speedBonus ? 'bg-[#7c6ded]' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                      speedBonus ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
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
