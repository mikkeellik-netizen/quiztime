import { create } from 'zustand'

export type HostPhase = 'idle' | 'dashboard' | 'lobby' | 'game' | 'finished' | 'analytics' | 'builder'
export type HostGamePhase = 'waiting' | 'question' | 'show_answer' | 'show_leaderboard' | 'finished'

export interface Quiz {
  id: string
  title: string
  status: string
  questionCount: number
  roundCount: number
  updatedAt: string
}

export interface HostQuestion {
  id: string
  text: string
  type: string
  options: { id: string; text: string }[]
  timerSec: number
  expiresAt: string
  startedAt: string
}

export interface LeaderboardEntry {
  rank: number
  name: string
  score: number
  correctCount: number
}

interface HostState {
  phase: HostPhase
  gamePhase: HostGamePhase
  token: string | null
  quizzes: Quiz[]
  gameCode: string
  quizTitle: string
  participantCount: number
  participantList: string[]
  currentQuestion: HostQuestion | null
  questionIndex: number
  totalQuestions: number
  correctOptionIds: string[]
  answerCount: number
  currentExplanation: string | null
  leaderboard: LeaderboardEntry[]

  setPhase: (phase: HostPhase) => void
  setGamePhase: (phase: HostGamePhase) => void
  setToken: (token: string) => void
  setQuizzes: (quizzes: Quiz[]) => void
  setGame: (code: string, title: string) => void
  addParticipant: (displayName: string, count: number) => void
  setCurrentQuestion: (q: HostQuestion, index: number, total: number) => void
  setShowAnswer: (correctIds: string[], answerCount: number, participantCount: number, explanation?: string | null) => void
  setLeaderboard: (lb: LeaderboardEntry[]) => void
  reset: () => void
}

export const useHostStore = create<HostState>((set) => ({
  phase: 'idle',
  gamePhase: 'waiting',
  token: null,
  quizzes: [],
  gameCode: '',
  quizTitle: '',
  participantCount: 0,
  participantList: [],
  currentQuestion: null,
  questionIndex: 0,
  totalQuestions: 0,
  correctOptionIds: [],
  answerCount: 0,
  currentExplanation: null,
  leaderboard: [],

  setPhase: (phase) => set({ phase }),
  setGamePhase: (gamePhase) => set({ gamePhase }),
  setToken: (token) => set({ token }),
  setQuizzes: (quizzes) => set({ quizzes }),
  setGame: (gameCode, quizTitle) => set({ gameCode, quizTitle, participantCount: 0, participantList: [] }),
  addParticipant: (displayName, count) =>
    set((s) => ({ participantList: [...s.participantList, displayName], participantCount: count })),
  setCurrentQuestion: (currentQuestion, questionIndex, totalQuestions) =>
    set({ currentQuestion, questionIndex, totalQuestions, correctOptionIds: [], answerCount: 0, gamePhase: 'question' }),
  setShowAnswer: (correctOptionIds, answerCount, participantCount, explanation = null) =>
    set({ correctOptionIds, answerCount, participantCount, currentExplanation: explanation ?? null, gamePhase: 'show_answer' }),
  setLeaderboard: (leaderboard) => set({ leaderboard, gamePhase: 'show_leaderboard' }),
  reset: () =>
    set({
      phase: 'idle',
      gamePhase: 'waiting',
      gameCode: '',
      quizTitle: '',
      participantCount: 0,
      participantList: [],
      currentQuestion: null,
      correctOptionIds: [],
      answerCount: 0,
      currentExplanation: null,
      leaderboard: [],
    }),
}))
