import { useState } from 'react'
import { X } from 'lucide-react'
import type { LessonQuizQuestion, QuizSubmitResult } from '../../them_bai_giang/services/lessonApi'
import { translateErrorMessageToVietnamese } from '../../auth/vietnamese-messages'

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

export interface StudentQuizOverlayProps {
  /** Câu hỏi quiz thật từ backend (không có đáp án đúng) */
  questions: LessonQuizQuestion[]
  lessonTitle: string
  onClose: () => void
  /** Nộp bài lên server chấm điểm */
  onSubmit: (answers: Array<{ question_id: string; selected_index: number }>) => Promise<QuizSubmitResult>
  /** Đủ 60% đúng → hoàn thành bài học */
  onPassed: () => void
  /** Chưa đạt → phát lại video từ đầu */
  onFailed: (message: string) => void
}

/**
 * Popup quiz trắc nghiệm nhỏ đè lên màn hình video — học viên trả lời từng câu,
 * hết câu tự nộp lên server chấm điểm:
 * - Đúng ≥ 60%: 🎉 hoàn thành bài học, popup tự đóng
 * - Chưa đạt: phát lại video từ đầu để làm lại
 */
export function StudentQuizOverlay({
  questions,
  lessonTitle,
  onClose,
  onSubmit,
  onPassed,
  onFailed,
}: StudentQuizOverlayProps) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected, setSelected] = useState<Record<number, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<QuizSubmitResult | null>(null)

  const total = questions.length
  const current = questions[currentIdx]

  function chooseOption(optionIndex: number) {
    if (submitting || result) return
    setSelected((prev) => ({ ...prev, [currentIdx]: optionIndex }))

    // Trả lời xong câu cuối → nộp bài tự động
    if (currentIdx === total - 1) {
      void submitAll({ ...selected, [currentIdx]: optionIndex })
    } else {
      setTimeout(() => setCurrentIdx((idx) => Math.min(idx + 1, total - 1)), 250)
    }
  }

  async function submitAll(finalAnswers: Record<number, number>) {
    setSubmitting(true)
    try {
      const answers = questions.map((q, i) => ({
        question_id: q.id ?? '',
        selected_index: finalAnswers[i] ?? -1,
      }))
      const result = await onSubmit(answers)
      setResult(result)
      if (result.passed) {
        // Đủ 60% → hoàn thành, gọi onPassed (popup sẽ tự đóng qua onAnimationEnd)
        setTimeout(() => onPassed(), 1200)
      }
    } catch (err) {
      onFailed(
        translateErrorMessageToVietnamese(
          err instanceof Error ? err.message : '',
          'Không thể nộp bài. Vui lòng thử lại.',
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Đang hiển thị kết quả chấm điểm
  if (result) {
    const passed = result.passed
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-ink-900/70 backdrop-blur-sm">
        <div className="w-[min(92%,380px)] rounded-2xl bg-white p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div
            className={`mx-auto flex size-14 items-center justify-center rounded-full text-3xl ${
              passed ? 'bg-emerald-100' : 'bg-amber-100'
            }`}
          >
            {passed ? '🎉' : '💪'}
          </div>
          <h3 className={`mt-3 text-lg font-extrabold ${passed ? 'text-emerald-700' : 'text-amber-700'}`}>
            {passed ? 'Chính xác hoàn toàn!' : `Đúng ${result.correct_count}/${result.total} câu`}
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
            {passed
              ? 'Bạn đã hoàn thành bài học này. Tiếp tục với bài học tiếp theo nhé!'
              : 'Chọn đáp án chưa chính xác — video sẽ phát lại từ đầu để bạn ôn tập và làm lại.'}
          </p>
          {!passed && (
            <button
              type="button"
              onClick={() => {
                setResult(null)
                onFailed(
                  `Bạn trả lời đúng ${result.correct_count}/${result.total} câu hỏi. Video phát lại từ đầu để bạn ôn tập!`
                )
              }}
              className="mt-4 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-ink-900 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              Xem lại video từ đầu
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="absolute left-1/2 top-1/2 z-50 w-[min(88%,440px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={`Bài kiểm tra trắc nghiệm bài ${lessonTitle}`}
    >
      {/* Header gọn: câu hiện tại / tổng + nút đóng */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <span className="text-xs font-extrabold uppercase tracking-wider text-brand-600">
          Câu hỏi {currentIdx + 1}/{total}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex size-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-ink-900 cursor-pointer"
          aria-label="Đóng bài kiểm tra"
        >
          <X size={15} />
        </button>
      </div>

      {/* Câu hỏi + 4 đáp án */}
      <div className="px-5 py-4">
        <p className="text-sm font-bold leading-snug text-ink-900">{current?.content}</p>
        <div className="mt-3 flex flex-col gap-2">
          {(current?.options ?? []).map((optionText, optionIndex) => {
            const isSelected = selected[currentIdx] === optionIndex
            return (
              <button
                key={optionIndex}
                type="button"
                onClick={() => chooseOption(optionIndex)}
                className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-xs transition-all cursor-pointer ${
                  isSelected
                    ? 'border-brand-600 bg-brand-50 font-semibold text-ink-900'
                    : 'border-slate-200 bg-white text-ink-700 hover:border-brand-300 hover:bg-brand-50/40'
                }`}
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                    isSelected
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-slate-300 bg-white text-slate-500'
                  }`}
                >
                  {OPTION_LABELS[optionIndex] ?? optionIndex + 1}
                </span>
                <span className="flex-1">{optionText}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
