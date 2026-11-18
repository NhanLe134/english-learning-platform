import { useState } from 'react'
import {
  Clock,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { SiteHeader } from '../../components/layout/SiteHeader'
import { SiteFooter } from '../../components/layout/SiteFooter'

export function ContactPage() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [courseInterest, setCourseInterest] = useState('Phát âm chuẩn IPA & Giao tiếp')
  const [currentLevel, setCurrentLevel] = useState('Người mất gốc hoàn toàn')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setSubmitted(true)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader activeTab="contact" />

      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-brand-50 via-[#fdf5f6] to-white">
          <div className="mx-auto max-w-7xl px-4 pb-12 pt-14 text-center sm:px-6 lg:px-8 lg:pb-16 lg:pt-20">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3.5 py-1 text-xs font-bold text-brand-600 ring-1 ring-brand-200">
              <Sparkles className="size-3.5" />
              Tư Vấn Miễn Phí &amp; Kiểm Tra Trình Độ
            </span>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
              Liên Hệ Với <span className="text-brand-600">Your English Voice</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ink-700 sm:text-lg">
              Bạn đang băn khoăn về lộ trình học hay chưa rõ trình độ hiện tại của mình?
              Hãy để lại lời nhắn, đội ngũ chuyên gia sẽ liên hệ tư vấn 1-1 cho bạn.
            </p>
          </div>
        </section>

        {/* Thông tin liên hệ & Form */}
        <section className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12">
            {/* Cột 1: Thông tin trung tâm & Cam kết */}
            <div className="space-y-8 lg:col-span-5">
              <div>
                <h2 className="text-2xl font-extrabold text-ink-900">
                  Thông Tin Trụ Sở &amp; Hỗ Trợ
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">
                  Chúng tôi tiếp nhận câu hỏi và hỗ trợ học viên từ 08:00 đến 21:00 hàng ngày,
                  bao gồm cả Thứ Bảy và Chủ Nhật.
                </p>
              </div>

              {/* Danh sách thẻ liên hệ */}
              <div className="space-y-4">
                <a
                  href="tel:0397714129"
                  className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-brand-200 hover:shadow-md"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Phone className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-ink-500">Hotline tư vấn</p>
                    <p className="mt-1 text-base font-extrabold text-brand-600">0397 714 129</p>
                    <p className="mt-0.5 text-xs text-ink-500">Hỗ trợ nhanh qua điện thoại &amp; Zalo</p>
                  </div>
                </a>

                <a
                  href="mailto:trangnn.ulis@gmail.com"
                  className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-brand-200 hover:shadow-md"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Mail className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-ink-500">Email học vụ &amp; đào tạo</p>
                    <p className="mt-1 text-base font-extrabold text-ink-900 break-all">trangnn.ulis@gmail.com</p>
                    <p className="mt-0.5 text-xs text-ink-500">Phản hồi trong vòng 24 giờ làm việc</p>
                  </div>
                </a>

                <div className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <MapPin className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-ink-500">Địa chỉ trung tâm</p>
                    <p className="mt-1 text-sm font-bold text-ink-900">
                      69 Dương Thị Xuân Quý, Phường Mỹ An, Quận Ngũ Hành Sơn, TP. Đà Nẵng
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">Có phòng học tương tác &amp; khu vực tự học</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Clock className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-ink-500">Giờ làm việc</p>
                    <p className="mt-1 text-sm font-bold text-ink-900">
                      Thứ Hai – Chủ Nhật: 08:00 – 21:00
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">Mở cửa đón tiếp học viên trực tiếp</p>
                  </div>
                </div>
              </div>

              {/* Cam kết */}
              <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-6">
                <div className="flex items-center gap-2.5 text-brand-600">
                  <ShieldCheck className="size-5" />
                  <h3 className="text-sm font-bold">Cam Kết Từ Your English Voice</h3>
                </div>
                <ul className="mt-3 space-y-2 text-xs leading-relaxed text-ink-700">
                  <li>✓ Kiểm tra trình độ phát âm và ngữ pháp hoàn toàn miễn phí.</li>
                  <li>✓ Tư vấn đúng lộ trình và thời gian học cần thiết, không chèo kéo.</li>
                  <li>✓ Cam kết đầu ra bằng văn bản cho mọi khóa học dài hạn.</li>
                </ul>
              </div>
            </div>

            {/* Cột 2: Form gửi yêu cầu tư vấn */}
            <div className="lg:col-span-7">
              <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-lg sm:p-10">
                <h3 className="text-2xl font-extrabold text-ink-900">
                  Gửi Yêu Cầu Tư Vấn Lộ Trình
                </h3>
                <p className="mt-2 text-sm text-ink-500">
                  Điền các thông tin dưới đây, giáo viên chuyên môn sẽ gọi điện thoại hoặc gửi email trao đổi trực tiếp với bạn.
                </p>

                {submitted ? (
                  <div className="mt-8 rounded-2xl bg-emerald-50 p-8 text-center">
                    <span className="inline-flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Sparkles className="size-7" />
                    </span>
                    <h4 className="mt-4 text-xl font-bold text-emerald-900">
                      Gửi Yêu Cầu Thành Công!
                    </h4>
                    <p className="mx-auto mt-2 max-w-md text-sm text-emerald-700">
                      Cảm ơn <strong>{fullName}</strong> đã quan tâm đến Your English Voice.
                      Chuyên viên học vụ sẽ liên hệ qua số điện thoại <strong>{phone}</strong> trong ít phút tới.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitted(false)
                        setFullName('')
                        setPhone('')
                        setEmail('')
                        setMessage('')
                      }}
                      className="mt-6 rounded-xl bg-brand-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-brand-700"
                    >
                      Gửi yêu cầu khác
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-ink-700">
                          Họ và tên của bạn <span className="text-brand-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Ví dụ: Nguyễn Văn An"
                          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-ink-900 outline-none transition-all focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-200"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-ink-700">
                          Số điện thoại (Zalo) <span className="text-brand-600">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Ví dụ: 0912 345 678"
                          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-ink-900 outline-none transition-all focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink-700">
                        Địa chỉ Email nhận tài liệu &amp; lộ trình <span className="text-brand-600">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-ink-900 outline-none transition-all focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-200"
                      />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-ink-700">
                          Chương trình bạn quan tâm
                        </label>
                        <select
                          value={courseInterest}
                          onChange={(e) => setCourseInterest(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-ink-900 outline-none transition-all focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-200"
                        >
                          <option value="Phát âm chuẩn IPA & Giao tiếp">Phát âm chuẩn IPA &amp; Giao tiếp</option>
                          <option value="IELTS Intensive (Mục tiêu 6.5 - 7.5+)">IELTS Intensive (Mục tiêu 6.5 - 7.5+)</option>
                          <option value="Tiếng Anh Giao Tiếp Cho Người Đi Làm">Tiếng Anh Giao Tiếp Cho Người Đi Làm</option>
                          <option value="Lấy Lại Căn Bản Cho Người Mất Gốc">Lấy Lại Căn Bản Cho Người Mất Gốc</option>
                          <option value="Khóa Học Kèm 1-1 Riêng Biệt">Khóa Học Kèm 1-1 Riêng Biệt</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-ink-700">
                          Trình độ tiếng Anh hiện tại
                        </label>
                        <select
                          value={currentLevel}
                          onChange={(e) => setCurrentLevel(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-ink-900 outline-none transition-all focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-200"
                        >
                          <option value="Người mất gốc hoàn toàn">Mất gốc hoàn toàn / Bắt đầu từ số 0</option>
                          <option value="Biết từ vựng nhưng không nói được">Biết từ vựng nhưng không phản xạ được</option>
                          <option value="Giao tiếp cơ bản nhưng hay sai phát âm">Giao tiếp cơ bản nhưng phát âm chưa chuẩn</option>
                          <option value="Đã có nền tảng, muốn luyện thi IELTS">Đã có nền tảng, muốn luyện thi chứng chỉ</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink-700">
                        Lời nhắn hoặc câu hỏi thêm của bạn (nếu có)
                      </label>
                      <textarea
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Hãy chia sẻ mục tiêu thời gian cần đạt kết quả hoặc khung giờ bạn có thể nhận cuộc gọi..."
                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-ink-900 outline-none transition-all focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-200"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-4 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
                    >
                      {submitting ? (
                        'Đang gửi thông tin...'
                      ) : (
                        <>
                          <Send className="size-4" />
                          Gửi Thông Tin Tư Vấn Ngay
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
