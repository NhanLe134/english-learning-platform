import React, { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import type { TuVungChiTiet } from '../types/dailyWord.types'

interface ManualWordModalProps {
  initialDate?: string
  initialData?: TuVungChiTiet
  isOpen: boolean
  onClose: () => void
  onSave: (date: string, wordData: Omit<TuVungChiTiet, 'id'>) => void
}

const getTodayDateStr = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export const ManualWordModal: React.FC<ManualWordModalProps> = ({
  initialDate,
  initialData,
  isOpen,
  onClose,
  onSave,
}) => {
  const defaultDate = initialDate || getTodayDateStr()
  const [date, setDate] = useState(defaultDate)
  const [tuTiengAnh, setTuTiengAnh] = useState(initialData?.tu_tieng_anh || '')
  const [phienAmIpa, setPhienAmIpa] = useState(initialData?.phien_am_ipa || '')
  const [tuLoai, setTuLoai] = useState(initialData?.tu_loai || 'Adj')
  const [dinhNghiaAnh, setDinhNghiaAnh] = useState(initialData?.dinh_nghia_tieng_anh || '')
  const [dinhNghiaViet, setDinhNghiaViet] = useState(initialData?.dinh_nghia_tieng_viet || '')
  const [viDuAnh, setViDuAnh] = useState(initialData?.vi_du_tieng_anh || '')
  const [viDuViet, setViDuViet] = useState(initialData?.vi_du_tieng_viet || '')

  useEffect(() => {
    if (isOpen) {
      setDate(initialDate || getTodayDateStr())
      setTuTiengAnh(initialData?.tu_tieng_anh || '')
      setPhienAmIpa(initialData?.phien_am_ipa || '')
      setTuLoai(initialData?.tu_loai || 'Adj')
      setDinhNghiaAnh(initialData?.dinh_nghia_tieng_anh || '')
      setDinhNghiaViet(initialData?.dinh_nghia_tieng_viet || '')
      setViDuAnh(initialData?.vi_du_tieng_anh || '')
      setViDuViet(initialData?.vi_du_tieng_viet || '')
    }
  }, [isOpen, initialDate, initialData])

  if (!isOpen) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tuTiengAnh.trim() || !dinhNghiaViet.trim()) return

    onSave(date, {
      tu_tieng_anh: tuTiengAnh.trim(),
      phien_am_ipa: phienAmIpa.trim(),
      tu_loai: tuLoai.trim(),
      dinh_nghia_tieng_anh: dinhNghiaAnh.trim(),
      dinh_nghia_tieng_viet: dinhNghiaViet.trim(),
      vi_du_tieng_anh: viDuAnh.trim(),
      vi_du_tieng_viet: viDuViet.trim(),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-2xs">
      <div className="w-full max-w-xl rounded-3xl border border-slate-100 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="text-base font-extrabold text-ink-900">
              {initialData ? 'Chỉnh sửa nội dung từ vựng' : 'Thêm từ vựng thủ công'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Thiết lập thông tin thẻ Flashcard hiển thị cho học viên
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-ink-700"
          >
            <X className="size-4.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5 text-xs">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <div>
              <label className="font-bold text-ink-900">Ngày phát hành</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 font-semibold text-ink-900 outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600"
              />
            </div>

            <div>
              <label className="font-bold text-ink-900">Từ vựng (Word)</label>
              <input
                type="text"
                required
                placeholder="vd: Eloquent"
                value={tuTiengAnh}
                onChange={(e) => setTuTiengAnh(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 font-extrabold text-ink-900 outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600"
              />
            </div>

            <div>
              <label className="font-bold text-ink-900">Từ loại</label>
              <select
                value={tuLoai}
                onChange={(e) => setTuLoai(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 font-bold text-ink-800 outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600"
              >
                <option value="Adj">Adj (Tính từ)</option>
                <option value="Noun">Noun (Danh từ)</option>
                <option value="Verb">Verb (Động từ)</option>
                <option value="Adv">Adv (Trạng từ)</option>
                <option value="Idiom">Idiom (Thành ngữ)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-ink-900">Phiên âm IPA</label>
            <input
              type="text"
              placeholder="vd: /'el.ə.kwənt/"
              value={phienAmIpa}
              onChange={(e) => setPhienAmIpa(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 font-mono text-ink-900 outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600"
            />
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className="font-bold text-ink-900">Định nghĩa tiếng Anh</label>
              <textarea
                rows={2}
                placeholder="Fluent or persuasive in speaking or writing..."
                value={dinhNghiaAnh}
                onChange={(e) => setDinhNghiaAnh(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 leading-relaxed outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600"
              />
            </div>

            <div>
              <label className="font-bold text-ink-900">Giải nghĩa tiếng Việt *</label>
              <textarea
                rows={2}
                required
                placeholder="Lưu loát, có tài hùng biện..."
                value={dinhNghiaViet}
                onChange={(e) => setDinhNghiaViet(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 leading-relaxed outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className="font-bold text-ink-900">Ví dụ tiếng Anh</label>
              <textarea
                rows={2}
                placeholder="An eloquent speech by the team leader..."
                value={viDuAnh}
                onChange={(e) => setViDuAnh(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 leading-relaxed outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600"
              />
            </div>

            <div>
              <label className="font-bold text-ink-900">Dịch nghĩa câu ví dụ</label>
              <textarea
                rows={2}
                placeholder="Bài phát biểu đầy sức thuyết phục..."
                value={viDuViet}
                onChange={(e) => setViDuViet(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 leading-relaxed outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
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
              <Save className="size-3.5" />
              <span>Lưu từ vựng</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
