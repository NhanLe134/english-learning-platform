import React, { useState, useEffect } from 'react'
import { X, Calendar, ArrowRight } from 'lucide-react'

interface RescheduleModalProps {
  currentDate: string
  wordTitle: string
  isOpen: boolean
  onClose: () => void
  onConfirm: (newDate: string) => void
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  currentDate,
  wordTitle,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [newDate, setNewDate] = useState(currentDate)

  useEffect(() => {
    if (isOpen) {
      setNewDate(currentDate)
    }
  }, [isOpen, currentDate])

  if (!isOpen) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newDate || newDate === currentDate) {
      onClose()
      return
    }
    onConfirm(newDate)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-2xs">
      <div className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Calendar className="size-4.5" />
            </span>
            <h3 className="text-sm font-extrabold text-ink-900">Đổi ngày phát hành</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-ink-700"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div className="rounded-2xl border border-slate-150 bg-slate-50/70 p-3.5">
            <span className="text-[11px] text-slate-500 font-medium">Từ vựng đang chọn:</span>
            <p className="text-base font-black text-ink-900 mt-0.5">{wordTitle}</p>
            <p className="mt-1 text-[11px] text-slate-500">
              Ngày hiện tại: <strong className="text-slate-800">{currentDate}</strong>
            </p>
          </div>

          <div>
            <label className="font-extrabold text-ink-900">Chọn ngày phát hành mới:</label>
            <input
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs font-bold text-ink-900 outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3.5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 items-center rounded-lg border border-slate-200/90 bg-white px-3 text-[11.5px] font-semibold text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-[0_3px_8px_rgba(0,0,0,0.06)] active:translate-y-0 active:scale-98 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 px-3.5 text-[11.5px] font-bold text-white shadow-[0_2px_8px_rgba(200,16,46,0.25)] ring-1 ring-brand-700/20 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:from-brand-500 hover:to-brand-600 hover:shadow-[0_4px_12px_rgba(200,16,46,0.35)] active:translate-y-0 active:scale-98 cursor-pointer"
            >
              <ArrowRight className="size-3.5" />
              <span>Xác nhận đổi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
