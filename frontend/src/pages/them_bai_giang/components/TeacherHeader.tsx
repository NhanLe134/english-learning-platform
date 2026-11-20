import { Bell, ChevronRight } from 'lucide-react'

const BREADCRUMB = ['Giảng dạy', 'Quản lý Khoá học']

/**
 * Header sticky cao 64px: breadcrumb bên trái, chuông thông báo + profile bên phải.
 */
export function TeacherHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-base" aria-label="Breadcrumb">
        {BREADCRUMB.map((item) => (
          <span key={item} className="flex items-center gap-2">
            <span className="text-slate-500">{item}</span>
            <ChevronRight className="size-3 text-ink-400" aria-hidden />
          </span>
        ))}
        <span className="font-semibold text-ink-900">Thêm bài giảng &amp; Bài tập</span>
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="relative cursor-pointer rounded-lg p-2 text-ink-500 transition-colors hover:bg-slate-50"
          aria-label="Thông báo"
        >
          <Bell className="size-4" aria-hidden />
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-brand-600" />
        </button>
        <span className="h-5 w-px bg-slate-200" aria-hidden />
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-xl bg-brand-600 text-xs font-bold text-white">
            NT
          </span>
          <span className="flex flex-col">
            <span className="text-xs font-semibold leading-[15px] text-ink-900">
              Nguyễn Thanh Tùng
            </span>
            <span className="text-[11px] leading-none text-ink-500">
              Academic Director
            </span>
          </span>
        </div>
      </div>
    </header>
  )
}
