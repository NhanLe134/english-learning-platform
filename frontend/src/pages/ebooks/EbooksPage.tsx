import { useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Download,
  FileText,
  Mail,
  Search,
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

function EbookCard({ ebook }: { ebook: Ebook }) {
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
/* Trang                                                               */
/* ------------------------------------------------------------------ */

export function EbooksPage() {
  const [category, setCategory] = useState(EBOOK_CATEGORIES[0])
  const [searchInput, setSearchInput] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')

  const ebookList = useMemo(() => {
    const keyword = appliedQuery.trim().toLowerCase()
    return ebooks.filter((ebook) => {
      const matchesCategory = category === EBOOK_CATEGORIES[0] || ebook.category === category
      const matchesKeyword =
        !keyword ||
        ebook.title.toLowerCase().includes(keyword) ||
        ebook.author.toLowerCase().includes(keyword) ||
        ebook.description.toLowerCase().includes(keyword)
      return matchesCategory && matchesKeyword
    })
  }, [category, appliedQuery])

  const applySearch = () => setAppliedQuery(searchInput)

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <main>
        {/* Hero + tìm kiếm */}
        <section className="bg-gradient-to-b from-brand-50 via-[#fdf5f6] to-white">
          <div className="mx-auto max-w-7xl px-4 pb-8 pt-10 text-center sm:px-6 lg:px-8 lg:pb-10 lg:pt-14">
            <h1 className="mx-auto max-w-3xl text-3xl font-black leading-tight tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
              Kho Ebook <span className="whitespace-nowrap text-brand-600">Chuẩn Quốc Tế</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ink-700 sm:text-base">
              Tài liệu được biên soạn trực tiếp bởi đội ngũ giảng viên của trung tâm —
              cô đọng, thực chiến và cập nhật theo đề thi mới nhất. Nhiều ebook hoàn
              toàn miễn phí để bạn tải về bắt đầu hành trình chinh phục tiếng Anh ngay
              hôm nay, không cần đăng ký.
            </p>

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
                  onChange={(event) => setSearchInput(event.target.value)}
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
            <p className="mt-10 rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center text-sm text-ink-500">
              Không tìm thấy ebook phù hợp. Thử từ khóa hoặc danh mục khác nhé!
            </p>
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {ebookList.map((ebook) => (
                <EbookCard key={ebook.id} ebook={ebook} />
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
              onSubmit={(event) => event.preventDefault()}
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
      </main>

      <SiteFooter />
    </div>
  )
}
