import { NextResponse, type NextRequest } from "next/server"

import { requireAdmin } from "@/lib/auth/guard"
import { createLocalSessionCookie } from "@/lib/auth/local-token"
import { isSafeRedirectTarget, normalizeRedirectTarget } from "@/lib/auth/redirect"
import {
  assertRequestSameOrigin,
  assertSafeStateChange,
  clearSessionCookie,
  readSessionCookie,
  requireHttpsOrigins,
  setSessionCookie,
} from "@/lib/auth/session"
import { AppAuthError, type AuthFailureReason } from "@/lib/auth/types"
import { DATA_COLLECTIONS } from "@/lib/data/collections"
import {
  authenticateWithPassword,
  getServerDataStore,
  LocalAuthError,
} from "@/lib/data/server-store"

function errorResponse(failure: AuthFailureReason): NextResponse {
  return NextResponse.json({ error: failure }, { status: new AppAuthError(failure).statusCode })
}

/**
 * GET /api/auth/session — protected context probe.
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
 * POST /api/auth/session — verify email/password against the local store and
 * mint a signed HttpOnly session cookie.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { email?: unknown; password?: unknown; redirect?: unknown }
  try {
    body = (await request.json()) as { email?: unknown; password?: unknown; redirect?: unknown }
  } catch {
    return NextResponse.json({ error: "unexpected" }, { status: 400 })
  }

  const email = typeof body.email === "string" ? body.email.trim() : ""
  const password = typeof body.password === "string" ? body.password : ""
  if (!email || !password) {
    return errorResponse("invalid_session")
  }

  try {
    await assertSafeStateChange()

    const account = await authenticateWithPassword(email, password)
    if (!account.emailVerified) {
      return errorResponse("email_not_verified")
    }

    const profileSnapshot = await getServerDataStore().getDoc(
      `${DATA_COLLECTIONS.users}/${account.uid}`,
    )
    if (!profileSnapshot.exists()) {
      return errorResponse("profile_missing")
    }
    const profile = (profileSnapshot.data() ?? {}) as Record<string, unknown>
    if (profile.role !== "admin" && profile.role !== "employee") {
      return errorResponse("not_admin")
    }
    if (profile.isActive !== true || profile.deletedAt != null) {
      return errorResponse("account_inactive")
    }

    const sessionCookie = createLocalSessionCookie({
      uid: account.uid,
      email: account.email,
      emailVerified: account.emailVerified,
      authTime: account.lastAuthTime,
    })
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? ""
    const forwardedProto = request.headers.get("x-forwarded-proto")
    await setSessionCookie(sessionCookie, {
      secure: requireHttpsOrigins({ host, forwardedProto }),
    })

    const role = profile.role as "admin" | "employee"
    const rawRequested = typeof body.redirect === "string" ? body.redirect : null
    const safeRequested = isSafeRedirectTarget(rawRequested) ? rawRequested : null
    const roleDefault = role === "employee" ? "/employee" : normalizeRedirectTarget(null)
    const redirect =
      role === "employee"
        ? safeRequested && safeRequested.startsWith("/employee")
          ? safeRequested
          : roleDefault
        : safeRequested && !safeRequested.startsWith("/employee")
          ? safeRequested
          : roleDefault

    return NextResponse.json({ ok: true, redirect, role }, { status: 201 })
  } catch (error) {
    if (error instanceof AppAuthError) {
      return errorResponse(error.failure)
    }
    if (error instanceof LocalAuthError) {
      if (error.code === "auth/user-disabled") {
        return errorResponse("account_inactive")
      }
      return errorResponse("invalid_session")
    }
    return NextResponse.json({ error: "unexpected" }, { status: 500 })
  }
}

/**
 * DELETE /api/auth/session — logout.
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

  return NextResponse.json({ ok: true }, { status: 200 })
}
