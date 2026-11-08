import { Check, PlayCircle, Users } from 'lucide-react'

const HERO_CHECKLIST = [
  'Cam kết hiểu sâu và vận dụng được ngay',
  'Học mọi lúc mọi nơi',
]

export function HeroSection() {
  return (
    <section className="bg-gradient-to-b from-brand-50 via-[#fdf5f6] to-white">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-20">
        {/* Nội dung */}
        <div>
          <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            <span className="text-ink-900">Hiểu sâu sắc</span>
            <br />
            <span className="text-brand-600">Tự Tin sử dụng</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-700">
            Tiếp cận tiếng Anh bằng phương pháp so sánh với tiếng Việt.
            Chuyển hoá những thói quen vô thức của học viên Việt. Đưa tiếng
            nói của người Việt ra thế giới.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="/courses"
              className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
            >
              Nhận chương trình học ngay
            </a>
            <a
              href="#workshop"
              className="rounded-xl bg-brand-50 px-6 py-3 text-sm font-bold text-brand-600 transition-colors hover:bg-brand-100"
            >
              Tham gia đào tạo trực tuyến
            </a>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            {HERO_CHECKLIST.map((item) => (
              <span
                key={item}
                className="flex items-center gap-1.5 text-xs font-medium text-ink-700"
              >
                <span className="flex size-4 items-center justify-center rounded-full bg-brand-600 text-white">
                  <Check className="size-2.5" strokeWidth={3} />
                </span>
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Ảnh lớp học — thay bằng ảnh thật trong src/assets khi có */}
        <div className="relative">
          <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#dbe4f0] via-[#e8eef7] to-[#f3e2e6] shadow-lg">
            <div className="flex flex-col items-center gap-3 text-ink-500">
              <Users className="size-16" strokeWidth={1.5} />
              <span className="text-sm font-medium">Ảnh lớp học</span>
            </div>
          </div>
          <span className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-ink-700 shadow-sm backdrop-blur">
            <PlayCircle className="size-4 text-brand-600" />
            Học trực tuyến cùng giáo viên
          </span>
        </div>
      </div>
    </section>
  )
}
