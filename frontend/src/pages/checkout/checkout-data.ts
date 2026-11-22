// checkout-data.ts
// Shared types and constants for the checkout flow.
// This module provides the type definitions and a storage key used by CheckoutPage.

/**
 * Local storage key where the simulated enrollment record is persisted.
 * The CheckoutPage writes the enrollment object after a successful simulated payment
 * and the CheckoutSuccessPage (or other components) can read it if needed.
 */
export const ENROLLMENT_STORAGE_KEY = 'checkout_enrollment'

/**
 * Supported payment methods for the checkout UI.
 * Matches the string literals used in the UI component state.
 */
export type PaymentMethod = 'vietqr' | 'bank' | 'card' | 'wallet'

/**
 * Shape of the enrollment record stored after a checkout.
 * It mirrors the fields created in CheckoutPage.handlePayment.
 */
export interface EnrollmentRecord {
  /** Unique order identifier returned from the payment provider (or simulated). */
  orderId: string
  /** Identifier of the purchased course. */
  courseId: string
  /** Human‑readable title of the course. */
  courseTitle: string
  /** Amount charged for the course, in the platform's currency unit. */
  amount: number
  /** Status of the enrollment – e.g. 'simulated_paid' for the mock flow. */
  status: string
  /** Payment method used for this order. */
  paymentMethod: PaymentMethod
  /** Student name supplied during checkout. */
  studentName: string
  /** Student email address. */
  studentEmail: string
  /** Student phone number. */
  studentPhone: string
  /** ISO timestamp when the enrollment record was created. */
  createdAt: string
}
