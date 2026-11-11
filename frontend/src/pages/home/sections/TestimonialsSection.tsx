import { Star } from 'lucide-react'
import { testimonials } from '../home-data'

export function TestimonialsSection() {
  return (
    <section className="bg-gray-50/80">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
            Chứng nhận thành công
          </p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            Cảm nhận Học viên
          </h2>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-6 lg:grid-cols-2">
          {testimonials.map((testimonial) => (
            <figure
              key={testimonial.name}
              className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, starIndex) => (
                  <Star
                    key={starIndex}
                    className="size-4 fill-brand-600 text-brand-600"
                  />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-sm italic leading-relaxed text-ink-700">
                {testimonial.quote}
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-gray-100 pt-4">
                <span className="flex size-10 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {testimonial.initials}
                </span>
                <div>
                  <p className="text-sm font-bold text-ink-900">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-ink-500">{testimonial.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
