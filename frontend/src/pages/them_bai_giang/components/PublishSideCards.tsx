import {
  Calendar,
  Check,
  ChevronDown,
  CloudUpload,
  FileText,
  FolderOpen,
  Paperclip,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react'

const ATTACHED_FILES = [
  {
    type: 'PDF',
    name: 'Unit_4_Task2_Cohesion.pdf',
    meta: '1.8 MB • Sẵn sàng tải',
    chipClass: 'border-transparent bg-rose-100 text-rose-700',
  },
  {
    type: 'DOCX',
    name: 'Vocabulary_List_C1.docx',
    meta: '420 KB • Phiên bản v2',
    chipClass: 'border-transparent bg-blue-100 text-blue-700',
  },
]

/**
 * Cột phải: 3 card — Tài liệu đính kèm, Điều kiện hoàn thành, Phân quyền & Phát hành.
 */
export function PublishSideCards() {
  return (
    <div className="flex w-[300px] flex-col gap-6">
      {/* CARD 1: Tài liệu học tập đính kèm */}
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="flex items-center gap-2 text-base font-semibold leading-6 text-ink-900">
            <FolderOpen className="size-4 text-brand-600" aria-hidden />
            Tài liệu học tập đính kèm
          </span>
          <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-ink-500">
            2 Files
          </span>
        </div>

        {/* Dropzone */}
        <div className="flex flex-col items-center gap-2 rounded border-2 border-slate-300 bg-slate-50 p-4 text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white">
            <CloudUpload className="size-4 text-slate-500" aria-hidden />
          </span>
          <span className="text-xs font-medium text-ink-900">
            Kéo thả file PDF, DOCX, Slide bài giảng
          </span>
          <span className="text-[11px] leading-[16.5px] text-ink-500">
            Dung lượng tối đa 25MB / file
          </span>
        </div>

        {/* Danh sách file đính kèm */}
        <div className="flex flex-col gap-2">
          {ATTACHED_FILES.map((file) => (
            <div
              key={file.name}
              className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 p-2.5"
            >
              <div className="flex items-center gap-2.5">
                <span className={`rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-medium leading-[15px] ${file.chipClass}`}>
                  {file.type}
                </span>
                <span className="flex flex-col">
                  <span className="text-xs font-medium text-ink-900">{file.name}</span>
                  <span className="font-mono text-[10px] leading-[15px] text-ink-500">{file.meta}</span>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" className="cursor-pointer p-1 text-ink-400 transition-colors hover:text-ink-700" aria-label="Tải xuống">
                  <FileText className="size-2.5" aria-hidden />
                </button>
                <button type="button" className="cursor-pointer p-1 text-ink-400 transition-colors hover:text-brand-600" aria-label="Xóa file">
                  <X className="size-2.5" aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="flex h-[34px] cursor-pointer items-center justify-center gap-1.5 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          <Paperclip className="size-2.5" aria-hidden />
          Tải lên tài liệu mới
        </button>
      </section>

      {/* CARD 2: Điều kiện hoàn thành */}
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="flex items-center gap-2 text-base font-semibold leading-6 text-ink-900">
            <ShieldCheck className="size-4 text-brand-600" aria-hidden />
            Điều kiện hoàn thành
          </span>
          <span className="rounded-sm bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold leading-[16.5px] text-emerald-700">
            Active
          </span>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="flex items-start justify-between gap-3">
            <span className="flex flex-col">
              <span className="text-xs font-medium text-ink-900">
                Bắt buộc xem tối thiểu 80% video
              </span>
              <span className="text-[11px] leading-[16.5px] text-ink-500">
                Chống tua nhanh video và bảo đảm đủ giờ học
              </span>
            </span>
            <input type="checkbox" defaultChecked className="mt-1 size-4 rounded-sm accent-brand-600" />
          </div>

          <div className="flex items-start justify-between gap-3">
            <span className="flex flex-col">
              <span className="text-xs font-medium text-ink-900">
                Vượt qua bài tập để mở bài tiếp
              </span>
              <span className="text-[11px] leading-[16.5px] text-ink-500">
                Bắt buộc đạt điểm số tối thiểu để unlock Unit 5
              </span>
            </span>
            <input type="checkbox" defaultChecked className="mt-1 size-4 rounded-sm accent-brand-600" />
          </div>

          <span className="h-px bg-slate-100" aria-hidden />

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-ink-900">Điểm số đạt yêu cầu:</span>
            <input
              type="text"
              defaultValue="80% (Tối thiểu 8/10 điểm)"
              className="h-[30px] w-44 rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 font-mono text-xs font-medium text-ink-900 focus:border-brand-500 focus:outline-none"
              aria-label="Điểm số đạt yêu cầu"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-ink-900">Số lần làm lại bài tập:</span>
            <div className="relative w-32">
              <select
                defaultValue="3"
                className="h-[30px] w-full appearance-none rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-ink-900 focus:border-brand-500 focus:outline-none"
                aria-label="Số lần làm lại bài tập"
              >
                <option value="1">Tối đa 1 lần</option>
                <option value="3">Tối đa 3 lần</option>
                <option value="5">Tối đa 5 lần</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2.5 top-1/2 size-2 -translate-y-1/2 text-ink-500"
                aria-hidden
              />
            </div>
          </div>
        </div>
      </section>

      {/* CARD 3: Phân quyền & Phát hành */}
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="flex items-center gap-2 text-base font-semibold leading-6 text-ink-900">
            <Send className="size-4 text-brand-600" aria-hidden />
            Phân quyền &amp; Phát hành
          </span>
          <span className="font-mono text-xs text-ink-500">IELTS-K24</span>
        </div>

        <div className="flex flex-col gap-3.5">
          {/* Áp dụng cho đối tượng */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-900">Áp dụng cho đối tượng:</span>
            <span className="flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border border-rose-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
              <X className="size-2" aria-hidden />
              Lớp IELTS Masterclass K24
              <X className="size-2" aria-hidden />
            </span>
            <button
              type="button"
              className="cursor-pointer self-start text-xs text-brand-600 transition-colors hover:text-brand-700"
            >
              + Thêm lớp
            </button>
          </div>

          {/* Thời gian mở bài giảng */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-ink-900">Thời gian mở bài giảng:</span>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input type="radio" name="schedule" className="size-4 accent-brand-600" />
              Ngay lập tức sau khi xuất bản
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-ink-900">
              <input type="radio" name="schedule" defaultChecked className="size-4 accent-brand-600" />
              Hẹn giờ phát hành tự động
            </label>
            <div className="relative">
              <Calendar
                className="pointer-events-none absolute left-3 top-1/2 size-3 -translate-y-1/2 text-ink-400"
                aria-hidden
              />
              <input
                type="text"
                defaultValue="20/10/2024 lúc 08:00 AM"
                className="h-[30px] w-full rounded border border-slate-300 bg-slate-50 pl-8 pr-3 py-1.5 font-mono text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
                aria-label="Thời gian phát hành"
              />
            </div>
          </div>

          {/* Thông báo */}
          <label className="flex items-start gap-2.5">
            <input type="checkbox" defaultChecked className="mt-0.5 size-4 rounded-sm accent-brand-600" />
            <span className="text-xs leading-[16.5px] text-slate-700">
              Gửi thông báo email &amp; mobile app cho học viên khi bài giảng mở.
            </span>
          </label>

          <button
            type="button"
            className="flex h-8 cursor-pointer items-center gap-2 self-start whitespace-nowrap rounded bg-brand-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-brand-500"
          >
            <Check className="size-3 shrink-0" aria-hidden />
            Xuất bản bài giảng
          </button>
        </div>
      </section>
    </div>
  )
}
