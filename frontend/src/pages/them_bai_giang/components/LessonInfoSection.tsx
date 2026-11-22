import { ChevronDown, FileText, Plus } from 'lucide-react'
import { SectionCard } from './SectionCard'
import type { LessonTopicItem } from '../services/lessonApi'

interface LessonInfoSectionProps {
  title: string
  onTitleChange: (value: string) => void
  topics: LessonTopicItem[]
  topicId: string
  onTopicChange: (topicId: string) => void
  newTopicMode: boolean
  onToggleNewTopic: () => void
  newTopicTitle: string
  onNewTopicTitleChange: (value: string) => void
  description: string
  onDescriptionChange: (value: string) => void
}

/**
 * Section 1: Thông tin cơ bản bài giảng — tiêu đề, chọn Topic/Chương (hoặc
 * tạo nhanh chủ đề mới), mô tả bài giảng. Toolbar trình soạn thảo văn bản
 * sẽ hoàn thiện sau — hiện lưu mô tả dạng text thuần.
 */
export function LessonInfoSection({
  title,
  onTitleChange,
  topics,
  topicId,
  onTopicChange,
  newTopicMode,
  onToggleNewTopic,
  newTopicTitle,
  onNewTopicTitleChange,
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

        {/* Chọn Topic / Chương */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lesson-topic" className="text-[13px] font-semibold leading-[18px] text-ink-900">
            Chọn Topic / Chương
          </label>
          {!newTopicMode ? (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <select
                  id="lesson-topic"
                  value={topicId}
                  onChange={(event) => onTopicChange(event.target.value)}
                  className="h-[42px] w-full appearance-none rounded border border-slate-300 bg-white px-3.5 py-2.5 pr-9 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
                >
                  <option value="">— Chọn chủ đề —</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.title} ({topic.lessons.length} bài)
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-500"
                  aria-hidden
                />
              </div>
              <button
                type="button"
                onClick={onToggleNewTopic}
                title="Tạo chủ đề mới cho khóa học"
                className="flex h-[42px] shrink-0 cursor-pointer items-center gap-1.5 rounded border border-slate-200 bg-white px-3 text-xs font-semibold text-ink-900 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                <Plus className="size-3.5" aria-hidden />
                Chủ đề mới
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                id="lesson-new-topic"
                type="text"
                autoFocus
                value={newTopicTitle}
                maxLength={200}
                onChange={(event) => onNewTopicTitleChange(event.target.value)}
                placeholder="Tên chủ đề mới (VD: Chương 1: Nền tảng)"
                className="h-[42px] flex-1 rounded border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={onToggleNewTopic}
                className="h-[42px] shrink-0 cursor-pointer rounded border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-ink-900"
              >
                Hủy
              </button>
            </div>
          )}
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
