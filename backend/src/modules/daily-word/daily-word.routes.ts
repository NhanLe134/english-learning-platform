import { Router } from 'express'
import { dailyWordController } from './daily-word.controller.js'

export const dailyWordRouter = Router()

// Lấy lịch phát hành theo tháng (cho giao diện Calendar)
dailyWordRouter.get('/calendar', (req, res) => dailyWordController.layLichThang(req, res))

// Dọn dẹp dữ liệu cũ hơn 2 tháng để làm nhẹ database
dailyWordRouter.post('/don-dep', (req, res) => dailyWordController.donDepDuLieuCu(req, res))

// Stream phát âm audio giọng bản xứ (US / UK)
dailyWordRouter.get('/phat-am/:tuTiengAnh', (req, res) => dailyWordController.phatAm(req, res))

// Lấy từ vựng Daily Word phát hành ngày hôm nay (cho Widget popup học viên)
dailyWordRouter.get('/today', (req, res) => dailyWordController.layTuVungHomNay(req, res))

// Lấy chi tiết 1 từ vựng theo ID hoặc ngày (YYYY-MM-DD)
dailyWordRouter.get('/:idHoacNgay', (req, res) => dailyWordController.layChiTietTuVung(req, res))

// Thêm từ thủ công và xếp ngày
dailyWordRouter.post('/', (req, res) => dailyWordController.taoTuVungThuCong(req, res))

// Đổi ngày phát hành
dailyWordRouter.patch('/:id/reschedule', (req, res) => dailyWordController.doiNgayPhatHanh(req, res))

// Xác nhận và đồng bộ xếp lịch hàng loạt từ tệp
dailyWordRouter.post('/bulk-schedule', (req, res) => dailyWordController.xepLichHangLoat(req, res))

// =======================================================
// FLASHCARD REVIEW (HỌC VIÊN)
// =======================================================
// Đánh giá flashcard: chua_thuoc (vị trí 3), tam_thuoc (vị trí 7), da_thuoc (xong)
dailyWordRouter.post('/flashcard/danh-gia', (req, res) => dailyWordController.danhGiaFlashcard(req, res))

// Lấy hàng đợi ôn tập flashcard của học viên
dailyWordRouter.get('/flashcard/hang-doi', (req, res) => dailyWordController.layHangDoiFlashcard(req, res))
