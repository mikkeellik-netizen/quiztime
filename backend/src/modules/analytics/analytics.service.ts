import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Session list ────────────────────────────────────────────────────────

  async listSessions(hostUserId: string) {
    const sessions = await this.prisma.gameSession.findMany({
      where: { hostUserId },
      orderBy: { startedAt: { sort: 'desc', nulls: 'last' } },
      take: 50,
    });

    if (sessions.length === 0) return [];

    // Fetch quiz titles
    const quizIds = [...new Set(sessions.map((s) => s.quizId))];
    const quizzes = await this.prisma.quiz.findMany({
      where: { id: { in: quizIds } },
      select: { id: true, title: true },
    });
    const quizMap = new Map(quizzes.map((q) => [q.id, q.title]));

    // Count participants per session
    const counts = await this.prisma.gameParticipant.groupBy({
      by: ['sessionId'],
      where: { sessionId: { in: sessions.map((s) => s.id) } },
      _count: { sessionId: true },
    });
    const countMap = new Map(counts.map((c) => [c.sessionId, c._count.sessionId]));

    return sessions.map((s) => ({
      id: s.id,
      code: s.code,
      quizTitle: quizMap.get(s.quizId) ?? 'Unknown',
      status: s.status,
      participantCount: countMap.get(s.id) ?? 0,
      startedAt: s.startedAt,
      finishedAt: s.finishedAt,
    }));
  }

  // ─── Session detail ──────────────────────────────────────────────────────

  async getSessionDetail(sessionId: string, hostUserId: string) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: {
          include: {
            rounds: {
              orderBy: { orderIndex: 'asc' },
              include: {
                questions: {
                  orderBy: { orderIndex: 'asc' },
                  include: {
                    options: { orderBy: { orderIndex: 'asc' } },
                    answers: true,
                  },
                },
              },
            },
          },
        },
        participants: {
          orderBy: { score: 'desc' },
        },
      },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.hostUserId !== hostUserId)
      throw new NotFoundException('Session not found');

    // Question stats
    const questionStats = session.quiz.rounds.flatMap((r) =>
      r.questions.map((q) => {
        const total = q.answers.length;
        const correct = q.answers.filter((a) => a.isCorrect).length;
        const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
        const avgMs =
          total > 0
            ? Math.round(
                q.answers.reduce((sum, a) => sum + a.timeTakenMs, 0) / total,
              )
            : 0;
        return {
          id: q.id,
          text: q.text,
          type: q.type,
          totalAnswers: total,
          correctAnswers: correct,
          pctCorrect: pct,
          avgTimeTakenMs: avgMs,
          difficulty: pct >= 70 ? 'easy' : pct >= 40 ? 'medium' : ('hard' as const),
        };
      }),
    );

    const leaderboard = session.participants.map((p, i) => ({
      rank: i + 1,
      displayName: p.displayName,
      score: p.score,
      correctCount: p.correctCount,
      avgAnswerMs: p.avgAnswerMs,
    }));

    return {
      id: session.id,
      code: session.code,
      quizTitle: session.quiz.title,
      status: session.status,
      startedAt: session.startedAt,
      finishedAt: session.finishedAt,
      participantCount: session.participants.length,
      leaderboard,
      questionStats,
    };
  }

  // ─── CSV export ──────────────────────────────────────────────────────────

  async exportCsv(sessionId: string, hostUserId: string): Promise<string> {
    const detail = await this.getSessionDetail(sessionId, hostUserId);

    const header = 'Место,Имя,Очки,Правильных,Среднее время (мс)\n';
    const rows = detail.leaderboard
      .map(
        (p) =>
          `${p.rank},"${p.displayName.replace(/"/g, '""')}",${p.score},${p.correctCount},${p.avgAnswerMs}`,
      )
      .join('\n');

    return header + rows;
  }
}
