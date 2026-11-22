import type { RequestHandler } from 'express'
import { env } from '../../config/env.js'

interface RateWindow {
  count: number
  expiresAt: number
}

const windows = new Map<string, RateWindow>()

export interface AuthRateLimitOptions {
  countAllRequests?: boolean
}

export function authRateLimit(
  maxAttempts: number,
  options: AuthRateLimitOptions = {},
): RequestHandler {
  return (request, response, next) => {
    // Môi trường development bỏ qua giới hạn: cả đội cùng dùng một IP localhost
    // và thử mật khẩu liên tục khi test sẽ tự khóa lẫn nhau vô ích.
    // Production (và test) vẫn áp dụng đầy đủ để chống dò mật khẩu và spam OTP/reset.
    if (env.nodeEnv === 'development') {
      next()
      return
    }

    const now = Date.now()
    const key = `${request.ip || 'unknown'}:${request.path}`
    const current = windows.get(key)
    const window = !current || current.expiresAt <= now
      ? { count: 0, expiresAt: now + env.authRateLimitWindowMs }
      : current

    if (window.count >= maxAttempts) {
      response.status(429).json({ message: 'Too many requests. Please try again later.' })
      return
    }

    if (options.countAllRequests) {
      window.count += 1
      windows.set(key, window)
      if (windows.size > 10000) {
        for (const [entryKey, entry] of windows) {
          if (entry.expiresAt <= now) windows.delete(entryKey)
        }
      }
      next()
      return
    }

    // Chỉ đếm các lần thử THẤT BẠI (HTTP >= 400): đăng nhập thành công không tốn hạn mức
    // và xóa sạch bộ đếm để người dùng bắt đầu lại từ đầu.
    response.on('finish', () => {
      if (response.statusCode < 400) {
        if (windows.get(key) === window) windows.delete(key)
        return
      }
      window.count += 1
      windows.set(key, window)

      if (windows.size > 10000) {
        for (const [entryKey, entry] of windows) {
          if (entry.expiresAt <= now) windows.delete(entryKey)
        }
      }
    })

    next()
  }
}
