import { useEffect, useState } from 'react'
import { ArrowRight, BookOpen, CalendarDays, LoaderCircle, Users } from 'lucide-react'
import { courseCatalogApi } from '../../courses/services/courseCatalogApi'
import type { CourseReference } from '../../courses/course-data'

export function CoursesSection() {
  const [courses, setCourses] = useState<CourseReference[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void courseCatalogApi
      .list()
      .then((data) => {
        if (!active) return
        setCourses(data)
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách khóa học.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <section id="khoa-hoc" className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
              Chương trình đào tạo
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
              Các khóa học hiện tại
            </h2>
          </div>
          <a
            href="/courses"
            className="flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            Xem tất cả khóa học
            <ArrowRight className="size-4" />
          </a>
        </div>

        {loading ? (
          <div className="mt-12 flex items-center justify-center py-12 text-sm text-ink-500">
            <LoaderCircle className="mr-2 size-5 animate-spin text-brand-600" />
            Đang tải danh sách khóa học…
          </div>
        ) : error ? (
          <div className="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-700">
            {error}
          </div>
        ) : courses.length === 0 ? (
          <div className="mt-8 rounded-xl border border-gray-100 bg-gray-50 p-8 text-center text-sm text-ink-500">
            Hiện chưa có khóa học nào được mở đăng ký.
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {courses.slice(0, 6).map((course) => {
              const courseLink = `/courses/${encodeURIComponent(course.slug)}`
              const priceLabel = `${course.price.toLocaleString('vi-VN')}đ`
              const originalPriceLabel = `${course.originalPrice.toLocaleString('vi-VN')}đ`

              return (
                <article
                  key={course.id}
                  className="relative flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-gray-50 transition-shadow hover:shadow-lg"
                >
                  <div>
                    {/* Header: Category + Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
                        {course.category || 'Tiếng Anh'}
                      </span>
                      {course.level && (
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 capitalize">
                          {course.level}
                        </span>
                      )}
                    </div>

                    {/* Thumbnail / Title */}
                    <div className="mt-4 flex items-center gap-3">
                      {course.thumbnailUrl ? (
                        <img
                          src={course.thumbnailUrl}
                          alt=""
                          className="size-12 rounded-xl object-cover shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <span className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 shrink-0">
                          <BookOpen className="size-6" />
                        </span>
                      )}
                      <h3 className="text-lg font-bold text-ink-900 leading-snug">
                        <a href={courseLink} className="hover:text-brand-600 transition-colors">
                          {course.title}
                        </a>
                      </h3>
                    </div>

                    {course.description && (
                      <p className="mt-3 text-sm leading-relaxed text-ink-500 line-clamp-3">
                        {course.description}
                      </p>
                    )}

                    {/* Meta info: Lessons count & Instructor */}
                    <ul className="mt-4 space-y-2 text-sm text-ink-700">
                      <li className="flex items-center gap-2">
                        <CalendarDays className="size-4 shrink-0 text-brand-600" />
                        <span>{course.totalLessons} bài học</span>
                      </li>
                      {course.instructor && (
                        <li className="flex items-center gap-2">
                          <Users className="size-4 shrink-0 text-brand-600" />
                          <span>Giảng viên: {course.instructor}</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Price and CTA */}
                  <div className="mt-6 border-t border-gray-100 pt-4">
                    <div className="flex items-baseline justify-between gap-2 mb-3">
                      <span className="text-xs text-ink-400">Học phí</span>
                      <div className="flex items-baseline gap-2">
                        {course.originalPrice > course.price && (
                          <del className="text-xs text-ink-400">{originalPriceLabel}</del>
                        )}
                        <strong className="text-base font-bold text-brand-600">
                          {priceLabel}
                        </strong>
                      </div>
                    </div>
                    <a
                      href={courseLink}
                      className="block w-full text-center rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
                    >
                      Xem chi tiết
                    </a>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
