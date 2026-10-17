import { env } from './env.js'

export const paymentConfig = {
  sepayApiKey: env.sepayApiKey,
  payos: {
    clientId: env.payosClientId,
    apiKey: env.payosApiKey,
    checksumKey: env.payosChecksumKey,
  },
} as const
