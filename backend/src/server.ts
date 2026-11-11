import cors from 'cors'
import { app } from './app.js'
import { env } from './config/env.js'
import { paymentConfirmationEmailService } from './modules/payments/payment-confirmation-email.service.js'

// Danh sách các domain cụ thể được phép gọi API
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://english-learning-platform-smoky-five.vercel.app', // <-- Thay link Vercel thực tế của bạn vào đây
]

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép request không có origin (Postman, curl,...) hoặc nằm trong danh sách allowedOrigins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
  })
)

app.listen(env.port, () => {
  console.log(`API server listening on port ${env.port}`)
  void paymentConfirmationEmailService.processDueJobs()
  const paymentEmailRetryTimer = setInterval(() => {
    void paymentConfirmationEmailService.processDueJobs()
  }, 60_000)
  paymentEmailRetryTimer.unref()
})