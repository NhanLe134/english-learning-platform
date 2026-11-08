import { Layers } from 'lucide-react'

const FOOTER_COLUMNS = [
  {
    title: 'Chương trình',
    links: [
      { label: 'Phát âm tiếng Anh', href: '#' },
      { label: 'Từ vựng tiếng Anh', href: '#' },
      { label: 'Ngữ pháp tiếng Anh', href: '#' },
    ],
  },
  {
    title: 'Hỗ trợ & Pháp lý',
    links: [
      { label: 'Về chúng tôi', href: '/courses' },
      { label: 'Chính sách bảo mật', href: '#' },
      { label: 'Điều khoản sử dụng', href: '#' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-gray-100 bg-[#fafafa]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        {/* Brand */}
        <div>
          <a href="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Layers className="size-5" strokeWidth={2.5} />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-ink-900">
              Your English Voice
            </span>
          </a>
          <p className="mt-4 text-sm text-ink-500">
            Đưa tiếng nói của người Việt ra thế giới
          </p>
        </div>

        {/* Thông tin liên hệ */}
        <div>
          <h3 className="text-sm font-bold text-ink-900">Thông tin liên hệ</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-500">
            <li>
              Hotline:{' '}
              <a href="tel:0397714129" className="hover:text-brand-600">
                0397 714 129
              </a>
            </li>
            <li>
              Email:{' '}
              <a
                href="mailto:trangnn.ulis@gmail.com"
                className="break-all hover:text-brand-600"
              >
                trangnn.ulis@gmail.com
              </a>
            </li>
            <li>
              Địa chỉ: 69 Dương Thị Xuân Quý, Ngũ Hành Sơn, Đà Nẵng
            </li>
          </ul>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <h3 className="text-sm font-bold text-ink-900">{column.title}</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-ink-500">
              {column.links.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="hover:text-brand-600">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  )
}
