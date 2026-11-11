import { useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  List,
  LayoutGrid,
  RotateCcw,
  Search,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { SiteHeader } from '../../components/layout/SiteHeader'
import { SiteFooter } from '../../components/layout/SiteFooter'
import { CourseCard } from '../../features/courses/components/CourseCard'
import { courses } from '../../features/courses/courses-data'

const POPULAR_FILTERS = [
  { label: 'IELTS Intensive', removable: true },
  { label: 'Khóa học có chứng chỉ', removable: false },
  { label: 'Giáo viên bản xứ', removable: false },
  { label: 'Đang giảm giá', removable: false },
]

interface FilterField {
  key: string
  label: string
  icon: ComponentType<{ className?: string }>
  options: string[]
}

const FILTER_FIELDS: FilterField[] = [
  {
    key: 'level',
    label: 'Cấp độ học viên',
    icon: TrendingUp,
    options: ['Tất cả cấp độ', 'Người mất gốc', 'Cơ bản', 'Trung cấp', 'Nâng cao'],
  },
  {
    key: 'goal',
    label: 'Mục tiêu học tập',
    icon: BadgeCheck,
    options: ['Mọi mục tiêu', 'IELTS', 'TOEIC', 'Giao tiếp', 'Phát âm', 'Business English'],
  },
  {
    key: 'format',
    label: 'Hình thức đào tạo',
    icon: Users,
    options: ['Tất cả hình thức', 'Học online', 'Học offline', 'Kết hợp'],
  },
  {
    key: 'price',
    label: 'Mức học phí',
    icon: Wallet,
    options: ['Tất cả mức giá', 'Dưới 2 triệu', '2 - 4 triệu', 'Trên 4 triệu'],
  },
]

const SORT_OPTIONS = ['Phổ biến nhất', 'Mới nhất', 'Giá thấp đến cao', 'Giá cao đến thấp', 'Đánh giá cao nhất']

function SearchBar() {
  const [query, setQuery] = useState('')
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-[0_8px_30px_rgba(200,16,46,0.08)] ring-1 ring-gray-100 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-3 px-3">
        <Search className="size-5 shrink-0 text-ink-500" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm khóa học IELTS, Giao tiếp, TOEIC, Ngữ pháp..."
          className="w-full bg-transparent py-2.5 text-sm text-ink-900 outline-none placeholder:text-ink-500"
        />
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden items-center gap-1.5 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-ink-700 md:flex">
          <Layers className="size-4" />
          Bảo đảm đầu ra
        </span>
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
        >
          Tìm Kiếm
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  )
}

