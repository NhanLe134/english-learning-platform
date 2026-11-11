import { useState } from 'react'
import {
  ArrowRight,
  BookCheck,
  BookHeadphones,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  Search,
  Sparkles,
  Star,
} from 'lucide-react'
import { SiteHeader } from '../../components/layout/SiteHeader'
import { SiteFooter } from '../../components/layout/SiteFooter'

interface EbookItem {
  id: string
  title: string
  category: string
  description: string
  format: string
  pages: number
  downloads: string
  rating: number
  badge?: string
  gradient: string
  icon: typeof FileText
  highlights: string[]
}

const EBOOK_LIST: EbookItem[] = [
  {
    id: 'ipa-mastery',
    title: 'Bí Kíp Phát Âm Chuẩn IPA Trong 30 Ngày',
    category: 'Phát âm & IPA',
    description:
      'Lộ trình sửa ngọng, đặt khẩu hình chuẩn bản xứ và phương pháp tự ghi âm chỉnh lỗi tại nhà.',
    format: 'PDF + 60 phút Audio HQ',
    pages: 120,
    downloads: '12.450+',
    rating: 4.9,
    badge: 'Phổ biến nhất',
    gradient: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 55%, #60A5FA 100%)',
    icon: BookHeadphones,
    highlights: ['44 âm IPA chi tiết có khẩu hình', 'Audio đối chiếu giọng Anh - Mỹ', 'Bài tập phản xạ câu nói hàng ngày'],
  },
  {
    id: '3000-vocabulary',
    title: '3000 Từ Vựng Tiếng Anh Giao Tiếp Thông Dụng',
    category: 'Từ vựng & Giao tiếp',
    description:
      'Tổng hợp 3000 từ vựng cốt lõi theo tần suất xuất hiện cao nhất trong đời sống và công việc.',
    format: 'PDF + Bộ Flashcards Anki',
    pages: 185,
    downloads: '9.820+',
    rating: 4.8,
    badge: 'Khuyên đọc',
    gradient: 'linear-gradient(135deg, #7C2D12 0%, #EA580C 55%, #FDBA74 100%)',
    icon: BookOpen,
    highlights: ['Phân loại theo 25 chủ đề thực chiến', 'Ví dụ ngữ cảnh thực tế & collocation', 'Kèm file flashcards nhập vào app'],
  },
  {
    id: 'ielts-strategy',
    title: 'Chiến Lược Tự Học IELTS 7.0 Từ Con Số 0',
    category: 'Luyện thi IELTS',
    description:
      'Phương pháp học hiểu bản chất, không học vẹt đề. Lộ trình phân bổ 4 kỹ năng khoa học cho người bận rộn.',
    format: 'PDF + Template Notion Tracker',
    pages: 145,
    downloads: '8.340+',
    rating: 4.9,
    gradient: 'linear-gradient(135deg, #064E3B 0%, #059669 55%, #6EE7B7 100%)',
    icon: BookCheck,
    highlights: ['Phân tích bẫy đề thi mới nhất', '15 khung lập luận Writing Task 2', 'Bảng mục tiêu từng tuần cụ thể'],
  },
  {
    id: 'grammar-applied',
    title: 'Cẩm Nang 10 Phút Ngữ Pháp Ứng Dụng Mỗi Ngày',
    category: 'Ngữ pháp ứng dụng',
    description:
      'Loại bỏ lý thuyết khô khan, học ngữ pháp theo cách diễn đạt tự nhiên không bị dịch ngược từ tiếng Việt.',
    format: 'PDF + Bài tập trắc nghiệm',
    pages: 96,
    downloads: '6.710+',
    rating: 4.7,
    gradient: 'linear-gradient(135deg, #3B0764 0%, #7C3AED 55%, #C4B5FD 100%)',
    icon: FileText,
    highlights: ['12 chủ điểm ngữ pháp hay nhầm lẫn', 'Quy tắc phản xạ 3 giây trong giao tiếp', 'Đáp án chi tiết giải thích tại sao'],
  },
  {
    id: 'workplace-idioms',
    title: 'Sổ Tay Cụm Động Từ & Idioms Dành Cho Người Đi Làm',
    category: 'Từ vựng & Giao tiếp',
    description:
      '500+ collocations và thành ngữ giao tiếp công sở giúp bạn tự tin viết email và thuyết trình cùng đối tác quốc tế.',
    format: 'PDF song ngữ',
    pages: 110,
    downloads: '5.920+',
    rating: 4.8,
    gradient: 'linear-gradient(135deg, #0F172A 0%, #334155 55%, #94A3B8 100%)',
    icon: BookOpen,
    highlights: ['Email templates chuẩn văn phòng', 'Từ lóng và thành ngữ họp meeting', 'Kèm audio đọc mẫu từng cụm'],
  },
  {
    id: 'ielts-speaking-forecast',
    title: 'Bộ Đề Dự Đoán & Lời Giải IELTS Speaking Quý Mới',
    category: 'Luyện thi IELTS',
    description:
      'Tổng hợp các chủ đề Speaking nóng hổi kèm bài mẫu 8.0+ và danh mục từ vựng band cao độc quyền.',
    format: 'PDF + Audio Band 8.5',
    pages: 130,
    downloads: '7.150+',
    rating: 4.9,
    badge: 'Mới cập nhật',
    gradient: 'linear-gradient(135deg, #713F12 0%, #CA8A04 55%, #FDE68A 100%)',
    icon: BookHeadphones,
    highlights: ['Sample answers cho cả Part 1, 2, 3', 'Gợi ý ý tưởng không lo bí đề', 'Audio giọng cựu giám khảo quốc tế'],
  },
]

