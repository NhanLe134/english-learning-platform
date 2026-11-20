
export interface TuVungHangNgay {
  id: string
  tu_tieng_anh: string
  phien_am_ipa: string
  tu_loai: string
  dinh_nghia_tieng_anh: string
  dinh_nghia_tieng_viet: string
  vi_du_tieng_anh: string
  vi_du_tieng_viet: string
  duong_dan_am_thanh?: string | null
  am_thanh_us?: string | null
  am_thanh_uk?: string | null
  phien_am_ipa_us?: string | null
  phien_am_ipa_uk?: string | null
  nhan_phan_loai?: string | null
  ngay_tao?: string
  ngay_cap_nhat?: string
}

export type TrangThaiLichDang = 'cho_phat_hanh' | 'dang_hoat_dong' | 'da_qua' | 'tam_dung'
export type NguonDuLieu = 'thu_cong' | 'boc_tach_tep' | 'ai_import'

export interface LichDangTuVung {
  id: string
  tu_vung_id: string
  ngay_phat_hanh: string // YYYY-MM-DD
  gio_phat_hanh: string  // HH:mm:ss
  trang_thai: TrangThaiLichDang
  nguon_du_lieu: NguonDuLieu
  ten_tep_nguon?: string | null
  da_gui_thong_bao: boolean
  thoi_gian_gui_thong_bao?: string | null
  ngay_tao?: string
  ngay_cap_nhat?: string
  // Thông tin từ vựng kèm theo
  tu_vung?: TuVungHangNgay
}

export interface YeuCauTaoTuVungVaLich {
  tu_tieng_anh: string
  phien_am_ipa: string
  tu_loai: string
  dinh_nghia_tieng_anh: string
  dinh_nghia_tieng_viet: string
  vi_du_tieng_anh: string
  vi_du_tieng_viet: string
  duong_dan_am_thanh?: string
  am_thanh_us?: string
  am_thanh_uk?: string
  phien_am_ipa_us?: string
  phien_am_ipa_uk?: string
  nhan_phan_loai?: string
  ngay_phat_hanh: string
  gio_phat_hanh?: string
}

export interface YeuCauBocTachVaXepLich {
  danh_sach_tu: Array<{
    tu_tieng_anh: string
    phien_am_ipa?: string
    tu_loai?: string
    dinh_nghia_tieng_anh?: string
    dinh_nghia_tieng_viet?: string
    vi_du_tieng_anh?: string
    vi_du_tieng_viet?: string
    am_thanh_us?: string
    am_thanh_uk?: string
    phien_am_ipa_us?: string
    phien_am_ipa_uk?: string
  }>
  kieu_thoi_gian?: '1_tuan' | '1_thang' | 'tu_dong' | 'tuy_chinh'
  ngay_bat_dau: string // YYYY-MM-DD
  gio_phat_hanh?: string // HH:mm:ss
  ten_tep_nguon?: string
}

export interface ThongKeLichThang {
  nam: number
  thang: number
  tong_so_ngay: number
  so_ngay_da_co_tu: number
  ty_le_phu_kin: number
  so_tu_da_dang: number
  so_tu_sap_dang: number
  so_ngay_con_lai_truoc_khi_het_tu: number
}

// =======================================================
// HÀNG ĐỢI ÔN TẬP FLASHCARD DÀNH CHO HỌC VIÊN
// =======================================================
export type MucDoGhiNho = 'chua_thuoc' | 'tam_thuoc' | 'da_thuoc'

export interface YeuCauDanhGiaFlashcard {
  hoc_vien_id: string
  tu_vung_id: string
  muc_do_ghi_nho: MucDoGhiNho
}

export interface HangDoiOnTapTuVung {
  id: string
  hoc_vien_id: string
  tu_vung_id: string
  muc_do_ghi_nho: MucDoGhiNho
  vi_tri_hang_doi: number
  ngay_on_tap_tiep_theo: string
  ngay_cap_nhat?: string
  tu_vung?: TuVungHangNgay
}
