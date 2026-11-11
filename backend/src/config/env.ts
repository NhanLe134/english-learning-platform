import { config } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') })

const port = Number(process.env.PORT ?? 5000)
const nodeEnv = process.env.NODE_ENV ?? 'development'
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'
const apiOrigin = process.env.API_ORIGIN ?? `http://localhost:${port}`
const authJwtSecret = process.env.AUTH_JWT_SECRET ?? ''
const sepayEnv = process.env.SEPAY_ENV ?? 'sandbox'
const sepayMerchantId = process.env.SEPAY_MERCHANT_ID ?? ''
const sepaySecretKey = process.env.SEPAY_SECRET_KEY ?? ''
const sepayIpnSecretKey = process.env.SEPAY_IPN_SECRET_KEY ?? ''
const sepayCheckoutMode = process.env.SEPAY_CHECKOUT_MODE ?? 'hosted'
const sepayBankWebhookSecret = process.env.SEPAY_BANK_WEBHOOK_SECRET ?? ''
const sepayBankCode = process.env.SEPAY_BANK_CODE ?? ''
const sepayBankName = process.env.SEPAY_BANK_NAME ?? ''
const sepayAccountNumber = process.env.SEPAY_ACCOUNT_NUMBER ?? ''
const sepayAccountName = process.env.SEPAY_ACCOUNT_NAME ?? ''

if (!['sandbox', 'production'].includes(sepayEnv)) {
  throw new Error('SEPAY_ENV must be either sandbox or production')
}
if (!['hosted', 'direct_qr'].includes(sepayCheckoutMode)) {
  throw new Error('SEPAY_CHECKOUT_MODE must be either hosted or direct_qr')
}
if (sepayCheckoutMode === 'direct_qr' &&
  (!sepayBankWebhookSecret || !sepayBankCode || !sepayBankName || !sepayAccountNumber || !sepayAccountName)) {
  throw new Error('SEPAY_CHECKOUT_MODE=direct_qr requires SEPAY_BANK_WEBHOOK_SECRET, SEPAY_BANK_CODE, SEPAY_BANK_NAME, SEPAY_ACCOUNT_NUMBER, and SEPAY_ACCOUNT_NAME')
}
if (nodeEnv === 'production' && sepayEnv === 'production' && (!sepayMerchantId || !sepaySecretKey || !sepayIpnSecretKey)) {
  throw new Error('Production SePay requires SEPAY_MERCHANT_ID, SEPAY_SECRET_KEY, and SEPAY_IPN_SECRET_KEY')
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535')
}

function positiveInteger(name: string, defaultValue: number): number {
  const value = Number(process.env[name] ?? defaultValue)
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`)
  }
  return value
}

for (const [name, value] of [
  ['FRONTEND_URL', frontendUrl],
  ['API_ORIGIN', apiOrigin],
] as const) {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${name} must be a valid HTTP(S) URL`)
  }
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    (nodeEnv === 'production' && url.protocol !== 'https:')
  ) {
    throw new Error(`${name} must use HTTPS in production and must not include credentials`)
  }
}

if (nodeEnv === 'production' && Buffer.byteLength(authJwtSecret, 'utf8') < 32) {
  throw new Error('AUTH_JWT_SECRET must contain at least 32 bytes in production')
}

export const env = {
  port,
  nodeEnv,
  frontendUrl,
  apiOrigin,
  authJwtSecret,
  authLoginRateLimit: positiveInteger('AUTH_LOGIN_RATE_LIMIT', 10),
  authResetRateLimit: positiveInteger('AUTH_RESET_RATE_LIMIT', 5),
  authRateLimitWindowMs: positiveInteger('AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
  authExposeRegistrationOtp:
    process.env.AUTH_EXPOSE_REGISTRATION_OTP === 'true' && nodeEnv === 'development',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  databaseUrl: process.env.DATABASE_URL ?? process.env.DB_URL ?? '',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabasePublicKey:
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  emailFrom: process.env.EMAIL_FROM ?? '',
  sepayApiKey: process.env.SEPAY_API_KEY ?? '',
  sepayMerchantId,
  sepaySecretKey,
  sepayIpnSecretKey,
  sepayCheckoutMode: sepayCheckoutMode as 'hosted' | 'direct_qr',
  sepayBankWebhookSecret,
  sepayEnv: sepayEnv as 'sandbox' | 'production',
  sepayBankCode,
  sepayBankName,
  sepayAccountNumber,
  sepayAccountName,
  payosClientId: process.env.PAYOS_CLIENT_ID ?? '',
  payosApiKey: process.env.PAYOS_API_KEY ?? '',
  payosChecksumKey: process.env.PAYOS_CHECKSUM_KEY ?? '',
} as const
