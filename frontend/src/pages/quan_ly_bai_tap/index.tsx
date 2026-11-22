import { ClipboardList, Plus } from 'lucide-react'
import { Sidebar } from '../quan_ly_nguoi_dung/components/Sidebar'
import { TopHeader } from '../quan_ly_nguoi_dung/components/TopHeader'

/**
 * Trang quản lý bài tập dành cho Admin.
 * Hiện mới chỉ có giao diện theo thiết kế mới — backend chưa có module exercises
 * (bảng exercises/questions đã có trong schema nhưng chưa có API), nên trang hiển thị
 * trạng thái trống. Sẽ nối dữ liệu thật sau khi backend triển khai endpoint exercises.
 */
export function QuanLyBaiTapPage() {
  const navigateAdmin = (tab: string) => {
    if (tab === 'quan_ly_nguoi_dung') window.location.assign('/admin/users')
    if (tab === 'khoa_hoc_bai_tap') window.location.assign('/admin/courses')
    if (tab === 'thanh_toan') window.location.assign('/admin/payments')
  }

  return (
    <div className="user-management-page-container">
      <Sidebar activeTab="khoa_hoc_bai_tap" onTabChange={navigateAdmin} />
      <div className="user-management-main-wrapper">
        <TopHeader currentPage="Quản lý bài tập" />

        <main className="min-h-screen bg-white px-8 py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-ink-900">Quản lý Bài tập</h1>
              <p className="mt-1 max-w-xl text-sm text-ink-500">
                Quản lý ngân hàng bài tập, câu hỏi và điểm số của học viên trên YourEnglishVoice
              </p>
            </div>
            {/* TODO: mở form tạo bài tập mới sau khi backend có API exercises */}
            <button
              type="button"
              disabled
              title="Tính năng sẽ được cập nhật sau"
              className="flex h-[38px] items-center gap-2 rounded bg-brand-600 px-4 text-xs font-semibold text-white opacity-60"
            >
              <Plus size={14} />
              Thêm bài tập mới
            </button>
          </div>

          <section
            aria-label="Danh sách bài tập"
            className="mt-6 flex min-h-[480px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white text-center"
          >
            <span className="flex size-14 items-center justify-center rounded-lg bg-brand-50">
              <ClipboardList size={26} className="text-brand-600" />
            </span>
            <strong className="text-sm font-semibold text-ink-900">Chưa có bài tập nào</strong>
            <p className="max-w-sm text-xs leading-relaxed text-ink-500">
              Tính năng quản lý bài tập sẽ được tích hợp sau khi API bài tập trên backend sẵn sàng.
              Hiện số liệu đang để trống (0 bài tập).
            </p>
          </section>
        </main>
      </div>
    </div>
  )
}

export default QuanLyBaiTapPage
