import { useGameStore } from './store/gameStore'
import { useHostStore } from './store/hostStore'
import LandingPage from './pages/LandingPage'
import JoinPage from './pages/JoinPage'
import LobbyPage from './pages/LobbyPage'
import QuestionPage from './pages/QuestionPage'
import ShowAnswerPage from './pages/ShowAnswerPage'
import LeaderboardPage from './pages/LeaderboardPage'
import FinishedPage from './pages/FinishedPage'
import HostDashboardPage from './pages/HostDashboardPage'
import HostLobbyPage from './pages/HostLobbyPage'
import HostGamePage from './pages/HostGamePage'
import HostFinishedPage from './pages/HostFinishedPage'

export default function App() {
  const phase = useGameStore((s) => s.phase)
  const hostPhase = useHostStore((s) => s.phase)

  // Host flow takes priority
  if (hostPhase !== 'idle') {
    return (
      <div className="min-h-screen bg-[#06080f]">
        {hostPhase === 'dashboard' && <HostDashboardPage />}
        {hostPhase === 'lobby' && <HostLobbyPage />}
        {hostPhase === 'game' && <HostGamePage />}
        {hostPhase === 'finished' && <HostFinishedPage />}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#06080f]">
      {phase === 'landing' && <LandingPage />}
      {phase === 'join' && <JoinPage />}
      {phase === 'lobby' && <LobbyPage />}
      {phase === 'question' && <QuestionPage />}
      {phase === 'show_answer' && <ShowAnswerPage />}
      {phase === 'leaderboard' && <LeaderboardPage />}
      {phase === 'finished' && <FinishedPage />}
    </div>
  )
}
