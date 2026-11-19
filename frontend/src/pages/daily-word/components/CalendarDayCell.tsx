import React from 'react'
import { Plus, Clock } from 'lucide-react'
import type { LichDangItem } from '../types/dailyWord.types'

interface CalendarDayCellProps {
  dayNumber: number
  dateString: string // YYYY-MM-DD
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  scheduledItem?: LichDangItem
  onSelectDate: (dateString: string) => void
  onAddWordForDate: (dateString: string) => void
}

export const CalendarDayCell: React.FC<CalendarDayCellProps> = ({
  dayNumber,
  dateString,
  isCurrentMonth,
  isToday,
  isSelected,
  scheduledItem,
  onSelectDate,
  onAddWordForDate,
}) => {
  // Ô thuộc tháng khác
  if (!isCurrentMonth) {
    return (
      <div className="min-h-[118px] border-b border-r border-slate-100/70 bg-slate-50/30 p-2.5 text-slate-300 select-none">
        <span className="text-[11px] font-medium">{dayNumber}</span>
      </div>
    )
  }

  const hasWord = Boolean(scheduledItem)

  return (
    <div
      onClick={() => onSelectDate(dateString)}
      className={`group relative flex min-h-[118px] cursor-pointer flex-col justify-between border-b border-r border-slate-100 p-2.5 transition-all duration-150 ${
        isSelected
          ? 'bg-brand-50/30 ring-1.5 ring-brand-600 ring-inset z-10'
          : isToday
          ? 'bg-gradient-to-b from-[#FEF1F2]/80 via-white to-white ring-1 ring-brand-500/70 shadow-[0_2px_8px_rgba(200,16,46,0.06)] z-5'
          : 'bg-white hover:bg-slate-50/70'
      }`}
    >
      {/* Hàng 1: Số ngày & Chấm trạng thái nhỏ gọn */}
      <div className="flex items-center justify-between">
        {isToday ? (
          <span className="inline-flex items-center rounded-full bg-brand-600 px-2 py-0.5 text-[9px] font-bold tracking-wider text-white uppercase shadow-2xs">
            HÔM NAY {dayNumber}
          </span>
        ) : (
          <span
            className={`text-xs font-semibold ${
              hasWord ? 'text-slate-700' : 'text-slate-400'
            }`}
          >
            {dayNumber}
          </span>
        )}

        {/* Chấm tròn trạng thái nhỏ xinh */}
        <span
          className={`size-1.5 rounded-full transition-transform group-hover:scale-125 ${
            isToday
              ? 'bg-brand-600 ring-2 ring-brand-100'
              : hasWord
              ? 'bg-emerald-500 ring-2 ring-emerald-100'
              : 'bg-slate-200'
          }`}
        />
      </div>

      {/* Hàng giữa: Từ vựng & Thông tin nội dung */}
      {hasWord && scheduledItem ? (
        <div className="my-auto flex flex-col pt-1">
          <p
            className={`line-clamp-1 text-[13px] font-bold tracking-tight transition-colors ${
              isToday ? 'text-brand-800' : 'text-slate-900 group-hover:text-brand-600'
            }`}
          >
            {scheduledItem.tu_vung.tu_tieng_anh}
          </p>
          <p className="line-clamp-1 text-[10px] font-mono text-slate-400 font-medium">
            {scheduledItem.tu_vung.phien_am_ipa}
          </p>
          <p className="line-clamp-1 text-[10.5px] text-slate-500 leading-snug mt-0.5">
            {scheduledItem.tu_vung.dinh_nghia_tieng_viet}
          </p>
        </div>
      ) : (
        /* Ô chưa có từ: Nhẹ nhàng, không gây rối mắt, button nhỏ gọn bo tròn đổ bóng tinh tế */
        <div className="my-auto flex flex-col items-center justify-center py-1">
          <p className="text-[10px] font-medium text-slate-300">Chưa có từ</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onAddWordForDate(dateString)
            }}
            className="group/btn mt-1 inline-flex h-5 items-center gap-1 rounded-full border border-slate-200/90 bg-white/95 px-2 text-[9.5px] font-semibold text-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-150 ease-out hover:-translate-y-0.2 hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-600 hover:shadow-[0_2px_5px_rgba(200,16,46,0.12)] active:translate-y-0 active:scale-95 cursor-pointer"
          >
            <Plus className="size-2.5 text-slate-400 group-hover/btn:text-brand-600 transition-colors" />
            <span>word</span>
          </button>
        </div>
      )}

      {/* Hàng đáy: Pill loại từ & Giờ phát */}
      {hasWord && scheduledItem ? (
        <div className="flex items-center justify-between pt-1 border-t border-slate-100/60">
          <span className="rounded-full bg-slate-100/90 px-1.5 py-0.2 text-[9px] font-medium text-slate-600">
            {scheduledItem.tu_vung.tu_loai}
          </span>

          {scheduledItem.trang_thai === 'cho_phat_hanh' ? (
            <span className="flex items-center gap-0.5 text-[9px] font-medium text-slate-400">
              <Clock className="size-2.5 text-slate-300" />
              {scheduledItem.gio_phat_hanh.substring(0, 5)}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="h-2" />
      )}
    </div>
  )
}
