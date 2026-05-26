import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { QuizImportResult } from '../import/dto/import-result.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

interface CreateFromImportBody {
  title: string;
  data: QuizImportResult;
}

@Controller('quizzes')
@UseGuards(JwtAuthGuard)
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  /** GET /api/quizzes — список своих квизов */
  @Get()
  listMyQuizzes(@CurrentUser() user: { id: string }) {
    return this.quizService.listByHost(user.id);
  }

  /** GET /api/quizzes/:id — квиз с вопросами */
  @Get(':id')
  getQuiz(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.quizService.getById(id, user.id);
  }

  /** POST /api/quizzes/:id/sessions — создать игровую сессию */
  @Post(':id/sessions')
  createSession(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.quizService.createSession(id, user.id);
  }

  /** POST /api/quizzes/import — создать квиз из импорта */
  @Post('import')
  createFromImport(
    @Body() body: CreateFromImportBody,
    @CurrentUser() user: { id: string },
  ) {
    return this.quizService.createFromImport(user.id, body.title, body.data);
  }
}
