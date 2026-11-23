export interface TuVungChiTiet {
  id: string
  tu_tieng_anh: string
  phien_am_ipa: string
  tu_loai: string // 'Adj' | 'Noun' | 'Verb' | 'Adv' | 'Idiom' | string
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
}

export type TrangThaiLichDang = 'cho_phat_hanh' | 'dang_hoat_dong' | 'da_qua' | 'tam_dung'
export type NguonDuLieu = 'thu_cong' | 'boc_tach_tep' | 'ai_import'

export interface LichDangItem {
  id: string
  tu_vung_id: string
  ngay_phat_hanh: string // YYYY-MM-DD
  gio_phat_hanh: string  // HH:mm:ss
  trang_thai: TrangThaiLichDang
  nguon_du_lieu: NguonDuLieu
  ten_tep_nguon?: string | null
  da_gui_thong_bao: boolean
  ngay_cap_nhat?: string
  thoi_gian_gui_thong_bao?: string | null
  tu_vung: TuVungChiTiet
}

export interface TuVungBocTach {
  id: string
  tu_tieng_anh: string
  phien_am_ipa: string
  tu_loai: string
  dinh_nghia_tieng_anh: string
  dinh_nghia_tieng_viet: string
  vi_du_tieng_anh: string
  vi_du_tieng_viet: string
}

export type KieuThoiGianDang = '1_tuan' | '1_thang' | 'tuy_chinh'

export interface ThongKeThang {
  tong_so_ngay: number
  so_ngay_da_co_tu: number
  ty_le_phu_kin: number
  so_tu_da_dang: number
  so_tu_sap_dang: number
  so_ngay_con_lai: number
}
