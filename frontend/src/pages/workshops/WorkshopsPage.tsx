import { useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Mic2,
  Sparkles,
  UserCheck,
  UserRound,
  Users,
  Video,
} from 'lucide-react'
import { SiteHeader } from '../../components/layout/SiteHeader'
import { SiteFooter } from '../../components/layout/SiteFooter'

interface WorkshopItem {
  id: string
  title: string
  category: string
  badge: string
  eyebrow: string
  description: string
  highlights: string[]
  schedule: string[]
  time: string
  platform: string
  host: string
  hostTitle: string
  seatsLeft: number
}

const WORKSHOP_LIST: WorkshopItem[] = [
  {
    id: 'pronunciation-mastery',
    title: 'Mastering English Pronunciation: Đặt Lưỡi Chuẩn Bản Xứ',
    category: 'Phát âm & Giao tiếp',
    badge: 'Zoom Trực Tuyến · Miễn Phí',
    eyebrow: 'Chỉnh khẩu hình trực tiếp 1-1',
    description:
      'Nhận diện các lỗi phát âm cố hữu của người Việt (nuốt âm cuối, sai trọng âm, ngữ điệu bằng phẳng). Được chuyên gia nghe và sửa lỗi trực tiếp trên phòng Zoom.',
    highlights: [
      'Luyện cơ miệng và đặt đầu lưỡi cho 8 cặp âm khó nhất',
      'Kỹ thuật nối âm, nuốt âm và nối từ tự nhiên không bị gượng',
      'Quy tắc nhấn trọng âm từ và trọng âm câu giúp nói có nhịp điệu',
    ],
    schedule: ['Thứ Bảy, 15/11/2026', 'Thứ Bảy, 22/11/2026'],
    time: '19:30 – 21:30',
    platform: 'Zoom Meeting Room (Sĩ số giới hạn)',
    host: 'Cô Trang Nguyễn (Trang Chuối)',
    hostTitle: 'Thạc sĩ ULIS, Cựu Giảng Viên Đại Học Ngoại Ngữ',
    seatsLeft: 8,
  },
  {
    id: 'workplace-barrier',
    title: 'Phá Bỏ Rào Cản Nói Tiếng Anh Cho Người Đi Làm',
    category: 'Tiếng Anh Công Sở',
    badge: 'Chuyên Đề Công Sở · Tương Tác Trực Tiếp',
    eyebrow: 'Phản xạ 3 giây không dịch nhẩm',
    description:
      'Phương pháp tư duy trực tiếp bằng tiếng Anh, giúp bạn tự tin phát biểu trong các cuộc họp với sếp Tây và đối tác nước ngoài mà không bị ngập ngừng.',
    highlights: [
      'Công thức hình thành ý tưởng nhanh không cần dịch từ tiếng Việt',
      '20 mẫu câu mở đầu và dẫn dắt ý kiến chuyên nghiệp trong meeting',
      'Xử lý tình huống khi không nghe kịp hoặc cần người khác nhắc lại',
    ],
    schedule: ['Chủ Nhật, 16/11/2026', 'Chủ Nhật, 23/11/2026'],
    time: '20:00 – 22:00',
    platform: 'Zoom Meeting tương tác',
    host: 'Thầy David Miller & Cô Mai Lan',
    hostTitle: 'Chuyên gia đào tạo kỹ năng giao tiếp quốc tế',
    seatsLeft: 5,
  },
  {
    id: 'ielts-speaking-intensive',
    title: 'IELTS Speaking 7.0+ Intensive: Mở Rộng Ý Tưởng Part 2 & 3',
    category: 'Chiến lược IELTS',
    badge: 'Luyện Thi Chuyên Sâu',
    eyebrow: 'Bí kíp từ cựu giám khảo quốc tế',
    description:
      'Chiến lược xây dựng câu trả lời có cấu trúc kim tự tháp (Idea Pyramid), sử dụng từ vựng theo ngữ cảnh và kiểm soát độ trôi chảy dưới áp lực phòng thi thật.',
    highlights: [
      'Khung trả lời mở rộng 60 giây không bị cạn ý Part 2',
      'Phát triển chiều sâu lập luận học thuật cho Part 3',
      'Bắt bệnh điểm yếu phát âm khiến bạn bị kẹt ở band 6.0',
    ],
    schedule: ['Thứ Năm, 20/11/2026', 'Thứ Năm, 27/11/2026'],
    time: '19:30 – 21:30',
    platform: 'Phòng Zoom Livestream tương tác',
    host: 'Thầy Robert Vance (Cựu Giám Khảo IELTS) & Đội Ngũ 8.5+',
    hostTitle: '12 năm kinh nghiệm chấm thi quốc tế',
    seatsLeft: 12,
  },
  {
    id: 'business-email-pitch',
    title: 'Kỹ Năng Viết Email & Thuyết Trình Tiếng Anh Chuyên Nghiệp',
    category: 'Tiếng Anh Công Sở',
    badge: 'Kỹ Năng Thực Chiến',
    eyebrow: 'Nâng tầm phong thái chuyên nghiệp',
    description:
      'Chuẩn hóa cấu trúc email công việc, tránh các từ ngữ cấm kỵ và kỹ thuật trình bày slide thuyết phục khách hàng quốc tế.',
    highlights: [
      'Bộ khung email từ chối, khiếu nại và đàm phán lịch sự',
      'Kỹ thuật body language và nhấn giọng khi thuyết trình trực tuyến',
      'Thực hành sửa 5 email học viên gửi trực tiếp trong buổi học',
    ],
    schedule: ['Thứ Ba, 25/11/2026'],
    time: '20:00 – 22:00',
    platform: 'Zoom Webinar',
    host: 'Thầy Alex Trần',
    hostTitle: 'Business Communication Coach',
    seatsLeft: 15,
  },
]

