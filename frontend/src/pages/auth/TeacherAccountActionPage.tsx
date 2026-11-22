import { useState, type FormEvent } from 'react'
import { authApi, getErrorMessage } from './auth-api'

export function TeacherAccountActionPage({ mode }: { mode: 'activate' | 'reset' }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const token = new URLSearchParams(window.location.search).get('token') ?? ''

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') ?? '')
    const confirm = String(form.get('confirmPassword') ?? '')
    if (password !== confirm) { setError('Mật khẩu xác nhận không khớp.'); return }
    if (password.length < 8) { setError('Mật khẩu cần có ít nhất 8 ký tự.'); return }
    setBusy(true)
    try {
      if (mode === 'activate') await authApi.activateTeacher(token, password)
      else await authApi.resetTeacherPassword(token, password)
      setDone(true)
    } catch (reason) { setError(getErrorMessage(reason)) }
    finally { setBusy(false) }
  }

  return <main className="mx-auto flex min-h-screen max-w-lg items-center px-5 py-12">
    <section className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-red-600">Your English Voice · Giáo viên</p>
      <h1 className="mt-3 text-2xl font-bold text-slate-900">{mode === 'activate' ? 'Kích hoạt tài khoản' : 'Đặt lại mật khẩu'}</h1>
      {done ? <div className="mt-6 space-y-4">
        <p className="text-slate-700">{mode === 'activate' ? 'Tài khoản đã được kích hoạt.' : 'Mật khẩu đã được cập nhật.'}</p>
        <a className="inline-flex rounded-lg bg-red-600 px-4 py-2 font-semibold text-white" href="/teacher/login">Đến đăng nhập</a>
      </div> : !token ? <p className="mt-5 text-red-700">Liên kết thiếu mã xác thực. Hãy yêu cầu quản trị viên gửi liên kết mới.</p> : <form className="mt-6 space-y-4" onSubmit={(event) => void submit(event)}>
        <label className="block text-sm font-medium text-slate-700">Mật khẩu mới
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
        </label>
        <label className="block text-sm font-medium text-slate-700">Nhập lại mật khẩu
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
        </label>
        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
        <button className="w-full rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60" type="submit" disabled={busy}>{busy ? 'Đang xử lý…' : mode === 'activate' ? 'Kích hoạt tài khoản' : 'Cập nhật mật khẩu'}</button>
      </form>}
    </section>
  </main>
}
