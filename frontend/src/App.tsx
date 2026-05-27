import { useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import { useHostStore } from './store/hostStore'
import { getSocket } from './socket/socket'
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
import AnalyticsPage from './pages/AnalyticsPage'
import QuizBuilderPage from './pages/QuizBuilderPage'
import { getToken } from './api/auth'

export default function App() {
  const phase = useGameStore((s) => s.phase)
  const hostPhase = useHostStore((s) => s.phase)

  // Restore token from localStorage into store on startup (sync, no HTTP)
  useEffect(() => {
    try {
      getToken()
    } catch {
      // localStorage may be unavailable in some webviews — игнорируем
    }
  }, [])

  // Global reconnect handler: если страница была перезагружена во время игры
  useEffect(() => {
    const socket = getSocket()

    socket.on('reconnected', (data: any) => {
      const store = useGameStore.getState()

      store.setParticipantName(data.displayName ?? '')
      store.setGameTitle(data.quizTitle ?? 'QuizTime')

      if (data.score !== undefined) store.setTotalScore(data.score)

      const status: string = data.status ?? ''
      const q = data.currentQuestion

      if (q && (status === 'QUESTION_ACTIVE' || status === 'ACTIVE')) {
        store.setCurrentQuestion({
          id: q.id,
          text: q.text,
          type: q.type,
          options: q.options ?? [],
          timerSec: q.timerSec,
          expiresAt: q.expiresAt ?? '',
          startedAt: q.startedAt ?? '',
          index: q.index ?? 1,
          total: q.total ?? 1,
          roundName: '',
        })
        store.setPhase('question')
      } else if (status === 'WAITING') {
        store.setPhase('lobby')
      } else if (status === 'SHOWING_ANSWER') {
        store.setPhase('show_answer')
      } else if (status === 'SHOWING_LEADERBOARD') {
        store.setPhase('leaderboard')
      } else if (status === 'FINISHED') {
        store.setPhase('finished')
      } else {
        store.setPhase('lobby')
      }
    })

    return () => {
      socket.off('reconnected')
    }
  }, [])

  // Host flow takes priority
  if (hostPhase !== 'idle') {
    return (
      <div className="min-h-screen bg-[#06080f]">
        {hostPhase === 'dashboard' && <HostDashboardPage />}
        {hostPhase === 'lobby' && <HostLobbyPage />}
        {hostPhase === 'game' && <HostGamePage />}
        {hostPhase === 'finished' && <HostFinishedPage />}
        {hostPhase === 'analytics' && <AnalyticsPage />}
        {hostPhase === 'builder' && <QuizBuilderPage />}
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
