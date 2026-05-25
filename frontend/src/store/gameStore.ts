import { create } from 'zustand'

export type GamePhase = 'join' | 'lobby' | 'question' | 'show_answer' | 'leaderboard' | 'finished'

export interface Question {
  id: string
  text: string
  type: 'SINGLE' | 'MULTI' | 'TRUE_FALSE'
  options: { id: string; text: string }[]
  timerSec: number
  expiresAt: string
  startedAt: string
  index: number
  total: number
  roundName: string
}

export interface LeaderboardEntry {
  rank: number
  name: string
  score: number
  correctCount: number
}

interface GameState {
  phase: GamePhase
  gameCode: string
  participantName: string
  reconnectToken: string | null
  currentQuestion: Question | null
  correctAnswerIds: string[]
  myAnswerIds: string[]
  scoreEarned: number
  totalScore: number
  leaderboard: LeaderboardEntry[]
  participants: number
  gameTitle: string

  setPhase: (phase: GamePhase) => void
  setGameCode: (code: string) => void
  setParticipantName: (name: string) => void
  setReconnectToken: (token: string) => void
  setCurrentQuestion: (q: Question) => void
  setCorrectAnswer: (ids: string[], scoreEarned: number) => void
  setMyAnswer: (ids: string[]) => void
  setLeaderboard: (lb: LeaderboardEntry[]) => void
  setParticipants: (n: number) => void
  setTotalScore: (s: number) => void
  setGameTitle: (t: string) => void
  reset: () => void
}

export const useGameStore = create<GameState>((set) => ({
  phase: 'join',
  gameCode: '',
  participantName: '',
  reconnectToken: null,
  currentQuestion: null,
  correctAnswerIds: [],
  myAnswerIds: [],
  scoreEarned: 0,
  totalScore: 0,
  leaderboard: [],
  participants: 0,
  gameTitle: 'QuizTime',

  setPhase: (phase) => set({ phase }),
  setGameCode: (gameCode) => set({ gameCode }),
  setParticipantName: (participantName) => set({ participantName }),
  setReconnectToken: (reconnectToken) => set({ reconnectToken }),
  setCurrentQuestion: (currentQuestion) => set({ currentQuestion, myAnswerIds: [], correctAnswerIds: [], scoreEarned: 0 }),
  setCorrectAnswer: (correctAnswerIds, scoreEarned) => set({ correctAnswerIds, scoreEarned }),
  setMyAnswer: (myAnswerIds) => set({ myAnswerIds }),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  setParticipants: (participants) => set({ participants }),
  setTotalScore: (totalScore) => set({ totalScore }),
  setGameTitle: (gameTitle) => set({ gameTitle }),
  reset: () => set({
    phase: 'join', currentQuestion: null, correctAnswerIds: [],
    myAnswerIds: [], scoreEarned: 0, totalScore: 0, leaderboard: [],
    participants: 0, reconnectToken: null,
  }),
}))
