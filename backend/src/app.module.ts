import { Module } from '@nestjs/common';
import { PrismaModule } from './shared/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { QuizModule } from './modules/quiz/quiz.module';
import { ImportModule } from './modules/import/import.module';

@Module({
  imports: [PrismaModule, AuthModule, QuizModule, ImportModule],
})
export class AppModule {}
