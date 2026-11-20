import { app } from './app.js'
import { env } from './config/env.js'
import { paymentConfirmationEmailService } from './modules/payments/payment-confirmation-email.service.js'
import { khoiDongTienTrinhDonDepTuDong } from './modules/daily-word/daily-word.service.js'

app.listen(env.port, () => {
  console.log(`API server listening on port ${env.port}`)
  void paymentConfirmationEmailService.processDueJobs()
  const paymentEmailRetryTimer = setInterval(() => {
    void paymentConfirmationEmailService.processDueJobs()
  }, 60_000)
  paymentEmailRetryTimer.unref()

  // Tự động kích hoạt dọn dẹp dữ liệu Daily Word cũ hơn 2 tháng định kỳ
  khoiDongTienTrinhDonDepTuDong()
})