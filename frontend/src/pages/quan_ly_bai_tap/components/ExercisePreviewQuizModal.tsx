import { useState } from 'react'
import { CheckCircle2, LoaderCircle, RotateCcw, Send, X, XCircle } from 'lucide-react'
import type {
  CourseExerciseDetail,
  ExerciseSubmissionAnswer,
  SubmitExerciseResult,
} from '../types'

interface ExercisePreviewQuizModalProps {
  exercise: CourseExerciseDetail
  onClose: () => void
  onSubmitAnswers: (answers: ExerciseSubmissionAnswer[]) => Promise<SubmitExerciseResult>
}

function optionLabel(index: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (index < letters.length) return letters[index] ?? String(index + 1)
  return `${Math.floor(index / 26)}${letters[index % 26] ?? ''}`
}

export function ExercisePreviewQuizModal({
  exercise,
  onClose,
  onSubmitAnswers,
}: ExercisePreviewQuizModalProps) {
  const [mcSelections, setMcSelections] = useState<Record<string, number[]>>({})
  const [fillInputs, setFillInputs] = useState<Record<string, string[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [gradeResult, setGradeResult] = useState<SubmitExerciseResult | null>(null)

  const toggleMcOption = (questionId: string, optionIdx: number, allowMultiple: boolean) => {
    if (gradeResult) return
    setMcSelections((prev) => {
      const current = prev[questionId] ?? []
      if (!allowMultiple) {
        return { ...prev, [questionId]: [optionIdx] }
      }
      const next = current.includes(optionIdx)
        ? current.filter((idx) => idx !== optionIdx)
        : [...current, optionIdx].sort((a, b) => a - b)
      return { ...prev, [questionId]: next }
    })
  }

  const updateFillInput = (questionId: string, blankIdx: number, value: string, totalBlanks: number) => {
    if (gradeResult) return
    setFillInputs((prev) => {
      const base = [...(prev[questionId] ?? Array.from({ length: totalBlanks }, () => ''))]
      while (base.length < totalBlanks) base.push('')
      base[blankIdx] = value
      return { ...prev, [questionId]: base }
    })
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const payload: ExerciseSubmissionAnswer[] = exercise.questions.map((q) => {
        if (q.question_type === 'multiple_choice') {
          return {
            question_id: q.id,
            selected_indices: mcSelections[q.id] ?? [],
          }
        }
        return {
          question_id: q.id,
          blank_answers: fillInputs[q.id] ?? [],
        }
      })
      const result = await onSubmitAnswers(payload)
      setGradeResult(result)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Không thể chấm bài.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetry = () => {
    setMcSelections({})
    setFillInputs({})
    setGradeResult(null)
    setSubmitError(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink-900/45"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Làm thử ${exercise.title}`}
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-extrabold text-ink-900">{exercise.title}</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Kiểm tra luồng chấm điểm tự động ({exercise.questions.length} câu hỏi)
            </p>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-ink-700 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {gradeResult && (
            <div
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
                gradeResult.passed
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {gradeResult.passed ? (
                  <CheckCircle2 className="size-5 text-emerald-600" />
                ) : (
                  <XCircle className="size-5 text-amber-600" />
                )}
                <div>
                  <p className="text-sm font-extrabold">
                    Kết quả: {gradeResult.earned_points}/{gradeResult.max_points} điểm ({gradeResult.score_percent}%)
                  </p>
                  <p className="text-xs opacity-85">
                    Đúng {gradeResult.correct_count}/{gradeResult.total_questions} câu ·{' '}
                    {gradeResult.passed ? 'Đạt yêu cầu (≥ 60%)' : 'Chưa đạt (< 60%)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-ink-800 hover:bg-slate-50 cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                Làm lại
              </button>
            </div>
          )}

          {submitError && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
              {submitError}
            </div>
          )}

          {exercise.questions.map((question, idx) => {
            const qGrade = gradeResult?.results.find((r) => r.question_id === question.id)

            const totalBlanks =
              question.question_type === 'fill_blank'
                ? question.blanks?.length ?? question.blank_count ?? 1
                : 0

            const contentSegments =
              question.question_type === 'fill_blank'
                ? question.content.split(/(_{3,})/g)
                : []

            let renderedInlineBlanks = 0
            const normalizeBlank = (raw: string) => {
              const collapsed = raw.trim().replace(/\s+/g, ' ')
              return question.question_type === 'fill_blank' && question.case_sensitive
                ? collapsed
                : collapsed.toLowerCase()
            }

            const renderInlineBlankInput = (blankIdx: number) => {
              const value = fillInputs[question.id]?.[blankIdx] ?? ''
              const blankAccepted = qGrade?.accepted_answers_per_blank?.[blankIdx]
              const isBlankCorrect = Boolean(
                blankAccepted &&
                  normalizeBlank(value) &&
                  blankAccepted.some((ans) => normalizeBlank(ans) === normalizeBlank(value))
              )

              let inputTone =
                'border-slate-300 bg-white text-ink-900 focus:border-brand-600 focus:ring-1 focus:ring-brand-600'
              if (qGrade) {
                inputTone = isBlankCorrect
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                  : 'border-rose-400 bg-rose-50 text-rose-700'
              }

              return (
                <input
                  key={`blank-${blankIdx}`}
                  type="text"
                  aria-label={`Ô trống ${blankIdx + 1}`}
                  disabled={Boolean(gradeResult)}
                  value={value}
                  onChange={(e) =>
                    updateFillInput(question.id, blankIdx, e.target.value, totalBlanks)
                  }
                  placeholder="___"
                  style={{ width: `${Math.max(10, value.length + 3)}ch` }}
                  className={`mx-1.5 my-0.5 inline-block h-7 min-w-[84px] max-w-full rounded-md border px-2 text-center text-xs font-semibold outline-none transition-colors ${inputTone}`}
                />
              )
            }

            return (
              <div
                key={question.id}
                className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/40 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  {question.question_type === 'fill_blank' ? (
                    <div className="text-xs font-bold leading-loose text-ink-900">
                      <span className="mr-1.5 text-brand-600">Câu {idx + 1}.</span>
                      {contentSegments.map((segment, segIdx) => {
                        if (/^_{3,}$/.test(segment) && renderedInlineBlanks < totalBlanks) {
                          const currentBlankIdx = renderedInlineBlanks
                          renderedInlineBlanks += 1
                          return renderInlineBlankInput(currentBlankIdx)
                        }
                        return <span key={`seg-${segIdx}`}>{segment}</span>
                      })}
                    </div>
                  ) : (
                    <p className="text-xs font-bold leading-relaxed text-ink-900">
                      <span className="mr-1.5 text-brand-600">Câu {idx + 1}.</span>
                      {question.content}
                    </p>
                  )}
                  <span className="shrink-0 rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[10.5px] font-bold text-ink-600">
                    {question.points} điểm
                  </span>
                </div>

                {question.question_type === 'multiple_choice' ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-ink-500">
                      {question.allow_multiple ? 'Chọn nhiều đáp án đúng' : 'Chọn 1 đáp án đúng'}
                    </p>
                    {question.options.map((opt, optIdx) => {
                      const selected = (mcSelections[question.id] ?? []).includes(optIdx)
                      const isCorrectOption = qGrade?.correct_indices?.includes(optIdx) ?? false

                      let optionClass = 'border-slate-200 bg-white text-ink-900 hover:bg-slate-50'
                      if (gradeResult) {
                        if (isCorrectOption) {
                          optionClass = 'border-emerald-300 bg-emerald-50 text-emerald-900'
                        } else if (selected && !isCorrectOption) {
                          optionClass = 'border-rose-300 bg-rose-50 text-rose-800'
                        }
                      } else if (selected) {
                        optionClass = 'border-brand-500 bg-brand-50 text-brand-800'
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={Boolean(gradeResult)}
                          onClick={() => toggleMcOption(question.id, optIdx, question.allow_multiple)}
                          className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors cursor-pointer disabled:cursor-default ${optionClass}`}
                        >
                          <span className="font-mono text-[11px] font-bold">
                            {optionLabel(optIdx)}.
                          </span>
                          <span className="flex-1">{opt}</span>
                          {gradeResult && isCorrectOption && (
                            <span className="text-[10.5px] font-bold text-emerald-700">Đáp án đúng</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <>
                    {renderedInlineBlanks < totalBlanks && (
                      <div className="flex flex-wrap items-center gap-2">
                        {Array.from(
                          { length: totalBlanks - renderedInlineBlanks },
                          (_, offset) => {
                            const blankIdx = renderedInlineBlanks + offset
                            return (
                              <div key={blankIdx} className="flex items-center gap-1">
                                <span className="text-[11px] font-bold text-ink-600">
                                  Ô #{blankIdx + 1}:
                                </span>
                                {renderInlineBlankInput(blankIdx)}
                              </div>
                            )
                          }
                        )}
                      </div>
                    )}

                    {qGrade?.accepted_answers_per_blank && qGrade.accepted_answers_per_blank.length > 0 && (
                      <div className="space-y-0.5 text-[11px] text-emerald-700">
                        {qGrade.accepted_answers_per_blank.map((accepted, blankIdx) => (
                          <p key={blankIdx}>
                            {qGrade.accepted_answers_per_blank && qGrade.accepted_answers_per_blank.length > 1
                              ? `Ô #${blankIdx + 1} — đáp án chấp nhận: `
                              : 'Đáp án chấp nhận: '}
                            <strong>{accepted.join(' / ')}</strong>
                          </p>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {qGrade && (
                  <p
                    className={`text-[11px] font-bold ${
                      qGrade.is_correct ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {qGrade.is_correct
                      ? `Chính xác (+${qGrade.earned_points} điểm)`
                      : `Chưa chính xác (0/${qGrade.max_points} điểm)`}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Đóng
          </button>
          {!gradeResult && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSubmit()}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 px-4 text-xs font-bold text-white shadow-[0_2px_8px_rgba(200,16,46,0.25)] hover:from-brand-500 hover:to-brand-600 disabled:opacity-60 cursor-pointer"
            >
              {submitting ? <LoaderCircle className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              <span>Nộp bài</span>
            </button>
          )}
        </footer>
      </section>
    </div>
  )
}
