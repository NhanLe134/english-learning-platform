import { BookHeadphones, BookOpen, FileText } from 'lucide-react'
import { ebooks } from '../home-data'

const EBOOK_ICONS = [FileText, BookOpen]

export function EbookSection() {
  return (
    <section id="ebook" className="bg-gray-50/80">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-20">
        {/* Ảnh minh họa — sách bìa dọc hiển thị đầy đủ trên nền kệ sách */}
        <div className="relative mx-auto w-full max-w-sm">
          <div className="flex aspect-[3/4] items-center justify-center rounded-2xl bg-gradient-to-b from-gray-50 to-gray-200 p-6 shadow-lg">
            <img
              src="/ebook5.jpg"
              alt="Tủ sách tự học tiếng Anh của Your English Voice"
              className="max-h-full max-w-full object-contain shadow-[0_16px_32px_rgba(23,24,28,0.3)]"
            />
          </div>
          <span className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-ink-700 shadow-sm backdrop-blur">
            <BookHeadphones className="size-4 text-brand-600" />
            Định dạng PDF &amp; Audio HQ
          </span>
        </div>

        <div>
          <span className="inline-block rounded-full border border-brand-200 px-3 py-1 text-xs font-bold text-brand-600">
            Tài Liệu Độc Quyền
          </span>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            Tủ Sách Tự Học
          </h2>

          <ul className="mt-6 space-y-4">
            {ebooks.map((ebook, index) => {
              const Icon = EBOOK_ICONS[index % EBOOK_ICONS.length]
              return (
                <li key={ebook.title} className="flex items-start gap-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-ink-900">
                      {ebook.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-500">
                      {ebook.description}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>

          <a
            href="/ebooks"
            className="mt-8 inline-block rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
          >
            Xem tất cả Ebook
          </a>
        </div>
      </div>
    </section>
  )
}
