export class AuthError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    cause?: unknown,
    readonly errorCode?: string
  ) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'AuthError'
  }
}
