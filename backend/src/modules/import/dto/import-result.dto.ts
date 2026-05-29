export type ImportQuestionType = 'SINGLE' | 'MULTI' | 'TRUE_FALSE' | 'TEXT';

export interface ImportOption {
  text: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface ImportQuestion {
  text: string;
  type: ImportQuestionType;
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
