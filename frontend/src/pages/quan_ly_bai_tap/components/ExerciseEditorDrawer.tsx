import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Check,
  CheckSquare,
  ChevronDown,
  CircleDot,
  ClipboardList,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import type {
  CourseExerciseDetail,
  CourseExerciseQuestionType,
  ExerciseQuestionInput,
  ExerciseStatus,
  SaveCourseExerciseInput,
} from '../types'

interface ExerciseEditorDrawerProps {
  exercise: CourseExerciseDetail | null
  saving: boolean
  onClose: () => void
  onSubmit: (input: SaveCourseExerciseInput) => Promise<void>
}

interface DraftMultipleChoiceQuestion {
  localId: string
  question_type: 'multiple_choice'
  content: string
  points: string
  allow_multiple: boolean
  options: string[]
  correct_indices: number[]
}

interface DraftFillBlankItem {
  accepted_answers: string[]
  draftInput: string
}

interface DraftFillBlankQuestion {
  localId: string
  question_type: 'fill_blank'
  content: string
  points: string
  case_sensitive: boolean
  blanks: DraftFillBlankItem[]
}

type DraftQuestion = DraftMultipleChoiceQuestion | DraftFillBlankQuestion

function createEmptyMcQuestion(seed: number): DraftMultipleChoiceQuestion {
  return {
    localId: `mc-${Date.now()}-${seed}`,
    question_type: 'multiple_choice',
    content: '',
    points: '1',
    allow_multiple: false,
    options: ['', '', '', ''],
    correct_indices: [0],
  }
}

function createEmptyFillBlankQuestion(seed: number): DraftFillBlankQuestion {
  return {
    localId: `fb-${Date.now()}-${seed}`,
    question_type: 'fill_blank',
    content: '',
    points: '1',
    case_sensitive: false,
    blanks: [{ accepted_answers: [], draftInput: '' }],
  }
}

function toDraftQuestions(detail: CourseExerciseDetail | null): DraftQuestion[] {
  if (!detail || detail.questions.length === 0) {
    return [createEmptyMcQuestion(1)]
  }
  return detail.questions.map((q, idx) => {
    if (q.question_type === 'multiple_choice') {
      return {
        localId: q.id || `mc-init-${idx}`,
        question_type: 'multiple_choice',
        content: q.content,
        points: String(q.points ?? 1),
        allow_multiple: q.allow_multiple,
        options: q.options.length >= 2 ? [...q.options] : ['', ''],
        correct_indices: q.correct_indices ? [...q.correct_indices] : [0],
      }
    }
    const blanks = (q.blanks && q.blanks.length > 0 ? q.blanks : [{ accepted_answers: [] }]).map(
      (b) => ({
        accepted_answers: [...b.accepted_answers],
        draftInput: '',
      })
    )
    return {
      localId: q.id || `fb-init-${idx}`,
      question_type: 'fill_blank',
      content: q.content,
      points: String(q.points ?? 1),
      case_sensitive: Boolean(q.case_sensitive),
      blanks,
    }
  })
}

function optionLabel(index: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (index < letters.length) return letters[index] ?? String(index + 1)
  return `${Math.floor(index / 26)}${letters[index % 26] ?? ''}`
}

function splitTotalScoreEvenly(totalScore: number, count: number): number[] {
  if (count <= 0 || !Number.isFinite(totalScore) || totalScore <= 0) return []
  const totalCents = Math.round(totalScore * 100)
  const baseCents = Math.floor(totalCents / count)
  const remainder = totalCents - baseCents * count
  return Array.from({ length: count }, (_, idx) => {
    const extra = idx >= count - remainder ? 1 : 0
    return (baseCents + extra) / 100
  })
}

const inputClass =
  'h-[38px] w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-xs font-medium text-ink-900 placeholder:font-normal placeholder:text-ink-400 outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600'

