import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { GraduationCap, LogOut } from 'lucide-react'
import { useAuth } from '../auth/auth-context'
import { authApi } from '../auth/auth-api'

export function TeacherDashboardPage() {
  const { user, logout, accessToken } = useAuth()
  const [message, setMessage] = useState('Äang táº£i tĂ i khoáº£nâ€¦')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordMessage('')
    setPasswordError('')
    if (newPassword.length < 8 || new TextEncoder().encode(newPassword).length > 72) {
      setPasswordError('Máº­t kháº©u má»›i cáº§n tá»« 8 kĂ½ tá»± vĂ  tá»‘i Ä‘a 72 byte.')
      return
    }
    try {
      setChangingPassword(true)
      await authApi.changePassword(currentPassword, newPassword, accessToken ?? undefined)
      setCurrentPassword('')
      setNewPassword('')
      setPasswordMessage('ÄĂ£ Ä‘á»•i máº­t kháº©u thĂ nh cĂ´ng.')
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'KhĂ´ng Ä‘á»•i Ä‘Æ°á»£c máº­t kháº©u.')
    } finally {
      setChangingPassword(false)
    }
  }

  useEffect(() => {
    const session = (() => {
      try { return JSON.parse(localStorage.getItem('your-voice-auth-session') ?? 'null') as { accessToken?: string } | null }
      catch { return null }
    })()
    const apiBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
    fetch(`${apiBase}/teachers/me`, { headers: { Authorization: `Bearer ${session?.accessToken ?? ''}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error('PhiĂªn Ä‘Äƒng nháº­p khĂ´ng cĂ²n quyá»n giĂ¡o viĂªn.')
        setMessage('TĂ i khoáº£n giĂ¡o viĂªn Ä‘Ă£ sáºµn sĂ ng. CĂ¡c cĂ´ng cá»¥ khĂ³a há»c sáº½ xuáº¥t hiá»‡n táº¡i Ä‘Ă¢y khi Ä‘Æ°á»£c triá»ƒn khai.')
      })
      .catch((reason: unknown) => setMessage(reason instanceof Error ? reason.message : 'KhĂ´ng táº£i Ä‘Æ°á»£c tĂ i khoáº£n.'))
  }, [])

  return <main className="min-h-screen bg-slate-50">
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <a href="/teacher/dashboard" className="flex min-w-0 items-center gap-3 text-slate-900 no-underline">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white">
            <GraduationCap size={22} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold tracking-tight sm:text-base">Your English Voice</span>
            <span className="block text-xs font-medium text-slate-500">Khu vực giáo viên</span>
          </span>
        </a>
        <div className="flex shrink-0 items-center gap-3 sm:gap-5">
          <div className="hidden text-right sm:block">
            <p className="max-w-56 truncate text-sm font-semibold text-slate-800">{user?.fullName || 'Giáo viên'}</p>
            <p className="max-w-56 truncate text-xs text-slate-500">{user?.email}</p>
          </div>
          <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700" onClick={() => void logout()}>
            <LogOut size={16} aria-hidden="true" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </header>
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-600">Teacher Dashboard</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Xin chào, {user?.fullName || 'Giáo viên'}</h1>
      </div>      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">TĂ i khoáº£n cá»§a báº¡n</h2>
        <p className="mt-2 text-slate-600">{message}</p>
        <p className="mt-4 text-sm text-slate-500">{user?.email}</p>
      </section>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Äá»•i máº­t kháº©u</h2>
        <form className="mt-4 grid max-w-xl gap-4" onSubmit={handleChangePassword}>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Máº­t kháº©u hiá»‡n táº¡i
            <input className="rounded-lg border border-slate-300 px-3 py-2" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Máº­t kháº©u má»›i
            <input className="rounded-lg border border-slate-300 px-3 py-2" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
          </label>
          {passwordError && <p className="text-sm text-red-700" role="alert">{passwordError}</p>}
          {passwordMessage && <p className="text-sm text-green-700" role="status">{passwordMessage}</p>}
          <button className="w-fit rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" type="submit" disabled={changingPassword}>
            {changingPassword ? 'Äang Ä‘á»•iâ€¦' : 'Äá»•i máº­t kháº©u'}
          </button>
        </form>
      </section>
    </div>
  </main>
}

