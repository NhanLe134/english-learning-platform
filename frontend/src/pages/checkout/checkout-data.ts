// import { FEATURED_COURSE } from '../courses/course-data'

export type PaymentMethod = 'vietqr' | 'card' | 'wallet'

export interface EnrollmentRecord {
  orderId: string
  courseId: string
  courseTitle: string
  amount: number
  status: 'simulated_paid'
  paymentMethod: PaymentMethod
  studentName: string
  studentEmail: string
  studentPhone: string
  createdAt: string
}

// export const COURSE_ID = FEATURED_COURSE.id
// export const COURSE_TITLE = FEATURED_COURSE.title
// export const PAYMENT_AMOUNT = FEATURED_COURSE.price
export const ENROLLMENT_STORAGE_KEY = 'your-english-voice-simulated-enrollment'

export function readEnrollmentRecord(): EnrollmentRecord | null {
  try {
    const stored = window.localStorage.getItem(ENROLLMENT_STORAGE_KEY)
    if (!stored) return null

    const record = JSON.parse(stored) as Partial<EnrollmentRecord>
    if (
      record.status !== 'simulated_paid' ||
      typeof record.orderId !== 'string' ||
      typeof record.courseTitle !== 'string' ||
      typeof record.amount !== 'number' ||
      typeof record.studentName !== 'string' ||
      typeof record.studentEmail !== 'string' ||
      typeof record.createdAt !== 'string'
    ) {
      return null
    }

    return record as EnrollmentRecord
  } catch {
    return null
  }
}
