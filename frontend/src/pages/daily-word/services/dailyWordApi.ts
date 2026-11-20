import type {
  LichDangItem,
  ThongKeThang,
  TuVungBocTach,
} from '../types/dailyWord.types'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  '/api'

export interface LichThangResponse {
  success: boolean
  data?: {
    danh_sach: LichDangItem[]
    thong_ke: ThongKeThang
  }
  error?: string
}

export interface ChiTietResponse {
  success: boolean
  data?: LichDangItem
  message?: string
  error?: string
}

export const dailyWordApi = {
  /**
   * Lấy lịch phát hành từ vựng theo tháng và năm
   */
  async layLichThang(nam: number, thang: number): Promise<{
    danh_sach: LichDangItem[]
    thong_ke: ThongKeThang
  }> {
    const res = await fetch(`${API_BASE_URL}/daily-word/calendar?nam=${nam}&thang=${thang}`)
    if (!res.ok) {
      throw new Error(`Lỗi khi tải lịch phát hành: HTTP ${res.status}`)
    }
    const json: LichThangResponse = await res.json()
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Không thể tải lịch phát hành')
    }
    return json.data
  },

  /**
   * Lấy chi tiết từ vựng theo ngày (YYYY-MM-DD) hoặc ID
   */
  async layChiTietTuVung(idHoacNgay: string): Promise<LichDangItem | null> {
    const res = await fetch(`${API_BASE_URL}/daily-word/${idHoacNgay}`)
    if (res.status === 404) return null
    if (!res.ok) {
      throw new Error(`Lỗi tải chi tiết từ: HTTP ${res.status}`)
    }
    const json: ChiTietResponse = await res.json()
    return json.data || null
  },

  /**
   * Thêm từ vựng thủ công và xếp ngày phát hành
   */
  async taoTuVungThuCong(payload: {
    tu_tieng_anh: string
    phien_am_ipa: string
    tu_loai: string
    dinh_nghia_tieng_anh: string
    dinh_nghia_tieng_viet: string
    vi_du_tieng_anh: string
    vi_du_tieng_viet: string
    ngay_phat_hanh: string
    gio_phat_hanh?: string
    am_thanh_us?: string
    am_thanh_uk?: string
  }): Promise<LichDangItem> {
    const res = await fetch(`${API_BASE_URL}/daily-word`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Không thể thêm từ mới')
    }
    return json.data
  },

  /**
   * Đổi ngày phát hành của một từ
   */
  async doiNgayPhatHanh(lichId: string, ngayMoi: string): Promise<LichDangItem> {
    const res = await fetch(`${API_BASE_URL}/daily-word/${lichId}/reschedule`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ngay_moi: ngayMoi }),
    })
    const json = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Không thể đổi ngày phát hành')
    }
    return json.data
  },

  /**
   * Xóa từ vựng khỏi kho (kèm lịch đăng + hàng đợi ôn tập liên quan)
   */
  async xoaTuVung(tuVungId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/daily-word/tu-vung/${tuVungId}`, {
      method: 'DELETE',
    })
    const json = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Không thể xóa từ vựng')
    }
  },

  /**
   * Dọn dẹp dữ liệu cũ hơn 2 tháng để làm nhẹ database
   */
  async donDepDuLieuCu(): Promise<{
    so_lich_da_xoa: number
    so_tu_da_xoa: number
    ngay_moc_cat: string
  }> {
    const res = await fetch(`${API_BASE_URL}/daily-word/don-dep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    const json = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Không thể dọn dẹp dữ liệu cũ')
    }
    return json.data
  },

  /**
   * Xếp lịch hàng loạt từ danh sách từ vựng bóc tách từ file
   */
  async xepLichHangLoat(payload: {
    danh_sach_tu: TuVungBocTach[]
    ngay_bat_dau: string
    gio_phat_hanh?: string
    ten_tep_nguon?: string
  }): Promise<{
    so_tu_da_xep: number
    ngay_bat_dau: string
    ngay_ket_thuc: string
    danh_sach: LichDangItem[]
  }> {
    const res = await fetch(`${API_BASE_URL}/daily-word/bulk-schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Không thể xếp lịch hàng loạt')
    }
    return json.data
  },

  /**
   * Trả về URL phát âm giọng bản xứ (US hoặc UK) qua backend audio proxy
   */
  layUrlPhatAm(tuTiengAnh: string, giong: 'us' | 'uk' = 'us'): string {
    return `${API_BASE_URL}/daily-word/phat-am/${encodeURIComponent(tuTiengAnh.trim().toLowerCase())}?giong=${giong}`
  },

  /**
   * Lấy từ vựng Daily Word phát hành ngày hôm nay
   */
  async layTuVungHomNay(): Promise<LichDangItem | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/daily-word/today`)
      if (!res.ok) return null
      const json = await res.json()
      return json.data || null
    } catch {
      return null
    }
  },

  /**
   * Lấy hàng đợi ôn tập Flashcard của học viên
   */
  async layHangDoiFlashcard(hocVienId: string): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/daily-word/flashcard/hang-doi?hoc_vien_id=${encodeURIComponent(hocVienId)}`)
      if (!res.ok) return []
      const json = await res.json()
      return json.data || []
    } catch {
      return []
    }
  },

  /**
   * Đánh giá flashcard dành cho học viên
   */
  async danhGiaFlashcard(
    hocVienId: string,
    tuVungId: string,
    mucDoGhiNho: 'chua_thuoc' | 'tam_thuoc' | 'da_thuoc'
  ) {
    const res = await fetch(`${API_BASE_URL}/daily-word/flashcard/danh-gia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hoc_vien_id: hocVienId,
        tu_vung_id: tuVungId,
        muc_do_ghi_nho: mucDoGhiNho,
      }),
    })
    return res.json()
  },
}
