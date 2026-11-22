import { LoaderCircle, Trash2, ArrowRight, TriangleAlert, X } from 'lucide-react'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  /** true = hành động xóa: icon chips + nút xác nhận dùng biểu tượng thùng rác */
  danger?: boolean
  loading?: boolean
  /** Lỗi hiển thị bên trong modal (VD: xóa/thao tác thất bại) */
  error?: string
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Modal xác nhận của trang Daily Word & Lịch đăng — cùng pattern thiết kế
 * với RescheduleModal (thẻ rounded-3xl, header icon chip, nút đỏ gradient),
 * thay cho hộp thoại window.confirm mặc định của trình duyệt.
 */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Xác nhận',
  danger = false,
  loading = false,
  error,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-2xs">
      <div className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header: icon chip + tiêu đề + nút X */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span
              className={`flex size-8 items-center justify-center rounded-xl ${
                danger ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600'
              }`}
            >
              {danger ? <Trash2 className="size-4.5" /> : <TriangleAlert className="size-4.5" />}
            </span>
            <h3 className="text-sm font-extrabold text-ink-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-ink-700 disabled:opacity-40 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Nội dung xác nhận trong khối nền xám giống RescheduleModal */}
        <div className="mt-4">
          <div className="rounded-2xl border border-slate-150 bg-slate-50/70 p-3.5">
            <p className="text-xs leading-relaxed text-slate-600">{message}</p>
            {error && (
              <p role="alert" className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3.5 mt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex h-8 items-center rounded-lg border border-slate-200/90 bg-white px-3 text-[11.5px] font-semibold text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-[0_3px_8px_rgba(0,0,0,0.06)] active:translate-y-0 active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 px-3.5 text-[11.5px] font-bold text-white shadow-[0_2px_8px_rgba(200,16,46,0.25)] ring-1 ring-brand-700/20 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:from-brand-500 hover:to-brand-600 hover:shadow-[0_4px_12px_rgba(200,16,46,0.35)] active:translate-y-0 active:scale-98 disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : danger ? (
              <Trash2 className="size-3.5" />
            ) : (
              <ArrowRight className="size-3.5" />
            )}
            <span>{loading ? 'Đang xử lý…' : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
