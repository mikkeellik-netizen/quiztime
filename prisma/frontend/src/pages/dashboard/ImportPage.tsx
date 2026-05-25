import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizApi } from '../../services/api/quizApi';
import {
  ImportError,
  ImportOption,
  ImportQuestion,
  ImportRound,
  QuestionType,
  QuizImportResult,
} from '../../types/quiz';

// ── Утилиты ────────────────────────────────────────────────────────

const TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE: 'Один ответ',
  MULTI: 'Несколько ответов',
  TRUE_FALSE: 'Да / Нет',
};

function genId() {
  return Math.random().toString(36).slice(2);
}

// Рабочие копии с id для React key
interface WorkOption extends ImportOption { _id: string }
interface WorkQuestion extends Omit<ImportQuestion, 'options'> { _id: string; options: WorkOption[] }
interface WorkRound extends Omit<ImportRound, 'questions'> { _id: string; questions: WorkQuestion[] }

function toWork(rounds: ImportRound[]): WorkRound[] {
  return rounds.map((r) => ({
    ...r,
    _id: genId(),
    questions: r.questions.map((q) => ({
      ...q,
      _id: genId(),
      options: q.options.map((o) => ({ ...o, _id: genId() })),
    })),
  }));
}

function fromWork(rounds: WorkRound[]): ImportRound[] {
  return rounds.map(({ _id: _r, questions, ...r }) => ({
    ...r,
    questions: questions.map(({ _id: _q, options, ...q }) => ({
      ...q,
      options: options.map(({ _id: _o, ...o }) => o),
    })),
  }));
}

// ── Компоненты ─────────────────────────────────────────────────────

function SectionHeader({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
        {n}
      </div>
      <h2 className="font-semibold text-gray-800 text-base">{title}</h2>
    </div>
  );
}

function Btn({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  className?: string;
}) {
  const base = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const variants = {
    primary:   'bg-violet-600 hover:bg-violet-700 text-white',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
    danger:    'bg-red-50 hover:bg-red-100 text-red-600',
    ghost:     'hover:bg-gray-100 text-gray-500',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

// ── Секция 1: Скачать шаблон ────────────────────────────────────────

function TemplateSection() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <SectionHeader n="1" title="Скачать шаблон" />
      <p className="text-sm text-gray-500 mb-4">
        Заполните шаблон и загрузите обратно. Поддерживаются форматы <strong>.xlsx</strong> и <strong>.txt</strong>.
      </p>
      <div className="flex flex-wrap gap-3">
        <Btn variant="secondary" onClick={() => quizApi.downloadTemplate('xlsx')}>
          📊 Скачать Excel-шаблон (.xlsx)
        </Btn>
        <Btn variant="secondary" onClick={() => quizApi.downloadTemplate('txt')}>
          📄 Скачать текстовый шаблон (.txt)
        </Btn>
      </div>
    </div>
  );
}

// ── Секция 2: Загрузить файл ────────────────────────────────────────

