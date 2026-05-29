import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { isTextAnswerCorrect } from '../../shared/utils/answer-match';

interface ParticipantState {
  id: string;
  displayName: string;
  socketId: string;
  score: number;
  correctCount: number;
  reconnectToken: string;
  totalAnswerMs: number;
  answerCount: number;
}

interface QuestionData {
  id: string;
  text: string;
  type: string;
  timerSec: number;
  baseScore: number;
  explanation: string | null;
  options: { id: string; text: string; isCorrect: boolean; orderIndex: number }[];
}

export interface SessionSettings {
  showAnswerSec: number;
  showLeaderboardSec: number;
  speedBonus: boolean;
}

interface SessionState {
  dbId: string;
  quizId: string;
  code: string;
  hostUserId: string;
  hostSocketId: string | null;
  status: string;
  participants: Map<string, ParticipantState>; // participantId → state
  participantsByToken: Map<string, string>;     // reconnectToken → participantId
  questions: QuestionData[];
  currentQuestionIndex: number;
  answers: Map<string, Map<string, string[]>>; // questionId → participantId → optionIds (для TEXT — пусто)
  answeredSet: Map<string, Set<string>>;        // questionId → participantId (универсальный учёт ответивших)
  quizTitle: string;
  questionStartedAt: number | null;
  settings: SessionSettings;
}

@Injectable()
export class GameService {
  private sessions = new Map<string, SessionState>();

  constructor(private readonly prisma: PrismaService) {}

  // ─── DB loader ───────────────────────────────────────────────────────────

