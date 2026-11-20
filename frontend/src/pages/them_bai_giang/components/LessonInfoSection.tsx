import {
  Bold,
  Braces,
  ChevronDown,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Rows3,
  FileText,
} from 'lucide-react'
import { SectionCard } from './SectionCard'

const TOOLBAR_GROUPS: { icon: typeof Bold; label: string; mono?: string }[][] = [
  [
    { icon: Bold, label: 'Đậm' },
    { icon: Italic, label: 'Nghiêng' },
    { icon: Rows3, label: 'Gạch chân' },
  ],
  [
    { icon: List, label: 'Danh sách' },
    { icon: ListOrdered, label: 'Danh sách đánh số' },
  ],
  [
    { icon: Braces, label: 'Chèn phiên âm IPA', mono: '[IPA]' },
    { icon: Quote, label: 'Trích dẫn' },
    { icon: Link2, label: 'Chèn liên kết' },
  ],
]

const OBJECTIVES = [
  'Nắm vững hệ thống liên kết câu (Discourse Markers & Transitions) ở phổ điểm Band 8.0+.',
  'Phân tích lỗi thường gặp: Overusing mechanical linkers (e.g., Furthermore, Moreover, In addition liên tiếp).',
  'Kỹ thuật Referencing (chỉ từ thay thế) & Lexical Cohesion để tránh lặp từ ngớ ngẩn trong Task 2.',
]

/**
 * Section 1: Thông tin cơ bản bài giảng — tiêu đề, chọn Topic/Chương,
 * trình soạn thảo mô tả & ghi chú học viên.
 */
export function LessonInfoSection() {
  return (
    <SectionCard
      icon={FileText}
      title="1. Thông tin cơ bản bài giảng"
      subtitle="Tiêu đề học phần, cấu trúc phân cấp và tài liệu ghi chú học thuật"
    >
      <div className="flex flex-col gap-4">
        {/* Tiêu đề bài giảng */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lesson-title" className="flex gap-1 text-[13px] font-semibold leading-[18px] text-ink-900">
            Tiêu đề bài giảng
            <span className="text-brand-600" aria-hidden>
              *
            </span>
          </label>
          <input
            id="lesson-title"
            type="text"
            defaultValue="Unit 4: Mastering Cohesion & Coherence in IELTS Writing Task 2"
            className="h-[42px] rounded border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
          />
        </div>

        {/* Chọn Topic / Chương */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lesson-topic" className="text-[13px] font-semibold leading-[18px] text-ink-900">
            Chọn Topic / Chương
          </label>
          <div className="relative">
            <select
              id="lesson-topic"
              defaultValue="chuong-2"
              className="h-[42px] w-full appearance-none rounded border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
            >
              <option value="chuong-1">Chương 1: Foundations of Academic Writing</option>
              <option value="chuong-2">Chương 2: Academic Lexical &amp; Structural Mastery</option>
              <option value="chuong-3">Chương 3: Data Description &amp; Trend Analysis</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-500"
              aria-hidden
            />
          </div>
        </div>

        {/* Mô tả bài giảng & Ghi chú học viên — trình soạn thảo */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold leading-[18px] text-ink-900">
            Mô tả bài giảng &amp; Ghi chú học viên
          </span>
          <div className="overflow-hidden rounded border border-slate-300">
            <div
              className="flex items-center gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2"
              role="toolbar"
              aria-label="Công cụ soạn thảo"
            >
              {TOOLBAR_GROUPS.map((group, groupIndex) => (
                <span key={groupIndex} className="flex items-center gap-1">
                  {groupIndex > 0 && <span className="mx-1 h-4 w-px bg-slate-300" aria-hidden />}
                  {group.map((tool) => (
                    <button
                      key={tool.label}
                      type="button"
                      title={tool.label}
                      className="cursor-pointer rounded-sm px-1.5 py-1.5 text-ink-500 transition-colors hover:bg-slate-100 hover:text-ink-900"
                    >
                      {tool.mono ? (
                        <span className="font-mono text-xs font-medium">{tool.mono}</span>
                      ) : (
                        <tool.icon className="size-3.5" aria-hidden />
                      )}
                    </button>
                  ))}
                </span>
              ))}
            </div>

            <div className="flex flex-col gap-2 bg-white px-4 py-4">
              <p className="text-sm font-medium leading-[22.75px] text-slate-700">
                Mục tiêu buổi học:
              </p>
              <ul className="flex flex-col gap-1 pl-4">
                {OBJECTIVES.map((objective) => (
                  <li key={objective} className="list-disc text-sm leading-[22.75px] text-slate-600">
                    {objective}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-ink-500">
                Lưu ý: Học viên bắt buộc hoàn thành 2 bài tập tương tác ngay dưới video để hệ thống
                ghi nhận giờ học.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}
