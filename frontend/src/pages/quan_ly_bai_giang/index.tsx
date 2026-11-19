import { ChevronRight, Eye, Save } from 'lucide-react'
import { AdminSidebar } from './components/AdminSidebar'
import { TeacherHeader } from './components/TeacherHeader'
import { LessonInfoSection } from './components/LessonInfoSection'
import { VideoSourceSection } from './components/VideoSourceSection'
import { ExercisesSection } from './components/ExercisesSection'
import { PublishSideCards } from './components/PublishSideCards'

const PAGE_BREADCRUMB = ['Học thuật', 'Quản lý Khoá học', 'IELTS Intensive Speaking & Writing']

/**
 * Trang "Thêm bài giảng & Bài tập tương tác" cho role giảng viên.
 * Route: /teacher/lessons/new. Hiện chỉ có giao diện tĩnh theo thiết kế Figma,
 * tích hợp API sẽ làm sau.
 */
export default function QuanLyBaiGiangPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar />

      <div className="ml-64">
        <TeacherHeader />

        <main className="bg-white px-8 pt-8 pb-16">
          <div className="flex flex-col gap-8 pb-16">
            {/* Thanh tiêu đề + hành động */}
            <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-6">
              <div className="flex flex-col gap-1.5">
                <nav className="flex items-center gap-2 text-xs" aria-label="Breadcrumb trang">
                  {PAGE_BREADCRUMB.map((item) => (
                    <span key={item} className="flex items-center gap-2 whitespace-nowrap">
                      <span className="text-ink-500">{item}</span>
                      <ChevronRight className="size-2 shrink-0 text-ink-500" aria-hidden />
                    </span>
                  ))}
                  <span className="whitespace-nowrap font-medium text-brand-700">
                    Thêm bài giảng mới
                  </span>
                </nav>
                <div className="flex flex-col gap-3">
                  <h1 className="text-2xl font-bold leading-8 text-ink-900">
                    Thêm bài giảng &amp; Bài tập tương tác
                  </h1>
                  <span className="flex w-fit items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1">
                    <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
                    <span className="text-xs font-semibold leading-4 text-amber-700">
                      Trạng thái: Bản nháp (Draft)
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="flex h-[34px] cursor-pointer items-center gap-2 whitespace-nowrap rounded border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-ink-900 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand-500"
                >
                  <Eye className="size-3.5 shrink-0 text-ink-500" aria-hidden />
                  Xem trước (Student View)
                </button>
                <button
                  type="button"
                  className="flex h-[34px] cursor-pointer items-center gap-2 whitespace-nowrap rounded border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-ink-500 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand-500"
                >
                  <Save className="size-3.5 shrink-0" aria-hidden />
                  Lưu bản nháp
                </button>
              </div>
            </div>

            {/* Lưới chính: 70% cột trái / 30% cột phải */}
            <div className="flex gap-8">
              <div className="flex min-w-0 flex-1 flex-col gap-8">
                <LessonInfoSection />
                <VideoSourceSection />
                <ExercisesSection />
              </div>
              <PublishSideCards />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
