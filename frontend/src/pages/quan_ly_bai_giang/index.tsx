import { useEffect, useState } from 'react'
import {
  CirclePlay,
  Clock3,
  Layers,
  LoaderCircle,
  Plus,
} from 'lucide-react'
import { Sidebar } from '../quan_ly_nguoi_dung/components/Sidebar'
import { TopHeader } from '../quan_ly_nguoi_dung/components/TopHeader'
import { courseCatalogApi } from '../courses/services/courseCatalogApi'
import type { CourseReference } from '../courses/course-data'

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Cơ bản',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao',
}

function readCourseId(): string {
  return new URLSearchParams(window.location.search).get('courseId') ?? ''
}

/**
 * Trang quản lý các bài giảng của MỘT khóa học.
 * Route: /admin/lessons?courseId=<id> — bấm từ nút "Quản lý N bài giảng" trên thẻ khóa học.
 * Dữ liệu bài giảng lấy từ danh mục công khai (GET /api/courses/:id, chỉ khóa Công khai
 * trả về topics/lessons). Khóa Lưu trữ/Nháp chưa có endpoint backend riêng nên hiển thị
 * trạng thái trống — sẽ nối API bài giảng đầy đủ sau.
 */
export function QuanLyBaiGiangKhoaHocPage() {
  const courseId = readCourseId()
  const [course, setCourse] = useState<CourseReference | null>(null)
  const [loading, setLoading] = useState(Boolean(courseId))
  const [loadError, setLoadError] = useState<string | null>(
    courseId ? null : 'Không xác định được khóa học — thiếu courseId trên địa chỉ trang.'
  )

  useEffect(() => {
    if (!courseId) return
    let cancelled = false
    courseCatalogApi
      .get(courseId)
      .then((data) => {
        if (cancelled) return
        setCourse(data)
        setLoadError(null)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setCourse(null)
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Không thể tải thông tin khóa học.'
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [courseId])

  const totalLessons = course?.modules.reduce((sum, topic) => sum + topic.lessons.length, 0) ?? 0

  const navigateAdmin = (tab: string) => {
    if (tab === 'quan_ly_nguoi_dung') window.location.assign('/admin/users')
    if (tab === 'khoa_hoc_bai_tap') window.location.assign('/admin/courses')
    if (tab === 'thanh_toan') window.location.assign('/admin/payments')
  }

  return (
    <div className="user-management-page-container">
      <Sidebar activeTab="khoa_hoc_bai_tap" onTabChange={navigateAdmin} />
      <div className="user-management-main-wrapper">
        <TopHeader
          breadcrumb={[
            { label: 'Quản lý khóa học', href: '/admin/courses' },
            { label: 'Quản lý bài giảng' },
          ]}
        />

        <main className="min-h-screen bg-white px-8 py-8">
          <div className="flex flex-col gap-8 pb-16">
            {/* Thanh tiêu đề + hành động */}
            <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-6">
              <div className="flex min-w-0 flex-col gap-2">
                <h1 className="text-2xl font-bold leading-8 text-ink-900">Quản lý bài giảng</h1>
                {course && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-ink-900/85 px-2 py-1 text-[11px] font-semibold text-white">
                      {course.category}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-ink-900">
                      {LEVEL_LABELS[course.level] ?? course.level}
                    </span>
                    <span className="font-medium text-brand-700">{course.title}</span>
                    <span className="flex items-center gap-1 text-xs text-ink-500">
                      <Layers size={13} className="text-ink-400" />
                      {totalLessons} bài giảng trong {course.modules.length} chủ đề
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => window.location.assign(`/admin/lessons/new?courseId=${courseId}`)}
                className="flex h-[34px] shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                <Plus className="size-3.5 shrink-0" aria-hidden />
                Thêm bài giảng
              </button>
            </div>

            {/* Danh sách bài giảng theo chủ đề */}
            {loading ? (
              <div className="flex items-center gap-2 py-16 text-sm text-ink-500">
                <LoaderCircle size={16} className="animate-spin" />
                Đang tải bài giảng…
              </div>
            ) : course && course.modules.length > 0 ? (
              <div className="flex flex-col gap-6">
                {course.modules.map((topic, topicIndex) => (
                  <section
                    key={topic.id}
                    className="overflow-hidden rounded-lg border border-slate-200 bg-white"
                  >
                    <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded bg-brand-50 text-xs font-bold text-brand-600">
                          {topicIndex + 1}
                        </span>
                        <div className="min-w-0">
                          <h2 className="truncate text-sm font-semibold text-ink-900">{topic.title}</h2>
                          {topic.description && (
                            <p className="truncate text-xs text-ink-500">{topic.description}</p>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-ink-500">
                        {topic.lessons.length} bài
                      </span>
                    </header>
                    <ol className="divide-y divide-slate-100">
                      {topic.lessons.map((lesson, lessonIndex) => (
                        <li
                          key={`${topic.id}-${lessonIndex}`}
                          className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50"
                        >
                          <CirclePlay className="size-4 shrink-0 text-brand-600" aria-hidden />
                          <span className="min-w-0 flex-1 truncate text-sm text-ink-900">
                            {lesson}
                          </span>
                          {/* Thời lượng hiển thị khi backend trả về duration_seconds cho admin */}
                          <span className="flex shrink-0 items-center gap-1 text-[11px] text-ink-400">
                            <Clock3 size={12} />
                            —
                          </span>
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white text-center">
                <span className="flex size-14 items-center justify-center rounded-lg bg-brand-50">
                  <Layers size={26} className="text-brand-600" />
                </span>
                <strong className="text-sm font-semibold text-ink-900">Chưa có bài giảng nào</strong>
                <p className="max-w-md text-xs leading-relaxed text-ink-500">
                  {loadError
                    ? <>Không tải được nội dung khóa học: {loadError}<br />Khóa ở trạng thái Lưu trữ/Nháp chưa có API riêng để đọc bài giảng.</>
                    : 'Khóa học này chưa có chủ đề và bài giảng. Bấm "Thêm bài giảng" để tạo bài giảng đầu tiên.'}
                </p>
                {courseId && (
                  <button
                    type="button"
                    onClick={() => window.location.assign(`/admin/lessons/new?courseId=${courseId}`)}
                    className="mt-1 flex h-[34px] items-center gap-2 rounded bg-brand-600 px-4 text-xs font-semibold text-white hover:bg-brand-700"
                  >
                    <Plus className="size-3.5" aria-hidden />
                    Thêm bài giảng
                  </button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default QuanLyBaiGiangKhoaHocPage
