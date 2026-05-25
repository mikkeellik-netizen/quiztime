import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { QuizImportResult } from './dto/import-result.dto';
import { parseExcel } from './parsers/excel.parser';
import { parseTxt } from './parsers/txt.parser';

const TXT_TEMPLATE = `# QuizTime — шаблон для импорта викторины
# Строки начинающиеся с # — комментарии, они игнорируются
# Разделяйте вопросы строкой ---
# Обязательные поля: РАУНД, ВОПРОС, ТИП, ПРАВИЛЬНЫЙ
# Типы: ОДИН, НЕСКОЛЬКО, ДА-НЕТ
# Дефолты: ВРЕМЯ=30, ОЧКИ=200

РАУНД: Разминка
ВОПРОС: Столица Франции?
ТИП: ОДИН
ВАРИАНТ_1: Лондон
ВАРИАНТ_2: Берлин
ВАРИАНТ_3: Париж
ВАРИАНТ_4: Мадрид
ПРАВИЛЬНЫЙ: 3
ВРЕМЯ: 30
ОЧКИ: 200
ОБЪЯСНЕНИЕ: Столица Франции — Париж
---
РАУНД: Разминка
ВОПРОС: Земля вращается вокруг Солнца?
ТИП: ДА-НЕТ
ПРАВИЛЬНЫЙ: ДА
ВРЕМЯ: 20
ОЧКИ: 100
---
РАУНД: Финал
ВОПРОС: Выбери страны Скандинавии:
ТИП: НЕСКОЛЬКО
ВАРИАНТ_1: Норвегия
ВАРИАНТ_2: Швеция
ВАРИАНТ_3: Германия
ВАРИАНТ_4: Дания
ПРАВИЛЬНЫЙ: 1,2,4
ВРЕМЯ: 45
ОЧКИ: 300
---`;

@Injectable()
export class ImportService {
  async generateExcelTemplate(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('QuizTime');

    ws.columns = [
      { key: 'round',       width: 15 },
      { key: 'question',    width: 42 },
      { key: 'type',        width: 13 },
      { key: 'opt1',        width: 20 },
      { key: 'opt2',        width: 20 },
      { key: 'opt3',        width: 20 },
      { key: 'opt4',        width: 20 },
      { key: 'correct',     width: 14 },
      { key: 'timer',       width: 11 },
      { key: 'score',       width: 11 },
      { key: 'explanation', width: 38 },
    ];

    // Строка заголовков
    const headerRow = ws.addRow([
      'Раунд', 'Вопрос', 'Тип', 'Вариант_1', 'Вариант_2',
      'Вариант_3', 'Вариант_4', 'Правильный', 'Время_сек', 'Очки', 'Объяснение',
    ]);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } } };
    });

    // Комментарий к колонке "Правильный"
    ws.getCell('H1').note = 'Для ОДИН: номер варианта (1-4). Для НЕСКОЛЬКО: номера через запятую (1,2,4). Для ДА-НЕТ: ДА или НЕТ';

    // Выпадающий список для колонки Тип (C), строки 2-200
    for (let r = 2; r <= 200; r++) {
      ws.getCell(r, 3).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"ОДИН,НЕСКОЛЬКО,ДА-НЕТ"'],
      };
    }

    // Примеры данных
    ws.addRow(['Разминка', 'Столица Франции?', 'ОДИН', 'Лондон', 'Берлин', 'Париж', 'Мадрид', '3', '30', '200', 'Столица Франции — Париж']);
    ws.addRow(['Разминка', 'Земля вращается вокруг Солнца?', 'ДА-НЕТ', '', '', '', '', 'ДА', '20', '100', '']);
    ws.addRow(['Финал', 'Выбери страны Скандинавии:', 'НЕСКОЛЬКО', 'Норвегия', 'Швеция', 'Германия', 'Дания', '1,2,4', '45', '300', '']);

    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  generateTxtTemplate(): string {
    return TXT_TEMPLATE;
  }

  async parseFile(file: Express.Multer.File): Promise<QuizImportResult> {
    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';

    if (ext === 'xlsx' || ext === 'xls') {
      return parseExcel(file.buffer);
    }
    if (ext === 'txt') {
      return parseTxt(file.buffer.toString('utf-8'));
    }

    return {
      title: '',
      rounds: [],
      errors: [{ row: 0, field: 'file', message: `Неподдерживаемый формат: .${ext}. Используйте .xlsx или .txt` }],
      warnings: [],
    };
  }
}