export function ExerciseEditorDrawer({
  exercise,
  saving,
  onClose,
  onSubmit,
}: ExerciseEditorDrawerProps) {
  const isEdit = exercise !== null
  const [title, setTitle] = useState(exercise?.title ?? '')
  const [description, setDescription] = useState(exercise?.description ?? '')
  const [maxScore, setMaxScore] = useState(
    exercise?.max_score && exercise.max_score > 0 ? String(exercise.max_score) : '10'
  )
  const [status, setStatus] = useState<ExerciseStatus>(exercise?.status ?? 'published')
  const [questions, setQuestions] = useState<DraftQuestion[]>(() => toDraftQuestions(exercise))
  const [validationError, setValidationError] = useState<string | null>(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const addMenuRef = useRef<HTMLDivElement>(null)
  const questionCardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const pendingScrollIdRef = useRef<string | null>(null)

  useEffect(() => {
    const targetId = pendingScrollIdRef.current
    if (!targetId) return
    pendingScrollIdRef.current = null
    const node = questionCardRefs.current.get(targetId)
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const textarea = node.querySelector('textarea')
      textarea?.focus({ preventScroll: true })
    }
  }, [questions])

  useEffect(() => {
    if (!addMenuOpen) return
    const handleOutsideClick = (event: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setAddMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [addMenuOpen])

  const addQuestion = (type: CourseExerciseQuestionType) => {
    setQuestions((prev) => {
      const nextQuestion =
        type === 'multiple_choice'
          ? createEmptyMcQuestion(prev.length + 1)
          : createEmptyFillBlankQuestion(prev.length + 1)
      pendingScrollIdRef.current = nextQuestion.localId
      return [...prev, nextQuestion]
    })
    setAddMenuOpen(false)
  }

  const addSameTypeAsLatest = () => {
    const latestType = questions[questions.length - 1]?.question_type ?? 'multiple_choice'
    addQuestion(latestType)
  }

  const changeQuestionType = (localId: string, nextType: CourseExerciseQuestionType) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.localId !== localId || q.question_type === nextType) return q
        if (nextType === 'multiple_choice') {
          return {
            localId: q.localId,
            question_type: 'multiple_choice',
            content: q.content,
            points: q.points,
            allow_multiple: false,
            options: ['', '', '', ''],
            correct_indices: [0],
          }
        }
        const blankMatches = (q.content.match(/___/g) ?? []).length
        const blankCount = Math.max(1, blankMatches)
        return {
          localId: q.localId,
          question_type: 'fill_blank',
          content: q.content,
          points: q.points,
          case_sensitive: false,
          blanks: Array.from({ length: blankCount }, () => ({
            accepted_answers: [],
            draftInput: '',
          })),
        }
      })
    )
  }

  const removeQuestion = (localId: string) => {
    setQuestions((prev) => (prev.length <= 1 ? prev : prev.filter((q) => q.localId !== localId)))
  }

  const updateQuestion = (localId: string, updater: (q: DraftQuestion) => DraftQuestion) => {
    setQuestions((prev) => prev.map((q) => (q.localId === localId ? updater(q) : q)))
  }

  const addBlankAnswer = (questionId: string, blankIdx: number) => {
    updateQuestion(questionId, (q) => {
      if (q.question_type !== 'fill_blank') return q
      const nextBlanks = q.blanks.map((blank, idx) => {
        if (idx !== blankIdx) return blank
        const candidate = blank.draftInput.trim()
        if (!candidate) return blank
        const exists = blank.accepted_answers.some(
          (item) => item.toLowerCase() === candidate.toLowerCase()
        )
        if (exists) {
          return { ...blank, draftInput: '' }
        }
        return {
          accepted_answers: [...blank.accepted_answers, candidate],
          draftInput: '',
        }
      })
      return { ...q, blanks: nextBlanks }
    })
  }

  const handleFormSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setValidationError('Vui lòng nhập tên bài tập.')
      return
    }

    const parsedMaxScore = Number(maxScore)
    if (!Number.isFinite(parsedMaxScore) || parsedMaxScore <= 0 || parsedMaxScore > 1000) {
      setValidationError('Tổng điểm bài tập phải lớn hơn 0 và tối đa 1000.')
      return
    }
    const cleanMaxScore = Math.round(parsedMaxScore * 100) / 100
    const submitPoints = splitTotalScoreEvenly(cleanMaxScore, questions.length)

    const normalizedQuestions: ExerciseQuestionInput[] = []

    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i]
      if (!q) continue
      const content = q.content.trim()
      if (!content) {
        setValidationError(`Câu hỏi ${i + 1}: vui lòng nhập nội dung câu hỏi.`)
        return
      }
      const points = submitPoints[i] ?? 1

      if (q.question_type === 'multiple_choice') {
        const cleanOptions = q.options.map((opt) => opt.trim())
        if (cleanOptions.some((opt) => !opt)) {
          setValidationError(`Câu hỏi ${i + 1}: các lựa chọn không được để trống.`)
          return
        }
        if (q.correct_indices.length === 0) {
          setValidationError(`Câu hỏi ${i + 1}: vui lòng chọn ít nhất 1 đáp án đúng.`)
          return
        }
        normalizedQuestions.push({
          question_type: 'multiple_choice',
          content,
          points,
          allow_multiple: q.allow_multiple,
          options: cleanOptions,
          correct_indices: [...new Set(q.correct_indices)].sort((a, b) => a - b),
        })
      } else {
        const cleanBlanks = q.blanks.map((blank) => {
          const pending = blank.draftInput.trim()
          const combined = pending
            ? [...blank.accepted_answers, pending]
            : [...blank.accepted_answers]
          return {
            accepted_answers: combined.map((ans) => ans.trim()).filter(Boolean),
          }
        })
        const emptyBlankIdx = cleanBlanks.findIndex((b) => b.accepted_answers.length === 0)
        if (emptyBlankIdx !== -1) {
          setValidationError(
            `Câu hỏi ${i + 1} (ô trống ${emptyBlankIdx + 1}): vui lòng thêm ít nhất 1 đáp án đúng.`
          )
          return
        }
        normalizedQuestions.push({
          question_type: 'fill_blank',
          content,
          points,
          blanks: cleanBlanks,
          case_sensitive: q.case_sensitive,
        })
      }
    }

    setValidationError(null)
    try {
      await onSubmit({
        title: trimmedTitle,
        description: description.trim() || null,
        time_limit_minutes: null,
        max_score: cleanMaxScore,
        status,
        questions: normalizedQuestions,
      })
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Không thể lưu bài tập.')
    }
  }

  const parsedPreviewMaxScore = Number(maxScore)
  const validPreviewMaxScore =
    Number.isFinite(parsedPreviewMaxScore) && parsedPreviewMaxScore > 0
      ? Math.round(parsedPreviewMaxScore * 100) / 100
      : 0
  const distributedPoints = splitTotalScoreEvenly(validPreviewMaxScore, questions.length)
  const totalPoints = validPreviewMaxScore

  const latestQuestionType: CourseExerciseQuestionType =
    questions[questions.length - 1]?.question_type ?? 'multiple_choice'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="presentation">
      <button
        type="button"
        aria-label="Đóng"
        onClick={() => {
          if (!saving) onClose()
        }}
        className="absolute inset-0 cursor-default bg-ink-900/45 backdrop-blur-[1px]"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Chỉnh sửa bài tập' : 'Thêm bài tập mới'}
        className="relative z-10 flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-100 px-7 py-5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <ClipboardList className="size-4.5" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-ink-900">
                {isEdit ? 'Chỉnh sửa bài tập khóa học' : 'Tạo bài tập mới cho khóa học'}
              </h2>
              <p className="mt-0.5 text-xs text-ink-500">
                Hỗ trợ trắc nghiệm (1 hoặc nhiều đáp án, không giới hạn lựa chọn) và điền từ vào chỗ trống (nhiều đáp án đúng).
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            disabled={saving}
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-ink-700 disabled:opacity-40 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </header>

        <form onSubmit={handleFormSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-6 overflow-y-auto px-7 py-6">
            {validationError && (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
                {validationError}
              </div>
            )}

            {/* Thông tin chung */}
            <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/40 p-4.5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="sm:col-span-3">
                  <label htmlFor="ex-title" className="text-xs font-bold text-ink-900">
                    Tên bài tập <span className="text-brand-600">*</span>
                  </label>
                  <input
                    id="ex-title"
                    type="text"
                    className={`${inputClass} mt-1.5`}
                    placeholder="VD: Bài tập tổng hợp Thì hiện tại & Từ vựng Unit 1-3"
                    value={title}
                    maxLength={200}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="ex-max-score" className="text-xs font-bold text-ink-900">
                    Tổng điểm <span className="text-brand-600">*</span>
                  </label>
                  <input
                    id="ex-max-score"
                    type="number"
                    min={1}
                    max={1000}
                    step="any"
                    className={`${inputClass} mt-1.5`}
                    placeholder="10"
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ex-desc" className="text-xs font-bold text-ink-900">
                  Hướng dẫn / Mô tả
                </label>
                <input
                  id="ex-desc"
                  type="text"
                  className={`${inputClass} mt-1.5`}
                  placeholder="Ghi chú ngắn cho học viên (không bắt buộc)"
                  value={description}
                  maxLength={2000}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ink-900">Trạng thái:</span>
                  {(['published', 'draft'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      className={`inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                        status === st
                          ? st === 'published'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                            : 'border-amber-300 bg-amber-50 text-amber-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {status === st && <Check className="size-3" />}
                      {st === 'published' ? 'Công khai' : 'Bản nháp'}
                    </button>
                  ))}
                </div>

                <span className="text-xs text-ink-500">
                  Tổng: <strong className="font-bold text-ink-900">{questions.length} câu</strong> ·{' '}
                  <strong className="font-bold text-brand-600">{totalPoints} điểm</strong>
                </span>
              </div>
            </section>

            {/* Danh sách câu hỏi */}
            <section className="space-y-4">
              <div className="sticky -top-6 z-20 -mx-7 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white/95 px-7 py-3 backdrop-blur-xs">
                <h3 className="text-sm font-extrabold text-ink-900">Danh sách câu hỏi</h3>
                <div className="relative" ref={addMenuRef}>
                  <button
                    type="button"
                    aria-expanded={addMenuOpen}
                    aria-haspopup="menu"
                    onClick={() => setAddMenuOpen((open) => !open)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11.5px] font-semibold text-ink-800 shadow-2xs transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    <span>Thêm câu hỏi</span>
                    <ChevronDown
                      className={`size-3.5 text-ink-400 transition-transform ${addMenuOpen ? 'rotate-180' : ''}`}
                      aria-hidden
                    />
                  </button>

                  {addMenuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 z-20 mt-1.5 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => addQuestion('multiple_choice')}
                        className="block w-full whitespace-nowrap px-3.5 py-2 text-left text-xs font-semibold text-ink-800 hover:bg-brand-50 hover:text-brand-700 cursor-pointer"
                      >
                        Trắc nghiệm
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => addQuestion('fill_blank')}
                        className="block w-full whitespace-nowrap px-3.5 py-2 text-left text-xs font-semibold text-ink-800 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                      >
                        Điền từ vào chỗ trống
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {questions.map((question, qIndex) => (
                <div
                  key={question.localId}
                  ref={(el) => {
                    if (el) {
                      questionCardRefs.current.set(question.localId, el)
                    } else {
                      questionCardRefs.current.delete(question.localId)
                    }
                  }}
                  className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]"
                >
                  {/* Header câu hỏi */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="flex size-6 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-ink-900">
                        {qIndex + 1}
                      </span>
                      <div className="relative">
                        <select
                          aria-label={`Loại bài tập câu ${qIndex + 1}`}
                          value={question.question_type}
                          onChange={(e) =>
                            changeQuestionType(
                              question.localId,
                              e.target.value as CourseExerciseQuestionType
                            )
                          }
                          className="h-7 cursor-pointer appearance-none rounded-lg border border-slate-200 bg-slate-50 pl-2.5 pr-7 text-[11.5px] font-bold text-ink-900 outline-none focus:border-brand-600 focus:bg-white"
                        >
                          <option value="multiple_choice">Trắc nghiệm</option>
                          <option value="fill_blank">Điền từ vào chỗ trống</option>
                        </select>
                        <ChevronDown
                          className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-ink-400"
                          aria-hidden
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-bold text-ink-700">
                        {distributedPoints[qIndex] ?? 0} điểm
                      </span>

                      <button
                        type="button"
                        disabled={questions.length <= 1}
                        onClick={() => removeQuestion(question.localId)}
                        title="Xóa câu hỏi"
                        className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Nội dung câu hỏi */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-ink-900">
                        Nội dung câu hỏi <span className="text-brand-600">*</span>
                      </label>
                      {question.question_type === 'fill_blank' && (
                        <button
                          type="button"
                          onClick={() =>
                            updateQuestion(question.localId, (q) => {
                              if (q.question_type !== 'fill_blank') return q
                              const separator = q.content.endsWith(' ') || q.content === '' ? '' : ' '
                              const nextContent = `${q.content}${separator}___ `
                              const blankMatches = (nextContent.match(/___/g) ?? []).length
                              const nextBlanks = [...q.blanks]
                              while (nextBlanks.length < blankMatches) {
                                nextBlanks.push({ accepted_answers: [], draftInput: '' })
                              }
                              return { ...q, content: nextContent, blanks: nextBlanks }
                            })
                          }
                          className="inline-flex h-6 items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 cursor-pointer"
                        >
                          <Plus className="size-3" />
                          Chèn ô trống (___)
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={2}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-ink-900 outline-none placeholder:font-normal placeholder:text-ink-400 focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600"
                      placeholder={
                        question.question_type === 'multiple_choice'
                          ? 'Nhập câu hỏi trắc nghiệm...'
                          : 'VD: She ___ to school every morning. (dùng ___ cho mỗi chỗ trống)'
                      }
                      value={question.content}
                      onChange={(e) =>
                        updateQuestion(question.localId, (q) => ({ ...q, content: e.target.value }))
                      }
                    />
                  </div>

                  {/* Chi tiết theo loại câu hỏi */}
                  {question.question_type === 'multiple_choice' ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-ink-900">
                          Các lựa chọn ({question.options.length}) &amp; Đáp án đúng
                        </span>
                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink-700 select-none">
                          <input
                            type="checkbox"
                            checked={question.allow_multiple}
                            onChange={(e) => {
                              const checked = e.target.checked
                              updateQuestion(question.localId, (q) => {
                                if (q.question_type !== 'multiple_choice') return q
                                const trimmedCorrect = checked
                                  ? q.correct_indices
                                  : q.correct_indices.length > 0
                                    ? [q.correct_indices[0] ?? 0]
                                    : [0]
                                return {
                                  ...q,
                                  allow_multiple: checked,
                                  correct_indices: trimmedCorrect,
                                }
                              })
                            }}
                            className="size-3.5 accent-brand-600 rounded"
                          />
                          <span>Cho phép chọn nhiều đáp án đúng</span>
                        </label>
                      </div>

                      <div className="space-y-2">
                        {question.options.map((optText, optIdx) => {
                          const isCorrect = question.correct_indices.includes(optIdx)
                          return (
                            <div key={optIdx} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuestion(question.localId, (q) => {
                                    if (q.question_type !== 'multiple_choice') return q
                                    if (!q.allow_multiple) {
                                      return { ...q, correct_indices: [optIdx] }
                                    }
                                    const exists = q.correct_indices.includes(optIdx)
                                    const next = exists
                                      ? q.correct_indices.filter((idx) => idx !== optIdx)
                                      : [...q.correct_indices, optIdx].sort((a, b) => a - b)
                                    return { ...q, correct_indices: next }
                                  })
                                }
                                title={
                                  question.allow_multiple
                                    ? 'Bật/tắt đáp án đúng'
                                    : 'Chọn làm đáp án đúng duy nhất'
                                }
                                className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-bold transition-colors cursor-pointer ${
                                  isCorrect
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                                }`}
                              >
                                {question.allow_multiple ? (
                                  <CheckSquare className="size-3.5" />
                                ) : (
                                  <CircleDot className="size-3.5" />
                                )}
                                <span>{optionLabel(optIdx)}</span>
                              </button>

                              <input
                                type="text"
                                className="h-8 flex-1 rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-xs font-medium text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-600 focus:bg-white"
                                placeholder={`Nội dung lựa chọn ${optionLabel(optIdx)}`}
                                value={optText}
                                onChange={(e) =>
                                  updateQuestion(question.localId, (q) => {
                                    if (q.question_type !== 'multiple_choice') return q
                                    const nextOpts = q.options.map((item, idx) =>
                                      idx === optIdx ? e.target.value : item
                                    )
                                    return { ...q, options: nextOpts }
                                  })
                                }
                              />

                              <button
                                type="button"
                                disabled={question.options.length <= 2}
                                onClick={() =>
                                  updateQuestion(question.localId, (q) => {
                                    if (q.question_type !== 'multiple_choice' || q.options.length <= 2) {
                                      return q
                                    }
                                    const nextOpts = q.options.filter((_, idx) => idx !== optIdx)
                                    const nextCorrect = q.correct_indices
                                      .filter((idx) => idx !== optIdx)
                                      .map((idx) => (idx > optIdx ? idx - 1 : idx))
                                    return {
                                      ...q,
                                      options: nextOpts,
                                      correct_indices:
                                        nextCorrect.length > 0 ? nextCorrect : [0],
                                    }
                                  })
                                }
                                title="Xóa lựa chọn"
                                className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          )
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          updateQuestion(question.localId, (q) => {
                            if (q.question_type !== 'multiple_choice') return q
                            return { ...q, options: [...q.options, ''] }
                          })
                        }
                        className="inline-flex h-7 items-center gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-3 text-[11px] font-semibold text-ink-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 cursor-pointer"
                      >
                        <Plus className="size-3" />
                        Thêm lựa chọn 
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-ink-900">
                          Đáp án đúng theo từng ô trống (1 ô trống có thể chấp nhận nhiều đáp án)
                        </span>
                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink-700 select-none">
                          <input
                            type="checkbox"
                            checked={question.case_sensitive}
                            onChange={(e) =>
                              updateQuestion(question.localId, (q) =>
                                q.question_type === 'fill_blank'
                                  ? { ...q, case_sensitive: e.target.checked }
                                  : q
                              )
                            }
                            className="size-3.5 accent-brand-600 rounded"
                          />
                          <span>Phân biệt hoa / thường</span>
                        </label>
                      </div>

                      <div className="space-y-2.5">
                        {question.blanks.map((blank, blankIdx) => (
                          <div
                            key={blankIdx}
                            className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11.5px] font-bold text-ink-800">
                                Ô trống #{blankIdx + 1}
                              </span>
                              {question.blanks.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuestion(question.localId, (q) => {
                                      if (q.question_type !== 'fill_blank' || q.blanks.length <= 1) {
                                        return q
                                      }
                                      return {
                                        ...q,
                                        blanks: q.blanks.filter((_, idx) => idx !== blankIdx),
                                      }
                                    })
                                  }
                                  className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                                >
                                  Xóa ô trống
                                </button>
                              )}
                            </div>

                            {blank.accepted_answers.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {blank.accepted_answers.map((ans, ansIdx) => (
                                  <span
                                    key={`${ans}-${ansIdx}`}
                                    className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-emerald-800"
                                  >
                                    {ans}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateQuestion(question.localId, (q) => {
                                          if (q.question_type !== 'fill_blank') return q
                                          return {
                                            ...q,
                                            blanks: q.blanks.map((b, idx) =>
                                              idx === blankIdx
                                                ? {
                                                    ...b,
                                                    accepted_answers: b.accepted_answers.filter(
                                                      (_, i) => i !== ansIdx
                                                    ),
                                                  }
                                                : b
                                            ),
                                          }
                                        })
                                      }
                                      className="rounded-full p-0.5 text-emerald-700 hover:bg-emerald-200/70 cursor-pointer"
                                      aria-label={`Xóa đáp án ${ans}`}
                                    >
                                      <X className="size-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                className="h-8 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-600"
                                placeholder="Nhập đáp án đúng rồi bấm Enter hoặc Thêm..."
                                value={blank.draftInput}
                                onChange={(e) =>
                                  updateQuestion(question.localId, (q) => {
                                    if (q.question_type !== 'fill_blank') return q
                                    return {
                                      ...q,
                                      blanks: q.blanks.map((b, idx) =>
                                        idx === blankIdx ? { ...b, draftInput: e.target.value } : b
                                      ),
                                    }
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    addBlankAnswer(question.localId, blankIdx)
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => addBlankAnswer(question.localId, blankIdx)}
                                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-ink-800 hover:bg-slate-50 cursor-pointer"
                              >
                                <Plus className="size-3" />
                                Thêm đáp án
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          updateQuestion(question.localId, (q) => {
                            if (q.question_type !== 'fill_blank') return q
                            return {
                              ...q,
                              blanks: [...q.blanks, { accepted_answers: [], draftInput: '' }],
                            }
                          })
                        }
                        className="inline-flex h-7 items-center gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-3 text-[11px] font-semibold text-ink-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                      >
                        <Plus className="size-3" />
                        Thêm ô trống cho câu này
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addSameTypeAsLatest}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 py-3 text-xs font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50/40 hover:text-brand-700 cursor-pointer"
              >
                <Plus className="size-4" />
                <span>
                  Thêm nhanh (cùng loại:{' '}
                  {latestQuestionType === 'multiple_choice'
                    ? 'Trắc nghiệm'
                    : 'Điền từ vào chỗ trống'}
                  )
                </span>
              </button>
            </section>
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-slate-100 px-7 py-4">
            <span className="text-xs text-ink-500">
              {questions.length} câu hỏi · Tổng {totalPoints} điểm
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 px-4 text-xs font-bold text-white shadow-[0_2px_8px_rgba(200,16,46,0.25)] hover:from-brand-500 hover:to-brand-600 disabled:opacity-60 cursor-pointer"
              >
                {saving ? <LoaderCircle className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                <span>{isEdit ? 'Lưu thay đổi' : 'Tạo bài tập'}</span>
              </button>
            </div>
          </footer>
        </form>
      </aside>
    </div>
  )
}
