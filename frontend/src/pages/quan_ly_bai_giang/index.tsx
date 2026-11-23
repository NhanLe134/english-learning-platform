import { useCallback, useEffect, useState } from 'react'
import {
  BookOpen,
  CirclePlay,
  Layers,
  LoaderCircle,
  Plus,
} from 'lucide-react'
import { Sidebar } from '../quan_ly_nguoi_dung/components/Sidebar'
import { TopHeader } from '../quan_ly_nguoi_dung/components/TopHeader'
import { LessonPreviewDrawer } from './components/LessonPreviewDrawer'
import { courseCatalogApi } from '../courses/services/courseCatalogApi'
import type { CourseReference } from '../courses/course-data'
import { lessonApi, type LessonTopicItem } from '../them_bai_giang/services/lessonApi'
import { useAuth } from '../auth/auth-context'

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
 * Dữ liệu lấy từ endpoint quản trị GET /api/lessons/courses/:courseId/topics —
 * trả về đầy đủ chủ đề + bài giảng (gồm cả bản nháp) cho ADMIN/TEACHER được phân công.
 * Bấm vào một bài giảng để mở drawer xem trước nội dung (video nhúng, mô tả, trạng thái).
 */
export function QuanLyBaiGiangKhoaHocPage() {
  const { accessToken, refreshSession } = useAuth()
  const courseId = readCourseId()
  const [topics, setTopics] = useState<LessonTopicItem[]>([])
  const [course, setCourse] = useState<CourseReference | null>(null)
  const [loading, setLoading] = useState(Boolean(courseId))
  const [loadError, setLoadError] = useState<string | null>(
    courseId ? null : 'Không xác định được khóa học — thiếu courseId trên địa chỉ trang.'
  )
  const [preview, setPreview] = useState<{ topicTitle: string; lessonIndex: number } | null>(null)

  const loadTopics = useCallback(async () => {
    if (!courseId) return
    try {
      const data = await lessonApi.getTopics(courseId, accessToken, async () => (await refreshSession()).accessToken)
      setTopics(data)
      setLoadError(null)
    } catch (error) {
      setTopics([])
      setLoadError(error instanceof Error ? error.message : 'Không thể tải bài giảng của khóa học.')
    } finally {
      setLoading(false)
    }
  }, [accessToken, courseId, refreshSession])

  useEffect(() => {
    if (!courseId) {
      setLoading(false)
      return
    }
    void loadTopics()
  }, [loadTopics])

  // Lấy thông tin khóa (phân loại, trình độ) — chỉ khóa Công khai có qua catalog, lỗi thì bỏ qua
  useEffect(() => {
    if (!courseId) return
    let cancelled = false
    courseCatalogApi
      .get(courseId)
      .then((data) => {
        if (!cancelled) setCourse(data)
      })
      .catch(() => {
        /* Khóa Lưu trữ/Nháp không có qua catalog — chỉ ẩn chips thông tin */
      })
    return () => {
      cancelled = true
    }
  })

  // Chủ đề không có bài giảng nào thì không hiển thị
  const visibleTopics = topics.filter((topic) => topic.lessons.length > 0)
  const totalLessons = visibleTopics.reduce((sum, topic) => sum + topic.lessons.length, 0)
  const previewTopic = preview
    ? (visibleTopics.find((topic) => topic.title === preview.topicTitle) ?? null)
    : null
  const previewLesson =
    previewTopic && preview ? previewTopic.lessons[preview.lessonIndex] ?? null : null

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
                <div className="flex flex-wrap items-center gap-2">
                  {course && (
                    <>
                      <span className="rounded bg-ink-900/85 px-2 py-1 text-[11px] font-semibold text-white">
                        {course.category}
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-ink-900">
                        {LEVEL_LABELS[course.level] ?? course.level}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-ink-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                        <BookOpen className="size-3.5 text-brand-600" aria-hidden />
                        {course.title}
                      </span>
                    </>
                  )}
                  <span className="flex items-center gap-1 text-xs text-ink-500">
                    <Layers size={13} className="text-ink-400" />
                    {totalLessons} bài giảng
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.location.assign(`/admin/lessons/new?courseId=${courseId}`)}
                className="flex h-[34px] shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded bg-gradient-to-r from-brand-600 to-brand-700 px-3.5 py-2 text-xs font-bold text-white shadow-[0_2px_8px_rgba(200,16,46,0.25)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(200,16,46,0.35)] active:translate-y-0 active:scale-98 focus-visible:outline-2 focus-visible:outline-brand-500"
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
            ) : visibleTopics.length > 0 ? (
              <div className="flex flex-col gap-6">
                {visibleTopics.map((topic, topicIndex) => (
                  <section
                    key={topic.id ?? 'none'}
                    className="overflow-hidden rounded-lg border border-slate-200 bg-white"
                  >
                    {/* Nhóm ảo "Không chia chủ đề" (id null) không hiển thị header */}
                    {topic.id !== null && (
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
                    )}
                    <ol className="divide-y divide-slate-100">
                      {topic.lessons.map((lesson, lessonIndex) => {
                        const isPublished = lesson.status === 'published'
                        return (
                          <li key={lesson.id}>
                            <button
                              type="button"
                              onClick={() => setPreview({ topicTitle: topic.title, lessonIndex })}
                              className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50 cursor-pointer"
                              title={`Xem trước bài giảng "${lesson.title}"`}
                            >
                              <CirclePlay className="size-4 shrink-0 text-brand-600" aria-hidden />
                              <span className="min-w-0 flex-1 truncate text-sm text-ink-900">
                                {lesson.title}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                  isPublished
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border-amber-200 bg-amber-50 text-amber-700'
                                }`}
                              >
                                <span className={`size-1.5 rounded-full ${isPublished ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                {isPublished ? 'Công khai' : 'Bản nháp'}
                              </span>
                            </button>
                          </li>
                        )
                      })}
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
                    ? <>Không tải được nội dung khóa học: {loadError}</>
                    : 'Khóa học này chưa có chủ đề và bài giảng. Bấm "Thêm bài giảng" để tạo bài giảng đầu tiên.'}
                </p>
                {courseId && (
                  <button
                    type="button"
                    onClick={() => window.location.assign(`/admin/lessons/new?courseId=${courseId}`)}
                    className="mt-1 flex h-[34px] items-center gap-2 rounded bg-gradient-to-r from-brand-600 to-brand-700 px-4 text-xs font-bold text-white shadow-[0_2px_8px_rgba(200,16,46,0.25)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(200,16,46,0.35)] active:translate-y-0 active:scale-98"
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

      {/* Drawer xem trước / chỉnh sửa / xóa bài giảng */}
      {previewLesson && previewTopic && (
        <LessonPreviewDrawer
          topicTitle={previewTopic.title}
          lesson={previewLesson}
          onClose={() => setPreview(null)}
          onSaveEdit={async (input) => {
            await lessonApi.updateLesson(input, accessToken, async () => (await refreshSession()).accessToken)
            await loadTopics()
            setPreview(null)
          }}
          onDelete={async () => {
            await lessonApi.deleteLesson(previewLesson.id, accessToken, async () => (await refreshSession()).accessToken)
            await loadTopics()
            setPreview(null)
          }}
        />
      )}
    </div>
  )
}

export default QuanLyBaiGiangKhoaHocPage
