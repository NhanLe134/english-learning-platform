import React, { useState } from 'react'
import {
  Volume2,
  Calendar,
  Edit3,
  Bell,
  CheckCircle2,
  X,
  Plus,
} from 'lucide-react'
import type { LichDangItem } from '../types/dailyWord.types'
import { dailyWordApi } from '../services/dailyWordApi'

interface WordDetailDrawerProps {
  selectedDate: string // YYYY-MM-DD
  item?: LichDangItem
  onClose: () => void
  onOpenReschedule: () => void
  onOpenEdit: () => void
  onAddNewWord: () => void
}

function formatDateDisplay(dateStr: string): { dayMonthYear: string; dayOfWeek: string } {
  if (!dateStr) return { dayMonthYear: '', dayOfWeek: '' }
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return { dayMonthYear: dateStr, dayOfWeek: '' }

  const daysOfWeek = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']
  const dayOfWeek = daysOfWeek[d.getDay()]
  const day = d.getDate()
  const month = d.getMonth() + 1
  const year = d.getFullYear()

  return {
    dayMonthYear: `${day} THÁNG ${month}, ${year}`,
    dayOfWeek,
  }
}

export const WordDetailDrawer: React.FC<WordDetailDrawerProps> = ({
  selectedDate,
  item,
  onClose,
  onOpenReschedule,
  onOpenEdit,
  onAddNewWord,
}) => {
  const [playingAccent, setPlayingAccent] = useState<'us' | 'uk' | null>(null)
  const dateInfo = formatDateDisplay(selectedDate)

  // Phát âm thanh mẫu US hoặc UK: ưu tiên stream backend audio, fallback Web Speech
  function handlePlayPronunciation(giong: 'us' | 'uk' = 'us') {
    if (!item?.tu_vung?.tu_tieng_anh) return
    setPlayingAccent(giong)

    const audioUrl = dailyWordApi.layUrlPhatAm(item.tu_vung.tu_tieng_anh, giong)
    const audio = new Audio(audioUrl)

    audio.onended = () => setPlayingAccent(null)
    audio.onerror = () => {
      try {
        const utterance = new SpeechSynthesisUtterance(item.tu_vung.tu_tieng_anh)
        utterance.lang = giong === 'uk' ? 'en-GB' : 'en-US'
        utterance.rate = 0.85
        utterance.onend = () => setPlayingAccent(null)
        utterance.onerror = () => setPlayingAccent(null)
        window.speechSynthesis.speak(utterance)
      } catch {
        setPlayingAccent(null)
      }
    }

    audio.play().catch(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(item.tu_vung.tu_tieng_anh)
        utterance.lang = giong === 'uk' ? 'en-GB' : 'en-US'
        utterance.rate = 0.85
        utterance.onend = () => setPlayingAccent(null)
        utterance.onerror = () => setPlayingAccent(null)
        window.speechSynthesis.speak(utterance)
      } catch {
        setPlayingAccent(null)
      }
    })
  }

  // Trường hợp ngày này chưa có từ vựng
  if (!item) {
    return (
      <div className="flex flex-col rounded-2xl border border-slate-100 bg-white p-5.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] sm:p-6 animate-in fade-in duration-200">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {dateInfo.dayMonthYear}
              </p>
              <p className="text-[11px] text-slate-400 font-medium">{dateInfo.dayOfWeek}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                Chưa có từ
              </span>
              <button
                type="button"
                onClick={onClose}
                className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                title="Đóng thẻ chi tiết"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="py-12 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 border border-slate-100">
              <Calendar className="size-5" strokeWidth={1.8} />
            </span>
            <h3 className="mt-3.5 text-sm font-bold text-slate-900">
              Ngày này chưa được lên lịch
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400 max-w-xs mx-auto">
              Hãy thêm từ mới thủ công hoặc tải file danh sách từ vựng để tự động lên lịch phát hành.
            </p>

            <button
              type="button"
              onClick={onAddNewWord}
              className="mt-5 inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 text-[11.5px] font-bold text-white shadow-[0_2px_8px_rgba(200,16,46,0.25)] ring-1 ring-brand-700/20 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-[0_4px_12px_rgba(200,16,46,0.35)] active:translate-y-0 active:scale-98 cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>Thêm từ cho ngày này</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  const { tu_vung } = item
  const isActiveToday = item.trang_thai === 'dang_hoat_dong'

  return (
    <div className="flex flex-col rounded-2xl border border-slate-100 bg-white p-5.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] sm:p-6 animate-in fade-in duration-200">
      <div className="space-y-4">
        {/* Header Ngày & Trạng thái Pill & Nút đóng [X] */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="inline-flex items-center gap-2">
            <span className="rounded-lg bg-brand-50 border border-brand-100/80 px-2.5 py-1 text-[11px] font-bold text-brand-700 tracking-wide">
              {dateInfo.dayMonthYear}
            </span>
            <span className="text-xs text-slate-400 font-medium">{dateInfo.dayOfWeek}</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                isActiveToday
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : item.trang_thai === 'cho_phat_hanh'
                  ? 'bg-blue-50 text-blue-700 border-blue-100'
                  : 'bg-slate-50 text-slate-600 border-slate-100'
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  isActiveToday ? 'bg-emerald-500' : item.trang_thai === 'cho_phat_hanh' ? 'bg-blue-500' : 'bg-slate-400'
                }`}
              />
              {isActiveToday
                ? 'Đang hoạt động'
                : item.trang_thai === 'cho_phat_hanh'
                ? 'Sắp phát hành'
                : 'Đã hoàn thành'}
            </span>

            <button
              type="button"
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              title="Đóng thẻ chi tiết"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Khối Từ Vựng & Flashcard Head */}
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {tu_vung.tu_tieng_anh}
            </h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
              {tu_vung.tu_loai}
            </span>
          </div>

          {/* Cụm phát âm US & UK chuẩn âm bản xứ */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handlePlayPronunciation('us')}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all active:scale-95 cursor-pointer ${
                playingAccent === 'us'
                  ? 'border-brand-600 bg-brand-600 text-white shadow-2xs'
                  : 'border-slate-200 bg-slate-50/80 text-slate-700 hover:border-brand-200 hover:bg-brand-50/40 hover:text-brand-700'
              }`}
              title="Nghe phát âm chuẩn Mỹ (US)"
            >
              <Volume2 className="size-3" />
              <span>US</span>
              <span className="font-mono font-normal opacity-80">
                {tu_vung.phien_am_ipa_us || tu_vung.phien_am_ipa}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handlePlayPronunciation('uk')}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all active:scale-95 cursor-pointer ${
                playingAccent === 'uk'
                  ? 'border-brand-600 bg-brand-600 text-white shadow-2xs'
                  : 'border-slate-200 bg-slate-50/80 text-slate-700 hover:border-brand-200 hover:bg-brand-50/40 hover:text-brand-700'
              }`}
              title="Nghe phát âm chuẩn Anh (UK)"
            >
              <Volume2 className="size-3" />
              <span>UK</span>
              <span className="font-mono font-normal opacity-80">
                {tu_vung.phien_am_ipa_uk || tu_vung.phien_am_ipa}
              </span>
            </button>
          </div>
        </div>

        {/* Khối ĐỊNH NGHĨA HỌC THUẬT: Nền xám nhẹ, không viền đậm */}
        <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-3.5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            ĐỊNH NGHĨA HỌC THUẬT
          </h4>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-800">
            {tu_vung.dinh_nghia_tieng_anh}
          </p>
          <p className="mt-1 text-[11.5px] italic leading-relaxed text-slate-500">
            ({tu_vung.dinh_nghia_tieng_viet})
          </p>
        </div>

        {/* Khối VÍ DỤ THỰC TẾ TRONG NGỮ CẢNH: Card nổi bật với viền accent tinh tế bên trái */}
        <div className="rounded-r-xl border-l-3 border-brand-500 bg-brand-50/25 p-3.5 pl-3">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-700">
            VÍ DỤ THỰC TẾ TRONG NGỮ CẢNH
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-800 font-normal">
            &ldquo;
            <span className="font-bold text-brand-700">{tu_vung.vi_du_tieng_anh}</span>
            &rdquo;
          </p>
          <p className="mt-1 text-[11.5px] italic leading-relaxed text-slate-500">
            ({tu_vung.vi_du_tieng_viet})
          </p>
        </div>

        {/* Khối Tự động gửi Push Notification */}
        <div className="flex items-center gap-3 rounded-xl bg-slate-50/60 border border-slate-100/80 p-3">
          <span className="flex size-7.5 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200/60 text-slate-500 shadow-2xs">
            <Bell className="size-3.5" />
          </span>
          <div className="flex-1 text-xs leading-tight">
            <p className="font-bold text-slate-800">Tự động gửi Push Notification</p>
            <p className="mt-0.5 text-[10.5px] text-slate-400 font-normal">
              {item.da_gui_thong_bao
                ? `Đã phát vào ${item.gio_phat_hanh.substring(0, 5)} sáng nay`
                : `Dự kiến phát hành lúc ${item.gio_phat_hanh.substring(0, 5)}`}
            </p>
          </div>
          <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
        </div>
      </div>

      {/* Footer 2 nút hành động: Chia đều 50% bằng grid, cùng chiều cao h-8 (32px), cân đối chuẩn xác */}
      <div className="mt-4 border-t border-slate-100 pt-3.5">
        <div className="grid grid-cols-2 gap-2.5 w-full">
          <button
            type="button"
            onClick={onOpenReschedule}
            className="group flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2 text-[11.5px] font-semibold text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50/80 hover:text-slate-900 hover:shadow-[0_3px_8px_rgba(0,0,0,0.06)] active:translate-y-0 active:scale-98 whitespace-nowrap cursor-pointer"
          >
            <Calendar className="size-3.5 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" />
            <span>Đổi ngày đăng</span>
          </button>

          <button
            type="button"
            onClick={onOpenEdit}
            className="group flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-brand-600 bg-brand-600 px-2 text-[11.5px] font-semibold text-white shadow-xs shadow-brand-600/20 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-brand-700 hover:border-brand-700 hover:shadow-sm hover:shadow-brand-600/30 active:translate-y-0 active:scale-98 whitespace-nowrap cursor-pointer"
          >
            <Edit3 className="size-3.5 shrink-0" />
            <span>Chỉnh sửa nội dung</span>
          </button>
        </div>
      </div>
    </div>
  )
}
