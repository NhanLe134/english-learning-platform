import { useContext, useEffect, useState } from 'react'
import { Layers, Menu, User, X } from 'lucide-react'
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
        window.location.assign('/login')
      }
      return
    }

    setLoggingOut(true)
    try {
      if (auth?.logout) {
        await auth.logout()
      }
      window.location.assign('/login')
    } catch (error) {
      if (auth?.reportError) {
        auth.reportError(error instanceof Error ? error.message : 'Đăng xuất không thành công.')
      }
      window.location.assign('/login')
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
          <a
            href="/register"
            className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Đăng ký
          </a>

          {/* Nút hình người - Bấm để chuyển đến trang đăng nhập */}
          <button
            type="button"
            aria-label={
              user
                ? `Tài khoản (${user.email}) - Bấm để đăng xuất`
                : isLoginPage
                  ? 'Đang ở trang đăng nhập'
                  : 'Đăng nhập'
            }
            title={
              user
                ? `Đăng xuất (${user.email})`
                : isLoginPage
                  ? 'Đang ở trang đăng nhập'
                  : 'Đăng nhập'
            }
            onClick={() => void handleAccountClick()}
            disabled={loggingOut}
            className={`hidden size-10 items-center justify-center rounded-full border transition-colors sm:flex ${
              user || isLoginPage
                ? 'border-brand-600 bg-brand-50 text-brand-600 hover:bg-brand-100'
                : 'border-gray-200 text-ink-700 hover:border-brand-600 hover:text-brand-600'
            }`}
          >
            <User className="size-5" />
          </button>

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
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                void handleAccountClick()
              }}
              disabled={loggingOut}
              className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
                user || isLoginPage
                  ? 'border-brand-600 bg-brand-50 text-brand-600'
                  : 'border-gray-200 text-ink-700 hover:border-brand-600 hover:text-brand-600'
              }`}
            >
              <User className="size-4" />
              {user ? `Đăng xuất (${user.email})` : isLoginPage ? 'Đang ở trang đăng nhập' : 'Đăng nhập'}
            </button>
            <a
              href="/register"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Đăng ký tài khoản
            </a>
          </div>
        </nav>
      )}
    </header>
  )
}
