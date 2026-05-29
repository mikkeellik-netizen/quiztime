import { create } from 'zustand'

export type GamePhase = 'landing' | 'join' | 'lobby' | 'question' | 'show_answer' | 'leaderboard' | 'finished'

export interface Question {
  id: string
  text: string
  type: 'SINGLE' | 'MULTI' | 'TRUE_FALSE' | 'TEXT'
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
  correctTextAnswers: string[]      // принятые варианты для TEXT-вопросов
  myAnswerIds: string[]
  myAnswerCorrect: boolean | null   // правильность по версии сервера (для TEXT и общего экрана)
  scoreEarned: number
  totalScore: number
  leaderboard: LeaderboardEntry[]
  prevLeaderboard: LeaderboardEntry[]  // для стрелок изменения позиции
  currentExplanation: string | null    // объяснение к ответу
  participants: number
  gameTitle: string

  setPhase: (phase: GamePhase) => void
  setGameCode: (code: string) => void
  setParticipantName: (name: string) => void
  setReconnectToken: (token: string) => void
  setCurrentQuestion: (q: Question) => void
  setCorrectAnswer: (ids: string[], scoreEarned: number, explanation?: string | null, correctText?: string[]) => void
  setMyAnswer: (ids: string[]) => void
  setMyAnswerCorrect: (correct: boolean | null) => void
  setLeaderboard: (lb: LeaderboardEntry[]) => void
  setParticipants: (n: number) => void
  setTotalScore: (s: number) => void
  setGameTitle: (t: string) => void
  reset: () => void
}

export const useGameStore = create<GameState>((set) => ({
  phase: 'landing',
  gameCode: '',
  participantName: '',
  reconnectToken: null,
  currentQuestion: null,
  correctAnswerIds: [],
  correctTextAnswers: [],
  myAnswerIds: [],
  myAnswerCorrect: null,
  scoreEarned: 0,
  totalScore: 0,
  leaderboard: [],
  prevLeaderboard: [],
  currentExplanation: null,
  participants: 0,
  gameTitle: 'QuizTime',

  setPhase: (phase) => set({ phase }),
  setGameCode: (gameCode) => set({ gameCode }),
  setParticipantName: (participantName) => set({ participantName }),
  setReconnectToken: (reconnectToken) => set({ reconnectToken }),
  setCurrentQuestion: (currentQuestion) =>
    set({ currentQuestion, myAnswerIds: [], correctAnswerIds: [], correctTextAnswers: [], myAnswerCorrect: null, scoreEarned: 0, currentExplanation: null }),
  setCorrectAnswer: (correctAnswerIds, scoreEarned, explanation = null, correctText = []) =>
    set({ correctAnswerIds, scoreEarned, currentExplanation: explanation ?? null, correctTextAnswers: correctText ?? [] }),
  setMyAnswer: (myAnswerIds) => set({ myAnswerIds }),
  setMyAnswerCorrect: (myAnswerCorrect) => set({ myAnswerCorrect }),
  setLeaderboard: (leaderboard) =>
    set((state) => ({ prevLeaderboard: state.leaderboard, leaderboard })),
  setParticipants: (participants) => set({ participants }),
  setTotalScore: (totalScore) => set({ totalScore }),
  setGameTitle: (gameTitle) => set({ gameTitle }),
  reset: () =>
    set({
      phase: 'landing',
      currentQuestion: null,
      correctAnswerIds: [],
      myAnswerIds: [],
      scoreEarned: 0,
      totalScore: 0,
      leaderboard: [],
      prevLeaderboard: [],
      currentExplanation: null,
      participants: 0,
      reconnectToken: null,
    }),
}))
