import { Check, Plus, Trash2 } from 'lucide-react'
import { SectionCard } from './SectionCard'

export interface BuilderQuestion {
  content: string
  options: string[]
  correct_index: number
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

interface QuizBuilderSectionProps {
  questions: BuilderQuestion[]
  onChange: (questions: BuilderQuestion[]) => void
  /** Lỗi validate từ lúc bấm Lưu (nếu quiz có nhập mà chưa hợp lệ) */
  error?: string | null
}

/**
 * Section 3: Bài tập tương tác — soạn câu hỏi trắc nghiệm cho bài giảng ĐANG TẠO.
 * Không tự lưu: câu hỏi được gửi kèm payload khi bấm "Lưu bản nháp"/"Xuất bản bài giảng"
 * (một request duy nhất lưu cả bài giảng lẫn quiz).
 */
export function QuizBuilderSection({ questions, onChange, error }: QuizBuilderSectionProps) {
  function updateQuestion(index: number, patch: Partial<BuilderQuestion>) {
    onChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)))
  }

  function updateOption(qIndex: number, oIndex: number, value: string) {
    onChange(
      questions.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) } : q
      )
    )
  }

  return (
    <SectionCard
      icon={Check}
      title="3. Bài tập tương tác — Quiz trắc nghiệm"
      subtitle="Soạn câu hỏi trắc nghiệm hiển thị trên video để kiểm tra sự theo dõi của học viên (tùy chọn — lưu cùng lúc với bài giảng)"
    >
      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Danh sách câu hỏi */}
      {questions.map((question, qIndex) => (
        <div key={qIndex} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <span className="rounded bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">
              CÂU {qIndex + 1}
            </span>
            <button
              type="button"
              onClick={() => onChange(questions.filter((_, i) => i !== qIndex))}
              className="flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-rose-600 transition-colors hover:text-rose-700"
            >
              <Trash2 className="size-3" /> Xóa câu
            </button>
          </div>

          <label className="block">
            <span className="text-xs font-bold text-ink-900">Nội dung câu hỏi</span>
            <textarea
              rows={2}
              value={question.content}
              maxLength={1000}
              onChange={(event) => updateQuestion(qIndex, { content: event.target.value })}
              placeholder="VD: Ý chính của bài học này là gì?"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs leading-relaxed text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
            />
          </label>

          <div className="mt-2.5 space-y-2">
            {question.options.map((option, oIndex) => (
              <div key={oIndex} className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Đánh dấu đáp án đúng ${OPTION_LABELS[oIndex]}`}
                  aria-pressed={question.correct_index === oIndex}
                  onClick={() => updateQuestion(qIndex, { correct_index: oIndex })}
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-colors ${
                    question.correct_index === oIndex
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-300 bg-white text-slate-500 hover:border-emerald-400'
                  }`}
                  title="Đặt làm đáp án đúng"
                >
                  {question.correct_index === oIndex ? <Check className="size-3" /> : OPTION_LABELS[oIndex]}
                </button>
                <input
                  type="text"
                  value={option}
                  maxLength={300}
                  onChange={(event) => updateOption(qIndex, oIndex, event.target.value)}
                  placeholder={`Nội dung đáp án ${OPTION_LABELS[oIndex]}`}
                  className="h-[34px] flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Thêm câu hỏi */}
      <button
        type="button"
        onClick={() =>
          onChange([...questions, { content: '', options: ['', '', '', ''], correct_index: 0 }])
        }
        className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-semibold text-ink-700 transition-colors hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-700"
      >
        <Plus className="size-3.5" /> Thêm câu hỏi
      </button>

      <p className="mt-3 text-[11px] leading-relaxed text-ink-500">
        Câu hỏi sẽ được lưu cùng lần khi bạn bấm "Lưu bản nháp" hoặc "Xuất bản bài giảng" phía trên.
        Học viên trả lời đúng từ 60% số câu trở lên thì bài học được tính là hoàn thành.
      </p>
    </SectionCard>
  )
}
