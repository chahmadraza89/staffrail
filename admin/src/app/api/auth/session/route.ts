import { NextResponse, type NextRequest } from "next/server"
import {
  assertRequestSameOrigin,
  assertSafeStateChange,
  clearSessionCookie,
  readSessionCookie,
  requireHttpsOrigins,
  setSessionCookie,
} from "@/lib/auth/session"
import { requireAdmin } from "@/lib/auth/guard"
import { isSafeRedirectTarget, normalizeRedirectTarget } from "@/lib/auth/redirect"
import { AppAuthError, type AuthFailureReason } from "@/lib/auth/types"
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin"


const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000 // 14d (Firebase max)

function errorResponse(failure: AuthFailureReason): NextResponse {
  return NextResponse.json({ error: failure }, { status: new AppAuthError(failure).statusCode })
}

/**
 * GET /api/auth/session — protected context probe.
 *
 * Example of a guarded Route Handler: it uses the *same* `requireAdmin()`
 * helper that Server Components and Server Actions use.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const context = await requireAdmin()
    return NextResponse.json({
      ok: true,
      uid: context.uid,
      email: context.email,
      role: context.profile.role,
      name: context.profile.name ?? null,
    })
  } catch (error) {
    if (error instanceof AppAuthError) {
      return errorResponse(error.failure)
    }
    return NextResponse.json({ error: "unexpected" }, { status: 500 })
  }
}

/**
 * POST /api/auth/session — exchange a browser Firebase ID token for a
 * secure, HttpOnly server session cookie.
 *
 * Order of operations (each step is mandatory):
 *   1. same-origin + double-submit CSRF validation
 *   2. ID-token verification against live Auth (revocation-safe)
 *   3. email_verified claim required
 *   4. users/{uid}: exists, role === "admin", isActive === true
 *   5. mint Firebase session cookie (Admin SDK) → HttpOnly cookie
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { idToken?: unknown; redirect?: unknown }
  try {
    body = (await request.json()) as { idToken?: unknown; redirect?: unknown }
  } catch {
    return NextResponse.json({ error: "unexpected" }, { status: 400 })
  }

  if (typeof body.idToken !== "string" || body.idToken.length === 0) {
    return NextResponse.json({ error: "unexpected" }, { status: 400 })
  }

  try {
    await assertSafeStateChange()

    const auth = getAdminAuth()
    const decoded = await auth.verifyIdToken(body.idToken, true)

    if (decoded.email_verified !== true) {
      return errorResponse("email_not_verified")
    }

    const profileSnapshot = await getAdminFirestore().collection("users").doc(decoded.uid).get()
    if (!profileSnapshot.exists) {
      return errorResponse("profile_missing")
    }
    const profile = profileSnapshot.data() as Record<string, unknown>
    if (profile.role !== "admin") {
      return errorResponse("not_admin")
    }
    if (profile.isActive !== true) {
      return errorResponse("account_inactive")
    }

    const sessionCookie = await auth.createSessionCookie(body.idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    })
    await setSessionCookie(sessionCookie, { secure: requireHttpsOrigins() })

    // Open-redirect-safe destination for the client.
    const redirect = isSafeRedirectTarget(
      typeof body.redirect === "string" ? body.redirect : null,
    )
      ? (body.redirect as string)
      : normalizeRedirectTarget(null)

    return NextResponse.json({ ok: true, redirect }, { status: 201 })
  } catch (error) {
    if (error instanceof AppAuthError) {
      return errorResponse(error.failure)
    }
    if (isTokenCredentialsProblem(error)) {
      return errorResponse("invalid_session")
    }
    if (isAdminConfigProblem(error)) {
      return errorResponse("not_configured")
    }
    return NextResponse.json({ error: "unexpected" }, { status: 500 })
  }
}

/**
 * DELETE /api/auth/session — logout.
 *
 * Clears the server session cookie. CSRF token is not required to clear
 * your own cookie, but same-origin is still enforced.
 */
export async function DELETE(): Promise<NextResponse> {
  try {
    await assertRequestSameOrigin()
  } catch (error) {
    if (error instanceof AppAuthError) {
      return errorResponse(error.failure)
    }
  }

  const hasCookie = (await readSessionCookie()) !== null
  if (hasCookie) {
    await clearSessionCookie()
  }

  // Always respond with a clean wall-off so revoked/expired clients get
  // the same observable result as an explicit logout.
  return NextResponse.json({ ok: true }, { status: 200 })
}

/* ── helpers ─────────────────────────────────────────────────────────── */

function isTokenCredentialsProblem(error: unknown): boolean {
  const code = (error as { code?: string })?.code ?? String((error as Error)?.message ?? "")
  return (
    code.includes("auth/invalid-id-token") ||
    code.includes("auth/id-token-expired") ||
    code.includes("auth/id-token-revoked") ||
    code.includes("auth/invalid-credential") ||
    code.includes("auth/user-token-expired")
  )
}

function isAdminConfigProblem(error: unknown): boolean {
  const message = String((error as Error)?.message ?? "")
  return /initializeApp|credential|private.?key|not configured/i.test(message)
}
