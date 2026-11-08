import {
  ArrowRight,
  CalendarDays,
  Mic2,
  UserRound,
} from 'lucide-react'
import { workshops } from '../home-data'

export function WorkshopSection() {
  return (
    <section id="workshop" className="bg-[#17181c]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-500">
              Workshop đặc quyền
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Tham Gia Workshop Ngay Cùng Chúng Tôi
            </h2>
          </div>
          <a
            href="#"
            className="flex items-center gap-1.5 text-sm font-semibold text-brand-500 hover:text-brand-200"
          >
            Xem tất cả
            <ArrowRight className="size-4" />
          </a>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {workshops.map((workshop) => (
            <article
              key={workshop.id}
              className="flex flex-col rounded-2xl bg-white p-6 shadow-lg"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600">
                  {workshop.badge}
                </span>
              </div>
              <p className="mt-3 text-xs font-semibold text-brand-600">
                {workshop.eyebrow}
              </p>
              <h3 className="mt-1.5 text-lg font-bold text-ink-900">
                {workshop.title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-500">
                {workshop.description}
              </p>

              <ul className="mt-4 space-y-2 text-sm text-ink-700">
                {workshop.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-600" />
                    {highlight}
                  </li>
                ))}
              </ul>

              <div className="mt-5 space-y-2.5 border-t border-gray-100 pt-4 text-sm text-ink-700">
                {workshop.schedule.map((slot) => (
                  <p key={slot} className="flex items-center gap-2">
                    <CalendarDays className="size-4 shrink-0 text-brand-600" />
                    {slot}
                  </p>
                ))}
                <p className="flex items-center gap-2">
                  {workshop.id === 'english-entrepreneurs' ? (
                    <Mic2 className="size-4 shrink-0 text-brand-600" />
                  ) : (
                    <UserRound className="size-4 shrink-0 text-brand-600" />
                  )}
                  {workshop.host}
                </p>
              </div>

              <button
                type="button"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
              >
                Đăng ký giữ chỗ ngay
                <ArrowRight className="size-4" />
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
