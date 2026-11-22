const configuredSupportPhone = import.meta.env.VITE_SUPPORT_PHONE?.trim() ?? ''

export const paymentSupportPhone = configuredSupportPhone
export const paymentPollingIntervalMs = 3_000
export const paymentConfirmationTimeoutMs = (() => {
  const configured = Number(import.meta.env.VITE_PAYMENT_CONFIRMATION_TIMEOUT_MS)
  return Number.isFinite(configured) && configured > 0 ? configured : 120_000
})()

export type PaymentInstructions = NonNullable<import('./sepayApi').CreateOrderResponse['paymentInformation']>

const paymentInstructionsKey = (orderId: string) => `sepay-payment-instructions:${orderId}`

export function savePaymentInstructions(orderId: string, instructions: PaymentInstructions | null): void {
  if (!instructions || typeof window === 'undefined') return
  try {
    // Store only bank transfer instructions; never persist customer data or checkout fields.
    window.sessionStorage.setItem(paymentInstructionsKey(orderId), JSON.stringify({ orderId, instructions }))
  } catch {
    // The result page still works from the live order response when storage is unavailable.
  }
}

export function readPaymentInstructions(orderId: string): PaymentInstructions | null {
  if (!orderId || typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(paymentInstructionsKey(orderId))
    if (!raw) return null
    const cache = JSON.parse(raw) as { orderId?: unknown; instructions?: Partial<PaymentInstructions> }
    const value = cache.instructions
    const expiresAt = typeof value?.expiresAt === 'string' ? Date.parse(value.expiresAt) : Number.NaN
    const qrUrl = typeof value?.qrCodeUrl === 'string' ? new URL(value.qrCodeUrl) : null
    const valid = cache.orderId === orderId &&
      typeof value?.bankName === 'string' && value.bankName.length > 0 &&
      typeof value.accountNumber === 'string' && value.accountNumber.length > 0 &&
      typeof value.accountName === 'string' &&
      qrUrl?.protocol === 'https:' &&
      typeof value.amount === 'number' && Number.isFinite(value.amount) && value.amount > 0 &&
      typeof value.transferContent === 'string' && value.transferContent.length > 0 &&
      Number.isFinite(expiresAt) && expiresAt > Date.now()
    if (valid) return value as PaymentInstructions
    window.sessionStorage.removeItem(paymentInstructionsKey(orderId))
    return null
  } catch {
    try {
      window.sessionStorage.removeItem(paymentInstructionsKey(orderId))
    } catch {
      // Storage may be disabled; treat the cache as unavailable.
    }
    return null
  }
}
