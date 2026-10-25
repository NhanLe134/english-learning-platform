export class AuthError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    cause?: unknown
  ) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'AuthError'
  }
}
