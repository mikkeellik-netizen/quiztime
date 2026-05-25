import { useGameStore } from './store/gameStore'
import JoinPage from './pages/JoinPage'
import LobbyPage from './pages/LobbyPage'
import QuestionPage from './pages/QuestionPage'
import ShowAnswerPage from './pages/ShowAnswerPage'
import LeaderboardPage from './pages/LeaderboardPage'
import FinishedPage from './pages/FinishedPage'

export default function App() {
  const phase = useGameStore(s => s.phase)

  return (
    <div className="min-h-screen bg-[#06080f]">
      {phase === 'join' && <JoinPage />}
      {phase === 'lobby' && <LobbyPage />}
      {phase === 'question' && <QuestionPage />}
      {phase === 'show_answer' && <ShowAnswerPage />}
      {phase === 'leaderboard' && <LeaderboardPage />}
      {phase === 'finished' && <FinishedPage />}
    </div>
  )
}
