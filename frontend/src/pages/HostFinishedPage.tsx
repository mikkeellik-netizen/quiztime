import { useHostStore } from '../store/hostStore'
import { useGameStore } from '../store/gameStore'
import { disconnectSocket } from '../socket/socket'

export default function HostFinishedPage() {
  const { leaderboard, quizTitle, reset: resetHost } = useHostStore()
  const setGamePhase = useGameStore((s) => s.setPhase)

  const goHome = () => {
    disconnectSocket()
    resetHost()
    setGamePhase('landing')
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="text-3xl font-bold text-white">Игра завершена!</h1>
          <p className="text-white/40 mt-2">{quizTitle}</p>
        </div>

        <div className="space-y-2 mb-8">
          {leaderboard.slice(0, 10).map((entry, i) => (
            <div
              key={entry.rank}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
                i === 0
                  ? 'bg-yellow-500/15 border-yellow-500/30'
                  : i === 1
                  ? 'bg-gray-400/10 border-gray-400/20'
                  : i === 2
                  ? 'bg-orange-500/15 border-orange-500/30'
                  : 'bg-[#141e33] border-white/5'
              }`}
            >
              <span className="text-xl w-8 text-center">{medals[i] ?? entry.rank}</span>
              <span className="flex-1 text-white font-medium truncate">{entry.name}</span>
              <div className="text-right">
                <div className="text-[#7c6ded] font-bold">{entry.score}</div>
                <div className="text-white/30 text-xs">{entry.correctCount} верных</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={goHome}
          className="w-full py-4 rounded-2xl bg-[#7c6ded] hover:bg-[#6a5bd4] text-white font-bold text-lg transition"
        >
          На главную
        </button>
      </div>
    </div>
  )
}
