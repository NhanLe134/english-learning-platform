import { config } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') })

const port = Number(process.env.PORT ?? 5000)
const nodeEnv = process.env.NODE_ENV ?? 'development'
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'
const apiOrigin = process.env.API_ORIGIN ?? `http://localhost:${port}`
const authJwtSecret = process.env.AUTH_JWT_SECRET ?? ''

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
  authExposeResetLink: process.env.AUTH_EXPOSE_RESET_LINK === 'true' && nodeEnv === 'development',
  databaseUrl: process.env.DATABASE_URL ?? process.env.DB_URL ?? '',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  emailFrom: process.env.EMAIL_FROM ?? '',
  sepayApiKey: process.env.SEPAY_API_KEY ?? '',
  payosClientId: process.env.PAYOS_CLIENT_ID ?? '',
  payosApiKey: process.env.PAYOS_API_KEY ?? '',
  payosChecksumKey: process.env.PAYOS_CHECKSUM_KEY ?? '',
} as const
