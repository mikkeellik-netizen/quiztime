import apiClient from './apiClient';
import { Quiz, QuizImportResult } from '../../types/quiz';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const quizApi = {
  /** Скачать шаблон (xlsx или txt) напрямую через тег <a>. */
  downloadTemplate(format: 'xlsx' | 'txt'): void {
    const a = document.createElement('a');
    a.href = `${BASE}/api/import/template/${format}`;
    a.download = format === 'xlsx' ? 'quiz_template.xlsx' : 'quiz_template.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  /** Загрузить файл на парсинг, вернуть QuizImportResult. */
  async uploadFile(file: File): Promise<QuizImportResult> {
    const form = new FormData();
    form.append('file', file);
    const res = await apiClient.post<QuizImportResult>('/api/import/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  /** Создать квиз из разобранного import-результата. */
  async createFromImport(title: string, data: QuizImportResult): Promise<Quiz> {
    const res = await apiClient.post<Quiz>('/api/quizzes/import', { title, data });
    return res.data;
  },
};
