export class CorsOriginError extends Error {
  constructor() {
    super('Not allowed by CORS')
    this.name = 'CorsOriginError'
  }
}
