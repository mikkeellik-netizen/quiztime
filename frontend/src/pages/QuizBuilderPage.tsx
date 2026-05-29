import { useState, useEffect, useRef } from 'react'
import { useHostStore } from '../store/hostStore'
import { apiClient, asArray, getErrorMessage } from '../api/client'
import { getToken } from '../api/auth'

const DRAFT_KEY = 'quiz_draft'

type QType = 'SINGLE' | 'MULTI' | 'TRUE_FALSE' | 'TEXT'

const uid = () => Math.random().toString(36).slice(2, 9)

interface BuildOpt {
  id: string
  text: string
  isCorrect: boolean
}

interface BuildQ {
  id: string
  type: QType
  text: string
  timerSec: number
  baseScore: number
  explanation: string
  options: BuildOpt[]
}

interface BuildRound {
  id: string
  title: string
  questions: BuildQ[]
}

function defaultOpts(type: QType): BuildOpt[] {
  if (type === 'TRUE_FALSE') {
    return [
      { id: uid(), text: 'Верно', isCorrect: true },
      { id: uid(), text: 'Неверно', isCorrect: false },
    ]
  }
  if (type === 'TEXT') {
    // Принятые варианты ответа — все считаются правильными
    return [
      { id: uid(), text: '', isCorrect: true },
    ]
  }
  return [
    { id: uid(), text: '', isCorrect: true },
    { id: uid(), text: '', isCorrect: false },
    { id: uid(), text: '', isCorrect: false },
    { id: uid(), text: '', isCorrect: false },
  ]
}

function makeQ(): BuildQ {
  return {
    id: uid(), type: 'SINGLE', text: '',
    timerSec: 20, baseScore: 100, explanation: '',
    options: defaultOpts('SINGLE'),
  }
}

function makeRound(n: number): BuildRound {
  return { id: uid(), title: `Раунд ${n}`, questions: [makeQ()] }
}

// ─── Main page ────────────────────────────────────────────────────────────────

// ─── Draft helpers ────────────────────────────────────────────────────────────

function saveDraft(title: string, rounds: BuildRound[]) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, rounds, savedAt: Date.now() }))
  } catch {}
}