function FilterBar() {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(FILTER_FIELDS.map((field) => [field.key, field.options[0]])),
  )
  const [sort, setSort] = useState(SORT_OPTIONS[0])
  const [chips, setChips] = useState(POPULAR_FILTERS)

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
        {FILTER_FIELDS.map((field) => {
          const Icon = field.icon
          return (
            <div key={field.key}>
              <label
                htmlFor={`filter-${field.key}`}
                className="flex items-center gap-1.5 text-xs font-semibold text-ink-700"
              >
                <Icon className="size-3.5" />
                {field.label}
              </label>
              <div className="relative mt-2">
                <select
                  id={`filter-${field.key}`}
                  value={values[field.key]}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                  }
                  className="w-full cursor-pointer appearance-none rounded-lg bg-gray-100 py-2.5 pl-4 pr-9 text-sm font-medium text-ink-900 outline-none focus:ring-2 focus:ring-brand-200"
                >
                  {field.options.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-500" />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-gray-100 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-ink-900">Bộ lọc phổ biến:</span>
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() =>
                chip.removable && setChips((prev) => prev.filter((c) => c.label !== chip.label))
              }
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                chip.removable
                  ? 'bg-ink-900 text-white hover:bg-ink-700'
                  : 'bg-gray-100 text-ink-700 hover:bg-gray-200'
              }`}
            >
              {chip.label}
              {chip.removable && <X className="size-3" />}
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-ink-900">Sắp xếp:</span>
          <div className="relative">
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="cursor-pointer appearance-none rounded-lg bg-gray-100 py-2 pl-4 pr-9 text-sm font-medium text-ink-900 outline-none focus:ring-2 focus:ring-brand-200"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-500" />
          </div>
          <button
            type="button"
            onClick={() => {
              setValues(Object.fromEntries(FILTER_FIELDS.map((f) => [f.key, f.options[0]])))
              setSort(SORT_OPTIONS[0])
            }}
            className="flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            <RotateCcw className="size-4" />
            Đặt lại
          </button>
        </div>
      </div>
    </section>
  )
}

function Pagination() {
  const [current, setCurrent] = useState(1)
  const totalPages = 8
  const pages = [1, 2, 3, 4]

  return (
    <nav aria-label="Phân trang" className="mt-10 flex items-center justify-center gap-2">
      <button
        type="button"
        aria-label="Trang trước"
        disabled={current === 1}
        onClick={() => setCurrent((page) => Math.max(1, page - 1))}
        className="flex size-10 items-center justify-center rounded-lg border border-gray-200 text-ink-700 transition-colors hover:border-brand-600 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="size-4" />
      </button>

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => setCurrent(page)}
          aria-current={current === page ? 'page' : undefined}
          className={`flex size-10 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
            current === page
              ? 'bg-brand-600 text-white'
              : 'border border-gray-200 text-ink-700 hover:border-brand-600 hover:text-brand-600'
          }`}
        >
          {page}
        </button>
      ))}

      <span className="px-1 text-sm text-ink-500">…</span>

      <button
        type="button"
        onClick={() => setCurrent(totalPages)}
        className={`flex size-10 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
          current === totalPages
            ? 'bg-brand-600 text-white'
            : 'border border-gray-200 text-ink-700 hover:border-brand-600 hover:text-brand-600'
        }`}
      >
        {totalPages}
      </button>

      <button
        type="button"
        aria-label="Trang sau"
        disabled={current === totalPages}
        onClick={() => setCurrent((page) => Math.min(totalPages, page + 1))}
        className="flex size-10 items-center justify-center rounded-lg border border-gray-200 text-ink-700 transition-colors hover:border-brand-600 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  )
}

export function CoursesPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const courseList = useMemo(() => courses, [])

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="bg-gradient-to-b from-brand-50 via-[#fdf5f6] to-white">
          <div className="mx-auto max-w-7xl px-4 pb-12 pt-14 sm:px-6 lg:px-8 lg:pb-16 lg:pt-20">
            <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
              Khám Phá Các Khóa Học{' '}
              <span className="text-brand-600">
                Tiếng
                <br />
                Anh Chuẩn Quốc Tế
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-700">
              Lộ trình học tập chuẩn CEFR &amp; Cambridge kết hợp công nghệ phản xạ
              trực quan. Đồng hành cùng cựu giám khảo quốc tế và chuyên gia 8.5+
              IELTS.
            </p>
            <div className="mt-8 max-w-5xl">
              <SearchBar />
            </div>
          </div>
        </section>

        {/* Bộ lọc */}
        <section className="bg-gray-50/80">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <FilterBar />
          </div>
        </section>

        {/* Danh sách khóa học */}
        <section className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">
              Danh Sách Khóa Học
            </h2>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600">
              Tìm thấy 24 khóa học
            </span>
            <div className="ml-auto flex items-center gap-1 rounded-lg border border-gray-200 p-1">
              <button
                type="button"
                aria-label="Xem dạng lưới"
                onClick={() => setView('grid')}
                className={`flex size-8 items-center justify-center rounded-md transition-colors ${
                  view === 'grid' ? 'bg-brand-600 text-white' : 'text-ink-500 hover:text-brand-600'
                }`}
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Xem dạng danh sách"
                onClick={() => setView('list')}
                className={`flex size-8 items-center justify-center rounded-md transition-colors ${
                  view === 'list' ? 'bg-brand-600 text-white' : 'text-ink-500 hover:text-brand-600'
                }`}
              >
                <List className="size-4" />
              </button>
            </div>
          </div>

          <div
            className={`mt-6 ${
              view === 'grid'
                ? 'grid gap-6 sm:grid-cols-2 xl:grid-cols-3'
                : 'flex flex-col gap-5'
            }`}
          >
            {courseList.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>

          <Pagination />
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