function UploadSection({
  onResult,
}: {
  onResult: (result: QuizImportResult, filename: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError('');
      setLoading(true);
      try {
        const result = await quizApi.uploadFile(file);
        onResult(result, file.name.replace(/\.[^.]+$/, ''));
      } catch (e: any) {
        setError(e?.response?.data?.message ?? e?.message ?? 'Ошибка загрузки файла');
      } finally {
        setLoading(false);
      }
    },
    [onResult],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <SectionHeader n="2" title="Загрузить файл" />

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors select-none ${
          dragging
            ? 'border-violet-400 bg-violet-50'
            : 'border-gray-300 hover:border-violet-300 hover:bg-gray-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.txt"
          className="hidden"
          onChange={onInputChange}
        />
        {loading ? (
          <div className="text-violet-600 font-medium animate-pulse">Парсим файл…</div>
        ) : (
          <>
            <div className="text-4xl mb-3">📂</div>
            <div className="font-semibold text-gray-700">Перетащите файл сюда или нажмите</div>
            <div className="text-sm text-gray-400 mt-1">Поддерживаются .xlsx, .xls, .txt · максимум 10 МБ</div>
          </>
        )}
      </div>

      {error && (
        <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}

// ── Секция 3: Предпросмотр и редактирование ─────────────────────────

function OptionEditor({
  option,
  index,
  type,
  onChange,
  onRemove,
  canRemove,
}: {
  option: WorkOption;
  index: number;
  type: QuestionType;
  onChange: (o: WorkOption) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const letter = ['A', 'B', 'C', 'D'][index] ?? String(index + 1);

  const toggleCorrect = () => {
    if (type === 'SINGLE' || type === 'TRUE_FALSE') {
      // переключение обрабатывается на уровне вопроса
    }
    onChange({ ...option, isCorrect: !option.isCorrect });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold bg-gray-100 text-gray-500 flex-shrink-0">
        {letter}
      </span>
      <input
        type="text"
        value={option.text}
        onChange={(e) => onChange({ ...option, text: e.target.value })}
        placeholder={`Вариант ${letter}`}
        className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-violet-400"
        disabled={type === 'TRUE_FALSE'}
      />
      <input
        type={type === 'MULTI' ? 'checkbox' : 'radio'}
        checked={option.isCorrect}
        onChange={toggleCorrect}
        title="Правильный ответ"
        className={`w-4 h-4 accent-green-500 flex-shrink-0 ${type === 'SINGLE' ? 'cursor-pointer' : ''}`}
      />
      {canRemove && type !== 'TRUE_FALSE' && (
        <button onClick={onRemove} className="text-gray-300 hover:text-red-400 text-xs flex-shrink-0">
          ✕
        </button>
      )}
    </div>
  );
}

function QuestionEditor({
  question,
  qIndex,
  onChange,
  onRemove,
}: {
  question: WorkQuestion;
  qIndex: number;
  onChange: (q: WorkQuestion) => void;
  onRemove: () => void;
}) {
  const updateOption = (i: number, opt: WorkOption) => {
    let opts = [...question.options];

    // Для SINGLE — снимаем правильный у остальных при установке
    if (question.type === 'SINGLE' && opt.isCorrect) {
      opts = opts.map((o, idx) => ({ ...o, isCorrect: idx === i }));
    } else {
      opts[i] = opt;
    }

    onChange({ ...question, options: opts });
  };

  const removeOption = (i: number) => {
    onChange({
      ...question,
      options: question.options
        .filter((_, idx) => idx !== i)
        .map((o, idx) => ({ ...o, orderIndex: idx + 1 })),
    });
  };

  const addOption = () => {
    const newOpt: WorkOption = {
      _id: genId(),
      text: '',
      isCorrect: false,
      orderIndex: question.options.length + 1,
    };
    onChange({ ...question, options: [...question.options, newOpt] });
  };

  const changeType = (type: QuestionType) => {
    let options = question.options;
    if (type === 'TRUE_FALSE') {
      options = [
        { _id: genId(), text: 'Верно', isCorrect: true, orderIndex: 1 },
        { _id: genId(), text: 'Неверно', isCorrect: false, orderIndex: 2 },
      ];
    } else if (question.type === 'TRUE_FALSE') {
      options = [
        { _id: genId(), text: '', isCorrect: true, orderIndex: 1 },
        { _id: genId(), text: '', isCorrect: false, orderIndex: 2 },
      ];
    }
    onChange({ ...question, type, options });
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3">
      <div className="flex items-start gap-2 mb-3">
        <span className="text-xs font-bold text-gray-400 pt-1 flex-shrink-0">#{qIndex + 1}</span>
        <textarea
          value={question.text}
          onChange={(e) => onChange({ ...question, text: e.target.value })}
          rows={2}
          placeholder="Текст вопроса…"
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-violet-400 resize-none"
        />
        <button
          onClick={onRemove}
          className="text-gray-300 hover:text-red-400 text-lg flex-shrink-0 leading-none pt-1"
          title="Удалить вопрос"
        >
          ✕
        </button>
      </div>

      {/* Настройки вопроса */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <select
          value={question.type}
          onChange={(e) => changeType(e.target.value as QuestionType)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none"
        >
          {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>

        <label className="flex items-center gap-1 text-xs text-gray-500">
          ⏱
          <input
            type="number"
            value={question.timerSec}
            onChange={(e) => onChange({ ...question, timerSec: Number(e.target.value) })}
            className="w-14 border border-gray-200 rounded-lg px-1.5 py-0.5 text-center focus:outline-none"
            min={5}
            max={300}
          />
          сек
        </label>

        <label className="flex items-center gap-1 text-xs text-gray-500">
          ⭐
          <input
            type="number"
            value={question.baseScore}
            onChange={(e) => onChange({ ...question, baseScore: Number(e.target.value) })}
            className="w-16 border border-gray-200 rounded-lg px-1.5 py-0.5 text-center focus:outline-none"
            min={0}
          />
          очков
        </label>
      </div>

      {/* Варианты ответов */}
      <div className="space-y-2 mb-2">
        {question.options.map((opt, i) => (
          <OptionEditor
            key={opt._id}
            option={opt}
            index={i}
            type={question.type}
            onChange={(o) => updateOption(i, o)}
            onRemove={() => removeOption(i)}
            canRemove={question.options.length > 2}
          />
        ))}
      </div>

      {question.type !== 'TRUE_FALSE' && question.options.length < 6 && (
        <button
          onClick={addOption}
          className="text-xs text-violet-500 hover:text-violet-700 font-medium mb-2"
        >
          + Добавить вариант
        </button>
      )}

      {/* Объяснение */}
      <input
        type="text"
        value={question.explanation ?? ''}
        onChange={(e) =>
          onChange({ ...question, explanation: e.target.value || undefined })
        }
        placeholder="Объяснение ответа (необязательно)…"
        className="w-full text-xs border border-gray-100 rounded-lg px-2 py-1 focus:outline-none focus:border-violet-300 text-gray-500"
      />
    </div>
  );
}

function RoundEditor({
  round,
  roundIndex,
  onChange,
  onRemove,
}: {
  round: WorkRound;
  roundIndex: number;
  onChange: (r: WorkRound) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(true);

  const updateQuestion = (i: number, q: WorkQuestion) => {
    const questions = [...round.questions];
    questions[i] = q;
    onChange({ ...round, questions });
  };

  const removeQuestion = (i: number) => {
    onChange({ ...round, questions: round.questions.filter((_, idx) => idx !== i) });
  };

  const addQuestion = () => {
    const newQ: WorkQuestion = {
      _id: genId(),
      text: '',
      type: 'SINGLE',
      timerSec: 30,
      baseScore: 200,
      options: [
        { _id: genId(), text: '', isCorrect: true,  orderIndex: 1 },
        { _id: genId(), text: '', isCorrect: false, orderIndex: 2 },
      ],
    };
    onChange({ ...round, questions: [...round.questions, newQ] });
  };

  return (
    <div className="border border-gray-200 rounded-xl mb-4 overflow-hidden">
      {/* Заголовок раунда */}
      <div className="bg-gray-50 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-gray-400 w-5 flex-shrink-0"
        >
          {open ? '▾' : '▸'}
        </button>
        <input
          type="text"
          value={round.title}
          onChange={(e) => onChange({ ...round, title: e.target.value })}
          className="flex-1 font-semibold text-sm bg-transparent border-none focus:outline-none text-gray-800"
          placeholder="Название раунда…"
        />
        <span className="text-xs text-gray-400">{round.questions.length} вопр.</span>
        <button
          onClick={onRemove}
          className="text-gray-300 hover:text-red-400 text-sm ml-2"
          title="Удалить раунд"
        >
          ✕
        </button>
      </div>

      {/* Вопросы раунда */}
      {open && (
        <div className="p-4">
          {round.questions.map((q, i) => (
            <QuestionEditor
              key={q._id}
              question={q}
              qIndex={i}
              onChange={(updated) => updateQuestion(i, updated)}
              onRemove={() => removeQuestion(i)}
            />
          ))}
          <button
            onClick={addQuestion}
            className="w-full text-sm text-violet-600 hover:text-violet-800 font-medium border border-dashed border-violet-300 rounded-xl py-2 hover:bg-violet-50 transition-colors"
          >
            + Добавить вопрос
          </button>
        </div>
      )}
    </div>
  );
}

function PreviewSection({
  filename,
  errors,
  warnings,
  rounds,
  onRoundsChange,
  onSave,
  saving,
}: {
  filename: string;
  errors: ImportError[];
  warnings: string[];
  rounds: WorkRound[];
  onRoundsChange: (r: WorkRound[]) => void;
  onSave: (title: string) => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(filename);

  const updateRound = (i: number, r: WorkRound) => {
    const next = [...rounds];
    next[i] = r;
    onRoundsChange(next);
  };

  const removeRound = (i: number) => {
    onRoundsChange(rounds.filter((_, idx) => idx !== i));
  };

  const addRound = () => {
    onRoundsChange([
      ...rounds,
      {
        _id: genId(),
        title: `Раунд ${rounds.length + 1}`,
        questions: [],
      },
    ]);
  };

  const totalQuestions = rounds.reduce((s, r) => s + r.questions.length, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <SectionHeader n="3" title="Предпросмотр и редактирование" />

      {/* Ошибки */}
      {errors.length > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="font-semibold text-red-700 text-sm mb-2">
            ❌ Ошибок при парсинге: {errors.length}
          </div>
          <ul className="space-y-1">
            {errors.map((e, i) => (
              <li key={i} className="text-xs text-red-600">
                Строка {e.row} · <strong>{e.field}</strong>: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Предупреждения */}
      {warnings.length > 0 && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="font-semibold text-yellow-700 text-sm mb-1">⚠️ Предупреждения</div>
          {warnings.map((w, i) => (
            <div key={i} className="text-xs text-yellow-700">{w}</div>
          ))}
        </div>
      )}

      {/* Название викторины */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Название викторины
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 font-semibold text-gray-800 focus:outline-none focus:border-violet-400"
          placeholder="Введите название…"
        />
      </div>

      {/* Статистика */}
      <div className="flex gap-4 mb-5 text-sm text-gray-500">
        <span>📁 <strong className="text-gray-800">{rounds.length}</strong> раундов</span>
        <span>❓ <strong className="text-gray-800">{totalQuestions}</strong> вопросов</span>
      </div>

      {/* Раунды */}
      {rounds.map((r, i) => (
        <RoundEditor
          key={r._id}
          round={r}
          roundIndex={i}
          onChange={(updated) => updateRound(i, updated)}
          onRemove={() => removeRound(i)}
        />
      ))}

      <button
        onClick={addRound}
        className="w-full text-sm text-gray-500 hover:text-gray-700 font-medium border border-dashed border-gray-300 rounded-xl py-2.5 hover:bg-gray-50 transition-colors mb-6"
      >
        + Добавить раунд
      </button>

      {/* Кнопка создания */}
      <div className="flex justify-end">
        <Btn
          variant="primary"
          onClick={() => onSave(title)}
          disabled={saving || !title.trim() || rounds.length === 0}
          className="px-6 py-2.5 text-base"
        >
          {saving ? 'Создаём…' : '🚀 Создать викторину'}
        </Btn>
      </div>
    </div>
  );
}

// ── Главный компонент ───────────────────────────────────────────────

export default function ImportPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [filename, setFilename] = useState('');
  const [parseErrors, setParseErrors] = useState<ImportError[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [rounds, setRounds] = useState<WorkRound[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleResult = useCallback((result: QuizImportResult, name: string) => {
    setFilename(name);
    setParseErrors(result.errors);
    setParseWarnings(result.warnings);
    setRounds(toWork(result.rounds));
    setStep('preview');
  }, []);

  const handleSave = async (title: string) => {
    setSaveError('');
    setSaving(true);
    try {
      const data: QuizImportResult = {
        title,
        rounds: fromWork(rounds),
        errors: [],
        warnings: [],
      };
      // hostUserId временно передаётся в теле — в полной реализации берётся из JWT
      await quizApi.createFromImport(title, data);
      navigate('/dashboard');
    } catch (e: any) {
      setSaveError(e?.response?.data?.error ?? e?.message ?? 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Навигация */}
        <div className="mb-6">
          <button
            onClick={() => (step === 'preview' ? setStep('upload') : navigate('/dashboard'))}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            ← {step === 'preview' ? 'Загрузить другой файл' : 'Назад к викторинам'}
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">📥 Импорт викторины</h1>

        <TemplateSection />

        {step === 'upload' && <UploadSection onResult={handleResult} />}

        {step === 'preview' && (
          <>
            {saveError && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                ❌ {saveError}
              </div>
            )}
            <PreviewSection
              filename={filename}
              errors={parseErrors}
              warnings={parseWarnings}
              rounds={rounds}
              onRoundsChange={setRounds}
              onSave={handleSave}
              saving={saving}
            />
          </>
        )}
      </div>
    </div>
  );
}
