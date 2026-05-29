/**
 * "Умное" распознавание текстовых ответов.
 * Игнорирует регистр, ё/е, пунктуацию, лишние пробелы, склонения и мелкие опечатки.
 */

/** Нормализация: нижний регистр, ё→е, убрать пунктуацию, схлопнуть пробелы. */
export function normalizeAnswer(input: string): string {
  return (input ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9\s]/gi, ' ') // оставляем буквы/цифры/пробелы
    .replace(/\s+/g, ' ')
    .trim();
}

/** Расстояние Левенштейна (число правок). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

/**
 * Сравнение одного нормализованного ответа с одним нормализованным эталоном.
 * Возвращает true, если считаем их одинаковыми.
 */
function matchesOne(input: string, target: string): boolean {
  if (!input || !target) return false;
  if (input === target) return true;

  const minLen = Math.min(input.length, target.length);
  const maxLen = Math.max(input.length, target.length);

  // Склонения: один — префикс другого, общий корень длинный, хвост короткий.
  // Напр. "город" vs "города"/"городе" — корень "город", разница 1 символ.
  if (minLen >= 4 && (input.startsWith(target) || target.startsWith(input))) {
    if (maxLen - minLen <= 3) return true;
  }

  // Мелкие опечатки: расстояние Левенштейна в пределах ~20% длины.
  const dist = levenshtein(input, target);
  if (maxLen >= 5 && dist <= Math.max(1, Math.floor(maxLen * 0.2))) return true;
  if (maxLen >= 3 && maxLen < 5 && dist <= 1) return true;

  return false;
}

/**
 * Проверяет, совпадает ли ответ участника хотя бы с одним из принятых вариантов.
 * @param input  — то, что ввёл участник
 * @param accepted — список допустимых вариантов ответа (как ввёл создатель)
 */
export function isTextAnswerCorrect(input: string, accepted: string[]): boolean {
  const ni = normalizeAnswer(input);
  if (!ni) return false;
  return accepted.some((variant) => matchesOne(ni, normalizeAnswer(variant)));
}
