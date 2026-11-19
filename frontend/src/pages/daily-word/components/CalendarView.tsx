import React from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import type { LichDangItem, ThongKeThang } from '../types/dailyWord.types'
import { CalendarDayCell } from './CalendarDayCell'

interface CalendarViewProps {
  currentYear: number
  currentMonth: number // 1 - 12
  selectedDate: string | null // YYYY-MM-DD
  scheduledItems: LichDangItem[]
  statistics: ThongKeThang
  onPrevMonth: () => void
  onNextMonth: () => void
  onGoToday: () => void
  onSelectDate: (dateString: string) => void
  onAddWordForDate: (dateString: string) => void
}

const WEEKDAYS = [
  { label: 'T2 (Mon)' },
  { label: 'T3 (Tue)' },
  { label: 'T4 (Wed)' },
  { label: 'T5 (Thu)' },
  { label: 'T6 (Fri)' },
  { label: 'T7 (Sat)' },
  { label: 'CN (Sun)' },
]

export const CalendarView: React.FC<CalendarViewProps> = ({
  currentYear,
  currentMonth,
  selectedDate,
  scheduledItems,
  statistics,
  onPrevMonth,
  onNextMonth,
  onGoToday,
  onSelectDate,
  onAddWordForDate,
}) => {
  // Tính số ngày và ngày bắt đầu của tháng
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
  // Lấy ngày đầu tiên trong tuần (0: CN, 1: T2, ..., 6: T7)
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay()
  // Chuyển đổi để Thứ 2 là cột đầu tiên (0: T2 ... 6: CN)
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  // Tính số ngày tháng trước để vẽ ô đệm
  const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate()

  // Tạo map tra cứu nhanh từ vựng theo ngày
  const itemsByDate = new Map<string, LichDangItem>()
  scheduledItems.forEach((item) => {
    itemsByDate.set(item.ngay_phat_hanh, item)
  })

  // Định dạng ngày hôm nay theo thời gian thực tế
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      {/* Top Header: Bộ lọc tháng & Chỉ số phủ kín - Chống rớt dòng tuyệt đối với shrink-0 & whitespace-nowrap */}
      <div className="flex flex-col gap-3.5 border-b border-slate-100 p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Điều hướng tháng & Hôm nay - Không bao giờ bị co rúm hay rớt dòng */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex h-8 shrink-0 items-center rounded-lg border border-slate-200/80 bg-white p-0.5 shadow-2xs whitespace-nowrap">
            <button
              type="button"
              onClick={onPrevMonth}
              className="flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
              title="Tháng trước"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <span className="px-2.5 text-xs font-bold text-slate-800 whitespace-nowrap select-none">
              Tháng {currentMonth}, {currentYear}
            </span>
            <button
              type="button"
              onClick={onNextMonth}
              className="flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
              title="Tháng sau"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onGoToday}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white px-3 text-[11.5px] font-semibold text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-[0_3px_8px_rgba(0,0,0,0.06)] active:translate-y-0 active:scale-98 whitespace-nowrap cursor-pointer"
          >
            Hôm nay
          </button>
        </div>

        {/* Thống kê tiến độ lịch tháng dạng Pill thanh lịch */}
        <div className="flex flex-wrap items-center gap-2 text-xs sm:justify-end">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-200/60 px-2.5 py-1 text-[11px] font-medium text-slate-700 whitespace-nowrap">
            <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>
              Đã phủ kín: <strong className="font-bold text-slate-900">{statistics.so_ngay_da_co_tu}/{statistics.tong_so_ngay} ngày</strong> ({statistics.ty_le_phu_kin}%)
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50/70 border border-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700 whitespace-nowrap">
            <CheckCircle2 className="size-3 shrink-0" />
            <span>{statistics.so_tu_da_dang} từ đã đăng</span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50/70 border border-blue-100 px-2.5 py-1 text-[11px] font-medium text-blue-700 whitespace-nowrap">
            <Clock className="size-3 shrink-0" />
            <span>{statistics.so_tu_sap_dang} từ sắp đăng</span>
          </div>

          {statistics.so_ngay_con_lai > 0 && (
            <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 border border-amber-200/60 whitespace-nowrap">
              <AlertTriangle className="size-3 text-amber-600 shrink-0" />
              <span>còn {statistics.so_ngay_con_lai} ngày nữa hết từ</span>
            </div>
          )}
        </div>
      </div>

      {/* Lưới 7 cột thứ trong tuần */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/40 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
        {WEEKDAYS.map((wd) => (
          <div key={wd.label} className="py-2.5">
            {wd.label}
          </div>
        ))}
      </div>

      {/* Lưới các ô ngày */}
      <div className="grid grid-cols-7">
        {/* Các ô đệm của tháng trước */}
        {Array.from({ length: offset }).map((_, i) => {
          const prevDay = daysInPrevMonth - offset + i + 1
          return (
            <CalendarDayCell
              key={`prev-${prevDay}`}
              dayNumber={prevDay}
              dateString=""
              isCurrentMonth={false}
              isToday={false}
              isSelected={false}
              onSelectDate={() => {}}
              onAddWordForDate={() => {}}
            />
          )
        })}

        {/* Các ngày trong tháng hiện tại */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate
          const item = itemsByDate.get(dateStr)

          return (
            <CalendarDayCell
              key={dateStr}
              dayNumber={day}
              dateString={dateStr}
              isCurrentMonth={true}
              isToday={isToday}
              isSelected={isSelected}
              scheduledItem={item}
              onSelectDate={onSelectDate}
              onAddWordForDate={onAddWordForDate}
            />
          )
        })}
      </div>
    </div>
  )
}
