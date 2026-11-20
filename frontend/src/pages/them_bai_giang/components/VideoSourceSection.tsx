import {
  ChevronRight,
  HardDrive,
  Link2,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Upload,
  Video,
  Volume2,
} from 'lucide-react'
import { SectionCard } from './SectionCard'

const SOURCE_TABS = [
  { icon: Video, label: 'YouTube Video', active: true },
  { icon: HardDrive, label: 'Google Drive', active: false },
  { icon: Upload, label: 'Tải video trực tiếp (MP4 / WebM)', active: false },
]

const VIDEO_ID = 'YEV-VID-8839'

/**
 * Section 2: Nguồn video bài giảng — chọn tab nguồn, nhập URL,
 * mô phỏng trình phát video với timeline mốc câu hỏi tương tác.
 */
export function VideoSourceSection() {
  return (
    <SectionCard
      icon={Video}
      title={
        <>
          2. Nguồn Video bài giảng
          <span className="rounded-sm border border-brand-100 bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold leading-[15px] text-brand-600">
            BẮT BUỘC
          </span>
        </>
      }
      subtitle="Hỗ trợ nhúng video trực tiếp từ máy chủ YouTube, Drive hoặc tải tệp mã hoá riêng"
    >
      <div className="flex flex-col gap-4">
        {/* Tabs chọn nguồn */}
        <div className="flex gap-6 border-b border-slate-200">
          {SOURCE_TABS.map((tab) => (
            <button
              key={tab.label}
              type="button"
              className={
                tab.active
                  ? 'flex cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 border-brand-600 pb-2 text-xs font-semibold text-brand-600'
                  : 'flex cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 border-transparent pb-2 text-xs font-medium text-ink-500 transition-colors hover:text-ink-700'
              }
            >
              {tab.active ? (
                <span className="size-2 shrink-0 rounded-full bg-brand-600" aria-hidden />
              ) : (
                <tab.icon className="size-3.5 shrink-0" aria-hidden />
              )}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Thanh nhập URL + nút kiểm tra */}
        <div className="flex gap-2.5">
          <div className="relative flex-1">
            <Link2
              className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-400"
              aria-hidden
            />
            <input
              type="url"
              defaultValue="https://www.youtube.com/watch?v=academic_ielts_c1_task2_mastery"
              className="h-[38px] w-full rounded border border-slate-300 bg-white pl-9 pr-3 font-mono text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
              aria-label="URL video"
            />
          </div>
          <button
            type="button"
            className="flex h-[38px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded border border-slate-200 bg-slate-100 px-4 text-xs font-semibold text-ink-900 transition-colors hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-brand-500"
          >
            <RotateCcw className="size-3.5 shrink-0" aria-hidden />
            Kiểm tra &amp; Tải thông tin
          </button>
        </div>

        {/* Mô phỏng trình phát video */}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
          {/* Vùng hình video */}
          <div className="relative h-80 bg-slate-900">
            {/* Placeholder khung hình video */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
              <button
                type="button"
                className="flex size-14 cursor-pointer items-center justify-center rounded-xl bg-brand-600 shadow-lg transition hover:bg-brand-500 focus-visible:outline-2 focus-visible:outline-white"
                aria-label="Phát video"
              >
                <Play className="size-5 fill-white text-white" aria-hidden />
              </button>
            </div>

            {/* Nhãn chất lượng phát */}
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded border border-white/20 bg-slate-900/90 px-2 py-1.5">
              <span className="size-2 rounded-full bg-emerald-400" aria-hidden />
              <span className="font-mono text-xs font-medium text-white">1080p FHD • 60 FPS</span>
            </div>

            {/* Timeline + điều khiển */}
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 px-4 pb-4">
              <div className="relative h-1.5 rounded-full bg-white/90">
                <div className="absolute inset-y-0 left-0 w-3/5 rounded-full bg-brand-600" />
                {/* Mốc câu hỏi tương tác */}
                <span
                  className="absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-amber-400 shadow"
                  style={{ left: '20%' }}
                  title="Câu hỏi 1 — phút 08:30"
                />
                <span
                  className="absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-sky-400 shadow"
                  style={{ left: '34%' }}
                  title="Câu hỏi 2 — phút 14:20"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <Pause className="size-3.5" aria-hidden />
                  <Volume2 className="size-3.5" aria-hidden />
                  <span className="font-mono text-xs">24:15 / 42:30</span>
                </div>
                <div className="flex items-center gap-3 text-white">
                  <span className="rounded-sm bg-white/90 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
                    Interactive Active
                  </span>
                  <Maximize2 className="size-3.5" aria-hidden />
                </div>
              </div>
            </div>
          </div>

          {/* Thanh metadata video */}
          <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900 px-3.5 py-3.5">
            <div className="flex items-center gap-3">
              <Video className="size-4 text-brand-600" aria-hidden />
              <span className="flex flex-col">
                <span className="text-xs font-semibold text-white">
                  Lecture 4 - Advanced Cohesive Devices &amp; Paragraph Flow
                </span>
                <span className="mt-0.5 font-mono text-[11px] leading-[16.5px] text-slate-400">
                  ID: {VIDEO_ID} • 1080p HD • Chế độ xem phụ đề tự động (English / CC)
                </span>
              </span>
            </div>
            <button
              type="button"
              className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-xs text-rose-300 transition-colors hover:text-rose-200"
            >
              <ChevronRight className="size-3 shrink-0" aria-hidden />
              Thay video
            </button>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}
