import { HardDrive, Link2, Video } from 'lucide-react'
import { SectionCard } from './SectionCard'

export type VideoSource = 'youtube' | 'drive'

interface VideoSourceSectionProps {
  videoUrl: string
  onVideoUrlChange: (value: string) => void
  source: VideoSource
  onSourceChange: (source: VideoSource) => void
  validationError?: string
  /** Thông báo hợp lệ (hiển thị màu xanh) */
  validationSuccess?: string
  onValidate: () => void
}

/**
 * Section 2: Nguồn video bài giảng — MVP chỉ hỗ trợ dán URL YouTube /
 * Google Drive. Chức năng tải video trực tiếp và trình phát mô phỏng
 * sẽ hoàn thiện sau (cần Supabase Storage).
 */
export function VideoSourceSection({
  videoUrl,
  onVideoUrlChange,
  source,
  onSourceChange,
  validationError,
  validationSuccess,
  onValidate,
}: VideoSourceSectionProps) {
  const tabs: { id: VideoSource; icon: typeof Video; label: string }[] = [
    { id: 'youtube', icon: Video, label: 'YouTube Video' },
    { id: 'drive', icon: HardDrive, label: 'Google Drive' },
  ]

  const placeholder =
    source === 'youtube'
      ? 'https://www.youtube.com/watch?v=...'
      : 'https://drive.google.com/file/d/.../view'

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
      subtitle="Dán liên kết video từ YouTube hoặc Google Drive — học viên xem trực tiếp trong trang khóa học"
    >
      <div className="flex flex-col gap-4">
        {/* Tabs chọn nguồn */}
        <div className="flex gap-6 border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSourceChange(tab.id)}
              className={
                source === tab.id
                  ? 'flex cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 border-brand-600 pb-2 text-xs font-semibold text-brand-600'
                  : 'flex cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 border-transparent pb-2 text-xs font-medium text-ink-500 transition-colors hover:text-ink-700'
              }
            >
              {source === tab.id ? (
                <span className="size-2 shrink-0 rounded-full bg-brand-600" aria-hidden />
              ) : (
                <tab.icon className="size-3.5 shrink-0" aria-hidden />
              )}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Thanh nhập URL + nút kiểm tra */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2.5">
            <div className="relative flex-1">
              <Link2
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-400"
                aria-hidden
              />
              <input
                type="url"
                value={videoUrl}
                onChange={(event) => onVideoUrlChange(event.target.value)}
                placeholder={placeholder}
                className="h-[38px] w-full rounded border border-slate-300 bg-white pl-9 pr-3 font-mono text-xs text-ink-900 placeholder:font-normal placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
                aria-label="URL video"
              />
            </div>
            <button
              type="button"
              onClick={onValidate}
              className="flex h-[38px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded border border-slate-200 bg-slate-100 px-4 text-xs font-semibold text-ink-900 transition-colors hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-brand-500"
            >
              Kiểm tra định dạng
            </button>
          </div>
          {validationError ? (
            <p className="text-[11px] font-semibold leading-relaxed text-rose-600">{validationError}</p>
          ) : validationSuccess ? (
            <p className="text-[11px] font-semibold leading-relaxed text-emerald-700">{validationSuccess}</p>
          ) : (
            <p className="text-[11px] leading-relaxed text-ink-400">
              {source === 'youtube'
                ? 'Video YouTube nên đặt "Không liệt kê (Unlisted)" — miễn phí, không hiện trên kênh/tìm kiếm, nhúng phát bình thường. Riêng tư (Private) sẽ KHÔNG phát được.'
                : 'File Google Drive phải bật chia sẻ "Bất kỳ ai có liên kết" — để ở chế độ Riêng tư học viên sẽ không xem được.'}
            </p>
          )}
        </div>
      </div>
    </SectionCard>
  )
}