function loadDraft(): { title: string; rounds: BuildRound[]; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Defensive: ensure rounds is an array
    if (!parsed || !Array.isArray(parsed.rounds)) return null
    return parsed
  } catch {
    return null
  }
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY)
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function QuizBuilderPage() {
  const { setPhase, setQuizzes } = useHostStore()
  const [title, setTitle] = useState('')
  const [rounds, setRounds] = useState<BuildRound[]>([makeRound(1)])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingQ, setEditingQ] = useState<{ roundId: string; qId: string } | null>(null)
  const [draftBanner, setDraftBanner] = useState(false)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Когда квиз успешно сохранён — НЕ восстанавливаем черновик на unmount
  const savedRef = useRef(false)

  // Check for existing draft on mount
  useEffect(() => {
    const draft = loadDraft()
    if (draft && (draft.title || draft.rounds.some(r => r.questions.some(q => q.text)))) {
      setDraftBanner(true)
    }
  }, [])

  // Keep latest title/rounds in a ref so we can flush-save on unmount
  const latestRef = useRef({ title, rounds })
  latestRef.current = { title, rounds }

  // Auto-save draft on every change (debounced 800ms)
  useEffect(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(() => saveDraft(title, rounds), 800)
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current) }
  }, [title, rounds])

  // Flush-save the draft when leaving the builder (unmount)
  useEffect(() => {
    return () => {
      if (savedRef.current) return // квиз сохранён — черновик не нужен
      const { title: t, rounds: r } = latestRef.current
      // Сохраняем только если есть что сохранять
      if (t.trim() || r.some(rd => rd.questions.some(q => q.text.trim()))) {
        saveDraft(t, r)
      }
    }
  }, [])

  // Явный выход «Назад» — сразу сохраняем черновик и уходим
  const goBack = () => {
    const { title: t, rounds: r } = latestRef.current
    if (t.trim() || r.some(rd => rd.questions.some(q => q.text.trim()))) {
      saveDraft(t, r)
    }
    setPhase('dashboard')
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const addRound = () => setRounds(r => [...r, makeRound(r.length + 1)])

  const deleteRound = (rid: string) => setRounds(r => r.filter(x => x.id !== rid))

  const updateRoundTitle = (rid: string, t: string) =>
    setRounds(r => r.map(x => x.id === rid ? { ...x, title: t } : x))

  const addQuestion = (rid: string) =>
    setRounds(r => r.map(x => x.id === rid ? { ...x, questions: [...x.questions, makeQ()] } : x))

  const deleteQuestion = (rid: string, qid: string) =>
    setRounds(r => r.map(x =>
      x.id === rid ? { ...x, questions: x.questions.filter(q => q.id !== qid) } : x
    ))

  const updateQuestion = (rid: string, updated: BuildQ) =>
    setRounds(r => r.map(x =>
      x.id === rid ? { ...x, questions: x.questions.map(q => q.id === updated.id ? updated : q) } : x
    ))

  const editingQuestion = editingQ
    ? rounds.find(r => r.id === editingQ.roundId)?.questions.find(q => q.id === editingQ.qId) ?? null
    : null

  // ─── Validation ───────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!title.trim()) return 'Введи название квиза'
    for (const r of rounds) {
      if (!r.title.trim()) return 'Введи название каждого раунда'
      if (r.questions.length === 0) return `В раунде "${r.title}" нет вопросов`
      for (const q of r.questions) {
        if (!q.text.trim()) return 'Заполни текст для всех вопросов'
        const filledOpts = q.options.filter(o => o.text.trim())
        if (q.type === 'TEXT') {
          if (filledOpts.length < 1) return 'Добавь хотя бы один вариант правильного ответа'
          continue
        }
        if (filledOpts.length < 2) return 'Каждый вопрос должен иметь минимум 2 варианта ответа'
        if (!filledOpts.some(o => o.isCorrect)) return 'Отметь правильный ответ для каждого вопроса'
      }
    }
    return null
  }

  // ─── Save ─────────────────────────────────────────────────────────────────
  const save = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setSaving(true)
    setError('')

    const doSave = async () => {
      const importData = {
        title: title.trim(),
        rounds: rounds.map(r => ({
          title: r.title,
          questions: r.questions.map(q => ({
            type: q.type,
            text: q.text,
            timerSec: q.timerSec,
            baseScore: q.baseScore,
            ...(q.explanation.trim() ? { explanation: q.explanation.trim() } : {}),
            options: q.options
              .filter(o => o.text.trim())
              .map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, orderIndex: i + 1 })),
          })),
        })),
        errors: [],
        warnings: [],
      }

      await apiClient.post('/api/quizzes/import', { title: title.trim(), data: importData })

      const res = await apiClient.get('/api/quizzes')
      setQuizzes(asArray(res.data))
      savedRef.current = true
      clearDraft()
      setPhase('dashboard')
    }

    const authToken = getToken()
    if (!authToken) {
      setError('Сессия истекла. Вернись на главный экран и войди снова.')
      setSaving(false)
      return
    }

    try {
      await doSave()
    } catch (e: any) {
      if (e?.response?.status === 401) {
        setError('Сессия истекла. Вернись на главный экран и войди снова.')
      } else {
        setError(getErrorMessage(e, 'Ошибка сохранения'))
      }
      setSaving(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen px-4 py-6 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={goBack}
            className="text-white/40 hover:text-white transition text-lg"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-white flex-1">Новый квиз</h1>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-[#7c6ded] hover:bg-[#6a5bd4] text-white font-bold text-sm transition disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : '✓ Сохранить'}
          </button>
        </div>

        {/* Draft restore banner */}
        {draftBanner && (
          <div className="bg-[#7c6ded]/15 border border-[#7c6ded]/30 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
            <span className="text-[#9b8ff5] text-sm flex-1">📝 Есть незаконченный черновик</span>
            <button
              onClick={() => {
                const draft = loadDraft()
                if (draft) { setTitle(draft.title); setRounds(draft.rounds) }
                setDraftBanner(false)
              }}
              className="text-[#7c6ded] text-sm font-bold hover:text-[#9b8ff5] transition"
            >
              Восстановить
            </button>
            <button
              onClick={() => { clearDraft(); setDraftBanner(false) }}
              className="text-white/30 text-sm hover:text-white/60 transition"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Quiz title */}
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Название квиза"
          className="w-full px-4 py-3 rounded-xl bg-[#141e33] border border-white/10 text-white text-lg font-bold focus:outline-none focus:border-[#7c6ded] transition mb-6"
          maxLength={100}
        />

        {/* Rounds */}
        <div className="space-y-4">
          {rounds.map((round, ri) => (
            <RoundCard
              key={round.id}
              round={round}
              index={ri + 1}
              canDelete={rounds.length > 1}
              onUpdateTitle={t => updateRoundTitle(round.id, t)}
              onDelete={() => deleteRound(round.id)}
              onAddQuestion={() => addQuestion(round.id)}
              onEditQuestion={qid => setEditingQ({ roundId: round.id, qId: qid })}
              onDeleteQuestion={qid => deleteQuestion(round.id, qid)}
            />
          ))}
        </div>

        <button
          onClick={addRound}
          className="w-full mt-4 py-3 rounded-xl border-2 border-dashed border-white/15 text-white/35 hover:border-white/30 hover:text-white/55 transition text-sm font-semibold"
        >
          + Добавить раунд
        </button>
      </div>

      {/* Question editor modal */}
      {editingQ && editingQuestion && (
        <QuestionEditor
          question={editingQuestion}
          onSave={q => { updateQuestion(editingQ.roundId, q); setEditingQ(null) }}
          onClose={() => setEditingQ(null)}
        />
      )}
    </div>
  )
}

// ─── RoundCard ────────────────────────────────────────────────────────────────

function RoundCard({
  round, index, canDelete,
  onUpdateTitle, onDelete, onAddQuestion, onEditQuestion, onDeleteQuestion,
}: {
  round: BuildRound
  index: number
  canDelete: boolean
  onUpdateTitle: (t: string) => void
  onDelete: () => void
  onAddQuestion: () => void
  onEditQuestion: (qid: string) => void
  onDeleteQuestion: (qid: string) => void
}) {
  const [editingTitle, setEditingTitle] = useState(false)

  return (
    <div className="bg-[#141e33] rounded-2xl p-4 border border-white/10">
      {/* Round header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[#7c6ded] font-bold text-xs uppercase tracking-widest shrink-0">
          Раунд {index}
        </span>
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              autoFocus
              value={round.title}
              onChange={e => onUpdateTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={e => e.key === 'Enter' && setEditingTitle(false)}
              className="bg-transparent text-white text-sm font-semibold focus:outline-none border-b border-[#7c6ded] w-full"
              maxLength={60}
            />
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="text-white text-sm font-semibold hover:text-white/70 transition truncate max-w-full text-left"
            >
              {round.title || 'Без названия'} <span className="text-white/30">✏️</span>
            </button>
          )}
        </div>
        {canDelete && (
          <button onClick={onDelete} className="text-white/20 hover:text-red-400 transition shrink-0">
            🗑
          </button>
        )}
      </div>

      {/* Questions list */}
      <div className="space-y-2 mb-3">
        {round.questions.map((q, qi) => (
          <div
            key={q.id}
            className="bg-[#0d1424] rounded-xl px-3 py-2.5 flex items-center gap-3"
          >
            <span className="text-white/25 text-xs w-4 shrink-0 text-right">{qi + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm leading-snug truncate">
                {q.text || <span className="text-white/25 italic">Пусто</span>}
              </p>
              <p className="text-white/30 text-xs mt-0.5">
                {q.type === 'TRUE_FALSE' ? 'Да/Нет' : q.type === 'MULTI' ? 'Несколько' : q.type === 'TEXT' ? 'Свой ответ' : 'Один ответ'}
                {' · '}{q.timerSec}с{' · '}{q.baseScore} оч
              </p>
            </div>
            <button
              onClick={() => onEditQuestion(q.id)}
              className="text-[#7c6ded] text-xs font-semibold hover:text-[#9b8ff5] transition shrink-0"
            >
              Изменить
            </button>
            {round.questions.length > 1 && (
              <button
                onClick={() => onDeleteQuestion(q.id)}
                className="text-white/15 hover:text-red-400 transition text-xs shrink-0 ml-1"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onAddQuestion}
        className="w-full py-2 rounded-xl border border-dashed border-white/15 text-white/35 hover:border-[#7c6ded]/50 hover:text-[#7c6ded] transition text-sm"
      >
        + Добавить вопрос
      </button>
    </div>
  )
}

// ─── QuestionEditor ───────────────────────────────────────────────────────────

function QuestionEditor({
  question, onSave, onClose,
}: {
  question: BuildQ
  onSave: (q: BuildQ) => void
  onClose: () => void
}) {
  const [q, setQ] = useState<BuildQ>({
    ...question,
    options: question.options.map(o => ({ ...o })),
  })
  const [showExplanation, setShowExplanation] = useState(!!question.explanation)

  // ─── Type change ────────────────────────────────────────────────────────
  const changeType = (type: QType) => {
    if (type === q.type) return
    if (type === 'TEXT') {
      // Переходим к свободному ответу: варианты как принятые ответы (все правильные)
      const kept = q.options.filter(o => o.text.trim()).map(o => ({ ...o, isCorrect: true }))
      setQ(prev => ({ ...prev, type, options: kept.length ? kept : defaultOpts('TEXT') }))
    } else if (q.type === 'TEXT') {
      // Уходим от свободного ответа → свежие варианты
      setQ(prev => ({ ...prev, type, options: defaultOpts(type) }))
    } else if (type === 'TRUE_FALSE') {
      setQ(prev => ({ ...prev, type, options: defaultOpts('TRUE_FALSE') }))
    } else if (q.type === 'TRUE_FALSE') {
      // Switching away from TRUE_FALSE → fresh options
      setQ(prev => ({ ...prev, type, options: defaultOpts(type) }))
    } else if (type === 'SINGLE') {
      // MULTI → SINGLE: keep first correct only
      const opts = q.options.map((o, i) => {
        const firstCorrectIdx = q.options.findIndex(x => x.isCorrect)
        return { ...o, isCorrect: i === (firstCorrectIdx >= 0 ? firstCorrectIdx : 0) }
      })
      setQ(prev => ({ ...prev, type, options: opts }))
    } else {
      // SINGLE → MULTI: just change type, options stay
      setQ(prev => ({ ...prev, type }))
    }
  }

  // ─── Option helpers ──────────────────────────────────────────────────────
  const setOptText = (id: string, text: string) =>
    setQ(prev => ({ ...prev, options: prev.options.map(o => o.id === id ? { ...o, text } : o) }))

  const toggleCorrect = (id: string) => {
    if (q.type === 'SINGLE') {
      setQ(prev => ({ ...prev, options: prev.options.map(o => ({ ...o, isCorrect: o.id === id })) }))
    } else {
      setQ(prev => ({
        ...prev,
        options: prev.options.map(o => o.id === id ? { ...o, isCorrect: !o.isCorrect } : o),
      }))
    }
  }

  const addOption = () => {
    if (q.options.length >= 6) return
    setQ(prev => ({ ...prev, options: [...prev.options, { id: uid(), text: '', isCorrect: false }] }))
  }

  const removeOption = (id: string) => {
    if (q.options.length <= 2) return
    setQ(prev => {
      const newOpts = prev.options.filter(o => o.id !== id)
      // Ensure at least one correct for SINGLE
      if (prev.type === 'SINGLE' && !newOpts.some(o => o.isCorrect)) {
        newOpts[0].isCorrect = true
      }
      return { ...prev, options: newOpts }
    })
  }

  const setTfCorrect = (value: boolean) => {
    // TRUE_FALSE: set "Верно" correct or "Неверно" correct
    setQ(prev => ({
      ...prev,
      options: prev.options.map((o, i) => ({ ...o, isCorrect: i === 0 ? value : !value })),
    }))
  }

  const isValid = q.type === 'TEXT'
    ? !!q.text.trim() && q.options.filter(o => o.text.trim()).length >= 1
    : !!q.text.trim() &&
      q.options.filter(o => o.text.trim()).length >= 2 &&
      q.options.some(o => o.isCorrect && o.text.trim())

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#06080f]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4 border-b border-white/10 shrink-0">
        <button onClick={onClose} className="text-white/40 hover:text-white transition text-lg">
          ←
        </button>
        <h2 className="text-white font-bold flex-1">Редактор вопроса</h2>
        <button
          onClick={() => isValid && onSave(q)}
          disabled={!isValid}
          className="px-5 py-2 rounded-xl bg-[#7c6ded] hover:bg-[#6a5bd4] text-white font-bold text-sm transition disabled:opacity-40"
        >
          Готово
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Question text */}
        <div>
          <label className="text-white/50 text-xs uppercase tracking-widest mb-2 block">Вопрос</label>
          <textarea
            value={q.text}
            onChange={e => setQ(prev => ({ ...prev, text: e.target.value }))}
            placeholder="Напиши вопрос..."
            rows={3}
            maxLength={500}
            className="w-full px-4 py-3 rounded-xl bg-[#141e33] border border-white/10 text-white focus:outline-none focus:border-[#7c6ded] transition resize-none"
          />
        </div>

        {/* Type selector */}
        <div>
          <label className="text-white/50 text-xs uppercase tracking-widest mb-2 block">Тип ответа</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { v: 'SINGLE', label: 'Один ответ' },
              { v: 'MULTI', label: 'Несколько' },
              { v: 'TRUE_FALSE', label: 'Да / Нет' },
              { v: 'TEXT', label: '✍️ Свой ответ' },
            ] as { v: QType; label: string }[]).map(({ v, label }) => (
              <button
                key={v}
                onClick={() => changeType(v)}
                className={`py-2.5 rounded-xl text-sm font-semibold transition ${
                  q.type === v
                    ? 'bg-[#7c6ded] text-white'
                    : 'bg-[#141e33] text-white/50 hover:text-white border border-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Timer + Score */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-white/50 text-xs uppercase tracking-widest mb-2 block">
              Время (сек)
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQ(p => ({ ...p, timerSec: Math.max(5, p.timerSec - 5) }))}
                className="w-9 h-9 rounded-lg bg-[#141e33] border border-white/10 text-white font-bold hover:bg-white/10 transition"
              >
                −
              </button>
              <span className="flex-1 text-center text-white font-bold text-lg">{q.timerSec}</span>
              <button
                onClick={() => setQ(p => ({ ...p, timerSec: Math.min(120, p.timerSec + 5) }))}
                className="w-9 h-9 rounded-lg bg-[#141e33] border border-white/10 text-white font-bold hover:bg-white/10 transition"
              >
                +
              </button>
            </div>
          </div>
          <div>
            <label className="text-white/50 text-xs uppercase tracking-widest mb-2 block">
              Очки
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQ(p => ({ ...p, baseScore: Math.max(50, p.baseScore - 50) }))}
                className="w-9 h-9 rounded-lg bg-[#141e33] border border-white/10 text-white font-bold hover:bg-white/10 transition"
              >
                −
              </button>
              <span className="flex-1 text-center text-white font-bold text-lg">{q.baseScore}</span>
              <button
                onClick={() => setQ(p => ({ ...p, baseScore: Math.min(1000, p.baseScore + 50) }))}
                className="w-9 h-9 rounded-lg bg-[#141e33] border border-white/10 text-white font-bold hover:bg-white/10 transition"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Options */}
        <div>
          <label className="text-white/50 text-xs uppercase tracking-widest mb-2 block">
            Варианты ответа
          </label>

          {q.type === 'TEXT' ? (
            /* TEXT: список принятых вариантов ответа (все правильные) */
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg shrink-0 bg-green-500/20 border-2 border-green-500/40 text-green-400 flex items-center justify-center text-sm">
                    ✓
                  </span>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={e => setOptText(opt.id, e.target.value)}
                    placeholder={oi === 0 ? 'Например: Москва' : 'Ещё вариант (синоним, англ., и т.д.)'}
                    maxLength={120}
                    className="flex-1 px-3 py-2 rounded-xl bg-[#141e33] border border-white/10 text-white text-sm focus:outline-none focus:border-[#7c6ded] transition"
                  />
                  {q.options.length > 1 && (
                    <button
                      onClick={() => removeOption(opt.id)}
                      className="text-white/20 hover:text-red-400 transition shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {q.options.length < 10 && (
                <button
                  onClick={addOption}
                  className="w-full py-2 rounded-xl border border-dashed border-white/15 text-white/35 hover:border-[#7c6ded]/50 hover:text-[#7c6ded] transition text-sm mt-1"
                >
                  + Ещё вариант ответа
                </button>
              )}
              <p className="text-white/25 text-xs">
                Участник вводит ответ сам. Засчитаем любой из вариантов — регистр, ё/е,
                опечатки и склонения не важны.
              </p>
            </div>
          ) : q.type === 'TRUE_FALSE' ? (
            /* TRUE_FALSE: two big buttons */
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '✅ Верно', value: true },
                { label: '❌ Неверно', value: false },
              ].map(({ label, value }) => {
                const isSelected = q.options[0]?.isCorrect === value
                return (
                  <button
                    key={String(value)}
                    onClick={() => setTfCorrect(value)}
                    className={`py-4 rounded-xl font-bold text-base transition ${
                      isSelected
                        ? 'bg-green-500/30 border-2 border-green-500 text-green-300'
                        : 'bg-[#141e33] border-2 border-white/10 text-white/60 hover:border-white/30'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
              <p className="col-span-2 text-white/30 text-xs text-center">
                Нажми на правильный ответ
              </p>
            </div>
          ) : (
            /* SINGLE / MULTI: list of options */
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <div key={opt.id} className="flex items-center gap-2">
                  {/* Correct toggle */}
                  <button
                    onClick={() => toggleCorrect(opt.id)}
                    className={`w-8 h-8 rounded-lg shrink-0 border-2 flex items-center justify-center text-sm transition ${
                      opt.isCorrect
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-white/20 text-white/20 hover:border-white/40'
                    }`}
                    title="Отметить как правильный"
                  >
                    {opt.isCorrect ? '✓' : oi + 1}
                  </button>

                  {/* Option text */}
                  <input
                    type="text"
                    value={opt.text}
                    onChange={e => setOptText(opt.id, e.target.value)}
                    placeholder={`Вариант ${oi + 1}`}
                    maxLength={200}
                    className="flex-1 px-3 py-2 rounded-xl bg-[#141e33] border border-white/10 text-white text-sm focus:outline-none focus:border-[#7c6ded] transition"
                  />

                  {/* Delete option */}
                  {q.options.length > 2 && (
                    <button
                      onClick={() => removeOption(opt.id)}
                      className="text-white/20 hover:text-red-400 transition shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              {q.options.length < 6 && (
                <button
                  onClick={addOption}
                  className="w-full py-2 rounded-xl border border-dashed border-white/15 text-white/35 hover:border-[#7c6ded]/50 hover:text-[#7c6ded] transition text-sm mt-1"
                >
                  + Ещё вариант
                </button>
              )}

              <p className="text-white/25 text-xs">
                {q.type === 'SINGLE'
                  ? 'Нажми на номер чтобы отметить правильный ответ'
                  : 'Можно отметить несколько правильных ответов'}
              </p>
            </div>
          )}
        </div>

        {/* Explanation (optional) */}
        <div>
          <button
            onClick={() => setShowExplanation(v => !v)}
            className="text-white/40 hover:text-white/70 text-sm transition flex items-center gap-1"
          >
            {showExplanation ? '▼' : '▶'} Пояснение (необязательно)
          </button>
          {showExplanation && (
            <textarea
              value={q.explanation}
              onChange={e => setQ(prev => ({ ...prev, explanation: e.target.value }))}
              placeholder="Объяснение правильного ответа..."
              rows={2}
              maxLength={500}
              className="w-full mt-2 px-4 py-3 rounded-xl bg-[#141e33] border border-white/10 text-white text-sm focus:outline-none focus:border-[#7c6ded] transition resize-none"
            />
          )}
        </div>
      </div>
    </div>
  )
}
