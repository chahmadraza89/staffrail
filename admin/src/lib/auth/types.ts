/**
 * Shared auth types for the StaffRail server.
 *
 * `AppAuthError.failure` coarse codes intentionally mirror the UI states in
 * the login page: server issues must never leak authorization details into
 * client-visible messages.
 */

export type AuthFailureReason =
  /** No session cookie present (visitor). */
  | "no_session"
  /** Cookie exists but is invalid, expired or revoked. */
  | "invalid_session"
  /** Account record exists but the email address is not verified. */
  | "email_not_verified"
  /** No users/{uid} profile document. */
  | "profile_missing"
  /** Profile exists but role is not permitted for the requested portal. */
  | "not_admin"
  /** Profile exists, but isActive !== true or deletedAt != null. */
  | "account_inactive"
  /** Profile store read failed. */
  | "profile_lookup_failed"
  /** Server session configuration is missing. */
  | "not_configured"
  /** Same-origin/CSRF validation failed. */
  | "csrf_rejected"
  /** Unexpected error. */
  | "unexpected"

export class AppAuthError extends Error {
  readonly failure: AuthFailureReason
  readonly statusCode: number

  constructor(failure: AuthFailureReason, statusCode?: number, message?: string) {
    super(message ?? failure)
    this.name = "AppAuthError"
    this.failure = failure
    this.statusCode = statusCode ?? statusCodeFor(failure)
  }
}

export function statusCodeFor(failure: AuthFailureReason): number {
  switch (failure) {
    case "no_session":
    case "invalid_session":
      return 401
    case "csrf_rejected":
      return 403
    case "email_not_verified":
    case "profile_missing":
    case "not_admin":
    case "account_inactive":
      return 403
    case "profile_lookup_failed":
    case "unexpected":
      return 500
    case "not_configured":
      return 503
  }
}

/** users/{uid} profile (subset the admin panel cares about). */
export interface AdminProfile {
  role: string
  isActive: boolean
  deletedAt?: unknown
  adminId?: string | null
  name?: string | null
  photoUrl?: string | null
}

/** Everything the UI needs after successful authorization. */
export interface AuthContext {
  uid: string
  email: string | null
  emailVerified: boolean
  profile: AdminProfile
}

/** A decoded session credential (mirrors the claims the guard relies on). */
export interface DecodedCredential {
  uid: string
  email?: string
  email_verified?: boolean
  auth_time?: number
  role?: string
}

/** Injectable session verification function. */
export type VerifySessionFn = (
  sessionCookie: string,
  checkRevoked: boolean,
) => Promise<DecodedCredential>

/** Injectable profile lookup. */
export type GetUserProfileFn = (uid: string) => Promise<AdminProfile | null>

export interface DataCodeError extends Error {
  code: string
}

export function isDataStoreError(error: unknown): error is DataCodeError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string" &&
    typeof (error as { message?: unknown }).message === "string"
  )
}
