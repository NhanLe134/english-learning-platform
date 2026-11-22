import type { Request, Response } from 'express'
import { dailyWordService } from './daily-word.service.js'

export class DailyWordController {
  async layLichThang(req: Request, res: Response) {
    try {
      const nam = parseInt(req.query.nam as string) || new Date().getFullYear()
      const thang = parseInt(req.query.thang as string) || new Date().getMonth() + 1
      const data = await dailyWordService.layLichTheoThang(nam, thang)
      res.json({ success: true, data })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Lỗi server' })
    }
  }

  async layTuVungHomNay(_req: Request, res: Response) {
    try {
      const data = await dailyWordService.layTuVungHomNay()
      if (!data) {
        return res.status(404).json({ success: false, message: 'Chưa có từ vựng phát hành hôm nay' })
      }
      res.json({ success: true, data })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Lỗi server' })
    }
  }

  async layChiTietTuVung(req: Request, res: Response) {
    try {
      const idHoacNgay = String(req.params.idHoacNgay || '')
      const data = await dailyWordService.layChiTietTuVung(idHoacNgay)
      if (!data) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy từ vựng' })
      }
      res.json({ success: true, data })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Lỗi server' })
    }
  }

  async taoTuVungThuCong(req: Request, res: Response) {
    try {
      const {
        tu_tieng_anh,
        phien_am_ipa,
        tu_loai,
        dinh_nghia_tieng_anh,
        dinh_nghia_tieng_viet,
        vi_du_tieng_anh,
        vi_du_tieng_viet,
        ngay_phat_hanh,
        gio_phat_hanh,
        am_thanh_us,
        am_thanh_uk,
      } = req.body

      if (!tu_tieng_anh || !ngay_phat_hanh) {
        return res.status(400).json({
          success: false,
          error: 'Vui lòng cung cấp ít nhất từ tiếng Anh và ngày phát hành',
        })
      }

      const data = await dailyWordService.taoTuVungThuCong({
        tu_tieng_anh,
        phien_am_ipa: phien_am_ipa || '',
        tu_loai: tu_loai || 'Word',
        dinh_nghia_tieng_anh: dinh_nghia_tieng_anh || '',
        dinh_nghia_tieng_viet: dinh_nghia_tieng_viet || '',
        vi_du_tieng_anh: vi_du_tieng_anh || '',
        vi_du_tieng_viet: vi_du_tieng_viet || '',
        ngay_phat_hanh,
        gio_phat_hanh,
        am_thanh_us,
        am_thanh_uk,
      })
      res.status(201).json({ success: true, data })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Lỗi server' })
    }
  }

  async doiNgayPhatHanh(req: Request, res: Response) {
    try {
      const id = String(req.params.id || '')
      const { ngay_moi } = req.body
      if (!ngay_moi) {
        return res.status(400).json({ success: false, error: 'Thiếu ngày mới cần chuyển' })
      }
      const data = await dailyWordService.doiNgayPhatHanh(id, ngay_moi)
      res.json({ success: true, data })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Lỗi server' })
    }
  }

  async xepLichHangLoat(req: Request, res: Response) {
    try {
      const { danh_sach_tu, kieu_thoi_gian, ngay_bat_dau, gio_phat_hanh, ten_tep_nguon } = req.body
      if (!Array.isArray(danh_sach_tu) || danh_sach_tu.length === 0 || !ngay_bat_dau) {
        return res.status(400).json({
          success: false,
          error: 'Thiếu danh sách từ hoặc ngày bắt đầu',
        })
      }
      const data = await dailyWordService.xepLichHangLoatTuFile({
        danh_sach_tu,
        kieu_thoi_gian: kieu_thoi_gian || 'tu_dong',
        ngay_bat_dau,
        gio_phat_hanh,
        ten_tep_nguon,
      })
      res.json({ success: true, data })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Lỗi server' })
    }
  }

  async danhGiaFlashcard(req: Request, res: Response) {
    try {
      const { hoc_vien_id, tu_vung_id, muc_do_ghi_nho } = req.body
      if (!hoc_vien_id || !tu_vung_id || !muc_do_ghi_nho) {
        return res.status(400).json({
          success: false,
          error: 'Thiếu học viên ID, từ vựng ID hoặc mức độ ghi nhớ (chua_thuoc, tam_thuoc, da_thuoc)',
        })
      }
      const data = await dailyWordService.danhGiaFlashcard(hoc_vien_id, tu_vung_id, muc_do_ghi_nho)
      res.json({ success: true, data })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Lỗi server' })
    }
  }

  async layHangDoiFlashcard(req: Request, res: Response) {
    try {
      const hocVienId = String(req.query.hoc_vien_id || req.params.hocVienId || '')
      if (!hocVienId) {
        return res.status(400).json({ success: false, error: 'Thiếu hoc_vien_id' })
      }
      const data = await dailyWordService.layHangDoiFlashcard(hocVienId)
      res.json({ success: true, data })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Lỗi server' })
    }
  }

  // Xóa từ vựng khỏi kho (kèm lịch đăng + hàng đợi ôn tập liên quan)
  async xoaTuVung(req: Request, res: Response) {
    try {
      const tuVungId = String(req.params.id || '').trim()
      if (!tuVungId) {
        return res.status(400).json({ success: false, error: 'Thiếu ID từ vựng' })
      }
      const deleted = await dailyWordService.xoaTuVung(tuVungId)
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy từ vựng' })
      }
      res.json({ success: true, message: 'Đã xóa từ vựng và lịch đăng liên quan' })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Lỗi server' })
    }
  }

  async phatAm(req: Request, res: Response) {
    try {
      const tuTiengAnh = String(req.params.tuTiengAnh || '').trim()
      const giong = req.query.giong === 'uk' ? 'uk' : 'us'
      if (!tuTiengAnh) {
        return res.status(400).json({ success: false, error: 'Thiếu từ tiếng Anh cần phát âm' })
      }

      const { buffer, contentType } = await dailyWordService.layAudioStream(tuTiengAnh, giong)
      res.setHeader('Content-Type', contentType)
      res.setHeader('Cache-Control', 'public, max-age=86400')
      res.send(buffer)
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Lỗi phát âm' })
    }
  }

  async donDepDuLieuCu(_req: Request, res: Response) {
    try {
      const data = await dailyWordService.donDepDuLieuCuHon2Thang()
      res.json({
        success: true,
        message: `Đã dọn dẹp ${data.so_lich_da_xoa} lịch đăng và ${data.so_tu_da_xoa} từ vựng trước ngày ${data.ngay_moc_cat}`,
        data,
      })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Lỗi khi dọn dẹp dữ liệu' })
    }
  }
}

export const dailyWordController = new DailyWordController()
