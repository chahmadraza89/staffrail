import "server-only"

import { createHmac, randomBytes, timingSafeEqual } from "crypto"

/**
 * Server-side CSRF (double-submit cookie with an HMAC-signed token).
 *
 * GET /api/auth/csrf returns the raw token and sets `staffrail_csrf`
 * (readable by our JS). The client must echo the same token in the
 * `x-staffrail-csrf` header on POST/DELETE. The cookie value carries an
 * HMAC signature so an attacker-controlled value cannot be substituted.
 */

const SECRET_BYTES = 32

export class CsrfSecretError extends Error {
  constructor(message: string) {
    super(`CSRF secret is not available: ${message}`)
    this.name = "CsrfSecretError"
  }
}

function randomHex(bytes: number): string {
  return randomBytes(bytes).toString("hex")
}

function hmac(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token).digest("hex")
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"))
  } catch {
    return false
  }
}

/**
 * Secret resolution order:
 *  1. STAFFRAIL_CSRF_SECRET (explicit, stable across serverless instances)
 *  2. STAFFRAIL_SESSION_SECRET / SESSION_SECRET (if >= 32 chars)
 *  3. Ephemeral process-wide secret (zero-config local/demo default)
 *
 * Set STAFFRAIL_REQUIRE_EXPLICIT_SECRET=true in hardened production to
 * require (1) or (2) explicitly.
 */
export function getCsrfSecret(): string {
  const explicit = process.env.STAFFRAIL_CSRF_SECRET
  const requireExplicit = process.env.STAFFRAIL_REQUIRE_EXPLICIT_SECRET === "true"

  if (typeof explicit === "string" && explicit.trim().length >= 32) {
    return explicit.trim()
  }

  const sessionSecret = process.env.STAFFRAIL_SESSION_SECRET ?? process.env.SESSION_SECRET
  if (typeof sessionSecret === "string" && sessionSecret.trim().length >= 32) {
    return createHmac("sha256", sessionSecret.trim()).update("staffrail:csrf").digest("hex")
  }

  if (requireExplicit) {
    throw new CsrfSecretError(
      "set STAFFRAIL_CSRF_SECRET (or STAFFRAIL_SESSION_SECRET) when STAFFRAIL_REQUIRE_EXPLICIT_SECRET=true",
    )
  }

  // Zero-config local/demo fallback: created once per server process.
  const devCache = globalThis as unknown as { __staffrailCsrfSecretDev?: string }
  devCache.__staffrailCsrfSecretDev ??= randomHex(SECRET_BYTES)
  return devCache.__staffrailCsrfSecretDev
}

export interface CsrfCookieValue {
  sign: (rawToken: string) => string
}

export function createCsrfCookieValue(secret: string): string {
  const token = randomHex(SECRET_BYTES)
  return `${token}.${hmac(token, secret)}`
}

export interface CsrfVerificationInput {
  /** Token supplied by the client in the CSRF header. */
  headerToken: string | null
  /** Raw cookie value ("<token>.<hmac>"). */
  cookieValue: string | null
  /** Signing secret to recompute the HMAC. */
  secret: string
}

export function verifyCsrfPair({ headerToken, cookieValue, secret }: CsrfVerificationInput): boolean {
  if (!headerToken || !cookieValue) {
    return false
  }

  const dot = cookieValue.lastIndexOf(".")
  if (dot <= 0) {
    return false
  }

  const cookieToken = cookieValue.slice(0, dot)
  const signature = cookieValue.slice(dot + 1)

  return safeEqualHex(hmac(cookieToken, secret), signature) && safeEqualHex(headerToken, cookieToken)
}
