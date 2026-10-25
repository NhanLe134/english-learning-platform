import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { env } from '../../config/env.js'

const ISSUER = 'english-learning-platform-api'
const AUDIENCE = 'english-learning-platform-client'
const ACCESS_TOKEN_LIFETIME_SECONDS = 30 * 60
export const REFRESH_TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000
export const RESET_TOKEN_LIFETIME_MS = 10 * 60 * 1000

export interface AccessTokenClaims {
  sub: string
  sid: string
  iat: number
  exp: number
  iss: string
  aud: string
}

function signingSecret(): string {
  if (Buffer.byteLength(env.authJwtSecret, 'utf8') < 32) {
    throw new Error('AUTH_JWT_SECRET must contain at least 32 bytes')
  }
  return env.authJwtSecret
}

function encode(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url')
}

function sign(value: string): Buffer {
  return createHmac('sha256', signingSecret()).update(value).digest()
}

function safeEqual(left: Buffer, right: Buffer): boolean {
  return left.length === right.length && timingSafeEqual(left, right)
}

function isCanonicalBase64Url(value: string): boolean {
  return Buffer.from(value, 'base64url').toString('base64url') === value
}

export function createAccessToken(userId: string, sessionId: string, now = Date.now()): string {
  const issuedAt = Math.floor(now / 1000)
  const header = encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = encode(
    JSON.stringify({
      sub: userId,
      sid: sessionId,
      iat: issuedAt,
      exp: issuedAt + ACCESS_TOKEN_LIFETIME_SECONDS,
      iss: ISSUER,
      aud: AUDIENCE,
    } satisfies AccessTokenClaims)
  )
  const unsignedToken = `${header}.${payload}`
  return `${unsignedToken}.${sign(unsignedToken).toString('base64url')}`
}

export function verifyAccessToken(token: string, now = Date.now()): AccessTokenClaims | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  try {
    const encodedHeader = parts[0]
    const encodedPayload = parts[1]
    const encodedSignature = parts[2]
    if (!encodedHeader || !encodedPayload || !encodedSignature) return null
    if (
      !isCanonicalBase64Url(encodedHeader) ||
      !isCanonicalBase64Url(encodedPayload) ||
      !isCanonicalBase64Url(encodedSignature)
    ) {
      return null
    }
    const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8')) as {
      alg?: unknown
      typ?: unknown
    }
    if (header.alg !== 'HS256' || header.typ !== 'JWT') return null

    const unsignedToken = `${encodedHeader}.${encodedPayload}`
    const actualSignature = Buffer.from(encodedSignature, 'base64url')
    if (!safeEqual(actualSignature, sign(unsignedToken))) return null

    const claims = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as Partial<AccessTokenClaims>
    if (
      typeof claims.sub !== 'string' ||
      typeof claims.sid !== 'string' ||
      typeof claims.iat !== 'number' ||
      typeof claims.exp !== 'number' ||
      claims.iss !== ISSUER ||
      claims.aud !== AUDIENCE ||
      claims.exp <= Math.floor(now / 1000) ||
      claims.iat > Math.floor(now / 1000) + 60
    ) {
      return null
    }

    return claims as AccessTokenClaims
  } catch {
    return null
  }
}

export function createRefreshToken(sessionId: string, now = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + REFRESH_TOKEN_LIFETIME_MS / 1000
  const secret = randomBytes(32).toString('base64url')
  const payload = `${sessionId}.${expiresAt}.${secret}`
  const signature = sign(`refresh:${payload}`).toString('base64url')
  return `${payload}.${signature}`
}

export function verifyRefreshToken(
  token: string,
  now = Date.now()
): { sessionId: string; exp: number } | null {
  const parts = token.split('.')
  if (parts.length !== 4) return null

  const sessionId = parts[0]
  const encodedExpiration = parts[1]
  const randomPart = parts[2]
  const encodedSignature = parts[3]
  if (
    !sessionId ||
    !encodedExpiration ||
    !randomPart ||
    !encodedSignature ||
    !/^[0-9a-f-]{36}$/i.test(sessionId) ||
    !/^(0|[1-9]\d*)$/.test(encodedExpiration)
  ) {
    return null
  }
  if (!/^[A-Za-z0-9_-]{43}$/.test(randomPart)) return null

  try {
    if (!isCanonicalBase64Url(encodedSignature)) return null
    const expiresAt = Number(encodedExpiration)
    if (!Number.isSafeInteger(expiresAt)) return null

    const payload = `${sessionId}.${encodedExpiration}.${randomPart}`
    const expectedSignature = sign(`refresh:${payload}`)
    const actualSignature = Buffer.from(encodedSignature, 'base64url')
    if (
      !safeEqual(actualSignature, expectedSignature) ||
      expiresAt <= Math.floor(now / 1000)
    ) {
      return null
    }
    return { sessionId, exp: expiresAt }
  } catch {
    return null
  }
}

export function createResetToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return createHmac('sha256', signingSecret()).update(`token:${token}`).digest('hex')
}
