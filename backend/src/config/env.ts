import 'dotenv/config'

const port = Number(process.env.PORT ?? 5000)

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535')
}

export const env = {
  port,
  nodeEnv: process.env.NODE_ENV ?? 'development',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
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
