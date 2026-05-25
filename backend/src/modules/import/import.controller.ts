import {
  Controller,
  Get,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { ImportService } from './import.service';

@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  /** GET /api/import/template/xlsx */
  @Get('template/xlsx')
  async downloadExcelTemplate(@Res() res: Response) {
    const buffer = await this.importService.generateExcelTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="quiz_template.xlsx"');
    res.send(buffer);
  }

  /** GET /api/import/template/txt */
  @Get('template/txt')
  downloadTxtTemplate(@Res() res: Response) {
    const content = this.importService.generateTxtTemplate();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="quiz_template.txt"');
    res.send(Buffer.from(content, 'utf-8'));
  }

  /** POST /api/import/upload — multipart/form-data, поле "file" */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 МБ
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return {
        title: '',
        rounds: [],
        errors: [{ row: 0, field: 'file', message: 'Файл не загружен' }],
        warnings: [],
      };
    }
    return this.importService.parseFile(file);
  }
}
