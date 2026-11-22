import { useState, type FormEvent } from 'react'
import { CheckCircle2, ShieldCheck, GraduationCap, User } from 'lucide-react'
import type { UserProfile, UserRole } from '../types'

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Quản trị viên',
  TEACHER: 'Giáo viên',
  STUDENT: 'Học viên',
}

const ROLE_ICONS: Record<UserRole, typeof User> = {
  ADMIN: ShieldCheck,
  TEACHER: GraduationCap,
  STUDENT: User,
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Đang hoạt động',
  locked: 'Đang tạm khóa',
  pending: 'Chờ kích hoạt',
  deactivated: 'Đã vô hiệu hóa',
}

export interface EditUserPayload {
  full_name: string
  nickname: string
  phone_number: string
}

export function EditUserModal({
  user,
  onClose,
  onSave,
}: {
  user: UserProfile | null
  onClose: () => void
  onSave: (value: EditUserPayload) => Promise<void>
}) {
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [nickname, setNickname] = useState(user?.nickname ?? '')
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (!user) return null

  const RoleIcon = ROLE_ICONS[user.role] ?? User
  const createdDate = (() => {
    try {
      return new Date(user.created_at).toLocaleString('vi-VN')
    } catch {
      return user.created_at
    }
  })()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!fullName.trim()) {
      setError('Họ và tên không được để trống.')
      return
    }
    setBusy(true)
    try {
      await onSave({ full_name: fullName.trim(), nickname: nickname.trim(), phone_number: phoneNumber.trim() })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không lưu được thông tin.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        disabled={busy}
        className="absolute inset-0 cursor-default bg-ink-900/40 disabled:cursor-not-allowed"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-user-title"
        className="relative z-10 w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
          <span className="flex size-8 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <RoleIcon className="size-4" />
          </span>
          <h2 id="edit-user-title" className="text-sm font-extrabold text-ink-900">
            Chi tiết người dùng — {ROLE_LABELS[user.role]}
          </h2>
        </div>

        {/* Khối thông tin chi tiết (chỉ đọc) */}
        <div className="mt-4 rounded-xl border border-slate-150 bg-slate-50/70 p-3.5 text-xs">
          <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2">
            <dt className="font-medium text-slate-500">Họ và tên:</dt>
            <dd className="font-bold text-ink-900">{user.full_name}</dd>
            <dt className="font-medium text-slate-500">Email:</dt>
            <dd className="break-all text-ink-900">{user.email}</dd>
            <dt className="font-medium text-slate-500">Vai trò:</dt>
            <dd className="font-bold text-ink-900">{ROLE_LABELS[user.role]}</dd>
            <dt className="font-medium text-slate-500">Trạng thái:</dt>
            <dd className="flex items-center gap-1 text-ink-900">
              {user.is_verified && <CheckCircle2 size={13} className="text-sky-500" />}
              {STATUS_LABELS[user.status] ?? user.status}
              {user.is_verified && <span className="text-sky-600">(đã xác thực)</span>}
            </dd>
            <dt className="font-medium text-slate-500">Ngày tạo:</dt>
            <dd className="text-ink-900">{createdDate}</dd>
            <dt className="font-medium text-slate-500">ID:</dt>
            <dd className="break-all font-mono text-[10.5px] text-slate-400">{user.id}</dd>
          </dl>
        </div>

        {/* Trường chỉnh sửa */}
        <form className="mt-4 space-y-3.5 text-xs" onSubmit={(event) => void submit(event)}>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            THÔNG TIN CHỈNH SỬA
          </span>
          <label className="block">
            <span className="font-bold text-ink-900">Họ và tên <span className="text-brand-600">*</span></span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs font-medium text-ink-900 outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              maxLength={120}
            />
          </label>
          <label className="block">
            <span className="font-bold text-ink-900">Nickname</span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs font-medium text-ink-900 outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={60}
            />
          </label>
          <label className="block">
            <span className="font-bold text-ink-900">Số điện thoại</span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs font-medium text-ink-900 outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              maxLength={32}
            />
          </label>
          {error && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 font-semibold text-rose-700">
              {error}
            </p>
          )}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3.5">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="inline-flex h-8 items-center rounded-lg border border-slate-200/90 bg-white px-3.5 text-[11.5px] font-semibold text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 ease-out hover:bg-slate-50 hover:text-slate-900 active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-8 items-center rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 px-4 text-[11.5px] font-bold text-white shadow-[0_2px_8px_rgba(246,0,5,0.25)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(246,0,5,0.35)] active:translate-y-0 active:scale-98 disabled:opacity-60 disabled:hover:translate-y-0 cursor-pointer"
            >
              {busy ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
