import "server-only"

import { cookies, headers } from "next/headers"

import {
  CSRF_COOKIE,
  CSRF_HEADER,
  CSRF_MAX_AGE_SECONDS,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/constants"
import {
  createCsrfCookieValue,
  CsrfSecretError,
  getCsrfSecret,
  verifyCsrfPair,
} from "@/lib/auth/csrf"
import { assertSameOrigin, OriginError } from "@/lib/auth/origin"
import type { AuthFailureReason } from "@/lib/auth/types"
import { AppAuthError } from "@/lib/auth/types"

/**
 * Server-side session cookie helpers.
 *
 * The stored value is a **minted Firebase session cookie** (not the browser
 * ID token), verified with revocation checks on every protected request.
 *
 * CSRF strategy: double-submit cookie — GET /api/auth/csrf sets the signed
 * `staffrail_csrf` cookie and returns the raw token; state-changing requests
 * must echo it in the `x-staffrail-csrf` header. Same-origin is additionally
 * enforced via Origin/Referer checks.
 */

export function isProductionLike(): boolean {
  return process.env.NODE_ENV === "production"
}

function resolveSecret(): string {
  try {
    return getCsrfSecret()
  } catch (error) {
    if (error instanceof CsrfSecretError) {
      throw new AppAuthError("not_configured")
    }
    throw error
  }
}

/* ── Session cookie ───────────────────────────────────────────────────── */

/** Reads the raw session cookie value (without verifying it). */
export async function readSessionCookie(): Promise<string | null> {
  const store = await cookies()
  return store.get(SESSION_COOKIE)?.value ?? null
}

export async function setSessionCookie(
  sessionValue: string,
  options: { secure?: boolean } = {},
): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, sessionValue, {
    httpOnly: true,
    sameSite: "strict",
    secure: options.secure ?? isProductionLike(),
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  })
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: isProductionLike(),
    maxAge: 0,
    path: "/",
  })
}

/* ── CSRF ─────────────────────────────────────────────────────────────── */

/** Mints a fresh CSRF token, sets the signed cookie, returns the raw token. */
export async function issueCsrfToken(): Promise<string> {
  const store = await cookies()
  const secret = resolveSecret()
  const value = createCsrfCookieValue(secret)

  store.set(CSRF_COOKIE, value, {
    httpOnly: false, // double-submit requires our client JS to read it
    sameSite: "strict",
    secure: isProductionLike(),
    maxAge: CSRF_MAX_AGE_SECONDS,
    path: "/",
  })

  return value.slice(0, value.lastIndexOf("."))
}

/* ── State-changing request validation ────────────────────────────────── */

/** Enforces same-origin (Origin/Referer vs Host, https-aware in prod). */
export async function assertRequestSameOrigin(): Promise<void> {
  const headerBag = await headers()
  const host = headerBag.get("host") ?? ""

  try {
    assertSameOrigin({
      originHeader: headerBag.get("origin"),
      refererHeader: headerBag.get("referer"),
      host,
      requireHttps: requireHttpsOrigins(),
    })
  } catch (error) {
    if (error instanceof OriginError) {
      throw new AppAuthError("csrf_rejected")
    }
    throw error
  }
}

/** Verifies the client-echoed CSRF token against the signed cookie. */
export async function assertCsrfDoubleSubmit(): Promise<void> {
  const headerBag = await headers()
  const store = await cookies()
  const secret = resolveSecret()

  const ok = verifyCsrfPair({
    headerToken: headerBag.get(CSRF_HEADER),
    cookieValue: store.get(CSRF_COOKIE)?.value ?? null,
    secret,
  })

  if (!ok) {
    throw new AppAuthError("csrf_rejected")
  }
}

/** Full protection for every state-changing endpoint (POST/DELETE/…). */
export async function assertSafeStateChange(): Promise<void> {
  await assertRequestSameOrigin()
  await assertCsrfDoubleSubmit()
}

/** True when sessions must be marked Secure (production or override). */
export function requireHttpsOrigins(): boolean {
  if (process.env.STAFFRAIL_REQUIRE_HTTPS_ORIGIN === "true") {
    return true
  }
  return isProductionLike()
}

export type { AuthFailureReason }