const CATEGORIES = ['Tất cả', 'Phát âm & IPA', 'Từ vựng & Giao tiếp', 'Luyện thi IELTS', 'Ngữ pháp ứng dụng']

export function EbooksPage() {
  const [selectedCategory, setSelectedCategory] = useState('Tất cả')
  const [searchQuery, setSearchQuery] = useState('')
  const [downloadModal, setDownloadModal] = useState<EbookItem | null>(null)
  const [emailInput, setEmailInput] = useState('')
  const [downloadSuccess, setDownloadSuccess] = useState(false)

  const filteredEbooks = EBOOK_LIST.filter((item) => {
    const matchesCategory = selectedCategory === 'Tất cả' || item.category === selectedCategory
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  function handleDownloadSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!emailInput) return
    setDownloadSuccess(true)
    setTimeout(() => {
      setDownloadSuccess(false)
      setDownloadModal(null)
      setEmailInput('')
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader activeTab="ebook" />

      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-brand-50 via-[#fdf5f6] to-white">
          <div className="mx-auto max-w-7xl px-4 pb-12 pt-14 sm:px-6 lg:px-8 lg:pb-16 lg:pt-20">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3.5 py-1 text-xs font-bold text-brand-600 ring-1 ring-brand-200">
                <Sparkles className="size-3.5" />
                Kho Tài Liệu Độc Quyền Miễn Phí
              </span>
              <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
                Tủ Sách Ebook <span className="text-brand-600">Your English Voice</span>
              </h1>
              <p className="mt-4 text-base leading-relaxed text-ink-700 sm:text-lg">
                Tổng hợp tài liệu phát âm chuẩn IPA, 3000 từ vựng cốt lõi và chiến lược bứt phá
                điểm số được biên soạn công phu từ cựu giám khảo và chuyên gia 8.5+ IELTS.
              </p>

              {/* Ô tìm kiếm */}
              <div className="mx-auto mt-8 max-w-xl">
                <div className="relative flex items-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-gray-200 focus-within:ring-2 focus-within:ring-brand-200">
                  <Search className="ml-3 size-5 text-ink-500" />
                  <input
                    type="search"
                    placeholder="Tìm tên ebook, chủ đề ngữ pháp, từ vựng, IELTS..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent px-3 py-2 text-sm text-ink-900 outline-none placeholder:text-ink-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="mr-2 text-xs font-semibold text-ink-500 hover:text-ink-900"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Danh mục & Bộ lọc */}
        <section className="border-y border-gray-100 bg-gray-50/70 py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                      selectedCategory === cat
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-white text-ink-700 border border-gray-200 hover:border-brand-600 hover:text-brand-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <span className="text-xs font-bold text-ink-500">
                Hiển thị {filteredEbooks.length} tài liệu
              </span>
            </div>
          </div>
        </section>

        {/* Danh sách Ebook Cards */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEbooks.map((ebook) => {
              const Icon = ebook.icon
              return (
                <article
                  key={ebook.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-lg"
                >
                  {/* Bìa Gradient */}
                  <div
                    className="relative flex h-48 w-full items-center justify-center p-6 text-white"
                    style={{ background: ebook.gradient }}
                  >
                    <span className="flex size-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                      <Icon className="size-8" />
                    </span>

                    {ebook.badge && (
                      <span className="absolute left-3 top-3 rounded-full bg-brand-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                        {ebook.badge}
                      </span>
                    )}

                    <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold backdrop-blur-sm">
                      <Star className="size-3.5 fill-amber-400 text-amber-400" />
                      {ebook.rating} ({ebook.downloads})
                    </span>
                  </div>

                  {/* Nội dung chi tiết */}
                  <div className="flex flex-1 flex-col p-6">
                    <span className="text-xs font-semibold text-brand-600">{ebook.category}</span>
                    <h3 className="mt-2 text-lg font-bold text-ink-900 group-hover:text-brand-600 transition-colors">
                      {ebook.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-500">
                      {ebook.description}
                    </p>

                    <ul className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-xs text-ink-700">
                      {ebook.highlights.map((h) => (
                        <li key={h} className="flex items-start gap-2">
                          <CheckCircle2 className="size-3.5 shrink-0 text-brand-600 mt-0.5" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto pt-6 flex items-center justify-between border-t border-gray-100">
                      <div className="text-xs text-ink-500">
                        <span className="font-semibold text-ink-900">{ebook.pages} trang</span> · {ebook.format}
                      </div>

                      <button
                        type="button"
                        onClick={() => setDownloadModal(ebook)}
                        className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-700"
                      >
                        <Download className="size-3.5" />
                        Tải Ebook
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          {filteredEbooks.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-12 text-center">
              <BookOpen className="mx-auto size-12 text-ink-400" />
              <h3 className="mt-4 text-base font-bold text-ink-900">Không tìm thấy tài liệu phù hợp</h3>
              <p className="mt-1 text-sm text-ink-500">Vui lòng thử tìm với từ khóa khác hoặc đặt lại bộ lọc.</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('Tất cả')
                  setSearchQuery('')
                }}
                className="mt-4 rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700"
              >
                Xem tất cả tài liệu
              </button>
            </div>
          )}
        </section>

        {/* Form Đăng ký nhận tài liệu mới qua email */}
        <section className="bg-brand-50/60 border-t border-brand-100 py-16">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <span className="rounded-full bg-brand-600 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-white">
              Cập nhật hàng tuần
            </span>
            <h2 className="mt-4 text-2xl font-extrabold text-ink-900 sm:text-3xl">
              Nhận Trọn Bộ Tài Liệu Mới Nhất Trực Tiếp Qua Email
            </h2>
            <p className="mt-2 text-sm text-ink-700">
              Đội ngũ Your English Voice liên tục phát hành các bộ từ vựng, tài liệu phát âm và đề thi có giải thích chi tiết.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                alert('Đăng ký nhận tài liệu thành công!')
              }}
              className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                required
                placeholder="Nhập email của bạn..."
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink-900 outline-none focus:ring-2 focus:ring-brand-200"
              />
              <button
                type="submit"
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
              >
                Nhận Ebook Ngay
                <ArrowRight className="size-4" />
              </button>
            </form>
          </div>
        </section>

        {/* Modal Tải Ebook */}
        {downloadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-ink-900">Tải Tài Liệu Miễn Phí</h3>
              <p className="mt-1 text-xs text-brand-600 font-semibold">{downloadModal.title}</p>
              <p className="mt-3 text-xs leading-relaxed text-ink-500">
                Nhập email của bạn để hệ thống tự động gửi link tải tài liệu định dạng {downloadModal.format}.
              </p>

              {downloadSuccess ? (
                <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-center text-sm font-bold text-emerald-700">
                  ✓ Link tải tài liệu đã được gửi tới email của bạn!
                </div>
              ) : (
                <form onSubmit={handleDownloadSubmit} className="mt-4 space-y-3">
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Địa chỉ email nhận tài liệu..."
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-200"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDownloadModal(null)}
                      className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-bold text-ink-700 hover:bg-gray-50"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      className="flex-1 rounded-xl bg-brand-600 py-2.5 text-xs font-bold text-white hover:bg-brand-700"
                    >
                      Xác Nhận Tải
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
