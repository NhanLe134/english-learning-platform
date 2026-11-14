import { useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Download,
  FileText,
  Mail,
  Search,
  Sparkles,
  Star,
} from 'lucide-react'
import { SiteHeader } from '../../components/layout/SiteHeader'
import { SiteFooter } from '../../components/layout/SiteFooter'
import {
  EBOOK_CATEGORIES,
  ebooks,
  formatPrice,
  type Ebook,
} from './ebooks-data'

/* ------------------------------------------------------------------ */
/* Thẻ ebook                                                           */
/* ------------------------------------------------------------------ */

function EbookCard({
  ebook,
  onDownload,
}: {
  ebook: Ebook
  onDownload: (ebook: Ebook) => void
}) {
  return (
    <article className="group flex overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-lg">
      {/* Ảnh bìa — cột trái, khung dọc chuẩn bìa sách, ảnh hiện đầy đủ không crop */}
      <div
        className="relative flex w-36 shrink-0 items-center justify-center p-3 sm:w-44 sm:p-5"
        style={
          ebook.cover
            ? { background: 'linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%)' }
            : { background: ebook.gradient }
        }
      >
        {ebook.cover ? (
          <img
            src={ebook.cover}
            alt={ebook.title}
            className="max-h-full max-w-full object-contain shadow-[0_12px_24px_rgba(23,24,28,0.28)]"
          />
        ) : (
          <span className="flex size-20 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-sm">
            <BookOpen className="size-10" />
          </span>
        )}

        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-900 shadow-sm sm:left-3 sm:top-3 sm:px-2.5 sm:py-1">
          {ebook.format}
        </span>
        <span className="absolute bottom-2 right-2 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm sm:bottom-3 sm:right-3 sm:px-2.5 sm:py-1 sm:text-xs">
          {ebook.pages} trang
        </span>
      </div>

      {/* Nội dung — cột phải */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <span className="text-xs font-bold text-brand-600">{ebook.category}</span>

        <h3 className="mt-1.5 text-base font-bold leading-snug text-ink-900 transition-colors group-hover:text-brand-600 sm:text-lg">
          {ebook.title}
        </h3>

        <p className="mt-0.5 text-xs font-semibold text-ink-700">{ebook.author}</p>

        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-500">
          {ebook.description}
        </p>

        {/* Đánh giá + lượt tải */}
        <div className="mt-2.5 flex items-center gap-4 text-xs text-ink-500">
          <span className="flex items-center gap-1">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            <span className="font-bold text-ink-900">{ebook.rating.toFixed(1)}</span>
          </span>
          <span className="flex items-center gap-1">
            <Download className="size-3.5" />
            {ebook.downloads.toLocaleString('vi-VN')} lượt tải
          </span>
        </div>

        {/* Giá + CTA */}
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            {ebook.price === 0 ? (
              <p className="text-lg font-extrabold text-brand-600 sm:text-xl">Miễn phí</p>
            ) : (
              <>
                {ebook.originalPrice && (
                  <p className="text-xs text-ink-500 line-through sm:text-sm">
                    {formatPrice(ebook.originalPrice)}
                  </p>
                )}
                <p className="text-lg font-extrabold text-brand-600 sm:text-xl">
                  {formatPrice(ebook.price)}
                </p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => onDownload(ebook)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white transition-colors ${
              ebook.price === 0
                ? 'bg-ink-900 hover:bg-ink-700'
                : 'bg-brand-600 hover:bg-brand-700'
            }`}
          >
            {ebook.price === 0 ? (
              <>
                Tải xuống
                <Download className="size-3.5" />
              </>
            ) : (
              <>
                Mua ebook
                <ChevronRight className="size-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  )
}

/* ------------------------------------------------------------------ */
/* Trang Ebooks                                                        */
/* ------------------------------------------------------------------ */

export function EbooksPage() {
  const [category, setCategory] = useState<string>('Tất cả')
  const [searchInput, setSearchInput] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [downloadModal, setDownloadModal] = useState<Ebook | null>(null)
  const [emailInput, setEmailInput] = useState('')
  const [downloadSuccess, setDownloadSuccess] = useState(false)

  const ebookList = useMemo(() => {
    return ebooks.filter((item) => {
      const matchCategory =
        category === 'Tất cả' ||
        item.category.toLowerCase() === category.toLowerCase()
      const query = activeQuery.trim().toLowerCase()
      const matchQuery =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.author.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      return matchCategory && matchQuery
    })
  }, [category, activeQuery])

  function applySearch() {
    setActiveQuery(searchInput)
  }

  function handleOpenDownload(ebook: Ebook) {
    setDownloadModal(ebook)
    setDownloadSuccess(false)
    setEmailInput('')
  }

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
                Hệ thống tài liệu ôn thi độc quyền được biên soạn bởi đội ngũ giảng viên của trung tâm —
                cô đọng, thực chiến và cập nhật theo đề thi mới nhất. Nhiều ebook hoàn toàn miễn phí
                để bạn tải về bắt đầu hành trình chinh phục tiếng Anh ngay hôm nay.
              </p>

              {/* Ô tìm kiếm */}
              <div className="mx-auto mt-6 max-w-xl">
                <form
                  className="flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-[0_8px_30px_rgba(200,16,46,0.08)] ring-1 ring-gray-100"
                  onSubmit={(event) => {
                    event.preventDefault()
                    applySearch()
                  }}
                >
                  <Search className="ml-2 size-5 shrink-0 text-ink-500" />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(event) => {
                      setSearchInput(event.target.value)
                      if (!event.target.value) setActiveQuery('')
                    }}
                    placeholder="Tìm ebook theo tên, tác giả, chủ đề..."
                    className="w-full min-w-0 flex-1 bg-transparent py-2 text-sm text-ink-900 outline-none placeholder:text-ink-500"
                  />
                  <button
                    type="submit"
                    className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
                  >
                    Tìm Kiếm
                    <ArrowRight className="size-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Danh mục + lưới ebook */}
        <section className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            {EBOOK_CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  category === item
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-gray-100 text-ink-700 hover:bg-gray-200 hover:text-brand-600'
                }`}
              >
                {item}
              </button>
            ))}
            <span className="ml-auto rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600">
              Tìm thấy {ebookList.length} ebook
            </span>
          </div>

          {ebookList.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center">
              <BookOpen className="mx-auto size-12 text-ink-400" />
              <h3 className="mt-4 text-base font-bold text-ink-900">Không tìm thấy tài liệu phù hợp</h3>
              <p className="mt-1 text-sm text-ink-500">Vui lòng thử từ khóa hoặc danh mục khác nhé!</p>
              <button
                type="button"
                onClick={() => {
                  setCategory('Tất cả')
                  setSearchInput('')
                  setActiveQuery('')
                }}
                className="mt-4 rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700"
              >
                Xem tất cả tài liệu
              </button>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {ebookList.map((ebook) => (
                <EbookCard
                  key={ebook.id}
                  ebook={ebook}
                  onDownload={handleOpenDownload}
                />
              ))}
            </div>
          )}
        </section>

        {/* CTA nhận ebook miễn phí */}
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-brand-600 to-brand-800 px-8 py-12 text-center text-white">
            <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-white/15">
              <Mail className="size-6" />
            </span>
            <h2 className="mt-5 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Nhận Ebook Miễn Phí <span className="text-brand-100">Mỗi Tháng</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/85">
              Đăng ký nhận tài liệu mới, bài mẫu band cao và mẹo ôn thi được gửi thẳng
              tới email của bạn — không spam, hủy đăng ký bất cứ lúc nào.
            </p>
            <form
              className="mx-auto mt-7 flex max-w-md flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault()
                alert('Đăng ký nhận tài liệu định kỳ thành công!')
              }}
            >
              <input
                type="email"
                required
                placeholder="Email của bạn..."
                className="flex-1 rounded-xl bg-white px-4 py-3 text-sm text-ink-900 outline-none placeholder:text-ink-500 focus:ring-2 focus:ring-brand-200"
              />
              <button
                type="submit"
                className="flex items-center justify-center gap-2 rounded-xl bg-ink-900 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-ink-700"
              >
                <FileText className="size-4" />
                Đăng ký ngay
              </button>
            </form>
          </div>
        </section>

        {/* Modal Tải Ebook */}
        {downloadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-ink-900">
                {downloadModal.price === 0 ? 'Tải Tài Liệu Miễn Phí' : 'Đăng Ký Nhận Ebook'}
              </h3>
              <p className="mt-1 text-xs font-semibold text-brand-600">{downloadModal.title}</p>
              <p className="mt-3 text-xs leading-relaxed text-ink-500">
                {downloadModal.price === 0
                  ? `Nhập email của bạn để hệ thống tự động gửi link tải tài liệu định dạng ${downloadModal.format}.`
                  : `Ebook này có giá ${formatPrice(downloadModal.price)}. Nhập email để chuyên viên gửi thông tin hướng dẫn thanh toán & nhận sách.`}
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
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-ink-900 outline-none focus:ring-2 focus:ring-brand-200"
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
