export const PENDING_REGISTRATION_DRAFT_KEY = 'your-voice-pending-registration-draft'
export const GUEST_REGISTRATION_PROFILE_KEY = 'your-voice-guest-registration-profile'
export const PENDING_CHECKOUT_STUDENT_KEY = 'your-voice-pending-checkout-student'
export const TEMP_PASSWORD_TTL_MS = 30 * 60 * 1000
export const REGISTRATION_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000
export const NON_SENSITIVE_PROFILE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
export const GUEST_NAVIGATE_EVENT = 'your-voice:guest-navigate'

export interface PendingRegistrationDraft {
  fullName: string
  dateOfBirth: string
  email: string
  phoneNumber: string
  selectedCourseIds: string[]
  courseSearch: string
  otpPending: boolean
  otpSentAt: string | null
  otpExpiresAt: string | null
  savedAt: number
}

interface NonSensitiveRegistrationProfile {
  fullName: string
  dateOfBirth: string
  email: string
  phoneNumber: string
  savedAt: number
}

interface TemporaryRegistrationSecrets {
  password: string
  confirmPassword: string
  acceptedTerms: boolean
  savedAt: number
}

// Keep passwords strictly in ephemeral JS memory; never persist them to browser storage or URLs.
let temporaryRegistrationSecrets: TemporaryRegistrationSecrets | null = null

export function readTemporaryRegistrationSecrets(now = Date.now()): {
  password: string
  confirmPassword: string
  acceptedTerms: boolean
} {
  if (!temporaryRegistrationSecrets) {
    return { password: '', confirmPassword: '', acceptedTerms: false }
  }
  if (now - temporaryRegistrationSecrets.savedAt >= TEMP_PASSWORD_TTL_MS) {
    temporaryRegistrationSecrets = null
    return { password: '', confirmPassword: '', acceptedTerms: false }
  }
  return {
    password: temporaryRegistrationSecrets.password,
    confirmPassword: temporaryRegistrationSecrets.confirmPassword,
    acceptedTerms: temporaryRegistrationSecrets.acceptedTerms,
  }
}

export function hasTemporaryRegistrationSecretsExpired(now = Date.now()): boolean {
  return (
    temporaryRegistrationSecrets !== null &&
    now - temporaryRegistrationSecrets.savedAt >= TEMP_PASSWORD_TTL_MS
  )
}

export function saveTemporaryRegistrationSecrets(
  secrets: { password: string; confirmPassword: string; acceptedTerms: boolean },
  now = Date.now(),
): void {
  if (!secrets.password && !secrets.confirmPassword && !secrets.acceptedTerms) {
    temporaryRegistrationSecrets = null
    return
  }
  temporaryRegistrationSecrets = {
    password: secrets.password,
    confirmPassword: secrets.confirmPassword,
    acceptedTerms: secrets.acceptedTerms,
    savedAt: now,
  }
}

export function clearTemporaryRegistrationSecrets(): void {
  temporaryRegistrationSecrets = null
}

export function clearPendingCheckoutStudent(): void {
  try {
    sessionStorage.removeItem(PENDING_CHECKOUT_STUDENT_KEY)
  } catch {
    // Storage may be unavailable.
  }
}

