import { Resend } from 'resend'
import { env } from './env.js'

export function createResendClient() {
  if (!env.resendApiKey) {
    throw new Error('RESEND_API_KEY is required')
  }

  return new Resend(env.resendApiKey)
}
