import { Module } from '@nestjs/common';
import { PrismaModule } from './shared/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { QuizModule } from './modules/quiz/quiz.module';
import { ImportModule } from './modules/import/import.module';
import { GameModule } from './modules/game/game.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SpaController } from './spa.controller';

@Module({
  imports: [PrismaModule, AuthModule, QuizModule, ImportModule, GameModule, AnalyticsModule],
  controllers: [SpaController],
})
export class AppModule {}
