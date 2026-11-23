import type { AuthUser } from '../auth/auth-api'
import { getRoleHomePath } from '../auth/auth-context'

const RETURN_STORAGE_PREFIX = 'sepay-payment-return:'

const DISALLOWED_EXACT_OR_PREFIX_PATHS = [
  '/checkout',
  '/thanh-toan',
  '/payment-success',
  '/login',
  '/register',
  '/forgot-password',
  '/auth/callback',
  '/teacher/login',
  '/teacher/activate',
  '/teacher/reset-password',
  '/teacher/forgot-password',
]

const STUDENT_ALLOWED_PREFIXES = [
  '/my-courses',
  '/student',
  '/khoa-hoc-cua-toi',
  '/course',
  '/courses',
  '/ebooks',
  '/ebook',
  '/sach-dien-tu',
  '/workshops',
  '/workshop',
]

const GUEST_ALLOWED_EXACT_PATHS = ['/']

const GUEST_ALLOWED_PREFIXES = [
  '/home',
  '/course',
  '/courses',
  '/about',
  '/ve-chung-toi',
  '/ebooks',
  '/ebook',
  '/sach-dien-tu',
  '/workshops',
  '/workshop',
  '/contact',
  '/lien-he',
]

function matchesPathOrSubpath(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function isAllowedForRole(
  pathname: string,
  userRole: AuthUser['role'] | null | undefined,
): boolean {
  if (DISALLOWED_EXACT_OR_PREFIX_PATHS.some((prefix) => matchesPathOrSubpath(pathname, prefix))) {
    return false
  }

  switch (userRole) {
    case 'ADMIN':
      return matchesPathOrSubpath(pathname, '/admin')
    case 'TEACHER':
      return matchesPathOrSubpath(pathname, '/teacher')
    case 'STUDENT':
      return STUDENT_ALLOWED_PREFIXES.some((prefix) => matchesPathOrSubpath(pathname, prefix))
    default:
      return (
        GUEST_ALLOWED_EXACT_PATHS.includes(pathname) ||
        GUEST_ALLOWED_PREFIXES.some((prefix) => matchesPathOrSubpath(pathname, prefix))
      )
  }
}

function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i)
    if (code <= 0x1f || code === 0x7f) return true
  }
  return false
}

function isSafeRelativePath(path: string | null | undefined): path is string {
  if (typeof path !== 'string') return false
  const trimmed = path.trim()
  return (
    trimmed.length > 0 &&
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.includes('\\') &&
    !hasControlCharacter(trimmed)
  )
}

export function validatePaymentReturnPath(
  rawPath: string | null | undefined,
  userRole: AuthUser['role'] | null | undefined,
): string | null {
  if (!isSafeRelativePath(rawPath)) return null
  const trimmed = rawPath.trim()

  let parsed: URL
  try {
    parsed = new URL(trimmed, 'https://placeholder.local')
  } catch {
    return null
  }

  if (parsed.origin !== 'https://placeholder.local') {
    return null
  }

  const normalizedPathname = parsed.pathname.toLowerCase()
  if (!isAllowedForRole(normalizedPathname, userRole)) {
    return null
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`
}

export function savePaymentReturnPath(
  storageKey: string,
  returnPath: string | null | undefined,
): void {
  if (!storageKey || !isSafeRelativePath(returnPath) || typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(`${RETURN_STORAGE_PREFIX}${storageKey}`, returnPath.trim())
  } catch {
    // Session storage is optional; role fallback remains safe.
  }
}

export function readPaymentReturnPath(storageKey: string): string | null {
  if (!storageKey || typeof window === 'undefined') return null
  try {
    return window.sessionStorage.getItem(`${RETURN_STORAGE_PREFIX}${storageKey}`)
  } catch {
    return null
  }
}

export function resolvePaymentBackHref(options: {
  search: string
  storageKey?: string
  fallbackPath?: string | null
  userRole: AuthUser['role'] | null | undefined
}): string {
  const queryReturnTo = new URLSearchParams(options.search).get('returnTo')
  const validatedQuery = validatePaymentReturnPath(queryReturnTo, options.userRole)
  if (validatedQuery) return validatedQuery

  if (options.storageKey) {
    const storedReturnTo = readPaymentReturnPath(options.storageKey)
    const validatedStored = validatePaymentReturnPath(storedReturnTo, options.userRole)
    if (validatedStored) return validatedStored
  }

  const validatedFallback = validatePaymentReturnPath(options.fallbackPath, options.userRole)
  if (validatedFallback) return validatedFallback

  return getRoleHomePath(options.userRole)
}

export function buildPaymentPageUrl(orderId: string, returnTo?: string | null): string {
  const params = new URLSearchParams({ orderId })
  if (isSafeRelativePath(returnTo)) {
    params.set('returnTo', returnTo.trim())
  }
  return `/checkout/payment?${params.toString()}`
}

export function buildCheckoutPageUrl(
  courseId: string,
  slug?: string,
  returnTo?: string | null,
): string {
  const params = new URLSearchParams({ courseId })
  if (slug && slug.trim()) {
    params.set('slug', slug.trim())
  }
  if (isSafeRelativePath(returnTo)) {
    params.set('returnTo', returnTo.trim())
  }
  return `/checkout?${params.toString()}`
}
