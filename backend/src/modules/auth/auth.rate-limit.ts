import type { RequestHandler } from 'express'
import { env } from '../../config/env.js'

interface RateWindow {
  count: number
  expiresAt: number
}

const windows = new Map<string, RateWindow>()

export function authRateLimit(maxAttempts: number): RequestHandler {
  return (request, response, next) => {
    const now = Date.now()
    const key = `${request.ip || 'unknown'}:${request.path}`
    const current = windows.get(key)
    const window = !current || current.expiresAt <= now
      ? { count: 0, expiresAt: now + env.authRateLimitWindowMs }
      : current

    window.count += 1
    windows.set(key, window)

    if (windows.size > 10000) {
      for (const [entryKey, entry] of windows) {
        if (entry.expiresAt <= now) windows.delete(entryKey)
      }
    }

    if (window.count > maxAttempts) {
      response.status(429).json({ message: 'Too many requests. Please try again later.' })
      return
    }

    next()
  }
}
