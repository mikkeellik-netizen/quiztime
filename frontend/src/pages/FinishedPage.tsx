import { useGameStore } from '../store/gameStore'

export default function FinishedPage() {
  const { leaderboard, totalScore, participantName, reset } = useGameStore()

  const myRank = leaderboard.findIndex(e => e.name === participantName) + 1
  const topThree = leaderboard.slice(0, 3)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="text-6xl mb-4">🏆</div>
      <h2 className="text-2xl font-bold text-white mb-1">Игра завершена!</h2>

      {myRank > 0 && (
        <div className="text-center mb-8">
          <p className="text-[#5a6b8a]">Твоё место</p>
          <p className="text-4xl font-bold text-[#7c6ded]">#{myRank}</p>
          <p className="text-white">{totalScore} очков</p>
        </div>
      )}

      <div className="w-full max-w-sm space-y-2 mb-8">
        {topThree.map((entry, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#141e33]"
          >
            <span className="text-2xl">{['🥇', '🥈', '🥉'][i]}</span>
            <span className="flex-1 text-white font-medium">{entry.name}</span>
            <span className="text-[#7c6ded] font-bold">{entry.score}</span>
          </div>
        ))}
      </div>

      <button
        onClick={reset}
        className="w-full max-w-sm py-3 rounded-xl bg-[#7c6ded] text-white font-bold transition hover:bg-[#6a5bd4]"
      >
        Сыграть ещё
      </button>
    </div>
  )
}
