import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

interface ParticipantState {
  id: string;
  displayName: string;
  socketId: string;
  score: number;
  correctCount: number;
  reconnectToken: string;
}

interface QuestionData {
  id: string;
  text: string;
  type: string;
  timerSec: number;
  baseScore: number;
  options: { id: string; text: string; isCorrect: boolean; orderIndex: number }[];
}

interface SessionState {
  dbId: string;
  quizId: string;
  code: string;
  hostUserId: string;
  hostSocketId: string | null;
  status: string;
  participants: Map<string, ParticipantState>;
  questions: QuestionData[];
  currentQuestionIndex: number;
  answers: Map<string, Map<string, string[]>>; // questionId -> participantId -> optionIds
  quizTitle: string;
}

@Injectable()
export class GameService {
  private sessions = new Map<string, SessionState>();

  constructor(private readonly prisma: PrismaService) {}

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
        options: q.options.map((o) => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect,
          orderIndex: o.orderIndex,
        })),
      })),
    );

    const session: SessionState = {
      dbId: dbSession.id,
      quizId: dbSession.quizId,
      code,
      hostUserId: dbSession.hostUserId,
      hostSocketId: null,
      status: dbSession.status,
      participants: new Map(
        dbSession.participants.map((p) => [
          p.id,
          {
            id: p.id,
            displayName: p.displayName,
            socketId: p.socketId ?? '',
            score: p.score,
            correctCount: p.correctCount,
            reconnectToken: p.reconnectToken,
          },
        ]),
      ),
      questions,
      currentQuestionIndex: -1,
      answers: new Map(),
      quizTitle: dbSession.quiz.title,
    };
    this.sessions.set(code, session);
    return session;
  }

  async hostJoin(code: string, userId: string, socketId: string) {
    let session = this.sessions.get(code) ?? (await this.loadSessionFromDb(code));
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

  async playerJoin(
    code: string,
    displayName: string,
    socketId: string,
    userId: string | null,
  ) {
    let session = this.sessions.get(code) ?? (await this.loadSessionFromDb(code));
    if (!session) return { success: false, error: 'Игра не найдена' };
    if (session.status !== 'WAITING') return { success: false, error: 'Игра уже началась' };

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
    };
    session.participants.set(dbParticipant.id, participant);

    return {
      success: true,
      participantId: dbParticipant.id,
      reconnectToken,
      gameTitle: session.quizTitle,
      participantCount: session.participants.size,
    };
  }

  async startGame(code: string) {
    const session = this.sessions.get(code);
    if (!session) return { success: false, error: 'Сессия не найдена' };
    if (session.questions.length === 0) return { success: false, error: 'Нет вопросов' };

    session.status = 'ACTIVE';
    session.currentQuestionIndex = 0;
    await this.prisma.gameSession.update({
      where: { id: session.dbId },
      data: { status: 'QUESTION_ACTIVE', startedAt: new Date() },
    });

    const question = session.questions[0];
    return {
      success: true,
      question,
      questionIndex: 1,
      totalQuestions: session.questions.length,
    };
  }

  async submitAnswer(
    code: string,
    participantId: string,
    optionIds: string[],
  ): Promise<{ isCorrect: boolean; scoreEarned: number } | null> {
    const session = this.sessions.get(code);
    if (!session || session.currentQuestionIndex < 0) return null;

    const question = session.questions[session.currentQuestionIndex];
    if (!question) return null;

    const questionAnswers = session.answers.get(question.id) ?? new Map<string, string[]>();
    if (questionAnswers.has(participantId)) return null; // already answered

    questionAnswers.set(participantId, optionIds);
    session.answers.set(question.id, questionAnswers);

    const correctIds = new Set(question.options.filter((o) => o.isCorrect).map((o) => o.id));
    const isCorrect =
      optionIds.length > 0 &&
      optionIds.length === correctIds.size &&
      optionIds.every((id) => correctIds.has(id));

    const scoreEarned = isCorrect ? question.baseScore : 0;

    const participant = session.participants.get(participantId);
    if (participant) {
      participant.score += scoreEarned;
      if (isCorrect) participant.correctCount += 1;
    }

    try {
      await this.prisma.participantAnswer.create({
        data: {
          participantId,
          questionId: question.id,
          isCorrect,
          scoreEarned,
          answeredAtMs: BigInt(Date.now()),
          timeTakenMs: 0,
          selectedOptions: { connect: optionIds.map((id) => ({ id })) },
        },
      });
      if (participant) {
        await this.prisma.gameParticipant.update({
          where: { id: participantId },
          data: { score: participant.score, correctCount: participant.correctCount },
        });
      }
    } catch {
      // ignore duplicate
    }

    return { isCorrect, scoreEarned };
  }

  getAnswerResult(code: string) {
    const session = this.sessions.get(code);
    if (!session || session.currentQuestionIndex < 0) return null;

    const question = session.questions[session.currentQuestionIndex];
    if (!question) return null;

    const correctOptionIds = question.options.filter((o) => o.isCorrect).map((o) => o.id);
    const questionAnswers = session.answers.get(question.id);
    const answerCount = questionAnswers ? questionAnswers.size : 0;

    return {
      correctOptionIds,
      answerCount,
      participantCount: session.participants.size,
    };
  }

  getLeaderboard(code: string) {
    const session = this.sessions.get(code);
    if (!session) return [];

    return Array.from(session.participants.values())
      .sort((a, b) => b.score - a.score || b.correctCount - a.correctCount)
      .slice(0, 50)
      .map((p, i) => ({
        rank: i + 1,
        name: p.displayName,
        score: p.score,
        correctCount: p.correctCount,
      }));
  }

  nextQuestion(code: string) {
    const session = this.sessions.get(code);
    if (!session) return null;

    session.currentQuestionIndex += 1;
    if (session.currentQuestionIndex >= session.questions.length) {
      return { finished: true as const, question: null, questionIndex: 0, totalQuestions: 0 };
    }

    const question = session.questions[session.currentQuestionIndex];
    return {
      finished: false as const,
      question,
      questionIndex: session.currentQuestionIndex + 1,
      totalQuestions: session.questions.length,
    };
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
}
