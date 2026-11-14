import { reasons } from '../home-data'

export function AboutSection() {
  return (
    <section id="ve-chung-toi" className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
            Về chúng tôi
          </p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            Vì Sao Chọn Your English Voice
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            Tập trung tuyệt đối vào trải nghiệm học tập và hiệu quả thực tế của
            từng học viên.
          </p>
        </div>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((reason) => {
            const Icon = reason.icon
            return (
              <div key={reason.title}>
                <span className="flex size-11 items-center justify-center rounded-xl bg-brand-600 text-white">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-ink-900">
                  {reason.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">
                  {reason.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
