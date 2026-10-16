import "server-only"

import {
  AppAuthError,
  type AdminProfile,
  type AuthContext,
  type DecodedCredential,
  type GetUserProfileFn,
  type VerifySessionFn,
} from "@/lib/auth/types"
import { readSessionCookie } from "@/lib/auth/session"
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin"

/**
 * Reusable server-only authorization helper.
 *
 * Every protected Server Component, Route Handler and Server Action calls
 * this (directly or via a wrapper) — the proxy only does an optimistic
 * cookie-presence check and never authorizes.
 *
 * Rules enforced (Firebase project model, mirrors functions/src/index.ts):
 *   1. Session cookie verifies against live Auth state (revocation-safe).
 *   2. The credential's email must be verified (`email_verified` claim).
 *   3. `users/{uid}` must exist.
 *   4. `users/{uid}.role === "admin"`.
 *   5. `users/{uid}.isActive === true`.
 *
 * Failures raise `AppAuthError` with a coarse reason; nothing about *why*
 * an unauthed visitor was rejected is returned to clients.
 */

interface GuardDeps {
  /** Verify the raw session-cookie value against live Auth state. */
  verifySession: VerifySessionFn
  /** Fetch users/{uid}; null when the document does not exist. */
  getProfile: GetUserProfileFn
}

const defaultDeps: GuardDeps = {
  verifySession: (value, checkRevoked) => getAdminAuth().verifySessionCookie(value, checkRevoked),
  getProfile: async (uid) => {
    const snapshot = await getAdminFirestore().collection("users").doc(uid).get()
    if (!snapshot.exists) {
      return null
    }
    const data = snapshot.data() as Partial<AdminProfile> | undefined
    return {
      role: typeof data?.role === "string" ? data.role : "",
      isActive: data?.isActive === true,
      adminId: typeof data?.adminId === "string" ? data.adminId : null,
      name: typeof data?.name === "string" ? data.name : null,
    }
  },
}

export async function requireAdmin(deps: Partial<GuardDeps> = {}): Promise<AuthContext> {
  return analyzeAdminSession(deps) as Promise<AuthContext>
}

/**
 * Pure-ish version used by tests and by callers that want the failure
 * reason without constructing server cookie contexts.
 */
export async function analyzeAdminSession(
  overrides: Partial<GuardDeps> & { sessionCookie?: string | null } = {},
): Promise<AuthContext> {
  const deps: GuardDeps = { ...defaultDeps, ...omit(overrides, ["sessionCookie"]) }

  const sessionCookie = overrides.sessionCookie ?? (await tryReadCookie())
  if (!sessionCookie) {
    throw new AppAuthError("no_session")
  }

  let decoded: DecodedCredential
  try {
    decoded = await deps.verifySession(sessionCookie, true)
  } catch (error) {
    if (error instanceof AppAuthError) {
      throw error
    }
    if (isAuthConfigProblem(error)) {
      throw new AppAuthError("not_configured")
    }
    throw new AppAuthError("invalid_session")
  }

  if (!decoded?.uid) {
    throw new AppAuthError("invalid_session")
  }

  if (decoded.email === undefined || decoded.email_verified !== true) {
    throw new AppAuthError("email_not_verified")
  }

  let profile: AdminProfile | null
  try {
    profile = await deps.getProfile(decoded.uid)
  } catch (error) {
    if (error instanceof AppAuthError) {
      throw error
    }
    if (isAuthDatabaseError(error)) {
      throw new AppAuthError("profile_lookup_failed")
    }
    if (isAuthConfigProblem(error)) {
      throw new AppAuthError("not_configured")
    }
    throw new AppAuthError("unexpected")
  }

  if (!profile) {
    throw new AppAuthError("profile_missing")
  }

  if (profile.role !== "admin") {
    throw new AppAuthError("not_admin")
  }

  if (profile.isActive !== true) {
    throw new AppAuthError("account_inactive")
  }

  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    emailVerified: decoded.email_verified === true,
    profile,
  }
}

/* ── helpers ───────────────────────────────────────────────────────────── */

async function tryReadCookie(): Promise<string | null> {
  try {
    return await readSessionCookie()
  } catch {
    return null
  }
}

function isAuthConfigProblem(error: unknown): boolean {
  const message = String((error as Error)?.message ?? "")
  return /initialize|credential|invalid.*credential|private.?key|not configured/i.test(message)
}

function isAuthDatabaseError(error: unknown): boolean {
  const code = (error as { code?: string })?.code ?? ""
  return typeof code === "string" && (code.startsWith("permission-denied") || code.startsWith("unavailable") || code.startsWith("internal"))
}

function omit<T extends object, K extends keyof T>(source: T, keys: readonly K[]): Omit<T, K> {
  const copy = { ...source }
  for (const key of keys) {
    delete copy[key as unknown as keyof T]
  }
  return copy as Omit<T, K>
}
