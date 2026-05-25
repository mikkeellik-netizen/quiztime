import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { QuizImportResult } from '../import/dto/import-result.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

interface CreateFromImportBody {
  title: string;
  data: QuizImportResult;
}

@Controller('quizzes')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @UseGuards(JwtAuthGuard)
  @Post('import')
  createFromImport(
    @Body() body: CreateFromImportBody,
    @CurrentUser() user: { id: string },
  ) {
    return this.quizService.createFromImport(user.id, body.title, body.data);
  }
}
