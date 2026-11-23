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
    <section className="w-full rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-brand-600">Your English Voice · Giáo viên</p>
      <h1 className="mt-3 text-2xl font-extrabold text-ink-900">{mode === 'activate' ? 'Kích hoạt tài khoản' : 'Đặt lại mật khẩu'}</h1>
      {done ? <div className="mt-6 space-y-4">
        <p className="text-sm text-ink-700">{mode === 'activate' ? 'Tài khoản đã được kích hoạt.' : 'Mật khẩu đã được cập nhật.'}</p>
        <a className="inline-flex rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700" href="/teacher/login">Đến đăng nhập</a>
      </div> : !token ? <p className="mt-5 text-sm font-medium text-brand-700">Liên kết thiếu mã xác thực. Hãy yêu cầu quản trị viên gửi liên kết mới.</p> : <form className="mt-6 space-y-4" onSubmit={(event) => void submit(event)}>
        <label className="block text-xs font-semibold text-ink-700">Mật khẩu mới
          <input className="mt-1.5 w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm font-medium text-ink-900 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
        </label>
        <label className="block text-xs font-semibold text-ink-700">Nhập lại mật khẩu
          <input className="mt-1.5 w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm font-medium text-ink-900 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
        </label>
        {error && <p className="text-sm font-medium text-brand-700" role="alert">{error}</p>}
        <button className="w-full rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-60" type="submit" disabled={busy}>{busy ? 'Đang xử lý…' : mode === 'activate' ? 'Kích hoạt tài khoản' : 'Cập nhật mật khẩu'}</button>
      </form>}
    </section>
  </main>
}
