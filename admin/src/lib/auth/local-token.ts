import "server-only"

import { createHmac, randomBytes, timingSafeEqual } from "crypto"

import { SESSION_MAX_AGE_SECONDS } from "@/lib/auth/constants"

export interface LocalSessionClaims {
  uid: string
  email: string
  email_verified: boolean
  auth_time: number
  iat: number
  exp: number
}

function resolveSessionSecret(): string {
  const explicit = process.env.STAFFRAIL_SESSION_SECRET ?? process.env.SESSION_SECRET
  if (typeof explicit === "string" && explicit.trim().length >= 32) {
    return explicit.trim()
  }

  const csrfFallback = process.env.STAFFRAIL_CSRF_SECRET
  if (typeof csrfFallback === "string" && csrfFallback.trim().length >= 32) {
    return createHmac("sha256", csrfFallback.trim()).update("staffrail:session").digest("hex")
  }

  const globalCache = globalThis as unknown as { __staffrailSessionSecret?: string }
  if (!globalCache.__staffrailSessionSecret) {
    globalCache.__staffrailSessionSecret = randomBytes(32).toString("hex")
  }
  return globalCache.__staffrailSessionSecret
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input
  return buf.toString("base64url")
}

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input, "base64url")
}

function signPayload(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url")
}

export function createLocalSessionCookie(
  input: {
    uid: string
    email: string
    emailVerified: boolean
    authTime?: number
  },
  ttlSeconds: number = SESSION_MAX_AGE_SECONDS,
): string {
  const nowSec = Math.floor(Date.now() / 1000)
  const claims: LocalSessionClaims = {
    uid: input.uid,
    email: input.email,
    email_verified: input.emailVerified,
    auth_time: input.authTime ?? nowSec,
    iat: nowSec,
    exp: nowSec + ttlSeconds,
  }
  const encodedPayload = base64UrlEncode(JSON.stringify(claims))
  const signature = signPayload(encodedPayload, resolveSessionSecret())
  return `${encodedPayload}.${signature}`
}

export function verifyLocalSessionCookie(
  token: string,
  tokenValidAfter?: number,
): LocalSessionClaims {
  if (typeof token !== "string" || token.length === 0) {
    throw new Error("auth/session-cookie-invalid: missing token")
  }

  const dot = token.indexOf(".")
  if (dot <= 0 || dot === token.length - 1) {
    throw new Error("auth/session-cookie-invalid: malformed token")
  }

  const encodedPayload = token.slice(0, dot)
  const signature = token.slice(dot + 1)
  const expectedSig = signPayload(encodedPayload, resolveSessionSecret())

  const sigBuf = Buffer.from(signature)
  const expectedBuf = Buffer.from(expectedSig)
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error("auth/session-cookie-invalid: signature mismatch")
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8"))
  } catch {
    throw new Error("auth/session-cookie-invalid: invalid payload")
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("auth/session-cookie-invalid: invalid claims")
  }

  const claims = parsed as Partial<LocalSessionClaims>
  if (
    typeof claims.uid !== "string" ||
    claims.uid.length === 0 ||
    typeof claims.iat !== "number" ||
    typeof claims.exp !== "number"
  ) {
    throw new Error("auth/session-cookie-invalid: missing claims")
  }

  const nowSec = Math.floor(Date.now() / 1000)
  if (claims.exp <= nowSec) {
    throw new Error("auth/session-cookie-expired: session expired")
  }

  if (typeof tokenValidAfter === "number" && claims.iat < tokenValidAfter) {
    throw new Error("auth/session-cookie-revoked: session revoked")
  }

  return {
    uid: claims.uid,
    email: typeof claims.email === "string" ? claims.email : "",
    email_verified: claims.email_verified === true,
    auth_time: typeof claims.auth_time === "number" ? claims.auth_time : claims.iat,
    iat: claims.iat,
    exp: claims.exp,
  }
}
