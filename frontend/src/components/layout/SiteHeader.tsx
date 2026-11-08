import { useState } from 'react'
import { Layers, Menu, User, X } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Về chúng tôi', href: '/about' },
  { label: 'Các khóa học', href: '/courses' },
  { label: 'Ebook', href: '/ebooks' },
  { label: 'Workshop', href: '/workshops' },
  { label: 'Liên hệ', href: '/contact' },
]

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Layers className="size-5" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-ink-900">
            Your English Voice
          </span>
        </a>

        {/* Menu desktop */}
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-ink-700 transition-colors hover:text-brand-600"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <a
            href="/register"
            className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
          >
            Đăng ký
          </a>
          <button
            type="button"
            aria-label="Tài khoản"
            className="hidden size-10 items-center justify-center rounded-full border border-gray-200 text-ink-700 transition-colors hover:border-brand-600 hover:text-brand-600 sm:flex"
          >
            <User className="size-5" />
          </button>
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
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-brand-50 hover:text-brand-600"
            >
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  )
}
