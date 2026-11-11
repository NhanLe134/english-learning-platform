import { Hammer } from 'lucide-react'
import { SiteHeader } from '../../components/layout/SiteHeader'
import { SiteFooter } from '../../components/layout/SiteFooter'

export function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex min-h-[60vh] items-center justify-center bg-gray-50/80 px-4 py-16">
        <div className="text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand-50">
            <Hammer className="size-8 text-brand-600" aria-hidden />
          </span>
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            Liên hệ
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-700">
            Trang này đang được phát triển. Trong lúc chờ, bạn có thể liên hệ
            qua thông tin ở phần cuối trang nhé!
          </p>
          <a
            href="/"
            className="mt-8 inline-block rounded-full bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
          >
            Về trang chủ
          </a>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
