import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { QuizImportResult } from '../import/dto/import-result.dto';

@Injectable()
export class QuizService {
  constructor(private readonly prisma: PrismaService) {}

  async listByHost(hostUserId: string) {
    const quizzes = await this.prisma.quiz.findMany({
      where: { hostUserId },
      include: {
        rounds: {
          include: { _count: { select: { questions: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      status: q.status,
      updatedAt: q.updatedAt,
      roundCount: q.rounds.length,
      questionCount: q.rounds.reduce((sum, r) => sum + r._count.questions, 0),
    }));
  }

  async getById(id: string, hostUserId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
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
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    if (quiz.hostUserId !== hostUserId) throw new ForbiddenException('Not your quiz');
    return quiz;
  }

  async createSession(quizId: string, hostUserId: string) {
    await this.getById(quizId, hostUserId);

    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    const code = this.generateCode();

    const session = await this.prisma.gameSession.create({
      data: {
        quizId,
        hostUserId,
        code,
        status: 'WAITING',
        mode: quiz!.mode,
      },
    });

    return { sessionId: session.id, code: session.code, quizTitle: quiz!.title };
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)],
    ).join('');
  }

  /** Создаёт полный квиз из результата импорта в одной транзакции. */
  async createFromImport(
    hostUserId: string,
    title: string,
    data: QuizImportResult,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.create({
        data: {
          hostUserId,
          title,
          status: 'DRAFT',
        },
      });

      for (let ri = 0; ri < data.rounds.length; ri++) {
        const ir = data.rounds[ri];

        const round = await tx.round.create({
          data: {
            quizId: quiz.id,
            title: ir.title,
            orderIndex: ri + 1,
            isFinal: ri === data.rounds.length - 1,
          },
        });

        for (let qi = 0; qi < ir.questions.length; qi++) {
          const iq = ir.questions[qi];

          const question = await tx.question.create({
            data: {
              roundId: round.id,
              type: iq.type,
              text: iq.text,
              timerSec: iq.timerSec,
              baseScore: iq.baseScore,
              orderIndex: qi + 1,
              explanation: iq.explanation ?? null,
            },
          });

          for (const opt of iq.options) {
            await tx.answerOption.create({
              data: {
                questionId: question.id,
                text: opt.text,
                isCorrect: opt.isCorrect,
                orderIndex: opt.orderIndex,
              },
            });
          }
        }
      }

      return tx.quiz.findUnique({
        where: { id: quiz.id },
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
      });
    });
  }
}
