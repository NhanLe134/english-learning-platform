import { useState } from 'react'
import { Lock, Send } from 'lucide-react'

export function GiftCtaSection() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  return (
    <section className="bg-gray-50/80 pb-16 lg:pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 px-6 py-14 text-center shadow-xl sm:px-12">
          {/* Vòng tròn trang trí */}
          <div
            aria-hidden
            className="pointer-events-none absolute -left-20 -top-20 size-64 rounded-full bg-white/10"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -right-16 size-72 rounded-full bg-white/10"
          />

          <div className="relative">
            <span className="inline-block rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold text-white ring-1 ring-white/25">
              Quà tặng cho bạn
            </span>
            <h2 className="mx-auto mt-4 max-w-2xl text-2xl font-extrabold leading-snug tracking-tight text-white sm:text-3xl">
              Bắt đầu Hành trình tìm thấy chất giọng tiếng Anh của bạn ngay
              hôm nay!
            </h2>
            <p className="mt-3 text-sm text-white/85">
              Đăng ký để nhận Ebook miễn phí ngay
            </p>

            <form
              onSubmit={(event) => event.preventDefault()}
              className="mx-auto mt-7 flex max-w-2xl flex-col gap-3 sm:flex-row"
            >
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Họ và tên của bạn"
                aria-label="Họ và tên của bạn"
                className="w-full rounded-xl bg-white px-4 py-3 text-sm text-ink-900 outline-none placeholder:text-ink-500 focus:ring-2 focus:ring-white/60"
              />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                aria-label="Email"
                className="w-full rounded-xl bg-white px-4 py-3 text-sm text-ink-900 outline-none placeholder:text-ink-500 focus:ring-2 focus:ring-white/60"
              />
              <button
                type="submit"
                className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-800 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-900"
              >
                Nhận Ebook
                <Send className="size-4" />
              </button>
            </form>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-white/80">
              <Lock className="size-3.5" />
              Thông tin của bạn được cam kết bảo mật tuyệt đối 100%
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
