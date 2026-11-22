import { useState, useMemo, useEffect, useCallback } from 'react'
import { Sidebar } from '../quan_ly_nguoi_dung/components/Sidebar'
import { TopHeader } from '../quan_ly_nguoi_dung/components/TopHeader'
import { ConfirmModal } from './components/ConfirmModal'
import { DailyWordHeader } from './components/DailyWordHeader'
import { SmartDocParserCard } from './components/SmartDocParserCard'
import { CalendarView } from './components/CalendarView'
import { WordDetailDrawer } from './components/WordDetailDrawer'
import { ManualWordModal } from './components/ManualWordModal'
import { RescheduleModal } from './components/RescheduleModal'
import { downloadSampleImportFile } from './services/docParserService'
import { dailyWordApi } from './services/dailyWordApi'
import type {
  LichDangItem,
  TuVungBocTach,
  ThongKeThang,
  TuVungChiTiet,
} from './types/dailyWord.types'

const getTodayDateStr = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function DailyWordPage() {
  const today = new Date()
  const [scheduledItems, setScheduledItems] = useState<LichDangItem[]>([])
  const [loading, setLoading] = useState(false)
  const [showSmartParser, setShowSmartParser] = useState(true)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth() + 1)

  // Thẻ bên phải chỉ xuất hiện khi bấm vào 1 ngày trên lịch (mặc định ban đầu ẩn)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Modals state
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [manualInitialDate, setManualInitialDate] = useState<string>(getTodayDateStr)
  const [editingWordData, setEditingWordData] = useState<TuVungChiTiet | undefined>(undefined)
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false)
  const [isCleaningUp, setIsCleaningUp] = useState(false)

  // Modal xác nhận thay cho window.confirm của trình duyệt
  const [confirmRequest, setConfirmRequest] = useState<{
    title: string
    message: string
    confirmLabel: string
    danger: boolean
    action: () => Promise<void>
  } | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  async function handleConfirmAction() {
    if (!confirmRequest) return
    setConfirmLoading(true)
    try {
      await confirmRequest.action()
      setConfirmRequest(null)
    } catch (err: any) {
      alert(`Lỗi khi thực hiện thao tác: ${err.message || 'Vui lòng thử lại'}`)
    } finally {
      setConfirmLoading(false)
    }
  }

  // Dọn dẹp dữ liệu cũ hơn 2 tháng
  function handleCleanupOldData() {
    const twoMonthsAgo = new Date()
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
    const mocStr = `${String(twoMonthsAgo.getDate()).padStart(2, '0')}/${String(twoMonthsAgo.getMonth() + 1).padStart(2, '0')}/${twoMonthsAgo.getFullYear()}`

    setConfirmRequest({
      title: 'Dọn dẹp dữ liệu cũ?',
      message: `Xác nhận dọn dẹp toàn bộ dữ liệu lịch đăng và từ vựng trước ngày ${mocStr} (cũ hơn 2 tháng) để làm nhẹ Database? Thao tác này sẽ giải phóng dung lượng lưu trữ.`,
      confirmLabel: 'Dọn dẹp',
      danger: false,
      action: async () => {
        setIsCleaningUp(true)
        try {
          const res = await dailyWordApi.donDepDuLieuCu()
          alert(
            `Dọn dẹp thành công!\n- Số lịch đã xóa: ${res.so_lich_da_xoa}\n- Số từ vựng đã xóa: ${res.so_tu_da_xoa}\n- Mốc thời gian cắt: Trước ngày ${res.ngay_moc_cat}`
          )
          await taiDuLieuThang(currentYear, currentMonth)
        } finally {
          setIsCleaningUp(false)
        }
      },
    })
  }

  // Tải danh sách lịch đăng từ Backend theo năm và tháng
  const taiDuLieuThang = useCallback(async (nam: number, thang: number) => {
    try {
      setLoading(true)
      const data = await dailyWordApi.layLichThang(nam, thang)
      setScheduledItems(data.danh_sach || [])
    } catch (err) {
      console.warn('Lỗi nạp lịch phát hành từ backend:', err)
      // Giữ nguyên danh sách hiện tại nếu có lỗi mạng
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    taiDuLieuThang(currentYear, currentMonth)
  }, [currentYear, currentMonth, taiDuLieuThang])

  // Mục từ đang được chọn ở side panel
  const selectedItem = useMemo(() => {
    if (!selectedDate) return undefined
    return scheduledItems.find((item) => item.ngay_phat_hanh === selectedDate)
  }, [scheduledItems, selectedDate])

  // Thống kê tiến độ lịch tháng hiện tại
  const statistics = useMemo<ThongKeThang>(() => {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
    const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
    const inMonthItems = scheduledItems.filter((item) => item.ngay_phat_hanh.startsWith(monthPrefix))

    const soNgayDaCoTu = inMonthItems.length
    const tyLePhuKin = Math.min(100, Math.round((soNgayDaCoTu / daysInMonth) * 100))
    const soTuDaDang = inMonthItems.filter((i) => i.trang_thai === 'da_qua' || i.trang_thai === 'dang_hoat_dong').length
    const soTuSapDang = inMonthItems.filter((i) => i.trang_thai === 'cho_phat_hanh').length
    const soNgayConLai = Math.max(0, daysInMonth - soNgayDaCoTu)

    return {
      tong_so_ngay: daysInMonth,
      so_ngay_da_co_tu: soNgayDaCoTu,
      ty_le_phu_kin: tyLePhuKin,
      so_tu_da_dang: soTuDaDang,
      so_tu_sap_dang: soTuSapDang,
      so_ngay_con_lai: soNgayConLai,
    }
  }, [scheduledItems, currentYear, currentMonth])

  // Xử lý xác nhận xếp lịch tự động theo số lượng từ nhận diện trong file
  async function handleConfirmBulkSchedule(
    words: TuVungBocTach[],
    startDate: string,
    time: string
  ) {
    try {
      await dailyWordApi.xepLichHangLoat({
        danh_sach_tu: words,
        ngay_bat_dau: startDate,
        gio_phat_hanh: time,
        ten_tep_nguon: 'Mau_Import_Tu_Vung_DailyWord.txt',
      })
      await taiDuLieuThang(currentYear, currentMonth)
      setShowSmartParser(false)
    } catch (err: any) {
      alert(`Lỗi khi xếp lịch hàng loạt: ${err.message || 'Vui lòng thử lại'}`)
    }
  }

  // Thêm hoặc sửa từ thủ công
  async function handleSaveManualWord(date: string, wordData: Omit<TuVungChiTiet, 'id'>) {
    try {
      await dailyWordApi.taoTuVungThuCong({
        tu_tieng_anh: wordData.tu_tieng_anh,
        phien_am_ipa: wordData.phien_am_ipa,
        tu_loai: wordData.tu_loai,
        dinh_nghia_tieng_anh: wordData.dinh_nghia_tieng_anh,
        dinh_nghia_tieng_viet: wordData.dinh_nghia_tieng_viet,
        vi_du_tieng_anh: wordData.vi_du_tieng_anh,
        vi_du_tieng_viet: wordData.vi_du_tieng_viet,
        ngay_phat_hanh: date,
        gio_phat_hanh: '03:00:00',
      })
      await taiDuLieuThang(currentYear, currentMonth)
      setSelectedDate(date)
      setEditingWordData(undefined)
    } catch (err: any) {
      alert(`Lỗi khi lưu từ vựng: ${err.message || 'Vui lòng thử lại'}`)
    }
  }

  // Đổi ngày đăng
  async function handleConfirmReschedule(newDate: string) {
    if (!selectedItem) return
    try {
      await dailyWordApi.doiNgayPhatHanh(selectedItem.id, newDate)
      await taiDuLieuThang(currentYear, currentMonth)
      setSelectedDate(newDate)
    } catch (err: any) {
      alert(`Lỗi khi đổi ngày phát hành: ${err.message || 'Vui lòng thử lại'}`)
    }
  }

  // Xóa từ vựng đang chọn (kèm lịch đăng + hàng đợi ôn tập liên quan)
  function handleDeleteSelectedWord() {
    if (!selectedItem) return
    setConfirmRequest({
      title: 'Xóa từ vựng này?',
      message: `Xóa từ "${selectedItem.tu_vung.tu_tieng_anh}" và lịch đăng ngày ${selectedItem.ngay_phat_hanh}? Hành động không thể hoàn tác.`,
      confirmLabel: 'Xác nhận xóa',
      danger: true,
      action: async () => {
        await dailyWordApi.xoaTuVung(selectedItem.tu_vung_id)
        setSelectedDate(null)
        await taiDuLieuThang(currentYear, currentMonth)
      },
    })
  }

  function handleDownloadTemplate() {
    downloadSampleImportFile()
  }

  function handleGoToday() {
    const now = new Date()
    setCurrentYear(now.getFullYear())
    setCurrentMonth(now.getMonth() + 1)
    setSelectedDate(getTodayDateStr())
  }

  const navigateAdmin = (tab: string) => {
    if (tab === 'quan_ly_nguoi_dung') window.location.assign('/admin/users')
    if (tab === 'khoa_hoc_bai_tap') window.location.assign('/admin/courses')
    if (tab === 'thanh_toan') window.location.assign('/admin/payments')
  }

  return (
    <div className="user-management-page-container">
      <Sidebar activeTab="daily_word" onTabChange={navigateAdmin} />
      <div className="user-management-main-wrapper">
        <TopHeader currentPage="Daily Word & Lịch đăng" />

        <main className="min-h-screen bg-white px-8 py-8">
          {/* Thanh tiêu đề + cụm nút hành động của tính năng */}
          <DailyWordHeader
            onOpenManualModal={() => {
              setEditingWordData(undefined)
              setManualInitialDate(selectedDate || getTodayDateStr())
              setManualModalOpen(true)
            }}
            onToggleSmartParser={() => setShowSmartParser((open) => !open)}
            showSmartParser={showSmartParser}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onDownloadTemplate={handleDownloadTemplate}
            onCleanupOldData={handleCleanupOldData}
            isCleaningUp={isCleaningUp}
          />

      <div className="mt-6">
        {/* Khối Nhận diện thông minh & Tự động xếp lịch */}
        {showSmartParser && (
          <SmartDocParserCard
            onClose={() => setShowSmartParser(false)}
            onConfirmSchedule={handleConfirmBulkSchedule}
            onDownloadTemplate={handleDownloadTemplate}
          />
        )}

        {/* Nội dung chính: Lịch biểu bên trái + Panel chi tiết flashcard bên phải (Chỉ hiện khi bấm vào 1 ngày) */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Cột trái: Chiếm trọn 12 cột khi chưa chọn ngày, co lại 8 cột khi mở thẻ chi tiết */}
          <div className={selectedDate ? 'lg:col-span-8 transition-all' : 'lg:col-span-12 transition-all'}>
            {viewMode === 'calendar' ? (
              <div className="relative">
                {loading && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/50 backdrop-blur-[1px] rounded-2xl">
                    <span className="text-xs font-semibold text-brand-700 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-150">
                      Đang đồng bộ dữ liệu...
                    </span>
                  </div>
                )}
                <CalendarView
                  currentYear={currentYear}
                  currentMonth={currentMonth}
                  selectedDate={selectedDate}
                  scheduledItems={scheduledItems}
                  statistics={statistics}
                  onPrevMonth={() => {
                    if (currentMonth === 1) {
                      setCurrentMonth(12)
                      setCurrentYear((y) => y - 1)
                    } else {
                      setCurrentMonth((m) => m - 1)
                    }
                  }}
                  onNextMonth={() => {
                    if (currentMonth === 12) {
                      setCurrentMonth(1)
                      setCurrentYear((y) => y + 1)
                    } else {
                      setCurrentMonth((m) => m + 1)
                    }
                  }}
                  onGoToday={handleGoToday}
                  onSelectDate={(dateStr) => {
                    // Bấm vào 1 ngày trong lịch -> mở thẻ chi tiết ngày đó
                    setSelectedDate(dateStr)
                  }}
                  onAddWordForDate={(dateStr) => {
                    setEditingWordData(undefined)
                    setManualInitialDate(dateStr)
                    setManualModalOpen(true)
                  }}
                />
              </div>
            ) : (
              /* Chế độ xem dạng Danh sách (List View) */
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                  <h3 className="text-sm font-bold text-slate-900">
                    Danh sách phát hành từ vựng ({scheduledItems.length} từ)
                  </h3>
                  <span className="text-xs text-slate-400">Sắp xếp theo ngày tăng dần</span>
                </div>

                {scheduledItems.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Chưa có từ vựng nào trong tháng {currentMonth}/{currentYear}. Hãy thêm từ hoặc nạp file để xếp lịch.
                  </div>
                ) : (
                  <div className="mt-3 divide-y divide-slate-100">
                    {scheduledItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedDate(item.ngay_phat_hanh)}
                        className={`flex cursor-pointer items-center justify-between rounded-xl p-3.5 transition-all ${
                          item.ngay_phat_hanh === selectedDate
                            ? 'bg-brand-50/30 ring-1 ring-brand-500'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 font-bold text-slate-700 text-xs">
                            {item.ngay_phat_hanh.split('-')[2]}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900">
                                {item.tu_vung.tu_tieng_anh}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[10px] font-semibold text-slate-600">
                                {item.tu_vung.tu_loai}
                              </span>
                              <span className="font-mono text-xs text-slate-400">
                                {item.tu_vung.phien_am_ipa}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {item.tu_vung.dinh_nghia_tieng_viet}
                            </p>
                          </div>
                        </div>

                        <div className="text-right text-xs">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                              item.trang_thai === 'dang_hoat_dong'
                                ? 'bg-emerald-50 text-emerald-700'
                                : item.trang_thai === 'cho_phat_hanh'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {item.trang_thai === 'dang_hoat_dong'
                              ? 'Hôm nay'
                              : item.trang_thai === 'cho_phat_hanh'
                              ? 'Sắp phát'
                              : 'Đã hoàn thành'}
                          </span>
                          <p className="mt-1 text-[11px] font-mono text-slate-400">{item.ngay_phat_hanh}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cột phải: Thẻ chi tiết flashcard - CHỈ HIỆN KHI NGƯỜI DÙNG BẤM VÀO 1 NGÀY TRÊN LỊCH */}
          {selectedDate && (
            <div className="lg:col-span-4 animate-in fade-in slide-in-from-right-3 duration-200">
              <WordDetailDrawer
                selectedDate={selectedDate}
                item={selectedItem}
                onClose={() => setSelectedDate(null)}
                onOpenReschedule={() => setRescheduleModalOpen(true)}
                onOpenEdit={() => {
                  if (selectedItem) {
                    setEditingWordData(selectedItem.tu_vung)
                    setManualInitialDate(selectedItem.ngay_phat_hanh)
                    setManualModalOpen(true)
                  }
                }}
                onAddNewWord={() => {
                  setEditingWordData(undefined)
                  setManualInitialDate(selectedDate)
                  setManualModalOpen(true)
                }}
                onDelete={() => void handleDeleteSelectedWord()}
              />
            </div>
          )}
        </div>
      </div>
        </main>
      </div>

      {/* Modal Thêm hoặc Sửa từ vựng thủ công */}
      <ManualWordModal
        isOpen={manualModalOpen}
        initialDate={manualInitialDate}
        initialData={editingWordData}
        onClose={() => setManualModalOpen(false)}
        onSave={handleSaveManualWord}
      />

      {/* Modal Đổi ngày đăng */}
      {selectedItem && (
        <RescheduleModal
          isOpen={rescheduleModalOpen}
          currentDate={selectedItem.ngay_phat_hanh}
          wordTitle={selectedItem.tu_vung.tu_tieng_anh}
          onClose={() => setRescheduleModalOpen(false)}
          onConfirm={handleConfirmReschedule}
        />
      )}

      {/* Modal xác nhận (xóa từ / dọn dẹp dữ liệu cũ) thay cho window.confirm */}
      <ConfirmModal
        open={confirmRequest !== null}
        title={confirmRequest?.title ?? ''}
        message={confirmRequest?.message ?? ''}
        confirmLabel={confirmRequest?.confirmLabel}
        danger={confirmRequest?.danger}
        loading={confirmLoading}
        onCancel={() => setConfirmRequest(null)}
        onConfirm={() => void handleConfirmAction()}
      />
    </div>
  )
}

export default DailyWordPage
