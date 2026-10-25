export type RegistrationOperation =
  | 'supabase_auth_create_user'
  | 'profile_upsert'
  | 'role_upsert'
  | 'auth_session_insert'
  | 'registration_cleanup'

function redactSensitiveText(message: string, sensitiveValues: readonly string[]): string {
  const redacted = sensitiveValues
    .filter((value) => value.length > 0)
    .reduce((text, value) => text.split(value).join('[redacted]'), message)

  return redacted
    .replace(/https?:\/\/\S+/gi, '[redacted-url]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]')
    .replace(/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted-token]')
    .replace(
      /\b(password|passwd|secret|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|authorization)\b\s*[:=]\s*[^,\s;]+/gi,
      '$1=[redacted]'
    )
    .replace(/\b[A-Za-z0-9_-]{40,}\b/g, '[redacted-value]')
    .replace(/[\r\n\t]+/g, ' ')
    .slice(0, 500)
}

function errorDetails(error: unknown, sensitiveValues: readonly string[]): {
  code?: string
  status?: number
  message: string
} {
  const candidate = error && typeof error === 'object'
    ? error as Record<string, unknown>
    : {}
  const code = typeof candidate.code === 'string' &&
      /^[A-Za-z0-9_.-]{1,32}$/.test(candidate.code)
    ? candidate.code
    : undefined
  const statusValue = candidate.status ?? candidate.statusCode
  const status = typeof statusValue === 'number' &&
      Number.isInteger(statusValue) &&
      statusValue >= 100 &&
      statusValue <= 599
    ? statusValue
    : undefined
  const message = typeof candidate.message === 'string'
    ? redactSensitiveText(candidate.message, sensitiveValues)
    : 'Unclassified operation error'

  return {
    ...(code ? { code } : {}),
    ...(status ? { status } : {}),
    message,
  }
}

export function sanitizeRegistrationDiagnosticMessage(
  message: string,
  sensitiveValues: readonly string[] = []
): string {
  return redactSensitiveText(message, sensitiveValues)
}

export function logRegistrationFailure(
  operation: RegistrationOperation,
  error: unknown,
  sensitiveValues: readonly string[] = []
): void {
  console.error('[Registration diagnostic]', {
    operation,
    error: errorDetails(error, sensitiveValues),
  })
}
