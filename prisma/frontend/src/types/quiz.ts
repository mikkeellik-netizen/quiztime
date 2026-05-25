export type QuestionType = 'SINGLE' | 'MULTI' | 'TRUE_FALSE';
export type QuizMode = 'MULTIPLAYER' | 'TEAM';
export type QuizStatus = 'DRAFT' | 'READY' | 'ARCHIVE';

// ── Импорт ──────────────────────────────────────────────────────────

export interface ImportOption {
  text: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface ImportQuestion {
  text: string;
  type: QuestionType;
  timerSec: number;
  baseScore: number;
  explanation?: string;
  options: ImportOption[];
}

export interface ImportRound {
  title: string;
  questions: ImportQuestion[];
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
}

export interface QuizImportResult {
  title: string;
  rounds: ImportRound[];
  errors: ImportError[];
  warnings: string[];
}

// ── Модели ──────────────────────────────────────────────────────────

export interface AnswerOption {
  id: string;
  text: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  timerSec: number;
  baseScore: number;
  orderIndex: number;
  explanation?: string;
  options: AnswerOption[];
}

export interface Round {
  id: string;
  title: string;
  orderIndex: number;
  isFinal: boolean;
  questions: Question[];
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  mode: QuizMode;
  status: QuizStatus;
  createdAt: string;
  updatedAt: string;
  rounds: Round[];
}
