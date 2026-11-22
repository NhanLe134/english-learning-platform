import { Calendar, ListFilter, Broom, FileUp } from 'lucide-react'

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

/**
 * Thanh tiêu đề + cụm nút hành động của trang Daily Word.
 * Chỉ hiển thị bên DƯỚI TopHeader chung của khung admin — phần navbar riêng
 * (logo, chuông, profile) đã bỏ vì trùng lặp với TopHeader.
 */
export const DailyWordHeader: React.FC<DailyWordHeaderProps> = ({
  onToggleSmartParser,
  showSmartParser,
  viewMode,
  onViewModeChange,
  onCleanupOldData,
  isCleaningUp = false,
}) => {
  return (
    <div className="border-b border-slate-200/80 pb-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">
            Daily Word &amp; Lịch đăng tự động
          </h1>
        </div>

        {/* Cụm Buttons: nằm gọn gàng qua bên phải */}
        <div className="flex flex-wrap items-center justify-start md:justify-end gap-2.5 md:ml-auto shrink-0">
          {/* Nút Dọn dẹp dữ liệu cũ hơn 2 tháng để làm nhẹ database (chỉ icon) */}
          {onCleanupOldData && (
            <button
              type="button"
              onClick={onCleanupOldData}
              disabled={isCleaningUp}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 ease-out hover:bg-slate-50 hover:text-ink-700 active:scale-98 disabled:opacity-50 cursor-pointer"
              title={isCleaningUp ? 'Đang dọn dẹp...' : 'Dọn dẹp dữ liệu cũ hơn 2 tháng'}
              aria-label={isCleaningUp ? 'Đang dọn dẹp' : 'Dọn dẹp dữ liệu cũ hơn 2 tháng'}
            >
              <Broom className="size-4" />
            </button>
          )}

          {/* Nạp file thông minh / Đóng bộ nạp (chỉ icon) */}
          <button
            type="button"
            onClick={onToggleSmartParser}
            aria-pressed={showSmartParser}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 ease-out hover:bg-slate-50 hover:text-ink-700 active:scale-98 cursor-pointer"
            title={showSmartParser ? 'Đóng bộ nạp file' : 'Nạp file xếp lịch tự động'}
            aria-label={showSmartParser ? 'Đóng bộ nạp file' : 'Nạp file xếp lịch tự động'}
          >
            <FileUp className="size-4" />
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
  )
}
