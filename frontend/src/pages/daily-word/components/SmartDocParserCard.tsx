import React, { useState, useRef } from 'react'
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRightLeft,
  X,
  Trash2,
  TableProperties,
  Sparkles,
  Download,
  FileUp,
} from 'lucide-react'
import type { TuVungBocTach } from '../types/dailyWord.types'
import {
  parseDocumentFile,
  downloadSampleImportFile,
} from '../services/docParserService'

interface SmartDocParserCardProps {
  onClose: () => void
  onConfirmSchedule: (
    words: TuVungBocTach[],
    startDate: string,
    time: string
  ) => void
  onDownloadTemplate?: () => void
}

const getTodayDateStr = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function calculateEndDate(start: string, count: number): string {
  if (!start || count <= 0) return ''
  const d = new Date(start)
  if (Number.isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + count - 1)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export const SmartDocParserCard: React.FC<SmartDocParserCardProps> = ({
  onClose,
  onConfirmSchedule,
  onDownloadTemplate,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [fileName, setFileName] = useState<string>('')
  const [parsedWords, setParsedWords] = useState<TuVungBocTach[]>([])
  const [startDate, setStartDate] = useState<string>(getTodayDateStr)
  const [publishTime, setPublishTime] = useState<string>('03:00')

  // Xử lý khi chọn file (chỉ hỗ trợ DOCX, DOC, TXT)
  async function handleFileSelected(file: File) {
    setParsing(true)
    try {
      const result = await parseDocumentFile(file)
      setFileName(result.fileName)
      setParsedWords(result.words)
    } finally {
      setParsing(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFileSelected(e.dataTransfer.files[0])
    }
  }

  // Chỉnh sửa từng ô trong bảng xem trước
  function handleUpdateWordCell(id: string, field: keyof TuVungBocTach, value: string) {
    setParsedWords((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  // Xóa 1 từ khỏi danh sách xem trước
  function handleDeleteWord(id: string) {
    setParsedWords((prev) => prev.filter((item) => item.id !== id))
  }

  function handleConfirm() {
    if (parsedWords.length === 0) return
    onConfirmSchedule(parsedWords, startDate, `${publishTime}:00`)
  }

  const handleDownload = () => {
    if (onDownloadTemplate) {
      onDownloadTemplate()
    } else {
      downloadSampleImportFile()
    }
  }

  const endDateDisplay = calculateEndDate(startDate, parsedWords.length)

  return (
    <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] sm:p-6 animate-in fade-in duration-200">
      {/* Header card */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7.5 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <Sparkles className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Nhận diện thông minh &amp; Tự động xếp lịch phát hành
            </h2>
            <p className="text-[11.5px] text-slate-400">
              Hỗ trợ tải tệp Word (.docx, .doc) hoặc Text (.txt). Số ngày phát hành sẽ tự động nhận diện theo số từ trong file.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          title="Đóng bộ nạp file"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Main Container: Cột kéo thả bên trái & Cột kết quả/cấu hình bên phải */}
      <div className="mt-5 grid gap-5 lg:grid-cols-12">
        {/* Cột trái: Dropzone kéo thả file DOC, DOCX, TXT */}
        <div className="lg:col-span-5">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex h-full min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed p-5 text-center transition-all ${
              isDragging
                ? 'border-brand-500 bg-brand-50/30'
                : 'border-slate-200 bg-slate-50/40 hover:border-slate-300 hover:bg-slate-50/80'
            }`}
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-blue-50/80 text-blue-600 shadow-2xs">
              <UploadCloud className="size-5.5" strokeWidth={1.8} />
            </span>

            <p className="mt-2.5 text-xs font-bold text-slate-900">
              Kéo thả file Word (.docx, .doc) hoặc Text (.txt) vào đây
            </p>
            <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-slate-400">
              Hệ thống tự động phân tách từ vựng, phiên âm IPA, giải nghĩa và câu ví dụ ngăn cách bởi dấu |.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.doc,.txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  void handleFileSelected(e.target.files[0])
                }
              }}
            />

            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={parsing}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 ease-out hover:bg-slate-50 hover:text-ink-700 active:scale-98 disabled:opacity-50 cursor-pointer"
                title={parsing ? 'Đang nhận diện file...' : 'Chọn file tài liệu (.docx, .doc, .txt)'}
                aria-label={parsing ? 'Đang nhận diện file' : 'Chọn file tài liệu'}
              >
                <FileUp className="size-4" />
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 ease-out hover:bg-slate-50 hover:text-ink-700 active:scale-98 cursor-pointer"
                title="Tải file mẫu import để điền theo đúng chuẩn"
                aria-label="Tải file mẫu import"
              >
                <Download className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Cột phải: Nhận diện tự động & Cấu hình ngày bắt đầu */}
        <div className="flex flex-col justify-between rounded-xl bg-slate-50/50 border border-slate-100 p-4.5 lg:col-span-7">
          <div className="space-y-3.5">
            {/* Tên file & Trạng thái nhận diện */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-brand-600" />
                <span className="text-xs font-bold text-slate-900">{fileName || 'Chưa chọn file'}</span>
                <span className="rounded-full bg-brand-50 border border-brand-100 px-2 py-0.5 text-[10.5px] font-bold text-brand-700">
                  {parsedWords.length} từ vựng
                </span>
              </div>

              {parsedWords.length > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-100">
                  <CheckCircle2 className="size-3" />
                  Đã nhận diện đủ 4 trường chuẩn
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 border border-slate-200">
                  Chờ nạp tệp dữ liệu
                </span>
              )}
            </div>

            {/* 4 thẻ trường thông tin đã nhận diện */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg bg-white border border-slate-100 p-2.5 shadow-2xs">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Trường 1</span>
                <p className="mt-0.5 text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-brand-500" />
                  Từ vựng (Word)
                </p>
              </div>
              <div className="rounded-lg bg-white border border-slate-100 p-2.5 shadow-2xs">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Trường 2</span>
                <p className="mt-0.5 text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-blue-500" />
                  Phiên âm (IPA)
                </p>
              </div>
              <div className="rounded-lg bg-white border border-slate-100 p-2.5 shadow-2xs">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Trường 3</span>
                <p className="mt-0.5 text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Từ loại &amp; Nghĩa
                </p>
              </div>
              <div className="rounded-lg bg-white border border-slate-100 p-2.5 shadow-2xs">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Trường 4</span>
                <p className="mt-0.5 text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  Ví dụ &amp; Dịch
                </p>
              </div>
            </div>

            {/* Khối cấu hình ngày bắt đầu & Thông báo tự động xếp lịch */}
            <div className="rounded-xl bg-white border border-slate-150 p-3.5 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Quy tắc phát hành tự động:
                </span>
                <span className="rounded-md bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                  {parsedWords.length > 0
                    ? `Tự động xếp ${parsedWords.length} ngày liên tục`
                    : 'Tự động nhận diện số ngày theo file'}
                </span>
              </div>

              {/* Ngày bắt đầu & Giờ phát */}
              <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-slate-400" />
                  <span className="text-slate-600 font-medium">Bắt đầu từ ngày:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="rounded-md border border-slate-200 px-2 py-0.5 text-xs font-bold text-slate-800 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-slate-400" />
                  <span className="text-slate-600 font-medium">Khung giờ phát:</span>
                  <input
                    type="time"
                    value={publishTime}
                    onChange={(e) => setPublishTime(e.target.value)}
                    className="rounded-md border border-slate-200 px-2 py-0.5 text-xs font-bold text-slate-800 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                  />
                </div>
              </div>

              {/* Thông tin dự kiến phát hành */}
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-[11.5px] text-slate-600">
                Lịch phát hành dự kiến: Từ <strong className="text-slate-900 font-bold">{startDate}</strong> đến{' '}
                <strong className="text-slate-900 font-bold">{endDateDisplay || startDate}</strong> (Mỗi ngày phát 1 từ lúc{' '}
                <strong className="text-slate-900 font-bold">{publishTime}</strong>).
              </div>
            </div>
          </div>

          {/* Footer nút hành động */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 pt-3">
            <span className="text-xs text-slate-500">
              Tổng cộng: <strong className="text-slate-900 font-bold">{parsedWords.length} từ</strong> ={' '}
              <strong className="text-brand-700 font-bold">{parsedWords.length} ngày phát hành</strong>
            </span>

            <button
              type="button"
              disabled={parsedWords.length === 0 || parsing}
              onClick={handleConfirm}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 px-3.5 text-[11.5px] font-bold text-white shadow-[0_2px_8px_rgba(200,16,46,0.25)] ring-1 ring-brand-700/20 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:from-brand-500 hover:to-brand-600 hover:shadow-[0_4px_12px_rgba(200,16,46,0.35)] active:translate-y-0 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 whitespace-nowrap cursor-pointer"
            >
              <ArrowRightLeft className="size-3.5" />
              <span>
                {parsedWords.length > 0
                  ? `Xác nhận & Đồng bộ vào Lịch đăng (${parsedWords.length} ngày)`
                  : 'Xác nhận & Đồng bộ vào Lịch đăng'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* BẢNG XEM TRƯỚC VÀ CHỈNH SỬA DỮ LIỆU ĐÃ BÓC TÁCH (PREVIEW TABLE) */}
      <div className="mt-6 border-t border-slate-100 pt-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between pb-2.5">
          <div className="flex items-center gap-2">
            <TableProperties className="size-3.5 text-slate-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Bảng xem trước &amp; Kiểm tra dữ liệu ({parsedWords.length} từ)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 italic">
            * Bấm trực tiếp vào các ô bên dưới để sửa nhanh trước khi đồng bộ
          </span>
        </div>

        {parsedWords.length > 0 ? (
          <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-100 shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="w-10 px-3 py-2.5 font-bold text-center">#</th>
                  <th className="w-32 px-3 py-2.5 font-bold">Từ vựng (Word)</th>
                  <th className="w-28 px-3 py-2.5 font-bold">Phiên âm (IPA)</th>
                  <th className="w-20 px-3 py-2.5 font-bold">Từ loại</th>
                  <th className="px-3 py-2.5 font-bold">Giải nghĩa tiếng Việt</th>
                  <th className="px-3 py-2.5 font-bold">Ví dụ thực tế</th>
                  <th className="w-12 px-3 py-2.5 text-center font-bold">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {parsedWords.map((word, index) => (
                  <tr key={word.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-3 py-2 font-medium text-center text-slate-300">
                      {index + 1}
                    </td>

                    {/* Từ vựng */}
                    <td className="px-3 py-2 font-bold text-slate-900">
                      <input
                        value={word.tu_tieng_anh}
                        onChange={(e) => handleUpdateWordCell(word.id, 'tu_tieng_anh', e.target.value)}
                        className="w-full rounded bg-transparent px-1.5 py-0.5 font-bold text-slate-900 outline-none transition-colors hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-brand-500"
                      />
                    </td>

                    {/* Phiên âm IPA */}
                    <td className="px-3 py-2 font-mono text-slate-500">
                      <input
                        value={word.phien_am_ipa}
                        onChange={(e) => handleUpdateWordCell(word.id, 'phien_am_ipa', e.target.value)}
                        className="w-full rounded bg-transparent px-1.5 py-0.5 font-mono text-slate-600 outline-none transition-colors hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-brand-500"
                      />
                    </td>

                    {/* Từ loại */}
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        {word.tu_loai}
                      </span>
                    </td>

                    {/* Giải nghĩa tiếng Việt */}
                    <td className="px-3 py-2 text-slate-700">
                      <input
                        value={word.dinh_nghia_tieng_viet}
                        onChange={(e) => handleUpdateWordCell(word.id, 'dinh_nghia_tieng_viet', e.target.value)}
                        className="w-full rounded bg-transparent px-1.5 py-0.5 text-slate-700 outline-none transition-colors hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-brand-500"
                      />
                    </td>

                    {/* Ví dụ thực tế */}
                    <td className="px-3 py-2 text-slate-600">
                      <input
                        value={word.vi_du_tieng_anh}
                        onChange={(e) => handleUpdateWordCell(word.id, 'vi_du_tieng_anh', e.target.value)}
                        className="w-full rounded bg-transparent px-1.5 py-0.5 text-slate-600 outline-none transition-colors hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-brand-500"
                      />
                    </td>

                    {/* Nút xóa */}
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteWord(word.id)}
                        className="flex size-6 items-center justify-center rounded text-slate-300 hover:bg-red-50 hover:text-red-600 transition-colors mx-auto cursor-pointer"
                        title="Xóa từ này"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/40">
            <FileText className="size-8 text-slate-300" />
            <p className="mt-2 text-xs font-bold text-slate-700">Chưa có dữ liệu từ vựng</p>
            <p className="mt-1 text-[11px] text-slate-400 max-w-sm">
              Kéo thả hoặc tải lên file Word (.docx, .doc) hoặc Text (.txt) ở khung bên trái để xem trước danh sách từ và tự động xếp lịch.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
