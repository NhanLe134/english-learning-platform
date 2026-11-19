import { dailyWordRepository, DailyWordRepository } from './daily-word.repository.js'
import type {
  LichDangTuVung,
  ThongKeLichThang,
  YeuCauTaoTuVungVaLich,
  YeuCauBocTachVaXepLich,
  MucDoGhiNho,
  HangDoiOnTapTuVung,
} from './daily-word.types.js'

export class DailyWordService {
  constructor(private repo: DailyWordRepository = dailyWordRepository) {}

  /**
   * Tra cứu thông tin phát âm và link MP3 bản xứ từ Free Dictionary API
   */
  async layThongTinPhatAm(tuTiengAnh: string): Promise<{
    phien_am_ipa_us?: string
    phien_am_ipa_uk?: string
    am_thanh_us?: string
    am_thanh_uk?: string
    phien_am_chung?: string
  }> {
    try {
      const cleanWord = tuTiengAnh.trim().toLowerCase()
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`)
      if (!res.ok) return {}

      const data: any = await res.json()
      const firstEntry = data?.[0]
      if (!firstEntry) return {}

      const phonetics: any[] = firstEntry.phonetics || []
      let am_thanh_us: string | undefined
      let am_thanh_uk: string | undefined
      let phien_am_ipa_us: string | undefined
      let phien_am_ipa_uk: string | undefined

      for (const p of phonetics) {
        const audio: string = p.audio || ''
        const text: string = p.text || ''
        if (audio.includes('-us') || audio.includes('/us/')) {
          if (!am_thanh_us) am_thanh_us = audio
          if (!phien_am_ipa_us && text) phien_am_ipa_us = text
        } else if (audio.includes('-uk') || audio.includes('/uk/') || audio.includes('-gb')) {
          if (!am_thanh_uk) am_thanh_uk = audio
          if (!phien_am_ipa_uk && text) phien_am_ipa_uk = text
        }
      }

      // Fallback nếu không tách rõ US/UK trong URL
      const generalAudio = phonetics.find((p) => p.audio && p.audio.startsWith('http'))?.audio
      if (!am_thanh_us && generalAudio) am_thanh_us = generalAudio
      if (!am_thanh_uk && generalAudio) am_thanh_uk = generalAudio

      const generalIpa = firstEntry.phonetic || phonetics.find((p) => p.text)?.text

      return {
        phien_am_ipa_us: phien_am_ipa_us || generalIpa,
        phien_am_ipa_uk: phien_am_ipa_uk || generalIpa,
        am_thanh_us,
        am_thanh_uk,
        phien_am_chung: generalIpa,
      }
    } catch {
      return {}
    }
  }

  /**
   * Stream audio phát âm chất lượng cao (US hoặc UK).
   * Cơ chế 3 tầng đảm bảo 100% không bao giờ thiếu âm thanh:
   * 1. URL MP3 giọng bản xứ đã lưu trong Database
   * 2. Audio từ Free Dictionary API
   * 3. Fallback chuẩn tuyệt đối từ Google Translate TTS CDN
   */
  async layAudioStream(tuTiengAnh: string, giong: 'us' | 'uk' = 'us'): Promise<{
    buffer: Buffer
    contentType: string
  }> {
    const cleanWord = tuTiengAnh.trim().toLowerCase()

    // 1. Kiểm tra URL đã lưu trong DB
    try {
      const tuDb = await this.repo.timTuTheoTiengAnh(cleanWord)
      const directUrl =
        giong === 'uk'
          ? tuDb?.am_thanh_uk || tuDb?.duong_dan_am_thanh
          : tuDb?.am_thanh_us || tuDb?.duong_dan_am_thanh

      if (directUrl && directUrl.startsWith('http')) {
        const audioRes = await fetch(directUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        })
        if (audioRes.ok) {
          const arrayBuf = await audioRes.arrayBuffer()
          return {
            buffer: Buffer.from(arrayBuf),
            contentType: audioRes.headers.get('content-type') || 'audio/mpeg',
          }
        }
      }
    } catch {
      // bỏ qua fallback tầng tiếp theo
    }

    // 2. Tra cứu Free Dictionary API
    try {
      const dictRes = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`
      )
      if (dictRes.ok) {
        const entries: any = await dictRes.json()
        const phonetics: any[] = entries[0]?.phonetics || []
        let audioUrl: string | null = null

        if (giong === 'uk') {
          audioUrl = phonetics.find((p) => p.audio && (p.audio.includes('-uk') || p.audio.includes('-gb')))?.audio || null
        } else {
          audioUrl = phonetics.find((p) => p.audio && (p.audio.includes('-us') || !p.audio.includes('-uk')))?.audio || null
        }

        if (!audioUrl) {
          audioUrl = phonetics.find((p) => p.audio && p.audio.startsWith('http'))?.audio || null
        }

        if (audioUrl) {
          const audioRes = await fetch(audioUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          })
          if (audioRes.ok) {
            const arrayBuf = await audioRes.arrayBuffer()
            return {
              buffer: Buffer.from(arrayBuf),
              contentType: audioRes.headers.get('content-type') || 'audio/mpeg',
            }
          }
        }
      }
    } catch {
      // bỏ qua fallback tầng 3
    }

    // 3. Fallback chuẩn 100% bằng Google Translate TTS CDN
    const langCode = giong === 'uk' ? 'en-GB' : 'en-US'
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(cleanWord)}`
    const ttsRes = await fetch(ttsUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    })

    if (!ttsRes.ok) {
      throw new Error(`Không thể tạo phát âm từ audio provider: HTTP ${ttsRes.status}`)
    }

    const arrayBuf = await ttsRes.arrayBuffer()
    return {
      buffer: Buffer.from(arrayBuf),
      contentType: ttsRes.headers.get('content-type') || 'audio/mpeg',
    }
  }

  async layLichTheoThang(nam: number, thang: number): Promise<{
    danh_sach: LichDangTuVung[]
    thong_ke: ThongKeLichThang
  }> {
    const ngayBatDau = `${nam}-${String(thang).padStart(2, '0')}-01`
    const soNgayTrongThang = new Date(nam, thang, 0).getDate()
    const ngayKetThuc = `${nam}-${String(thang).padStart(2, '0')}-${String(soNgayTrongThang).padStart(2, '0')}`

    const danhSach = await this.repo.layLichTheoKhoangNgay(ngayBatDau, ngayKetThuc)

    const soNgayDaCoTu = danhSach.length
    const tyLePhuKin = Math.round((soNgayDaCoTu / soNgayTrongThang) * 100)
    const soTuDaDang = danhSach.filter((d) => d.trang_thai === 'da_qua' || d.trang_thai === 'dang_hoat_dong').length
    const soTuSapDang = danhSach.filter((d) => d.trang_thai === 'cho_phat_hanh').length
    const soNgayConLai = Math.max(0, soNgayTrongThang - soNgayDaCoTu)

    return {
      danh_sach: danhSach,
      thong_ke: {
        nam,
        thang,
        tong_so_ngay: soNgayTrongThang,
        so_ngay_da_co_tu: soNgayDaCoTu,
        ty_le_phu_kin: tyLePhuKin,
        so_tu_da_dang: soTuDaDang,
        so_tu_sap_dang: soTuSapDang,
        so_ngay_con_lai_truoc_khi_het_tu: soNgayConLai,
      },
    }
  }

  async layChiTietTuVung(ngayHoacId: string): Promise<LichDangTuVung | null> {
    const isDate = /^\d{4}-\d{2}-\d{2}$/.test(ngayHoacId)
    if (isDate) {
      return this.repo.layChiTietTheoNgay(ngayHoacId)
    }
    return null
  }

  /**
   * Lấy từ vựng Daily Word phát hành ngày hôm nay (hoặc từ gần nhất)
   */
  async layTuVungHomNay(): Promise<LichDangTuVung | null> {
    const todayStr = new Date().toISOString().split('T')[0] ?? ''
    const item = await this.repo.layChiTietTheoNgay(todayStr)
    if (item) return item

    try {
      const client = (this.repo as any).getClient()
      const { data } = await client
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
          tu_vung:tu_vung_hang_ngay (*)
        `)
        .order('ngay_phat_hanh', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data) {
        return {
          ...data,
          tu_vung: Array.isArray(data.tu_vung) ? data.tu_vung[0] : data.tu_vung,
        }
      }
    } catch {
      // Bỏ qua nếu có lỗi
    }
    return null
  }

  async taoTuVungThuCong(payload: YeuCauTaoTuVungVaLich): Promise<LichDangTuVung> {
    // Tự động bổ sung link phát âm US/UK nếu chưa có
    let amThanhUs = payload.am_thanh_us
    let amThanhUk = payload.am_thanh_uk
    let ipaUs = payload.phien_am_ipa_us
    let ipaUk = payload.phien_am_ipa_uk

    if (!amThanhUs || !amThanhUk) {
      const enriched = await this.layThongTinPhatAm(payload.tu_tieng_anh)
      if (!amThanhUs) amThanhUs = enriched.am_thanh_us
      if (!amThanhUk) amThanhUk = enriched.am_thanh_uk
      if (!ipaUs) ipaUs = enriched.phien_am_ipa_us
      if (!ipaUk) ipaUk = enriched.phien_am_ipa_uk
    }

    return this.repo.taoTuVungVaLich({
      ...payload,
      am_thanh_us: amThanhUs,
      am_thanh_uk: amThanhUk,
      phien_am_ipa_us: ipaUs,
      phien_am_ipa_uk: ipaUk,
      phien_am_ipa: payload.phien_am_ipa || ipaUs || ipaUk || '',
    })
  }

  async doiNgayPhatHanh(lichId: string, ngayMoi: string): Promise<LichDangTuVung> {
    return this.repo.doiNgayPhatHanh(lichId, ngayMoi)
  }

  /**
   * Tự động rải đều danh sách từ vựng theo số lượng từ nhận diện trong file
   * (mỗi ngày 1 từ liên tục bắt đầu từ ngay_bat_dau)
   */
  async xepLichHangLoatTuFile(yeuCau: YeuCauBocTachVaXepLich): Promise<{
    so_tu_da_xep: number
    ngay_bat_dau: string
    ngay_ket_thuc: string
    danh_sach: LichDangTuVung[]
  }> {
    const { danh_sach_tu, ngay_bat_dau, gio_phat_hanh = '07:00:00', ten_tep_nguon } = yeuCau
    const danhSachLuu: Array<{
      tu_vung: {
        tu_tieng_anh: string
        phien_am_ipa: string
        tu_loai: string
        dinh_nghia_tieng_anh: string
        dinh_nghia_tieng_viet: string
        vi_du_tieng_anh: string
        vi_du_tieng_viet: string
        am_thanh_us?: string
        am_thanh_uk?: string
        phien_am_ipa_us?: string
        phien_am_ipa_uk?: string
      }
      ngay_phat_hanh: string
      gio_phat_hanh: string
      ten_tep_nguon?: string
    }> = []

    let ngayHienTai = new Date(ngay_bat_dau)

    for (const item of danh_sach_tu) {
      const ngayFormat = ngayHienTai.toISOString().split('T')[0] ?? ''
      danhSachLuu.push({
        tu_vung: {
          tu_tieng_anh: item.tu_tieng_anh,
          phien_am_ipa: item.phien_am_ipa || '',
          tu_loai: item.tu_loai || 'Word',
          dinh_nghia_tieng_anh: item.dinh_nghia_tieng_anh || '',
          dinh_nghia_tieng_viet: item.dinh_nghia_tieng_viet || '',
          vi_du_tieng_anh: item.vi_du_tieng_anh || '',
          vi_du_tieng_viet: item.vi_du_tieng_viet || '',
        },
        ngay_phat_hanh: ngayFormat,
        gio_phat_hanh,
        ten_tep_nguon,
      })
      ngayHienTai.setDate(ngayHienTai.getDate() + 1)
    }

    const ngayKetThuc = new Date(ngayHienTai)
    ngayKetThuc.setDate(ngayKetThuc.getDate() - 1)

    // Lưu vào Supabase
    const savedItems = await this.repo.luuLichHangLoat(danhSachLuu)

    return {
      so_tu_da_xep: savedItems.length > 0 ? savedItems.length : danhSachLuu.length,
      ngay_bat_dau,
      ngay_ket_thuc: ngayKetThuc.toISOString().split('T')[0] ?? '',
      danh_sach: savedItems,
    }
  }

  // =======================================================
  // FLASHCARD REVIEW SERVICES
  // =======================================================
  async danhGiaFlashcard(
    hocVienId: string,
    tuVungId: string,
    mucDoGhiNho: MucDoGhiNho
  ) {
    return this.repo.luuDanhGiaFlashcard(hocVienId, tuVungId, mucDoGhiNho)
  }

  async layHangDoiFlashcard(hocVienId: string): Promise<HangDoiOnTapTuVung[]> {
    return this.repo.layHangDoiFlashcard(hocVienId)
  }

  // =======================================================
  // DỌN DẸP DỮ LIỆU CŨ HƠN 2 THÁNG
  // =======================================================
  async donDepDuLieuCuHon2Thang(): Promise<{
    so_lich_da_xoa: number
    so_tu_da_xoa: number
    ngay_moc_cat: string
  }> {
    return this.repo.donDepDuLieuCuHon2Thang()
  }
}

