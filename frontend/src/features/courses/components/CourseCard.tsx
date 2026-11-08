import type { ComponentType } from 'react'
import {
  Award,
  Briefcase,
  CalendarDays,
  ChevronRight,
  Mic,
  Sprout,
  Star,
  Target,
  Zap,
} from 'lucide-react'
import {
  type Course,
  type HighlightIcon,
  formatPrice,
} from '../courses-data'

const HIGHLIGHT_ICONS: Record<HighlightIcon, ComponentType<{ className?: string }>> = {
  target: Target,
  bolt: Zap,
  mic: Mic,
  trophy: Award,
  seedling: Sprout,
  briefcase: Briefcase,
}

const GRADIENT_ICON_GRADS: Record<HighlightIcon, string> = {
  target: 'linear-gradient(135deg,#1e3a5f,#3b82f6)',
  bolt: 'linear-gradient(135deg,#7c2d12,#f97316)',
  mic: 'linear-gradient(135deg,#3b0764,#8b5cf6)',
  trophy: 'linear-gradient(135deg,#064e3b,#10b981)',
  seedling: 'linear-gradient(135deg,#713f12,#eab308)',
  briefcase: 'linear-gradient(135deg,#0f172a,#64748b)',
}

/** Ảnh bìa khóa học — dùng ảnh thật nếu có, tạm thời hiển thị gradient + icon */
function CourseCover({ course }: { course: Course }) {
  const Icon = HIGHLIGHT_ICONS[course.highlightIcon]
  return (
    <div
      className="relative h-44 w-full"
      style={{ background: course.image ? undefined : course.gradient }}
    >
      {course.image ? (
        <img
          src={course.image}
          alt={course.title}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="flex size-20 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-sm"
            style={{ background: GRADIENT_ICON_GRADS[course.highlightIcon] }}
          >
            <Icon className="size-10" />
          </span>
        </div>
      )}

      {/* Badges trên ảnh */}
      <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-brand-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          {course.statusLabel}
        </span>
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-ink-700 shadow-sm">
          {course.categoryLabel}
        </span>
      </div>

      {/* Đánh giá */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
        <Star className="size-3.5 fill-amber-400 text-amber-400" />
        {course.rating.toFixed(1)}
        <span className="font-normal text-white/70">
          ({course.reviewCount.toLocaleString('vi-VN')})
        </span>
      </div>
    </div>
  )
}

export function CourseCard({ course }: { course: Course }) {
  const HighlightIcon = HIGHLIGHT_ICONS[course.highlightIcon]

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-lg">
      <CourseCover course={course} />

      <div className="flex flex-1 flex-col p-5">
        {/* Điểm nổi bật + số buổi */}
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold text-brand-600">
            <HighlightIcon className="size-4" />
            {course.highlight}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-ink-500">
            <CalendarDays className="size-3.5" />
            {course.lessons} buổi học
          </span>
        </div>

        <h3 className="mt-3 text-lg font-bold leading-snug text-ink-900 transition-colors group-hover:text-brand-600">
          {course.title}
        </h3>

        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-500">
          {course.description}
        </p>

        {/* Giảng viên */}
        <div className="mt-4 flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: GRADIENT_ICON_GRADS[course.highlightIcon] }}>
            {course.instructor.name
              .replace(/^(ThS\.|Thầy|Cô)\s*/, '')
              .split(' ')
              .map((word) => word[0])
              .slice(0, 2)
              .join('')}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-ink-900">
              {course.instructor.name}
            </p>
            <p className="truncate text-[11px] text-ink-500">
              {course.instructor.credential}
            </p>
          </div>
        </div>

        {/* Giá + CTA */}
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <p className="text-sm text-ink-500 line-through">
              {formatPrice(course.originalPrice)}
            </p>
            <p className="text-xl font-extrabold text-brand-600">
              {formatPrice(course.price)}
            </p>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Xem chi tiết
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </article>
  )
}