  private async loadSessionFromDb(code: string): Promise<SessionState | null> {
    const dbSession = await this.prisma.gameSession.findUnique({
      where: { code },
      include: {
        quiz: {
          include: {
            rounds: {
              orderBy: { orderIndex: 'asc' },
              include: {
                questions: {
                  orderBy: { orderIndex: 'asc' },
                  include: { options: { orderBy: { orderIndex: 'asc' } } },
                },
              },
            },
          },
        },
        participants: true,
      },
    });
    if (!dbSession) return null;

    const questions: QuestionData[] = dbSession.quiz.rounds.flatMap((r) =>
      r.questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        timerSec: q.timerSec,
        baseScore: q.baseScore,
        explanation: q.explanation ?? null,
        options: q.options.map((o) => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect,
          orderIndex: o.orderIndex,
        })),
      })),
    );

    const participantsByToken = new Map<string, string>();
    const participants = new Map(
      dbSession.participants.map((p) => {
        participantsByToken.set(p.reconnectToken, p.id);
        return [
          p.id,
          {
            id: p.id,
            displayName: p.displayName,
            socketId: p.socketId ?? '',
            score: p.score,
            correctCount: p.correctCount,
            reconnectToken: p.reconnectToken,
            totalAnswerMs: p.avgAnswerMs * p.correctCount,
            answerCount: p.correctCount,
          } as ParticipantState,
        ];
      }),
    );

    const session: SessionState = {
      dbId: dbSession.id,
      quizId: dbSession.quizId,
      code,
      hostUserId: dbSession.hostUserId,
      hostSocketId: null,
      status: dbSession.status,
      participants,
      participantsByToken,
      questions,
      currentQuestionIndex: -1,
      answers: new Map(),
      answeredSet: new Map(),
      quizTitle: dbSession.quiz.title,
      questionStartedAt: null,
      settings: {
        showAnswerSec: dbSession.showAnswerSec,
        showLeaderboardSec: dbSession.showLeaderboardSec,
        speedBonus: true,
      },
    };
    this.sessions.set(code, session);
    return session;
  }

  // ─── Host ────────────────────────────────────────────────────────────────

  async hostJoin(code: string, userId: string, socketId: string) {
    const session =
      this.sessions.get(code) ?? (await this.loadSessionFromDb(code));
    if (!session) return { success: false, error: 'Игра не найдена' };
    if (session.hostUserId !== userId) return { success: false, error: 'Нет доступа' };

    session.hostSocketId = socketId;

    return {
      success: true,
      sessionId: session.dbId,
      quizTitle: session.quizTitle,
      participants: Array.from(session.participants.values()).map((p) => ({
        displayName: p.displayName,
        score: p.score,
      })),
    };
  }

  // ─── Player ──────────────────────────────────────────────────────────────

  async playerJoin(
    code: string,
    displayName: string,
    socketId: string,
    userId: string | null,
  ) {
    const session =
      this.sessions.get(code) ?? (await this.loadSessionFromDb(code));
    if (!session) return { success: false, error: 'Игра не найдена' };
    if (session.status !== 'WAITING')
      return { success: false, error: 'Игра уже началась' };

    const nameTaken = Array.from(session.participants.values()).some(
      (p) => p.displayName.toLowerCase() === displayName.toLowerCase(),
    );
    if (nameTaken) return { success: false, error: 'Имя уже занято' };

    const reconnectToken = uuidv4();
    const dbParticipant = await this.prisma.gameParticipant.create({
      data: {
        sessionId: session.dbId,
        userId: userId ?? undefined,
        displayName,
        socketId,
        reconnectToken,
      },
    });

    const participant: ParticipantState = {
      id: dbParticipant.id,
      displayName,
      socketId,
      score: 0,
      correctCount: 0,
      reconnectToken,
      totalAnswerMs: 0,
      answerCount: 0,
    };
    session.participants.set(dbParticipant.id, participant);
    session.participantsByToken.set(reconnectToken, dbParticipant.id);

    return {
      success: true,
      participantId: dbParticipant.id,
      reconnectToken,
      gameTitle: session.quizTitle,
      participantCount: session.participants.size,
    };
  }

  // ─── Settings ────────────────────────────────────────────────────────────

  applySettings(code: string, settings: Partial<SessionSettings>) {
    const session = this.sessions.get(code);
    if (!session) return;
    if (settings.showAnswerSec !== undefined)
      session.settings.showAnswerSec = Math.max(0, settings.showAnswerSec);
    if (settings.showLeaderboardSec !== undefined)
      session.settings.showLeaderboardSec = Math.max(0, settings.showLeaderboardSec);
    if (settings.speedBonus !== undefined)
      session.settings.speedBonus = settings.speedBonus;
  }

  getSettings(code: string): SessionSettings {
    return (
      this.sessions.get(code)?.settings ?? {
        showAnswerSec: 5,
        showLeaderboardSec: 5,
        speedBonus: true,
      }
    );
  }

  // ─── Game flow ───────────────────────────────────────────────────────────

  async startGame(code: string) {
    const session = this.sessions.get(code);
    if (!session) return { success: false as const, error: 'Сессия не найдена' };
    if (session.questions.length === 0)
      return { success: false as const, error: 'Нет вопросов' };

    session.status = 'ACTIVE';
    session.currentQuestionIndex = 0;
    session.questionStartedAt = Date.now();

    await this.prisma.gameSession.update({
      where: { id: session.dbId },
      data: { status: 'QUESTION_ACTIVE', startedAt: new Date() },
    });

    const question = session.questions[0];
    return {
      success: true as const,
      question,
      questionIndex: 1,
      totalQuestions: session.questions.length,
      questionStartedAt: session.questionStartedAt,
    };
  }

  async submitAnswer(
    code: string,
    participantId: string,
    payload: { optionIds?: string[]; text?: string },
  ): Promise<{ isCorrect: boolean; scoreEarned: number; speedBonus: number } | null> {
    const session = this.sessions.get(code);
    if (!session || session.currentQuestionIndex < 0) return null;

    const question = session.questions[session.currentQuestionIndex];
    if (!question) return null;

    const optionIds = payload.optionIds ?? [];
    const textAnswer = (payload.text ?? '').trim();

    // Late answer check (1.5s grace period after timer expires)
    const now = Date.now();
    if (session.questionStartedAt) {
      const expiresAt = session.questionStartedAt + question.timerSec * 1000;
      if (now > expiresAt + 1500) return null;
    }

    // Deduplicate (универсально для всех типов)
    const answered =
      session.answeredSet.get(question.id) ?? new Set<string>();
    if (answered.has(participantId)) return null;
    answered.add(participantId);
    session.answeredSet.set(question.id, answered);

    // Сохраняем выбранные опции (для analytics/show_answer); для TEXT — пусто
    const questionAnswers =
      session.answers.get(question.id) ?? new Map<string, string[]>();
    questionAnswers.set(participantId, optionIds);
    session.answers.set(question.id, questionAnswers);

    // Correctness
    let isCorrect = false;
    if (question.type === 'TEXT') {
      const accepted = question.options
        .filter((o) => o.isCorrect)
        .map((o) => o.text);
      isCorrect = isTextAnswerCorrect(textAnswer, accepted);
    } else if (question.type === 'MULTI') {
      const correctIds = new Set(
        question.options.filter((o) => o.isCorrect).map((o) => o.id),
      );
      isCorrect =
        optionIds.length === correctIds.size &&
        optionIds.length > 0 &&
        optionIds.every((id) => correctIds.has(id));
    } else {
      // SINGLE or TRUE_FALSE
      const correctIds = new Set(
        question.options.filter((o) => o.isCorrect).map((o) => o.id),
      );
      isCorrect = optionIds.length === 1 && correctIds.has(optionIds[0]);
    }

    // Scoring
    let baseScoreEarned = 0;
    let speedBonusEarned = 0;
    const timeTakenMs = session.questionStartedAt
      ? now - session.questionStartedAt
      : 0;

    if (isCorrect) {
      baseScoreEarned = question.baseScore;
      if (session.settings.speedBonus && session.questionStartedAt) {
        const totalTime = question.timerSec * 1000;
        const remainingMs = Math.max(0, totalTime - timeTakenMs);
        const remainingRatio = remainingMs / totalTime;
        speedBonusEarned = Math.round(question.baseScore * remainingRatio * 0.5);
      }
    }
    const scoreEarned = baseScoreEarned + speedBonusEarned;

    // Update in-memory state
    const participant = session.participants.get(participantId);
    if (participant) {
      participant.score += scoreEarned;
      if (isCorrect) participant.correctCount += 1;
      participant.totalAnswerMs += timeTakenMs;
      participant.answerCount += 1;
    }

    // Persist
    try {
      await this.prisma.participantAnswer.create({
        data: {
          participantId,
          questionId: question.id,
          isCorrect,
          scoreEarned,
          answeredAtMs: BigInt(now),
          timeTakenMs,
          textAnswer: question.type === 'TEXT' ? textAnswer : null,
          ...(optionIds.length > 0
            ? { selectedOptions: { connect: optionIds.map((id) => ({ id })) } }
            : {}),
        },
      });
      if (participant) {
        const avgAnswerMs =
          participant.answerCount > 0
            ? Math.round(participant.totalAnswerMs / participant.answerCount)
            : 0;
        await this.prisma.gameParticipant.update({
          where: { id: participantId },
          data: {
            score: participant.score,
            correctCount: participant.correctCount,
            avgAnswerMs,
          },
        });
      }
    } catch {
      // ignore duplicate constraint violation
    }

    return { isCorrect, scoreEarned, speedBonus: speedBonusEarned };
  }

  getAnswerResult(code: string) {
    const session = this.sessions.get(code);
    if (!session || session.currentQuestionIndex < 0) return null;

    const question = session.questions[session.currentQuestionIndex];
    if (!question) return null;

    const correctOptionIds = question.options
      .filter((o) => o.isCorrect)
      .map((o) => o.id);
    // Для TEXT отдаём принятые варианты ответа (чтобы показать на экране результата)
    const correctText =
      question.type === 'TEXT'
        ? question.options.filter((o) => o.isCorrect).map((o) => o.text)
        : [];
    const answered = session.answeredSet.get(question.id);
    const answerCount = answered ? answered.size : 0;

    return {
      correctOptionIds,
      correctText,
      answerCount,
      participantCount: session.participants.size,
      explanation: question.explanation,
    };
  }

  getLeaderboard(code: string) {
    const session = this.sessions.get(code);
    if (!session) return [];

    return Array.from(session.participants.values())
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.correctCount - a.correctCount ||
          (a.answerCount > 0
            ? Math.round(a.totalAnswerMs / a.answerCount)
            : 999999) -
            (b.answerCount > 0
              ? Math.round(b.totalAnswerMs / b.answerCount)
              : 999999),
      )
      .slice(0, 50)
      .map((p, i) => ({
        rank: i + 1,
        name: p.displayName,
        score: p.score,
        correctCount: p.correctCount,
        avgAnswerMs:
          p.answerCount > 0
            ? Math.round(p.totalAnswerMs / p.answerCount)
            : 0,
      }));
  }

  nextQuestion(code: string) {
    const session = this.sessions.get(code);
    if (!session) return null;

    session.currentQuestionIndex += 1;
    if (session.currentQuestionIndex >= session.questions.length) {
      return {
        finished: true as const,
        question: null,
        questionIndex: 0,
        totalQuestions: 0,
        questionStartedAt: 0,
      };
    }

    session.questionStartedAt = Date.now();
    const question = session.questions[session.currentQuestionIndex];
    return {
      finished: false as const,
      question,
      questionIndex: session.currentQuestionIndex + 1,
      totalQuestions: session.questions.length,
      questionStartedAt: session.questionStartedAt,
    };
  }

  /** Переход на произвольный вопрос по индексу (для ручного управления ведущим). */
  goToQuestion(code: string, targetIndex: number) {
    const session = this.sessions.get(code);
    if (!session) return null;

    if (targetIndex < 0) targetIndex = 0;
    if (targetIndex >= session.questions.length) {
      return {
        finished: true as const,
        question: null,
        questionIndex: 0,
        totalQuestions: 0,
        questionStartedAt: 0,
      };
    }

    session.currentQuestionIndex = targetIndex;
    session.questionStartedAt = Date.now();
    const question = session.questions[targetIndex];
    return {
      finished: false as const,
      question,
      questionIndex: targetIndex + 1,
      totalQuestions: session.questions.length,
      questionStartedAt: session.questionStartedAt,
    };
  }

  /** Текущий индекс вопроса (0-based) либо -1, если игра ещё не началась. */
  getCurrentIndex(code: string): number {
    return this.sessions.get(code)?.currentQuestionIndex ?? -1;
  }

  async markFinished(code: string) {
    const session = this.sessions.get(code);
    if (!session) return;
    session.status = 'FINISHED';
    await this.prisma.gameSession.update({
      where: { id: session.dbId },
      data: { status: 'FINISHED', finishedAt: new Date() },
    });
  }

  getCurrentQuestionId(code: string): string | null {
    const session = this.sessions.get(code);
    if (!session || session.currentQuestionIndex < 0) return null;
    return session.questions[session.currentQuestionIndex]?.id ?? null;
  }

  // ─── Reconnect ───────────────────────────────────────────────────────────

  reconnectParticipant(reconnectToken: string, newSocketId: string) {
    for (const [code, session] of this.sessions.entries()) {
      const participantId = session.participantsByToken.get(reconnectToken);
      if (!participantId) continue;

      const participant = session.participants.get(participantId);
      if (!participant) continue;

      participant.socketId = newSocketId;

      const currentQuestion =
        session.currentQuestionIndex >= 0
          ? session.questions[session.currentQuestionIndex]
          : null;

      return {
        participantId,
        code,
        displayName: participant.displayName,
        score: participant.score,
        correctCount: participant.correctCount,
        status: session.status,
        quizTitle: session.quizTitle,
        currentQuestion: currentQuestion
          ? {
              id: currentQuestion.id,
              text: currentQuestion.text,
              type: currentQuestion.type,
              timerSec: currentQuestion.timerSec,
              baseScore: currentQuestion.baseScore,
              options:
                currentQuestion.type === 'TEXT'
                  ? []
                  : currentQuestion.options.map((o) => ({
                      id: o.id,
                      text: o.text,
                    })),
              expiresAt: session.questionStartedAt
                ? new Date(
                    session.questionStartedAt + currentQuestion.timerSec * 1000,
                  ).toISOString()
                : null,
              startedAt: session.questionStartedAt
                ? new Date(session.questionStartedAt).toISOString()
                : null,
              index: session.currentQuestionIndex + 1,
              total: session.questions.length,
            }
          : null,
      };
    }
    return null;
  }
}