const WORKSHOP_CATEGORIES = ['Tất cả workshop', 'Phát âm & Giao tiếp', 'Chiến lược IELTS', 'Tiếng Anh Công Sở']

export function WorkshopsPage() {
  const [selectedCat, setSelectedCat] = useState('Tất cả workshop')
  const [registerModal, setRegisterModal] = useState<WorkshopItem | null>(null)
  const [registered, setRegistered] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  const filteredWorkshops = WORKSHOP_LIST.filter(
    (w) => selectedCat === 'Tất cả workshop' || w.category === selectedCat
  )

  function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault()
    setRegistered(true)
    setTimeout(() => {
      setRegistered(false)
      setRegisterModal(null)
      setName('')
      setPhone('')
      setEmail('')
    }, 2500)
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader activeTab="workshop" />

      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-brand-50 via-[#fdf5f6] to-white">
          <div className="mx-auto max-w-7xl px-4 pb-12 pt-14 text-center sm:px-6 lg:px-8 lg:pb-16 lg:pt-20">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3.5 py-1 text-xs font-bold text-brand-600 ring-1 ring-brand-200">
              <Sparkles className="size-3.5" />
              Đào Tạo Trực Tuyến &amp; Tương Tác 1-1
            </span>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
              Workshop Tiếng Anh <span className="text-brand-600">Chuyên Sâu</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ink-700 sm:text-lg">
              Tham gia các buổi workshop định kỳ cùng giảng viên bản xứ và chuyên gia 8.5+ IELTS.
              Giải quyết triệt để rào cản phản xạ, chỉnh khẩu hình và luyện tập trực tiếp trên Zoom.
            </p>

            {/* Thống kê nhanh */}
            <div className="mx-auto mt-8 grid max-w-2xl grid-cols-3 gap-4 border-t border-brand-100 pt-6">
              <div>
                <p className="text-2xl font-black text-brand-600 sm:text-3xl">120+</p>
                <p className="mt-1 text-xs font-semibold text-ink-500">Buổi workshop tổ chức</p>
              </div>
              <div>
                <p className="text-2xl font-black text-brand-600 sm:text-3xl">15.000+</p>
                <p className="mt-1 text-xs font-semibold text-ink-500">Lượt học viên tham gia</p>
              </div>
              <div>
                <p className="text-2xl font-black text-brand-600 sm:text-3xl">98%</p>
                <p className="mt-1 text-xs font-semibold text-ink-500">Đánh giá xuất sắc</p>
              </div>
            </div>
          </div>
        </section>

        {/* Filter Bar */}
        <section className="border-y border-gray-100 bg-gray-50/70 py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {WORKSHOP_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCat(cat)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                      selectedCat === cat
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-white text-ink-700 border border-gray-200 hover:border-brand-600 hover:text-brand-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <span className="text-xs font-bold text-ink-500">
                Có {filteredWorkshops.length} workshop đang mở đăng ký
              </span>
            </div>
          </div>
        </section>

        {/* Danh sách Workshop */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-2">
            {filteredWorkshops.map((workshop) => (
              <article
                key={workshop.id}
                className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-lg sm:p-8"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600">
                      {workshop.badge}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                      <Users className="size-3.5" />
                      Chỉ còn {workshop.seatsLeft} chỗ trống
                    </span>
                  </div>

                  <p className="mt-4 text-xs font-bold uppercase tracking-wide text-brand-600">
                    {workshop.eyebrow}
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-ink-900 sm:text-2xl">
                    {workshop.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-500">
                    {workshop.description}
                  </p>

                  <div className="mt-5 rounded-xl bg-gray-50 p-4">
                    <p className="text-xs font-bold text-ink-900">Điểm nổi bật trong buổi học:</p>
                    <ul className="mt-2 space-y-2 text-xs text-ink-700">
                      {workshop.highlights.map((h) => (
                        <li key={h} className="flex items-start gap-2">
                          <CheckCircle2 className="size-3.5 shrink-0 text-brand-600 mt-0.5" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-5 space-y-2.5 border-t border-gray-100 pt-4 text-xs text-ink-700">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="size-4 shrink-0 text-brand-600" />
                      <span className="font-semibold text-ink-900">Lịch diễn ra:</span>
                      <span>{workshop.schedule.join(' · ')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 shrink-0 text-brand-600" />
                      <span className="font-semibold text-ink-900">Thời gian:</span>
                      <span>{workshop.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Video className="size-4 shrink-0 text-brand-600" />
                      <span className="font-semibold text-ink-900">Hình thức:</span>
                      <span>{workshop.platform}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserRound className="size-4 shrink-0 text-brand-600" />
                      <span className="font-semibold text-ink-900">Giảng viên phụ trách:</span>
                      <span>{workshop.host} — <em className="text-ink-500 not-italic">{workshop.hostTitle}</em></span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 border-t border-gray-100 pt-5">
                  <button
                    type="button"
                    onClick={() => setRegisterModal(workshop)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
                  >
                    Đăng Ký Giữ Chỗ Miễn Phí
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Lợi ích khi tham gia workshop */}
        <section className="bg-gray-50/70 border-t border-gray-100 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-600">
                Tại sao bạn nên tham gia?
              </span>
              <h2 className="mt-2 text-2xl font-extrabold text-ink-900 sm:text-3xl">
                Trải Nghiệm Lớp Học Trực Tuyến Độc Quyền
              </h2>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <span className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Mic2 className="size-6" />
                </span>
                <h3 className="mt-4 text-base font-bold text-ink-900">Sửa lỗi trực tiếp 1-1</h3>
                <p className="mt-2 text-sm text-ink-500 leading-relaxed">
                  Không phải buổi thuyết giảng một chiều. Bạn được bật mic thực hành và được giáo viên chỉnh khẩu hình ngay tại chỗ.
                </p>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <span className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <UserCheck className="size-6" />
                </span>
                <h3 className="mt-4 text-base font-bold text-ink-900">Sĩ số giới hạn</h3>
                <p className="mt-2 text-sm text-ink-500 leading-relaxed">
                  Mỗi buổi học giới hạn số lượng học viên tham gia để đảm bảo chất lượng tương tác và mọi người đều có cơ hội phát biểu.
                </p>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <span className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Video className="size-6" />
                </span>
                <h3 className="mt-4 text-base font-bold text-ink-900">Tặng kèm Video Record & Slide</h3>
                <p className="mt-2 text-sm text-ink-500 leading-relaxed">
                  Toàn bộ tài liệu, slide tóm tắt và video xem lại sau buổi học sẽ được gửi qua email cho học viên đăng ký.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Modal Đăng Ký Giữ Chỗ */}
        {registerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
              <h3 className="text-xl font-bold text-ink-900">Đăng Ký Giữ Chỗ Workshop</h3>
              <p className="mt-1 text-xs font-semibold text-brand-600">{registerModal.title}</p>
              <p className="mt-2 text-xs text-ink-500">
                Lịch học: {registerModal.schedule[0]} ({registerModal.time}) qua Zoom.
              </p>

              {registered ? (
                <div className="mt-6 rounded-xl bg-emerald-50 p-5 text-center">
                  <p className="text-sm font-bold text-emerald-800">
                    🎉 Đăng ký thành công!
                  </p>
                  <p className="mt-1 text-xs text-emerald-700">
                    Link phòng Zoom và hướng dẫn chuẩn bị trước buổi học đã được gửi tới email của bạn.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-700">Họ và tên của bạn</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn A"
                      className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-700">Số điện thoại (để nhận mã Zoom qua Zalo)</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ví dụ: 0912 345 678"
                      className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-700">Địa chỉ Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-200"
                    />
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setRegisterModal(null)}
                      className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-bold text-ink-700 hover:bg-gray-50"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="flex-1 rounded-xl bg-brand-600 py-2.5 text-xs font-bold text-white hover:bg-brand-700"
                    >
                      Xác Nhận Giữ Chỗ
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
