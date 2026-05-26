import { useGameStore } from '../store/gameStore'

const CONFETTI_COLORS = ['#7c6ded', '#22d3ee', '#84cc16', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4']

function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
      {Array.from({ length: 70 }).map((_, i) => (
        <div
          key={i}
          className="confetti-particle absolute"
          style={{
            left: `${(i * 1.43) % 100}%`,
            top: 0,
            width: `${6 + (i % 6) * 2}px`,
            height: `${6 + (i % 6) * 2}px`,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            borderRadius: i % 3 === 0 ? '50%' : i % 3 === 1 ? '2px' : '0',
            animationDelay: `${(i % 12) * 0.18}s`,
            animationDuration: `${2.2 + (i % 5) * 0.35}s`,
            transform: `rotate(${i * 37}deg)`,
          }}
        />
      ))}
    </div>
  )
}

export default function FinishedPage() {
  const { leaderboard, totalScore, participantName, reset } = useGameStore()

  const myRank = leaderboard.findIndex((e) => e.name === participantName) + 1
  const topThree = leaderboard.slice(0, 3)

  const handlePlayAgain = () => {
    localStorage.removeItem('reconnect_token')
    localStorage.removeItem('game_code')
    reset()
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-6">
      <Confetti />

      <div className="relative z-20 w-full max-w-sm">
        <div className="text-6xl text-center mb-4">🏆</div>
        <h2 className="text-2xl font-bold text-white text-center mb-1">Игра завершена!</h2>

        {myRank > 0 && (
          <div className="text-center mb-8">
            <p className="text-[#5a6b8a]">Твоё место</p>
            <p className="text-4xl font-bold text-[#7c6ded]">#{myRank}</p>
            <p className="text-white">{totalScore} очков</p>
          </div>
        )}

        <div className="space-y-2 mb-8">
          {topThree.map((entry, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border"
              style={{
                background:
                  i === 0
                    ? 'rgba(251,191,36,0.12)'
                    : i === 1
                    ? 'rgba(148,163,184,0.10)'
                    : 'rgba(251,146,60,0.10)',
                borderColor:
                  i === 0
                    ? 'rgba(251,191,36,0.3)'
                    : i === 1
                    ? 'rgba(148,163,184,0.2)'
                    : 'rgba(251,146,60,0.2)',
              }}
            >
              <span className="text-2xl">{['🥇', '🥈', '🥉'][i]}</span>
              <span className="flex-1 text-white font-medium">{entry.name}</span>
              <span className="text-[#7c6ded] font-bold">{entry.score}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handlePlayAgain}
          className="w-full py-3 rounded-xl bg-[#7c6ded] text-white font-bold transition hover:bg-[#6a5bd4]"
        >
          Сыграть ещё
        </button>
      </div>
    </div>
  )
}
