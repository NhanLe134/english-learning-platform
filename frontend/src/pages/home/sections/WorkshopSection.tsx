import { useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, UserRound } from 'lucide-react'

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api'
).replace(/\/+$/, '')

const HOME_WORKSHOP_LIMIT = 2

interface WorkshopTeacher {
  id: string
  full_name: string | null
  avatar_url: string | null
}

interface WorkshopItem {
  id: string
  title: string
  description: string | null
  startTime: string
  endTime: string
  price: number
  maxParticipants: number
  status: string
  createdAt: string
  teacher: WorkshopTeacher | null
}

const TIME_ZONE = 'Asia/Ho_Chi_Minh'

function formatSchedule(startTime: string, endTime: string): string {
  const date = new Intl.DateTimeFormat('vi-VN', {
    timeZone: TIME_ZONE,
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(startTime))
  const formatTime = (value: string) =>
    new Intl.DateTimeFormat('vi-VN', {
      timeZone: TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  return `${formatTime(startTime)} - ${formatTime(endTime)} | ${date}`
}

function formatPrice(price: number): string {
  return price === 0 ? 'Miễn phí' : `${price.toLocaleString('vi-VN')}đ`
}

export function WorkshopSection() {
  const [workshops, setWorkshops] = useState<WorkshopItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function loadWorkshops() {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(
          `${API_BASE_URL}/workshops?limit=${HOME_WORKSHOP_LIMIT}`,
          { signal: controller.signal },
        )
        const payload = (await response.json()) as {
          success: boolean
          data?: WorkshopItem[]
          message?: string
        }
        if (!response.ok || !payload.success) {
          throw new Error(payload.message ?? 'Không tải được danh sách workshop.')
        }
        setWorkshops(payload.data ?? [])
      } catch (fetchError) {
        if ((fetchError as Error).name === 'AbortError') return
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Không tải được danh sách workshop.'
        )
      } finally {
        setIsLoading(false)
      }
    }
    void loadWorkshops()
    return () => controller.abort()
  }, [])

  return (
    <section id="workshop" className="bg-[#17181c]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-500">
              Workshop đặc quyền
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Tham Gia Workshop Ngay Cùng Chúng Tôi
            </h2>
          </div>
          <a
            href="#"
            className="flex items-center gap-1.5 text-sm font-semibold text-brand-500 hover:text-brand-200"
          >
            Xem tất cả
            <ArrowRight className="size-4" />
          </a>
        </div>

        {isLoading ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {[0, 1].map((key) => (
              <div
                key={key}
                className="h-80 animate-pulse rounded-2xl bg-white/10"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : error ? (
          <p className="mt-8 rounded-2xl bg-white/5 py-12 text-center text-sm text-white/70">
            {error}
          </p>
        ) : workshops.length === 0 ? (
          <p className="mt-8 rounded-2xl bg-white/5 py-12 text-center text-sm text-white/70">
            Hiện chưa có workshop nào mở đăng ký. Quay lại sau nhé!
          </p>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {workshops.map((workshop) => (
              <article
                key={workshop.id}
                className="flex flex-col rounded-2xl bg-white p-6 shadow-lg"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600">
                    {workshop.maxParticipants} chỗ
                  </span>
                  <span className="rounded-full bg-ink-900 px-3 py-1 text-xs font-bold text-white">
                    {formatPrice(workshop.price)}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-bold text-ink-900">
                  {workshop.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-500">
                  {workshop.description}
                </p>

                <div className="mt-5 space-y-2.5 border-t border-gray-100 pt-4 text-sm text-ink-700">
                  <p className="flex items-center gap-2">
                    <CalendarDays className="size-4 shrink-0 text-brand-600" />
                    {formatSchedule(workshop.startTime, workshop.endTime)}
                  </p>
                  <p className="flex items-center gap-2">
                    <UserRound className="size-4 shrink-0 text-brand-600" />
                    {workshop.teacher?.full_name
                      ? `Host: ${workshop.teacher.full_name}`
                      : 'Diễn giả: Đội ngũ giảng viên trung tâm'}
                  </p>
                </div>

                <button
                  type="button"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
                >
                  Đăng ký giữ chỗ ngay
                  <ArrowRight className="size-4" />
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
