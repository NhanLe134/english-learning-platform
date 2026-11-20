import { Eye, Save } from 'lucide-react'
import { Sidebar } from '../quan_ly_nguoi_dung/components/Sidebar'
import { TopHeader } from '../quan_ly_nguoi_dung/components/TopHeader'
import { LessonInfoSection } from './components/LessonInfoSection'
import { VideoSourceSection } from './components/VideoSourceSection'
import { ExercisesSection } from './components/ExercisesSection'
import { PublishSideCards } from './components/PublishSideCards'

/**
 * Trang "Thêm bài giảng & Bài tập tương tác".
 * Route: /admin/lessons/new (ADMIN) và /teacher/lessons/new (giảng viên).
 * Hiện chỉ có giao diện tĩnh theo thiết kế Figma, tích hợp API sẽ làm sau.
 */
export default function ThemBaiGiangPage() {
  const courseId = new URLSearchParams(window.location.search).get('courseId') ?? ''

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
            {
              label: 'Quản lý bài giảng',
              href: courseId ? `/admin/lessons?courseId=${courseId}` : '/admin/lessons',
            },
            { label: 'Thêm bài giảng & Bài tập' },
          ]}
        />

        <main className="min-h-screen bg-white px-8 py-8">
          <div className="flex flex-col gap-8 pb-16">
            {/* Thanh tiêu đề + hành động */}
            <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-6">
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
