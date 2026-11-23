import { FileText } from 'lucide-react'
import { SectionCard } from './SectionCard'

interface LessonInfoSectionProps {
  title: string
  onTitleChange: (value: string) => void
  description: string
  onDescriptionChange: (value: string) => void
}

/**
 * Section 1: Thông tin cơ bản bài giảng — tiêu đề + mô tả.
 * Bài giảng không còn gắn chủ đề (topic) — lưu thẳng vào khóa.
 */
export function LessonInfoSection({
  title,
  onTitleChange,
  description,
  onDescriptionChange,
}: LessonInfoSectionProps) {
  return (
    <SectionCard
      icon={FileText}
      title="1. Thông tin cơ bản bài giảng"
      subtitle="Tiêu đề học phần, chủ đề/chương và mô tả bài giảng"
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
            value={title}
            maxLength={200}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="VD: Unit 4: Mastering Cohesion & Coherence in IELTS Writing Task 2"
            className="h-[42px] rounded border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
          />
        </div>

        {/* Mô tả bài giảng — text thuần (toolbar trình soạn thảo sẽ hoàn thiện sau) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lesson-description" className="text-[13px] font-semibold leading-[18px] text-ink-900">
            Mô tả bài giảng &amp; Ghi chú học viên
          </label>
          <textarea
            id="lesson-description"
            rows={5}
            value={description}
            maxLength={2000}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="VD: Mục tiêu buổi học, nội dung chính và ghi chú dành cho học viên..."
            className="rounded border border-slate-300 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
          />
        </div>
      </div>
    </SectionCard>
  )
}
