import { NextResponse, type NextRequest } from "next/server"

import { PROTECTED_PATH_PREFIXES, SESSION_COOKIE } from "@/lib/auth/constants"
import { isSafeRedirectTarget } from "@/lib/auth/redirect"

/**
 * Lightweight optimistic auth redirect (Next.js 16 Proxy, formerly
 * "middleware").
 *
 * IMPORTANT: This runs NO Firebase/Firestore work and never authorizes. It only checks
 * for the presence of the session cookie to bounce obvious visitors to the
 * login page. Real authorization always happens server-side via
 * `requireAdmin()` in pages, Route Handlers and Server Actions, and the
 * session is re-verified there (expiry / revocation / role changes).
 *
 * Note: `SameSite=strict` cookies are not attached when *navigating from
 * external sites*; that navigation may get one extra redirect to /login and
 * then continue after the cookie arrives again — acceptable and safe.
 */

const LOGIN_PATH = "/login"

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE)

  // A signed-in-ish visitor arriving at /login goes to their target.
  if (pathname === LOGIN_PATH) {
    if (hasSessionCookie) {
      const requested = safeRequestedRedirect(request.nextUrl)
      return NextResponse.redirect(new URL(requested, request.url))
    }
    return NextResponse.next()
  }

  const isProtected = PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )

  if (isProtected && !hasSessionCookie) {
    const loginUrl = new URL(LOGIN_PATH, request.url)
    // Validate/normalize what we echo to prevent redirect-parameter abuse.
    const target = isSafeRedirectTarget(`${pathname}${search}`)
      ? `${pathname}${search}`
      : "/dashboard"
    loginUrl.searchParams.set("redirect", target)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

function safeRequestedRedirect(url: URL): string {
  const candidate = url.searchParams.get("redirect")
  if (candidate && isSafeRedirectTarget(candidate)) {
    return candidate
  }
  return "/dashboard"
}

export const config = {
  // /login + protected prefixes. Excludes /api, _next assets and statics.
  matcher: ["/login", "/dashboard/:path*", "/dashboard"],
}
