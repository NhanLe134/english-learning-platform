import { useEffect, useRef, useState } from 'react'
import {
  Award,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  GraduationCap,
  Heart,
  Languages,
  Quote,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import { SiteHeader } from '../../components/layout/SiteHeader'
import { SiteFooter } from '../../components/layout/SiteFooter'

/* ------------------------------------------------------------------ */
/* Dữ liệu                                                             */
/* ------------------------------------------------------------------ */

const HERO_STATS = [
  { value: '5.000+', label: 'Học viên đã tốt nghiệp' },
  { value: '98%', label: 'Hài lòng về chất lượng' },
  { value: '24', label: 'Giảng viên 8.0+ IELTS' },
  { value: '12', label: 'Năm kinh nghiệm' },
]

const PILLARS = [
  {
    icon: Target,
    title: 'Sứ mệnh',
    description:
      'Đưa tiếng nói của người Việt ra thế giới — giúp mọi người Việt tự tin sử dụng tiếng Anh như ngôn ngữ thứ hai thật sự, không chỉ để thi lấy điểm.',
    points: ['Học để dùng, không học để thi', 'Phản xạ giao tiếp trong 3 giây'],
  },
  {
    icon: Eye,
    title: 'Tầm nhìn',
    description:
      'Trở thành trung tâm tiếng Anh chuẩn quốc tế hàng đầu Việt Nam theo lộ trình CEFR & Cambridge, nơi mỗi học viên đều tìm thấy giọng nói riêng của mình.',
    points: ['Chuẩn CEFR & Cambridge', 'Công nghệ phản xạ trực quan'],
  },
  {
    icon: Heart,
    title: 'Giá trị cốt lõi',
    description:
      ' Đồng hành tận tâm cùng từng học viên: cam kết đầu ra bằng văn bản, sĩ số nhỏ và lộ trình cá nhân hóa được đo lường sau mỗi 4 tuần học.',
    points: ['Cam kết đầu ra', 'Lộ trình cá nhân hóa'],
  },
]

interface Teacher {
  id: string
  name: string
  title: string
  initials: string
  gradient: string
  /** Ảnh chân dung (đặt trong frontend/public) — không có thì hiển thị gradient + initials */
  photo?: string
  credentials: string[]
  bio: string
  achievements: { icon: typeof Award; label: string }[]
}

const TEACHERS: Teacher[] = [
  {
    id: 'mark-davies',
    name: 'ThS. Mark Davies',
    title: 'Cựu Giám khảo IELTS British Council',
    initials: 'MD',
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 55%, #60a5fa 100%)',
    photo: '/david.png',
    credentials: ['12 năm làm giám khảo IELTS', 'Thạc sĩ TESOL — University of Leeds'],
    bio: 'Người thiết kế bộ công thức độc quyền xử lý 4 kỹ năng Nghe – Nói – Đọc – Viết của trung tâm. Mark trực tiếp chấm và sửa chi tiết từng bài Writing của học viên, giúp hàng nghìn người Việt chinh phục band 7.0+.',
    achievements: [
      { icon: Award, label: 'Giám khảo BC 12 năm' },
      { icon: TrendingUp, label: '90% học viên đạt 7.0+' },
      { icon: BookOpenCheck, label: 'Tác giả 4 giáo trình IELTS' },
    ],
  },
  {
    id: 'sarah-mai',
    name: 'Cô Sarah Mai',
    title: 'Chuyên gia Giao tiếp Doanh nghiệp',
    initials: 'SM',
    gradient: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 55%, #fdba74 100%)',
    photo: '/giaovien3.png',
    credentials: ['8.5 IELTS (Speaking 9.0)', '10 năm giảng dạy tại doanh nghiệp'],
    bio: 'Cô đào tạo đàm phán, viết email công sở và thuyết trình cho hơn 60 doanh nghiệp FDI. Phương pháp "Phản xạ 3 Giây" của cô giúp học viên xóa bỏ phản xạ dịch thầm tiếng Việt khi nói tiếng Anh.',
    achievements: [
      { icon: Languages, label: 'Speaking 9.0 IELTS' },
      { icon: Users, label: '60+ doanh nghiệp FDI' },
      { icon: Sparkles, label: 'Phương pháp Phản xạ 3 Giây' },
    ],
  },
  {
    id: 'hoang-nam',
    name: 'Thầy Hoàng Nam',
    title: 'Chuyên gia TOEIC — 990/990',
    initials: 'HN',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 55%, #6ee7b7 100%)',
    photo: '/giaovien.jpg',
    credentials: ['990/990 TOEIC Listening & Reading', 'Đào tạo 5.000+ sinh viên'],
    bio: 'Thầy nắm trọn bản đồ bẫy đề TOEIC Listening Part 3 & 4 và tối ưu tốc độ làm bài Reading Part 7 bằng phương pháp Skimming & Scanning. Lộ trình "Cấp tốc 2 tháng" của thầy giúp học viên tăng trung bình 250 điểm.',
    achievements: [
      { icon: Award, label: '990/990 TOEIC' },
      { icon: Users, label: '5.000+ học viên' },
      { icon: TrendingUp, label: '+250 điểm trung bình' },
    ],
  },
  {
    id: 'ngoc-anh',
    name: 'Cô Ngọc Ánh',
    title: 'Chuyên gia Ngữ âm học — American Accent',
    initials: 'NA',
    gradient: 'linear-gradient(135deg, #3b0764 0%, #7c3aed 55%, #c4b5fd 100%)',
    photo: '/giaovien2.jpg',
    credentials: ['Thủ khoa Sư Phạm Tiếng Anh', '8.0 IELTS — California Univ trao đổi'],
    bio: 'Cô giúp học viên làm chủ trọng âm câu, kỹ thuật lướt âm, nuốt âm và nối âm tự nhiên như người bản xứ. Chương trình 44 âm IPA & Nối Âm do cô biên soạn là nền tảng phát âm chuẩn của toàn bộ lộ trình trung tâm.',
    achievements: [
      { icon: GraduationCap, label: 'Thủ khoa Sư Phạm TA' },
      { icon: Languages, label: '44 âm IPA & Nối Âm' },
      { icon: Sparkles, label: 'Chuyên gia Ngữ âm học' },
    ],
  },
]

/* ------------------------------------------------------------------ */
/* Khối giảng viên — tab tự động chuyển                                 */
/* ------------------------------------------------------------------ */

const AUTO_ROTATE_MS = 5000

function TeacherShowcase() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (paused) return undefined
    timerRef.current = setInterval(() => {
      setActive((current) => (current + 1) % TEACHERS.length)
    }, AUTO_ROTATE_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [paused])

  const selectTeacher = (index: number) =>
    setActive((index + TEACHERS.length) % TEACHERS.length)

  const goPrevious = () => selectTeacher(active - 1)
  const goNext = () => selectTeacher(active + 1)

  const teacher = TEACHERS[active]

  return (
    <section className="bg-gray-50/80">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600">
            Đội ngũ giảng viên
          </span>
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            Những Người Thắp Lửa <span className="text-brand-600">Giọng Nói Việt</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-ink-700">
            100% giảng viên đạt 8.0+ IELTS hoặc tương đương, từng làm việc tại British
            Council, các doanh nghiệp FDI và đại học quốc tế.
          </p>
        </div>

        {/* Thẻ giảng viên: ảnh trái — thông tin phải, mũi tên 2 bên */}
        <div
          className="relative mx-auto mt-10 max-w-5xl"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <button
            type="button"
            aria-label="Giảng viên trước"
            onClick={goPrevious}
            className="absolute left-4 top-1/2 z-10 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink-900 shadow-lg transition-colors hover:bg-brand-50 hover:text-brand-600"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            aria-label="Giảng viên tiếp theo"
            onClick={goNext}
            className="absolute right-4 top-1/2 z-10 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink-900 shadow-lg transition-colors hover:bg-brand-50 hover:text-brand-600"
          >
            <ChevronRight className="size-6" />
          </button>

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-lg">
            <div key={teacher.id} className="flex flex-col md:flex-row">
            {/* Ảnh */}
            <div
              className="relative flex min-h-64 items-center justify-center md:w-2/5"
              style={{ background: teacher.photo ? undefined : teacher.gradient }}
            >
              {teacher.photo ? (
                <img
                  src={teacher.photo}
                  alt={teacher.name}
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                <span className="flex size-32 items-center justify-center rounded-full bg-white/15 text-5xl font-black text-white backdrop-blur-sm">
                  {teacher.initials}
                </span>
              )}
              <span className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                <Quote className="size-3.5" />
                {teacher.title}
              </span>
            </div>

            {/* Thông tin */}
            <div className="flex flex-1 flex-col p-6 sm:p-8">
              <h3 className="text-xl font-extrabold tracking-tight text-ink-900">
                {teacher.name}
              </h3>
              <p className="mt-1 text-sm font-bold text-brand-600">{teacher.title}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {teacher.credentials.map((credential) => (
                  <span
                    key={credential}
                    className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600"
                  >
                    {credential}
                  </span>
                ))}
              </div>

              <p className="mt-4 text-sm leading-relaxed text-ink-700">{teacher.bio}</p>

              <div className="mt-auto flex flex-wrap gap-x-6 gap-y-2 pt-6">
                {teacher.achievements.map((achievement) => {
                  const Icon = achievement.icon
                  return (
                    <span
                      key={achievement.label}
                      className="flex items-center gap-1.5 text-xs font-bold text-ink-900"
                    >
                      <Icon className="size-4 text-brand-600" />
                      {achievement.label}
                    </span>
                  )
                })}
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Trang                                                               */
/* ------------------------------------------------------------------ */

export function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="bg-gradient-to-b from-brand-50 via-[#fdf5f6] to-white">
          <div className="mx-auto max-w-7xl px-4 pb-12 pt-14 text-center sm:px-6 lg:px-8 lg:pb-16 lg:pt-20">
            <h1 className="mx-auto max-w-3xl text-3xl font-black leading-tight tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
              Đưa Tiếng Nói Của Người Việt{' '}
              <span className="text-brand-600">Ra Thế Giới</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-700">
              Your English Voice được thành lập với niềm tin rằng mỗi người Việt đều xứng
              đáng có một giọng nói tiếng Anh của riêng mình — tự tin, chuẩn mực và giàu
              cá tính. Từ Đà Nẵng, chúng tôi đã đồng hành cùng hàng nghìn học viên chinh
              phục các chuẩn mực CEFR, Cambridge, IELTS và TOEIC.
            </p>
            <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 lg:grid-cols-4">
              {HERO_STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgba(200,16,46,0.08)] ring-1 ring-gray-100"
                >
                  <p className="text-3xl font-extrabold text-brand-600">{stat.value}</p>
                  <p className="mt-1 text-xs font-medium text-ink-700">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sứ mệnh — Tầm nhìn — Giá trị cốt lõi */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600">
              Định hướng phát triển
            </span>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
              Sứ Mệnh, Tầm Nhìn & <span className="text-brand-600">Giá Trị Cốt Lõi</span>
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon
              return (
                <article
                  key={pillar.title}
                  className="flex flex-col rounded-2xl bg-white p-7 shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-lg"
                >
                  <span className="flex size-12 items-center justify-center rounded-xl bg-brand-600 text-white">
                    <Icon className="size-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-ink-900">{pillar.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-700">
                    {pillar.description}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
                    {pillar.points.map((point) => (
                      <span
                        key={point}
                        className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-ink-700"
                      >
                        {point}
                      </span>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        {/* Đội ngũ giảng viên */}
        <TeacherShowcase />

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-brand-600 to-brand-800 px-8 py-12 text-center text-white">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Sẵn Sàng Tìm Thấy <span className="text-brand-100">Giọng Nói</span> Của Bạn?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/85">
              Đăng ký học thử miễn phí để được kiểm tra trình độ đầu vào theo chuẩn CEFR
              và nhận lộ trình cá nhân hóa từ đội ngũ giảng viên của chúng tôi.
            </p>
            <a
              href="/courses"
              className="mt-7 inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-bold text-brand-600 transition-colors hover:bg-brand-50"
            >
              Khám phá các khóa học
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
