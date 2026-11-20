import {
  Clock,
  CloudUpload,
  Copy,
  FilePlus2,
  GripVertical,
  Lightbulb,
  ListChecks,
  PenLine,
  Plus,
  Trash2,
  Check,
} from 'lucide-react'
import { SectionCard } from './SectionCard'

const ADD_EXERCISE_ACTIONS = [
  { icon: Plus, label: 'Thêm câu trắc nghiệm (Multiple Choice)' },
  { icon: PenLine, label: 'Thêm câu điền từ (Gap-Fill)' },
  { icon: FilePlus2, label: 'Thêm bài tự luận / Nộp bài Writing' },
  { icon: CloudUpload, label: 'Đính kèm bài tập file PDF/Audio' },
]

const MCQ_OPTIONS = [
  { letter: 'A', text: 'On the flip side...', note: 'Spoken style', correct: false },
  { letter: 'B', text: 'By way of contrast...', note: undefined, correct: true },
  { letter: 'C', text: 'Anyway...', note: undefined, correct: false },
  { letter: 'D', text: 'Besides that...', note: undefined, correct: false },
]

/**
 * Section 3: Bài tập tương tác bên dưới video — MCQ, Gap-fill,
 * và thanh công cụ thêm dạng bài tập mới.
 */
export function ExercisesSection() {
  return (
    <SectionCard
      icon={ListChecks}
      title={
        <>
          3. Bài tập
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold leading-[16.5px] text-emerald-700">
            2 câu hỏi đã tạo
          </span>
        </>
      }
      subtitle="Học viên sẽ làm bài tập thực hành ngay bên dưới video sau khi xem xong bài giảng."
    >
      <div className="flex flex-col gap-6">
        {/* CÂU HỎI 1 — TRẮC NGHIỆM */}
        <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <GripVertical className="size-3 shrink-0 cursor-grab text-ink-400" aria-hidden />
              <span className="text-xs font-bold text-ink-900">CÂU HỎI 1 (TRẮC NGHIỆM)</span>
              <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-sm border border-amber-200 bg-amber-50 px-1.5 py-0.5">
                <Clock className="size-2.5 text-amber-800" aria-hidden />
                <span className="font-mono text-[11px] font-medium leading-[16.5px] text-amber-800">
                  Mốc video: 08:30
                </span>
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" className="cursor-pointer p-1 text-ink-400 transition-colors hover:text-ink-700" aria-label="Nhân bản câu hỏi">
                <Copy className="size-3" aria-hidden />
              </button>
              <button type="button" className="cursor-pointer p-1 text-ink-400 transition-colors hover:text-brand-600" aria-label="Xóa câu hỏi">
                <Trash2 className="size-3" aria-hidden />
              </button>
            </div>
          </div>

          {/* Nội dung câu hỏi */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="q1-stem" className="text-[13px] font-semibold leading-[18px] text-ink-900">
              Nội dung câu hỏi
            </label>
            <textarea
              id="q1-stem"
              rows={2}
              defaultValue="Which linking phrase best introduces an opposing argument without creating informal spoken tone?"
              className="resize-none rounded border border-slate-300 bg-white px-3.5 py-2.5 text-sm leading-5 text-ink-900 focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Các lựa chọn */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[13px] font-semibold leading-[18px] text-ink-900">
              Các lựa chọn &amp; Đáp án đúng
            </span>
            {MCQ_OPTIONS.map((option) =>
              option.correct ? (
                <div
                  key={option.letter}
                  className="flex items-center gap-3 rounded border border-emerald-300 bg-emerald-50 px-3 py-3"
                >
                  <span className="flex size-4 items-center justify-center rounded-full bg-emerald-600">
                    <Check className="size-2 text-white" aria-hidden />
                  </span>
                  <span className="font-mono text-xs font-medium text-emerald-800">{option.letter}.</span>
                  <span className="flex-1 text-sm font-medium text-emerald-950">{option.text}</span>
                  <span className="flex items-center gap-1 rounded-sm bg-emerald-100 px-1.5 py-0.5">
                    <Check className="size-2 text-emerald-800" aria-hidden />
                    <span className="text-[11px] font-semibold leading-[16.5px] text-emerald-800">
                      Đáp án đúng
                    </span>
                  </span>
                </div>
              ) : (
                <div
                  key={option.letter}
                  className="flex items-center gap-3 rounded border border-slate-200 bg-white px-3 py-3"
                >
                  <span className="size-4 rounded-full border border-slate-300 bg-white" aria-hidden />
                  <span className="font-mono text-xs font-medium text-ink-500">{option.letter}.</span>
                  <span className="flex-1 text-sm text-ink-900">{option.text}</span>
                  {option.note && <span className="text-xs text-ink-400">{option.note}</span>}
                </div>
              )
            )}
          </div>

          {/* Giải thích học thuật */}
          <div className="flex flex-col gap-1.5 rounded border border-slate-200 bg-white p-3">
            <span className="flex items-center gap-1 text-[11px] font-semibold leading-[14px] text-ink-500">
              <Lightbulb className="size-2.5 text-amber-500" aria-hidden />
              Giải thích học thuật (Hiển thị sau khi học viên nộp bài)
            </span>
            <p className="text-xs leading-4 text-slate-600">
              "By way of contrast" is a formal academic transitional phrase suitable for C1/C2
              writing. "On the flip side" and "Anyway" are colloquial/dominantly suitable for IELTS
              Task 2.
            </p>
          </div>
        </div>

        {/* CÂU HỎI 2 — ĐIỀN TỪ VÀO CHỖ TRỐNG */}
        <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <GripVertical className="size-3 shrink-0 cursor-grab text-ink-400" aria-hidden />
              <span className="text-xs font-bold text-ink-900">
                CÂU HỎI 2 (ĐIỀN TỪ VÀO CHỖ TRỐNG - VOCABULARY IN CONTEXT)
              </span>
              <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-sm border border-sky-200 bg-sky-50 px-1.5 py-0.5">
                <Clock className="size-2.5 text-sky-800" aria-hidden />
                <span className="font-mono text-[11px] font-medium leading-[16.5px] text-sky-800">
                  Mốc video: 14:20
                </span>
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" className="cursor-pointer p-1 text-ink-400 transition-colors hover:text-ink-700" aria-label="Nhân bản câu hỏi">
                <Copy className="size-3" aria-hidden />
              </button>
              <button type="button" className="cursor-pointer p-1 text-ink-400 transition-colors hover:text-brand-600" aria-label="Xóa câu hỏi">
                <Trash2 className="size-3" aria-hidden />
              </button>
            </div>
          </div>

          {/* Lời nhắc / Hướng dẫn đề bài */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="q2-instruction" className="text-[13px] font-semibold leading-[18px] text-ink-900">
              Lời nhắc / Hướng dẫn đề bài
            </label>
            <input
              id="q2-instruction"
              type="text"
              defaultValue="Học viên nghe đoạn audio/video ở phút 14:20 và điền từ thích hợp vào chỗ trống."
              className="h-[34px] rounded border border-slate-300 bg-white px-3.5 py-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Câu văn chứa vị trí điền khuyết */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="q2-gap" className="text-[13px] font-semibold leading-[18px] text-ink-900">
              Câu văn chứa vị trí điền khuyết (Sử dụng [từ_khóa] để tạo ô trống)
            </label>
            <div className="flex flex-col gap-2 rounded border border-slate-300 bg-white p-3.5">
              <p className="text-sm leading-[22.75px] text-slate-800">
                The argument presented by the author is notably{' '}
                <span className="rounded-sm border border-slate-200 bg-brand-50 px-1.5 py-0.5 font-mono text-xs font-medium text-brand-700">
                  [eloquent]
                </span>{' '}
                and backed by robust empirical data.
              </p>
              <p className="text-[11px] leading-[16.5px] text-ink-500">
                Học viên sẽ thấy: The argument presented by the author is notably [ . . . . . . . .
                ] and backed by robust…
              </p>
            </div>
          </div>

          {/* Đáp án chấp nhận */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="q2-exact" className="text-[13px] font-semibold leading-[18px] text-ink-900">
                Từ khoá chính xác (Exact Match)
              </label>
              <input
                id="q2-exact"
                type="text"
                defaultValue="eloquent"
                className="h-[34px] rounded border border-slate-300 bg-white px-3.5 py-2 font-mono text-xs font-medium text-ink-900 focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="q2-synonyms" className="text-[13px] font-semibold leading-[18px] text-ink-900">
                Từ đồng nghĩa được chấp nhận (Cách nhau dấu phẩy)
              </label>
              <input
                id="q2-synonyms"
                type="text"
                defaultValue="persuasive, articulate"
                className="h-[34px] rounded border border-slate-300 bg-white px-3.5 py-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Thanh thêm dạng bài tập */}
        <div className="flex flex-col gap-3 rounded-lg border-2 border-slate-200 bg-slate-50 p-4">
          <span className="text-xs font-semibold text-ink-500">THÊM DẠNG BÀI TẬP TƯƠNG TÁC</span>
          <div className="flex flex-wrap gap-2.5">
            {ADD_EXERCISE_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                className="flex h-[34px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-ink-900 transition-colors hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                <action.icon className="size-3.5 shrink-0 text-brand-600" aria-hidden />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  )
}
