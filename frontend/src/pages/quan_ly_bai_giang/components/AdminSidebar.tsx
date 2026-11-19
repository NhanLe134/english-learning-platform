import { Layers } from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Quản lý bài tập', active: false },
  { label: 'Quản lý khóa học', active: false },
  { label: 'Quản lý bài giảng', active: true },
]

/**
 * Sidebar trái cố định 256px của trang quản trị giảng viên.
 * Thông số theo Figma frame "Thêm bài giảng" (188:2).
 */
export function AdminSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-slate-200 bg-white">
      {/* Logo Branding — cao 64px, icon 36px bo góc 8px */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <span className="flex size-9 items-center justify-center rounded-lg bg-brand-600">
          <Layers className="size-5 text-white" aria-hidden />
        </span>
        <span className="flex flex-col">
          <span className="flex items-center gap-1.5">
            <span className="text-base font-bold leading-none text-ink-900">
              YourEnglishVoice
            </span>
            <span className="rounded-sm border border-brand-100 bg-brand-50 px-1 py-0.5 text-[9px] font-semibold leading-[13.5px] text-brand-600">
              PRO
            </span>
          </span>
          <span className="mt-1 text-[11px] font-medium leading-none text-ink-500">
            Academic Portal
          </span>
        </span>
      </div>

      {/* Navigation Section */}
      <p className="px-4 pt-4 pb-2 pl-6 text-[11px] leading-[16.5px] tracking-wide text-ink-400">
        HỆ THỐNG QUẢN TRỊ
      </p>

      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.label}
            href={item.active ? window.location.pathname : '#'}
            className={
              item.active
                ? 'rounded-lg border border-brand-100 bg-brand-50 px-3 py-2.5 text-base font-semibold leading-6 text-brand-600'
                : 'rounded-lg px-3 py-2.5 text-base leading-6 text-ink-700 transition-colors hover:bg-slate-50'
            }
          >
            {item.label}
          </a>
        ))}
      </nav>
    </aside>
  )
}
