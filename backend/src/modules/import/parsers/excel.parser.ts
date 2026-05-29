import * as ExcelJS from 'exceljs';
import {
  ImportOption,
  ImportQuestion,
  ImportQuestionType,
  ImportRound,
  QuizImportResult,
} from '../dto/import-result.dto';

const TYPE_MAP: Record<string, ImportQuestionType> = {
  'один': 'SINGLE', 'single': 'SINGLE', 'одиночный': 'SINGLE',
  'несколько': 'MULTI', 'multi': 'MULTI', 'multiple': 'MULTI', 'мульти': 'MULTI',
  'да-нет': 'TRUE_FALSE', 'да/нет': 'TRUE_FALSE', 'true_false': 'TRUE_FALSE',
  'true/false': 'TRUE_FALSE', 'tf': 'TRUE_FALSE', 'да нет': 'TRUE_FALSE',
  'свой': 'TEXT', 'свой ответ': 'TEXT', 'текст': 'TEXT', 'text': 'TEXT', 'ввод': 'TEXT',
};

function normalizeType(raw: string): ImportQuestionType | null {
  return TYPE_MAP[raw.toLowerCase().trim()] ?? null;
}

function cellStr(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && 'result' in v) return String((v as any).result ?? '').trim();
  return String(v).trim();
}

function buildOptions(
  optTexts: string[],
  correctRaw: string,
  type: ImportQuestionType,
): { options: ImportOption[]; error?: string } {
  if (type === 'TRUE_FALSE') {
    const isDa = ['да', 'yes', 'true', '1'].includes(correctRaw.toLowerCase().trim());
    return {
      options: [
        { text: 'Верно', isCorrect: isDa, orderIndex: 1 },
        { text: 'Неверно', isCorrect: !isDa, orderIndex: 2 },
      ],
    };
  }

  const filled = optTexts.filter((t) => t !== '');

  if (type === 'TEXT') {
    if (filled.length < 1) {
      return { options: [], error: 'Для типа «Свой ответ» нужен минимум 1 вариант' };
    }
    return {
      options: filled.map((text, i) => ({ text, isCorrect: true, orderIndex: i + 1 })),
    };
  }

  if (filled.length < 2) {
    return { options: [], error: 'Нужно минимум 2 варианта ответа' };
  }

  if (type === 'SINGLE') {
    const idx = parseInt(correctRaw, 10);
    if (isNaN(idx) || idx < 1 || idx > filled.length) {
      return {
        options: [],
        error: `Правильный ответ "${correctRaw}" — не число от 1 до ${filled.length}`,
      };
    }
    return {
      options: filled.map((text, i) => ({ text, isCorrect: i + 1 === idx, orderIndex: i + 1 })),
    };
  }

  // MULTI
  const indices = correctRaw.split(',').map((s) => parseInt(s.trim(), 10));
  if (indices.some(isNaN)) {
    return {
      options: [],
      error: `Правильный ответ "${correctRaw}" содержит нечисловые значения`,
    };
  }
  return {
    options: filled.map((text, i) => ({
      text,
      isCorrect: indices.includes(i + 1),
      orderIndex: i + 1,
    })),
  };
}

export async function parseExcel(buffer: Buffer): Promise<QuizImportResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const sheet =
    workbook.getWorksheet('QuizTime') ?? workbook.worksheets[0];

  if (!sheet) {
    return {
      title: '',
      rounds: [],
      errors: [{ row: 0, field: 'file', message: 'Лист "QuizTime" не найден в файле' }],
      warnings: [],
    };
  }

  const roundsMap = new Map<string, ImportRound>();
  const errors: { row: number; field: string; message: string }[] = [];
  const warnings: string[] = [];

  // Название квиза: строка 1, ячейка B1 (рядом с подписью "Название квиза:" в A1).
  // Поддерживаем и старый формат (без строки названия) — тогда title пустой.
  let title = '';
  const a1 = cellStr(sheet.getCell('A1')).toLowerCase();
  let headerRowNum = 1;
  if (a1.includes('назван') || a1.includes('title')) {
    title = cellStr(sheet.getCell('B1'));
    headerRowNum = 2;
  }

  sheet.eachRow((row, rowNum) => {
    if (rowNum <= headerRowNum) return; // пропускаем строку названия и заголовок

    const roundTitle  = cellStr(row.getCell(1));  // A
    const questionTxt = cellStr(row.getCell(2));  // B
    const typeRaw     = cellStr(row.getCell(3));  // C
    const opt1        = cellStr(row.getCell(4));  // D
    const opt2        = cellStr(row.getCell(5));  // E
    const opt3        = cellStr(row.getCell(6));  // F
    const opt4        = cellStr(row.getCell(7));  // G
    const correctRaw  = cellStr(row.getCell(8));  // H
    const timerRaw    = cellStr(row.getCell(9));  // I
    const scoreRaw    = cellStr(row.getCell(10)); // J
    const explanation = cellStr(row.getCell(11)); // K

    // Пропускаем полностью пустые строки
    if (!roundTitle && !questionTxt && !typeRaw) return;

    if (!roundTitle) {
      errors.push({ row: rowNum, field: 'Раунд', message: 'Не указан раунд' });
      return;
    }
    if (!questionTxt) {
      errors.push({ row: rowNum, field: 'Вопрос', message: 'Не указан текст вопроса' });
      return;
    }
    if (!typeRaw) {
      errors.push({ row: rowNum, field: 'Тип', message: 'Не указан тип вопроса' });
      return;
    }

    const type = normalizeType(typeRaw);
    if (!type) {
      errors.push({
        row: rowNum,
        field: 'Тип',
        message: `Неизвестный тип: "${typeRaw}". Допустимые: ОДИН, НЕСКОЛЬКО, ДА-НЕТ, СВОЙ`,
      });
      return;
    }

    // Для «Свой ответ» поле «Правильный» не требуется (ответы — в колонках вариантов)
    if (!correctRaw && type !== 'TEXT') {
      errors.push({ row: rowNum, field: 'Правильный', message: 'Не указан правильный ответ' });
      return;
    }

    const timerSec = timerRaw ? parseInt(timerRaw, 10) : 30;
    const baseScore = scoreRaw ? parseInt(scoreRaw, 10) : 200;

    if (isNaN(timerSec)) {
      errors.push({ row: rowNum, field: 'Время_сек', message: `Не число: "${timerRaw}"` });
      return;
    }
    if (isNaN(baseScore)) {
      errors.push({ row: rowNum, field: 'Очки', message: `Не число: "${scoreRaw}"` });
      return;
    }

    const { options, error: optErr } = buildOptions(
      [opt1, opt2, opt3, opt4],
      correctRaw,
      type,
    );
    if (optErr) {
      errors.push({ row: rowNum, field: 'Правильный', message: optErr });
      return;
    }

    const question: ImportQuestion = {
      text: questionTxt,
      type,
      timerSec,
      baseScore,
      options,
      ...(explanation ? { explanation } : {}),
    };

    if (!roundsMap.has(roundTitle)) {
      roundsMap.set(roundTitle, { title: roundTitle, questions: [] });
    }
    roundsMap.get(roundTitle)!.questions.push(question);
  });

  const rounds = Array.from(roundsMap.values());
  if (rounds.length === 0 && errors.length === 0) {
    warnings.push('Файл не содержит ни одного вопроса');
  }

  return { title, rounds, errors, warnings };
}
