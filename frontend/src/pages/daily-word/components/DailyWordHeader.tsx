import React from 'react'
import {
  Sparkles,
  Calendar,
  ListFilter,
  Layers,
  Bell,
  ChevronRight,
  Trash2,
} from 'lucide-react'

interface DailyWordHeaderProps {
  onToggleSmartParser: () => void
  showSmartParser: boolean
  viewMode: 'calendar' | 'list'
  onViewModeChange: (mode: 'calendar' | 'list') => void
  onOpenManualModal?: () => void
  onDownloadTemplate?: () => void
  onCleanupOldData?: () => void
  isCleaningUp?: boolean
}

export const DailyWordHeader: React.FC<DailyWordHeaderProps> = ({
  onToggleSmartParser,
  showSmartParser,
  viewMode,
  onViewModeChange,
  onCleanupOldData,
  isCleaningUp = false,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      {/* Top Navbar */}
      <div className="flex h-14 items-center justify-between border-b border-slate-100 px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
            <span className="flex size-7.5 items-center justify-center rounded-lg bg-brand-600 text-white shadow-xs">
              <Layers className="size-4" strokeWidth={2.5} />
            </span>
            <span className="text-sm font-extrabold tracking-tight text-ink-900">
              YourEnglishVoice
            </span>
          </a>

          <div className="mx-2 h-3.5 w-px bg-slate-200" />

          <nav className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Nội dung học tập</span>
            <ChevronRight className="size-3 text-slate-400" />
            <span className="font-bold text-ink-900">Daily Word &amp; Lịch đăng</span>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink-900 cursor-pointer"
            title="Thông báo"
          >
            <Bell className="size-4" strokeWidth={2} />
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-brand-600 ring-2 ring-white" />
          </button>

          <div className="mx-0.5 h-4 w-px bg-slate-200" />

          <div className="flex items-center gap-2 pl-1">
            <div className="flex size-7 items-center justify-center rounded-full bg-brand-50 text-[11px] font-extrabold text-brand-700 ring-1 ring-brand-200">
              NT
            </div>
            <div className="hidden text-left text-xs leading-none sm:block">
              <p className="font-bold text-ink-900 text-xs">Nguyễn Thanh Tùng</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Content Admin</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Header Title & Buttons - Gọn gàng ép sát bên phải */}
      <div className="px-6 py-4 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold text-brand-600">
              <span>Hệ thống</span>
              <ChevronRight className="size-2.5" />
              <span>Daily Word &amp; Lịch phát hành</span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-ink-900 sm:text-2xl">
              Daily Word &amp; Lịch đăng tự động
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Quản lý kho từ vựng mỗi ngày, tự động nhận diện file dữ liệu và đồng bộ lịch phát hành cho học viên.
            </p>
          </div>

          {/* Cụm Buttons: Tối giản, nằm gọn gàng qua bên phải */}
          <div className="flex flex-wrap items-center justify-start md:justify-end gap-2.5 md:ml-auto shrink-0">
            {/* Nút Dọn dẹp dữ liệu cũ hơn 2 tháng để làm nhẹ database */}
            {onCleanupOldData && (
              <button
                type="button"
                onClick={onCleanupOldData}
                disabled={isCleaningUp}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2.5 text-[11.5px] font-semibold text-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50/50 hover:text-red-700 active:translate-y-0 active:scale-98 disabled:opacity-50 cursor-pointer"
                title="Dọn dẹp các từ vựng và lịch đăng cũ hơn 2 tháng trước để giảm tải database"
              >
                <Trash2 className="size-3.5 text-slate-400 group-hover:text-red-600" />
                <span className="hidden sm:inline">
                  {isCleaningUp ? 'Đang dọn...' : 'Dọn dẹp (>2 tháng)'}
                </span>
              </button>
            )}

            {/* Nạp file thông minh / Đóng bộ nạp */}
            <button
              type="button"
              onClick={onToggleSmartParser}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-[11.5px] font-bold text-white transition-all duration-150 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-98 whitespace-nowrap cursor-pointer ${
                showSmartParser
                  ? 'bg-slate-800 shadow-[0_2px_6px_rgba(15,23,42,0.18)] hover:bg-slate-900 hover:shadow-[0_4px_10px_rgba(15,23,42,0.25)] ring-1 ring-slate-700/50'
                  : 'bg-brand-600 shadow-[0_2px_8px_rgba(200,16,46,0.25)] hover:bg-brand-700 hover:shadow-[0_4px_12px_rgba(200,16,46,0.35)] ring-1 ring-brand-700/30'
              }`}
            >
              <Sparkles className="size-3.5" />
              <span>{showSmartParser ? 'Đóng bộ nạp' : 'Nạp file'}</span>
            </button>

            {/* Phân cách nhẹ nhàng */}
            <div className="hidden h-4 w-px bg-slate-200 sm:block mx-0.5" />

            {/* Segmented Switch View Mode */}
            <div className="inline-flex h-8 items-center rounded-lg bg-slate-100/90 p-0.5 border border-slate-200/60 shadow-2xs">
              <button
                type="button"
                onClick={() => onViewModeChange('calendar')}
                className={`flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-white text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Calendar className="size-3 text-slate-500" />
                <span>Lịch biểu</span>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('list')}
                className={`flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <ListFilter className="size-3 text-slate-500" />
                <span>Danh sách</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
