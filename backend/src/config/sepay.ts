import { SePayPgClient } from 'sepay-pg-node'
import { env } from './env.js'

let sepayClient: SePayPgClient | null = null

export function getSePayClient(): SePayPgClient {
  if (!['sandbox', 'production'].includes(env.sepayEnv)) {
    throw new Error('SEPAY_ENV must be either sandbox or production')
  }
  if (!env.sepayMerchantId || !env.sepaySecretKey) {
    throw new Error('SEPAY_MERCHANT_ID and SEPAY_SECRET_KEY are required for SePay integration')
  }

  if (!sepayClient) {
    sepayClient = new SePayPgClient({
      env: env.sepayEnv,
      merchant_id: env.sepayMerchantId,
      secret_key: env.sepaySecretKey,
      api_version: 'v1',
      checkout_version: 'v1',
    })
  }

  return sepayClient
}

export interface SePayWebhookPayload {
  type?: string
  amountIn?: number | string
  amountOut?: number | string
  content?: string
  reference?: string
  transactionId?: string
  transaction_id?: string
  accountNumber?: string
  bankCode?: string
  description?: string
  [key: string]: unknown
}

export function buildSePayVietQrImageUrl(input: {
  bankCode: string
  accountNumber: string
  amount: number
  transferContent: string
  accountName: string
}): string {
  const url = new URL('https://vietqr.app/img')
  url.searchParams.set('acc', input.accountNumber)
  url.searchParams.set('bank', input.bankCode)
  url.searchParams.set('amount', String(input.amount))
  url.searchParams.set('des', input.transferContent)
  url.searchParams.set('template', 'compact')
  url.searchParams.set('showinfo', 'true')
  url.searchParams.set('fullacc', 'true')
  url.searchParams.set('holder', input.accountName)
  url.searchParams.set('store', 'Your Voice English')
  return url.toString()
}

/**
 * Extract the order id from a SePay transfer content string.
 * Expected format: DH{order_id} (e.g. DH550e8400-e29b-41d4-a716-446655440000)
 */
export function extractOrderIdFromContent(content: string): string | null {
  if (!content || typeof content !== 'string') return null

  const trimmed = content.trim()

  // Match DH prefix followed by a UUID (order id)
  const uuidMatch = trimmed.match(/^DH([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/i)
  if (uuidMatch?.[1]) return uuidMatch[1]

  // Fallback: match DH + any non-space token
  const tokenMatch = trimmed.match(/^DH(\S+)$/i)
  if (tokenMatch?.[1]) return tokenMatch[1]

  return null
}

export { sepayClient }
