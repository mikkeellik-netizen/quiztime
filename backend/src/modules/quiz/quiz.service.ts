import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { QuizImportResult } from '../import/dto/import-result.dto';

@Injectable()
export class QuizService {
  constructor(private readonly prisma: PrismaService) {}

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