export function readPendingRegistrationDraft(now = Date.now()): PendingRegistrationDraft | null {
  try {
    const raw = sessionStorage.getItem(PENDING_REGISTRATION_DRAFT_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PendingRegistrationDraft>
      const savedAt = typeof parsed.savedAt === 'number' && Number.isFinite(parsed.savedAt)
        ? parsed.savedAt
        : now
      const sessionExpired = now - savedAt >= REGISTRATION_SESSION_MAX_AGE_MS
      const baseDraft: PendingRegistrationDraft = {
        fullName: typeof parsed.fullName === 'string' ? parsed.fullName : '',
        dateOfBirth: typeof parsed.dateOfBirth === 'string' ? parsed.dateOfBirth : '',
        email: typeof parsed.email === 'string' ? parsed.email : '',
        phoneNumber: typeof parsed.phoneNumber === 'string' ? parsed.phoneNumber : '',
        selectedCourseIds: Array.isArray(parsed.selectedCourseIds)
          ? parsed.selectedCourseIds.filter((id): id is string => typeof id === 'string')
          : [],
        courseSearch: typeof parsed.courseSearch === 'string' ? parsed.courseSearch : '',
        otpPending: sessionExpired ? false : parsed.otpPending === true,
        otpSentAt: sessionExpired ? null : (typeof parsed.otpSentAt === 'string' ? parsed.otpSentAt : null),
        otpExpiresAt: sessionExpired ? null : (typeof parsed.otpExpiresAt === 'string' ? parsed.otpExpiresAt : null),
        savedAt,
      }
      if (sessionExpired) {
        clearTemporaryRegistrationSecrets()
        clearPendingCheckoutStudent()
        sessionStorage.setItem(PENDING_REGISTRATION_DRAFT_KEY, JSON.stringify(baseDraft))
      }
      return baseDraft
    }
  } catch {
    // Fall through to non-sensitive profile check.
  }

  try {
    const rawProfile = localStorage.getItem(GUEST_REGISTRATION_PROFILE_KEY)
    if (!rawProfile) return null
    const parsed = JSON.parse(rawProfile) as Partial<NonSensitiveRegistrationProfile>
    const savedAt = typeof parsed.savedAt === 'number' && Number.isFinite(parsed.savedAt)
      ? parsed.savedAt
      : 0
    if (!savedAt || now - savedAt >= NON_SENSITIVE_PROFILE_MAX_AGE_MS) {
      localStorage.removeItem(GUEST_REGISTRATION_PROFILE_KEY)
      return null
    }
    return {
      fullName: typeof parsed.fullName === 'string' ? parsed.fullName : '',
      dateOfBirth: typeof parsed.dateOfBirth === 'string' ? parsed.dateOfBirth : '',
      email: typeof parsed.email === 'string' ? parsed.email : '',
      phoneNumber: typeof parsed.phoneNumber === 'string' ? parsed.phoneNumber : '',
      selectedCourseIds: [],
      courseSearch: '',
      otpPending: false,
      otpSentAt: null,
      otpExpiresAt: null,
      savedAt,
    }
  } catch {
    return null
  }
}

export function savePendingRegistrationDraft(
  draft: Omit<PendingRegistrationDraft, 'savedAt'> & { savedAt?: number },
): void {
  const savedAt = typeof draft.savedAt === 'number' && Number.isFinite(draft.savedAt)
    ? draft.savedAt
    : Date.now()
  const sessionPayload: PendingRegistrationDraft = {
    fullName: draft.fullName,
    dateOfBirth: draft.dateOfBirth,
    email: draft.email,
    phoneNumber: draft.phoneNumber,
    selectedCourseIds: draft.selectedCourseIds,
    courseSearch: draft.courseSearch,
    otpPending: draft.otpPending,
    otpSentAt: draft.otpSentAt,
    otpExpiresAt: draft.otpExpiresAt,
    savedAt,
  }
  try {
    // Store only non-sensitive registration progress; never store passwords in browser storage.
    sessionStorage.setItem(PENDING_REGISTRATION_DRAFT_KEY, JSON.stringify(sessionPayload))
  } catch {
    // Storage may be unavailable; registration still works from form state and backend DB.
  }

  if (draft.fullName || draft.dateOfBirth || draft.email || draft.phoneNumber) {
    const profilePayload: NonSensitiveRegistrationProfile = {
      fullName: draft.fullName,
      dateOfBirth: draft.dateOfBirth,
      email: draft.email,
      phoneNumber: draft.phoneNumber,
      savedAt,
    }
    try {
      localStorage.setItem(GUEST_REGISTRATION_PROFILE_KEY, JSON.stringify(profilePayload))
    } catch {
      // Storage may be unavailable.
    }
  }
}

export function isGuestRegistrationFlowPath(pathname: string): boolean {
  return (
    pathname === '/register' ||
    pathname === '/checkout' ||
    pathname === '/thanh-toan' ||
    pathname === '/course' ||
    /^\/courses\/[^/]+$/.test(pathname)
  )
}

export function navigateGuestFlow(url: string): void {
  if (typeof window === 'undefined') return
  try {
    const target = new URL(url, window.location.origin)
    if (target.origin === window.location.origin && isGuestRegistrationFlowPath(target.pathname)) {
      window.history.pushState(null, '', `${target.pathname}${target.search}${target.hash}`)
      window.scrollTo(0, 0)
      window.dispatchEvent(new Event(GUEST_NAVIGATE_EVENT))
      return
    }
  } catch {
    // Fall back to standard browser navigation for malformed URLs.
  }
  window.location.assign(url)
}
