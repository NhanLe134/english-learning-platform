import { useState, type FormEvent } from 'react'
import type { UserProfile } from '../types'

export function EditTeacherModal({ user, onClose, onSave }: {
  user: UserProfile | null
  onClose: () => void
  onSave: (value: { full_name: string; nickname: string; phone_number: string }) => Promise<void>
}) {
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [nickname, setNickname] = useState(user?.nickname ?? '')
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (!user) return null

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try { await onSave({ full_name: fullName.trim(), nickname: nickname.trim(), phone_number: phoneNumber.trim() }) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được thông tin.') }
    finally { setBusy(false) }
  }
  return <div className="modal-backdrop"><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="edit-teacher-title">
    <header className="modal-header"><h2 id="edit-teacher-title">Chỉnh sửa giáo viên</h2><button type="button" className="modal-close-btn" onClick={onClose}>×</button></header>
    <form className="modal-form" onSubmit={(event) => void submit(event)}>
      <label className="form-group"><span className="form-label">Họ và tên</span><input className="form-input" value={fullName} onChange={(event) => setFullName(event.target.value)} required maxLength={120} /></label>
      <label className="form-group"><span className="form-label">Nickname</span><input className="form-input" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={60} /></label>
      <label className="form-group"><span className="form-label">Số điện thoại</span><input className="form-input" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} maxLength={32} /></label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <footer className="modal-footer"><button type="button" className="modal-cancel-btn" onClick={onClose} disabled={busy}>Hủy</button><button className="modal-submit-btn" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button></footer>
    </form>
  </section></div>
}
