import { ArrowRight, CheckCircle2, Clock } from 'lucide-react'
import { featuredCourses } from '../home-data'

export function CoursesSection() {
  return (
    <section className="bg-white">
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

        <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {featuredCourses.map((course) => {
            const Icon = course.icon
            return (
              <article
                key={course.id}
                className="relative flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-gray-50 transition-shadow hover:shadow-lg"
              >
                {/* Tag danh mục + nhãn nổi bật */}
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
                    {course.tag}
                  </span>
                  {course.popular && (
                    <span className="rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">
                      Phổ biến nhất
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="text-lg font-bold text-ink-900">
                    {course.title}
                  </h3>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-ink-500">
                  {course.description}
                </p>

                <ul className="mt-4 space-y-2.5 text-sm text-ink-700">
                  <li className="flex items-start gap-2">
                    <Clock className="mt-0.5 size-4 shrink-0 text-brand-600" />
                    {course.duration}
                  </li>
                  {course.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-600" />
                      {benefit}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className="mt-6 w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
                >
                  Xem chi tiết
                </button>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
