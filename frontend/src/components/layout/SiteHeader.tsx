import { useContext, useEffect, useState } from 'react'
import { Layers, Loader2, LogOut, Menu, User, X } from 'lucide-react'
import { AuthContext } from '../../pages/auth/auth-context'

export type NavTabId = 'home' | 'about' | 'courses' | 'ebook' | 'workshop' | 'contact'

export interface SiteHeaderProps {
  activeTab?: NavTabId
  brandName?: string
}

const NAV_LINKS: { id: NavTabId; label: string; href: string }[] = [
  { id: 'home', label: 'Trang chủ', href: '/' },
  { id: 'about', label: 'Về chúng tôi', href: '/about' },
  { id: 'courses', label: 'Các khóa học', href: '/khoa-hoc' },
  { id: 'ebook', label: 'Ebook', href: '/ebooks' },
  { id: 'workshop', label: 'Workshop', href: '/workshops' },
  { id: 'contact', label: 'Liên hệ', href: '/contact' },
]

function detectActiveTab(): NavTabId | null {
  if (typeof window === 'undefined') return 'home'
  const path = window.location.pathname.toLowerCase()
  const hash = window.location.hash.toLowerCase()

  if (
    path === '/about' ||
    path === '/ve-chung-toi' ||
    (path === '/' && hash === '#ve-chung-toi')
  ) {
    return 'about'
  }
  if (
    path === '/khoa-hoc' ||
    path === '/courses' ||
    path.startsWith('/khoa-hoc/') ||
    path.startsWith('/courses/')
  ) {
    return 'courses'
  }
  if (
    path === '/ebooks' ||
    path === '/ebook' ||
    (path === '/' && (hash === '#ebook' || hash === '#ebooks'))
  ) {
    return 'ebook'
  }
  if (
    path === '/workshops' ||
    path === '/workshop' ||
    (path === '/' && (hash === '#workshop' || hash === '#workshops'))
  ) {
    return 'workshop'
  }
  if (
    path === '/contact' ||
    path === '/lien-he' ||
    (path === '/' && (hash === '#lien-he' || hash === '#contact'))
  ) {
    return 'contact'
  }
  if (path === '/' && !hash) {
    return 'home'
  }
  return null
}

export function SiteHeader({ activeTab: explicitActiveTab, brandName = 'Your English Voice' }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [detectedTab, setDetectedTab] = useState<NavTabId | null>(detectActiveTab)
  const [loggingOut, setLoggingOut] = useState(false)

  const auth = useContext(AuthContext)
  const user = auth?.user ?? null
  const isLoginPage = typeof window !== 'undefined' && window.location.pathname.toLowerCase() === '/login'

  useEffect(() => {
    const handleLocationChange = () => {
      setDetectedTab(detectActiveTab())
    }
    window.addEventListener('popstate', handleLocationChange)
    window.addEventListener('hashchange', handleLocationChange)
    return () => {
      window.removeEventListener('popstate', handleLocationChange)
      window.removeEventListener('hashchange', handleLocationChange)
    }
  }, [])

  const currentTab = explicitActiveTab ?? detectedTab

  async function handleAccountClick() {
    if (!user) {
      if (window.location.pathname !== '/login') {
        window.location.replace('/login')
      }
      return
    }

    setLoggingOut(true)
    try {
      if (auth?.logout) {
        await auth.logout()
      }
      window.location.replace('/login')
    } catch (error) {
      if (auth?.reportError) {
        auth.reportError(error instanceof Error ? error.message : 'Đăng xuất không thành công.')
      }
      window.location.replace('/login')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Layers className="size-5" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-ink-900">
            {brandName}
          </span>
        </a>

        {/* Menu desktop */}
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => {
            const isActive = currentTab === link.id
            return (
              <a
                key={link.id}
                href={link.href}
                className={`text-sm transition-colors ${
                  isActive
                    ? 'font-bold text-brand-600'
                    : 'font-medium text-ink-700 hover:text-brand-600'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {link.label}
              </a>
            )
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Chip người dùng đã đăng nhập — thay nút Đăng ký/Đăng nhập cho khách */}
              <span
                className="hidden items-center gap-2 rounded-full border border-gray-200 bg-white py-1 pl-1 pr-3 sm:flex"
                title={user.email}
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {(user.fullName || user.email || '?').charAt(0).toUpperCase()}
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-xs font-bold text-ink-900">
                    {user.fullName || user.email}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    {user.role === 'STUDENT' ? 'Học viên' : user.role === 'TEACHER' ? 'Giáo viên' : 'Quản trị viên'}
                  </span>
                </span>
              </span>
              <button
                type="button"
                aria-label={`Đăng xuất (${user.email})`}
                title={`Đăng xuất (${user.email})`}
                onClick={() => void handleAccountClick()}
                disabled={loggingOut}
                className="hidden size-10 items-center justify-center rounded-full border border-brand-600 bg-brand-50 text-brand-600 transition-colors hover:bg-brand-100 sm:flex"
              >
                {loggingOut ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <LogOut className="size-4" />
                )}
              </button>
            </>
          ) : (
            <>
              <a
                href={isLoginPage ? '/courses' : '/register'}
                className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
              >
                Đăng ký
              </a>

              {/* Nút hình người - Bấm để chuyển đến trang đăng nhập */}
              <button
                type="button"
                aria-label={
                  isLoginPage ? 'Đang ở trang đăng nhập' : 'Đăng nhập'
                }
                title={isLoginPage ? 'Đang ở trang đăng nhập' : 'Đăng nhập'}
                onClick={() => void handleAccountClick()}
                disabled={loggingOut}
                className={`hidden size-10 items-center justify-center rounded-full border transition-colors sm:flex ${
                  isLoginPage
                    ? 'border-brand-600 bg-brand-50 text-brand-600 hover:bg-brand-100'
                    : 'border-gray-200 text-ink-700 hover:border-brand-600 hover:text-brand-600'
                }`}
              >
                <User className="size-5" />
              </button>
            </>
          )}

          {/* Toggle menu mobile */}
          <button
            type="button"
            aria-label="Mở menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex size-10 items-center justify-center rounded-full border border-gray-200 text-ink-700 lg:hidden"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <nav className="border-t border-gray-100 bg-white px-4 py-3 lg:hidden">
          {NAV_LINKS.map((link) => {
            const isActive = currentTab === link.id
            return (
              <a
                key={link.id}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-brand-50 font-bold text-brand-600'
                    : 'font-medium text-ink-700 hover:bg-brand-50 hover:text-brand-600'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {link.label}
              </a>
            )
          })}

          <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3">
            {user ? (
              <>
                <span className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    {(user.fullName || user.email || '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="text-xs font-bold text-ink-900">{user.fullName || user.email}</span>
                    <span className="text-[10px] font-medium text-slate-400">
                      {user.role === 'STUDENT' ? 'Học viên' : user.role === 'TEACHER' ? 'Giáo viên' : 'Quản trị viên'}
                    </span>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    void handleAccountClick()
                  }}
                  disabled={loggingOut}
                  className="flex items-center justify-center gap-2 rounded-xl border border-brand-600 bg-brand-50 py-2.5 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-100 disabled:opacity-50"
                >
                  {loggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    void handleAccountClick()
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-600 hover:text-brand-600"
                >
                  <User className="size-4" />
                  Đăng nhập
                </button>
                <a
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  Đăng ký tài khoản
                </a>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