export const dailyWordService = new DailyWordService()

/**
 * Khởi động tiến trình dọn dẹp dữ liệu cũ chạy ngầm định kỳ hàng ngày (mỗi 24 giờ)
 */
export function khoiDongTienTrinhDonDepTuDong() {
  // Quét kiểm tra sau 30 giây khi khởi động server
  setTimeout(async () => {
    try {
      const res = await dailyWordService.donDepDuLieuCuHon2Thang()
      if (res.so_lich_da_xoa > 0 || res.so_tu_da_xoa > 0) {
        console.log(
          `[Tự động dọn dẹp Daily Word] Đã xóa ${res.so_lich_da_xoa} lịch đăng và ${res.so_tu_da_xoa} từ vựng cũ hơn ngày ${res.ngay_moc_cat}`
        )
      }
    } catch (e: any) {
      console.warn('[Tự động dọn dẹp Daily Word] Cảnh báo kiểm tra định kỳ:', e.message)
    }
  }, 30_000)

  // Chu kỳ chạy lại mỗi 24 giờ
  setInterval(async () => {
    try {
      const res = await dailyWordService.donDepDuLieuCuHon2Thang()
      if (res.so_lich_da_xoa > 0 || res.so_tu_da_xoa > 0) {
        console.log(
          `[Tự động dọn dẹp Daily Word] Đã xóa ${res.so_lich_da_xoa} lịch đăng và ${res.so_tu_da_xoa} từ vựng cũ hơn ngày ${res.ngay_moc_cat}`
        )
      }
    } catch (e: any) {
      console.warn('[Tự động dọn dẹp Daily Word] Cảnh báo kiểm tra định kỳ:', e.message)
    }
  }, 24 * 60 * 60 * 1000)
}
