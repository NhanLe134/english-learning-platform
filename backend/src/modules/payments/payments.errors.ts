export class PaymentWebhookError extends Error {
  constructor(
    message: string,
    readonly statusCode: 400 | 403 | 404 | 422,
  ) {
    super(message)
    this.name = 'PaymentWebhookError'
  }
}
