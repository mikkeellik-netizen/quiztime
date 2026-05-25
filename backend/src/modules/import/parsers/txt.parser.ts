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
};

function normalizeType(raw: string): ImportQuestionType | null {
  return TYPE_MAP[raw.toLowerCase().trim()] ?? null;
}

function buildOptions(
  variants: Map<number, string>,
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

  const filled = [1, 2, 3, 4]
    .map((i) => variants.get(i))
    .filter((v): v is string => !!v);

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
      options: filled.map((text, i) => ({
        text,
        isCorrect: i + 1 === idx,
        orderIndex: i + 1,
      })),
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

export function parseTxt(content: string): QuizImportResult {
  const roundsMap = new Map<string, ImportRound>();
  const errors: { row: number; field: string; message: string }[] = [];
  const warnings: string[] = [];
  let blockIndex = 0;

  // Разбиваем на блоки по "---"
  const blocks = content.split(/^---\s*$/m);

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l !== '' && !l.startsWith('#'));

    if (lines.length === 0) continue;

    blockIndex++;
    const kv = new Map<string, string>();

    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim().toUpperCase();
      const value = line.slice(colonIdx + 1).trim();
      kv.set(key, value);
    }

    const roundTitle  = kv.get('РАУНД')      ?? kv.get('ROUND')       ?? '';
    const questionTxt = kv.get('ВОПРОС')     ?? kv.get('QUESTION')    ?? '';
    const typeRaw     = kv.get('ТИП')        ?? kv.get('TYPE')        ?? '';
    const correctRaw  = kv.get('ПРАВИЛЬНЫЙ') ?? kv.get('CORRECT')     ?? '';
    const timerRaw    = kv.get('ВРЕМЯ')      ?? kv.get('TIMER')       ?? '';
    const scoreRaw    = kv.get('ОЧКИ')       ?? kv.get('SCORE')       ?? '';
    const explanation = kv.get('ОБЪЯСНЕНИЕ') ?? kv.get('EXPLANATION') ?? '';

    if (!roundTitle) {
      errors.push({ row: blockIndex, field: 'РАУНД', message: 'Не указан раунд' });
      continue;
    }
    if (!questionTxt) {
      errors.push({ row: blockIndex, field: 'ВОПРОС', message: 'Не указан текст вопроса' });
      continue;
    }
    if (!typeRaw) {
      errors.push({ row: blockIndex, field: 'ТИП', message: 'Не указан тип вопроса' });
      continue;
    }

    const type = normalizeType(typeRaw);
    if (!type) {
      errors.push({
        row: blockIndex,
        field: 'ТИП',
        message: `Неизвестный тип: "${typeRaw}". Допустимые: ОДИН, НЕСКОЛЬКО, ДА-НЕТ`,
      });
      continue;
    }

    if (!correctRaw) {
      errors.push({ row: blockIndex, field: 'ПРАВИЛЬНЫЙ', message: 'Не указан правильный ответ' });
      continue;
    }

    const timerSec = timerRaw ? parseInt(timerRaw, 10) : 30;
    const baseScore = scoreRaw ? parseInt(scoreRaw, 10) : 200;

    const variants = new Map<number, string>();
    for (let i = 1; i <= 4; i++) {
      const v =
        kv.get(`ВАРИАНТ_${i}`) ??
        kv.get(`VARIANT_${i}`) ??
        kv.get(`OPTION_${i}`) ??
        '';
      if (v) variants.set(i, v);
    }

    const { options, error: optErr } = buildOptions(variants, correctRaw, type);
    if (optErr) {
      errors.push({ row: blockIndex, field: 'ПРАВИЛЬНЫЙ', message: optErr });
      continue;
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
  }

  const rounds = Array.from(roundsMap.values());
  if (rounds.length === 0 && errors.length === 0) {
    warnings.push('Файл не содержит ни одного вопроса');
  }

  return { title: '', rounds, errors, warnings };
}
