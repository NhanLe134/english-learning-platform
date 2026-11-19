import { createSupabaseClient } from '../../config/supabase.js'
import type {
  TuVungHangNgay,
  LichDangTuVung,
  YeuCauTaoTuVungVaLich,
  MucDoGhiNho,
  HangDoiOnTapTuVung,
} from './daily-word.types.js'

export class DailyWordRepository {
  private getClient() {
    return createSupabaseClient()
  }

  async layLichTheoKhoangNgay(ngayBatDau: string, ngayKetThuc: string): Promise<LichDangTuVung[]> {
    try {
      const client = this.getClient()
      const { data, error } = await client
        .from('lich_dang_tu_vung')
        .select(`
          id,
          tu_vung_id,
          ngay_phat_hanh,
          gio_phat_hanh,
          trang_thai,
          nguon_du_lieu,
          ten_tep_nguon,
          da_gui_thong_bao,
          thoi_gian_gui_thong_bao,
          ngay_tao,
          ngay_cap_nhat,
          tu_vung:tu_vung_hang_ngay (*)
        `)
        .gte('ngay_phat_hanh', ngayBatDau)
        .lte('ngay_phat_hanh', ngayKetThuc)
        .order('ngay_phat_hanh', { ascending: true })

      if (error) {
        console.warn('Lỗi query lich_dang_tu_vung từ Supabase:', error.message)
        return []
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        tu_vung_id: row.tu_vung_id,
        ngay_phat_hanh: row.ngay_phat_hanh,
        gio_phat_hanh: row.gio_phat_hanh,
        trang_thai: row.trang_thai,
        nguon_du_lieu: row.nguon_du_lieu,
        ten_tep_nguon: row.ten_tep_nguon,
        da_gui_thong_bao: row.da_gui_thong_bao,
        thoi_gian_gui_thong_bao: row.thoi_gian_gui_thong_bao,
        ngay_tao: row.ngay_tao,
        ngay_cap_nhat: row.ngay_cap_nhat,
        tu_vung: Array.isArray(row.tu_vung) ? row.tu_vung[0] : row.tu_vung,
      }))
    } catch (err) {
      console.warn('Exception khi truy vấn Supabase:', err)
      return []
    }
  }

  async layChiTietTheoNgay(ngay: string): Promise<LichDangTuVung | null> {
    try {
      const client = this.getClient()
      const { data, error } = await client
        .from('lich_dang_tu_vung')
        .select(`
          id,
          tu_vung_id,
          ngay_phat_hanh,
          gio_phat_hanh,
          trang_thai,
          nguon_du_lieu,
          ten_tep_nguon,
          da_gui_thong_bao,
          thoi_gian_gui_thong_bao,
          ngay_tao,
          ngay_cap_nhat,
          tu_vung:tu_vung_hang_ngay (*)
        `)
        .eq('ngay_phat_hanh', ngay)
        .maybeSingle()

      if (error || !data) return null

      return {
        id: data.id,
        tu_vung_id: data.tu_vung_id,
        ngay_phat_hanh: data.ngay_phat_hanh,
        gio_phat_hanh: data.gio_phat_hanh,
        trang_thai: data.trang_thai,
        nguon_du_lieu: data.nguon_du_lieu,
        ten_tep_nguon: data.ten_tep_nguon,
        da_gui_thong_bao: data.da_gui_thong_bao,
        thoi_gian_gui_thong_bao: data.thoi_gian_gui_thong_bao,
        ngay_tao: data.ngay_tao,
        ngay_cap_nhat: data.ngay_cap_nhat,
        tu_vung: Array.isArray(data.tu_vung) ? data.tu_vung[0] : data.tu_vung,
      }
    } catch {
      return null
    }
  }

  async timTuTheoTiengAnh(tuTiengAnh: string): Promise<TuVungHangNgay | null> {
    try {
      const client = this.getClient()
      const { data, error } = await client
        .from('tu_vung_hang_ngay')
        .select('*')
        .ilike('tu_tieng_anh', tuTiengAnh)
        .maybeSingle()

      if (error || !data) return null
      return data
    } catch {
      return null
    }
  }

  async taoTuVungVaLich(payload: YeuCauTaoTuVungVaLich): Promise<LichDangTuVung> {
    const client = this.getClient()

    // 1. Thêm từ vựng
    const { data: tuVungMoi, error: loiTuVung } = await client
      .from('tu_vung_hang_ngay')
      .insert({
        tu_tieng_anh: payload.tu_tieng_anh,
        phien_am_ipa: payload.phien_am_ipa,
        tu_loai: payload.tu_loai,
        dinh_nghia_tieng_anh: payload.dinh_nghia_tieng_anh,
        dinh_nghia_tieng_viet: payload.dinh_nghia_tieng_viet,
        vi_du_tieng_anh: payload.vi_du_tieng_anh,
        vi_du_tieng_viet: payload.vi_du_tieng_viet,
        duong_dan_am_thanh: payload.duong_dan_am_thanh || null,
        am_thanh_us: payload.am_thanh_us || null,
        am_thanh_uk: payload.am_thanh_uk || null,
        phien_am_ipa_us: payload.phien_am_ipa_us || null,
        phien_am_ipa_uk: payload.phien_am_ipa_uk || null,
        nhan_phan_loai: payload.nhan_phan_loai || 'Oxford 3000',
      })
      .select()
      .single()

    if (loiTuVung || !tuVungMoi) {
      throw new Error(`Không thể thêm từ vựng: ${loiTuVung?.message || 'Lỗi không xác định'}`)
    }

    // 2. Thêm lịch đăng
    const { data: lichMoi, error: loiLich } = await client
      .from('lich_dang_tu_vung')
      .upsert(
        {
          tu_vung_id: tuVungMoi.id,
          ngay_phat_hanh: payload.ngay_phat_hanh,
          gio_phat_hanh: payload.gio_phat_hanh || '07:00:00',
          trang_thai: 'cho_phat_hanh',
          nguon_du_lieu: 'thu_cong',
        },
        { onConflict: 'ngay_phat_hanh' }
      )
      .select()
      .single()

    if (loiLich || !lichMoi) {
      throw new Error(`Không thể xếp lịch đăng: ${loiLich?.message || 'Lỗi không xác định'}`)
    }

    return {
      ...lichMoi,
      tu_vung: tuVungMoi,
    }
  }

  async doiNgayPhatHanh(lichId: string, ngayMoi: string): Promise<LichDangTuVung> {
    const client = this.getClient()
    const { data, error } = await client
      .from('lich_dang_tu_vung')
      .update({
        ngay_phat_hanh: ngayMoi,
        ngay_cap_nhat: new Date().toISOString(),
      })
      .eq('id', lichId)
      .select('*, tu_vung:tu_vung_hang_ngay (*)')
      .single()

    if (error || !data) {
      throw new Error(`Không thể đổi ngày phát hành: ${error?.message || 'Lỗi không xác định'}`)
    }

    return {
      ...data,
      tu_vung: Array.isArray(data.tu_vung) ? data.tu_vung[0] : data.tu_vung,
    }
  }

  async capNhatNoiDungTuVung(tuVungId: string, payload: Partial<TuVungHangNgay>): Promise<TuVungHangNgay> {
    const client = this.getClient()
    const { data, error } = await client
      .from('tu_vung_hang_ngay')
      .update({
        ...payload,
        ngay_cap_nhat: new Date().toISOString(),
      })
      .eq('id', tuVungId)
      .select()
      .single()

    if (error || !data) {
      throw new Error(`Không thể cập nhật từ vựng: ${error?.message || 'Lỗi'}`)
    }

    return data
  }

  async xoaLichDang(lichId: string): Promise<boolean> {
    const client = this.getClient()
    const { error } = await client
      .from('lich_dang_tu_vung')
      .delete()
      .eq('id', lichId)

    if (error) {
      throw new Error(`Không thể xóa lịch đăng: ${error.message}`)
    }
    return true
  }

  async luuLichHangLoat(danhSach: Array<{
    tu_vung: Omit<TuVungHangNgay, 'id'>
    ngay_phat_hanh: string
    gio_phat_hanh: string
    ten_tep_nguon?: string
  }>): Promise<LichDangTuVung[]> {
    const client = this.getClient()
    const ketQua: LichDangTuVung[] = []

    for (const item of danhSach) {
      try {
        const { data: tuVungMoi } = await client
          .from('tu_vung_hang_ngay')
          .insert({
            tu_tieng_anh: item.tu_vung.tu_tieng_anh,
            phien_am_ipa: item.tu_vung.phien_am_ipa,
            tu_loai: item.tu_vung.tu_loai,
            dinh_nghia_tieng_anh: item.tu_vung.dinh_nghia_tieng_anh,
            dinh_nghia_tieng_viet: item.tu_vung.dinh_nghia_tieng_viet,
            vi_du_tieng_anh: item.tu_vung.vi_du_tieng_anh,
            vi_du_tieng_viet: item.tu_vung.vi_du_tieng_viet,
            duong_dan_am_thanh: item.tu_vung.duong_dan_am_thanh || null,
            am_thanh_us: item.tu_vung.am_thanh_us || null,
            am_thanh_uk: item.tu_vung.am_thanh_uk || null,
            phien_am_ipa_us: item.tu_vung.phien_am_ipa_us || null,
            phien_am_ipa_uk: item.tu_vung.phien_am_ipa_uk || null,
            nhan_phan_loai: 'Oxford 3000',
          })
          .select()
          .single()

        if (tuVungMoi) {
          const { data: lichMoi } = await client
            .from('lich_dang_tu_vung')
            .upsert(
              {
                tu_vung_id: tuVungMoi.id,
                ngay_phat_hanh: item.ngay_phat_hanh,
                gio_phat_hanh: item.gio_phat_hanh,
                trang_thai: 'cho_phat_hanh',
                nguon_du_lieu: 'boc_tach_tep',
                ten_tep_nguon: item.ten_tep_nguon || null,
              },
              { onConflict: 'ngay_phat_hanh' }
            )
            .select()
            .single()

          if (lichMoi) {
            ketQua.push({
              ...lichMoi,
              tu_vung: tuVungMoi,
            })
          }
        }
      } catch (err) {
        console.warn('Lỗi lưu mục từ trong luuLichHangLoat:', err)
      }
    }

    return ketQua
  }

  // =======================================================
  // FLASHCARD REVIEW QUEUE (HÀNG ĐỢI ÔN TẬP FLASHCARD)
  // =======================================================
  async luuDanhGiaFlashcard(
    hocVienId: string,
    tuVungId: string,
    mucDoGhiNho: MucDoGhiNho
  ): Promise<{ thanh_cong: boolean; vi_tri_hang_doi?: number; message: string }> {
    const client = this.getClient()

    if (mucDoGhiNho === 'da_thuoc') {
      // Đã thuộc -> xóa khỏi hàng đợi ôn tập
      await client
        .from('hang_doi_on_tap_tu_vung')
        .delete()
        .eq('hoc_vien_id', hocVienId)
        .eq('tu_vung_id', tuVungId)

      return { thanh_cong: true, message: 'Đã hoàn thành từ vựng này' }
    }

    // Quy tắc lặp lại ngắt quãng:
    // Chưa thuộc -> vị trí thứ 3
    // Tạm thuộc -> vị trí thứ 7
    const viTri = mucDoGhiNho === 'chua_thuoc' ? 3 : 7

    // Ngày ôn tập tiếp theo: ngày mai
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const ngayOnTap = tomorrow.toISOString().split('T')[0] ?? ''

    await client
      .from('hang_doi_on_tap_tu_vung')
      .upsert(
        {
          hoc_vien_id: hocVienId,
          tu_vung_id: tuVungId,
          muc_do_ghi_nho: mucDoGhiNho,
          vi_tri_hang_doi: viTri,
          ngay_on_tap_tiep_theo: ngayOnTap,
          ngay_cap_nhat: new Date().toISOString(),
        },
        { onConflict: 'hoc_vien_id,tu_vung_id' }
      )

    return {
      thanh_cong: true,
      vi_tri_hang_doi: viTri,
      message: `Đã xếp từ vào hàng đợi ôn tập ở vị trí thứ ${viTri}`,
    }
  }

  async layHangDoiFlashcard(hocVienId: string): Promise<HangDoiOnTapTuVung[]> {
    try {
      const client = this.getClient()
      const { data, error } = await client
        .from('hang_doi_on_tap_tu_vung')
        .select(`
          id,
          hoc_vien_id,
          tu_vung_id,
          muc_do_ghi_nho,
          vi_tri_hang_doi,
          ngay_on_tap_tiep_theo,
          ngay_cap_nhat,
          tu_vung:tu_vung_hang_ngay (*)
        `)
        .eq('hoc_vien_id', hocVienId)
        .order('vi_tri_hang_doi', { ascending: true })

      if (error || !data) return []

      return data.map((row: any) => ({
        id: row.id,
        hoc_vien_id: row.hoc_vien_id,
        tu_vung_id: row.tu_vung_id,
        muc_do_ghi_nho: row.muc_do_ghi_nho,
        vi_tri_hang_doi: row.vi_tri_hang_doi,
        ngay_on_tap_tiep_theo: row.ngay_on_tap_tiep_theo,
        ngay_cap_nhat: row.ngay_cap_nhat,
        tu_vung: Array.isArray(row.tu_vung) ? row.tu_vung[0] : row.tu_vung,
      }))
    } catch {
      return []
    }
  }

  /**
   * Dọn dẹp dữ liệu cũ hơn 2 tháng (tính từ ngày hiện tại) để giảm tải và làm nhẹ Database
   */
  async donDepDuLieuCuHon2Thang(): Promise<{
    so_lich_da_xoa: number
    so_tu_da_xoa: number
    ngay_moc_cat: string
  }> {
    const client = this.getClient()
    const now = new Date()
    now.setMonth(now.getMonth() - 2)
    const ngayMocCat = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    try {
      // 1. Thử gọi RPC nếu hàm lưu trữ đã được tạo trong Supabase
      const { data: rpcData, error: rpcError } = await client.rpc('don_dep_du_lieu_tu_vung_cu_hon_2_thang')
      if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
        return {
          so_lich_da_xoa: Number(rpcData[0].so_lich_da_xoa) || 0,
          so_tu_da_xoa: Number(rpcData[0].so_tu_da_xoa) || 0,
          ngay_moc_cat: rpcData[0].ngay_moc_cat || ngayMocCat,
        }
      }
    } catch {
      // Tiếp tục thực thi xóa trực tiếp qua Supabase Client
    }

    try {
      // 2. Tìm tất cả các lịch đăng cũ hơn 2 tháng
      const { data: oldSchedules, error: errSelect } = await client
        .from('lich_dang_tu_vung')
        .select('id, tu_vung_id')
        .lt('ngay_phat_hanh', ngayMocCat)

      if (errSelect || !oldSchedules || oldSchedules.length === 0) {
        return { so_lich_da_xoa: 0, so_tu_da_xoa: 0, ngay_moc_cat: ngayMocCat }
      }

      const tuVungIds = Array.from(
        new Set(oldSchedules.map((s) => s.tu_vung_id).filter(Boolean))
      )

      let soTuDaXoa = 0
      if (tuVungIds.length > 0) {
        // Xóa các từ vựng này khỏi tu_vung_hang_ngay (nhờ ON DELETE CASCADE, lịch và flashcard tự động bị xóa)
        const { data: deletedWords } = await client
          .from('tu_vung_hang_ngay')
          .delete()
          .in('id', tuVungIds)
          .select('id')
        soTuDaXoa = deletedWords?.length || tuVungIds.length
      }

      // Xóa dự phòng các lịch đăng mồ côi (nếu có)
      await client
        .from('lich_dang_tu_vung')
        .delete()
        .lt('ngay_phat_hanh', ngayMocCat)

      return {
        so_lich_da_xoa: oldSchedules.length,
        so_tu_da_xoa: soTuDaXoa,
        ngay_moc_cat: ngayMocCat,
      }
    } catch (err) {
      console.error('Lỗi khi thực hiện dọn dẹp dữ liệu cũ hơn 2 tháng:', err)
      return { so_lich_da_xoa: 0, so_tu_da_xoa: 0, ngay_moc_cat: ngayMocCat }
    }
  }
}

export const dailyWordRepository = new DailyWordRepository()
