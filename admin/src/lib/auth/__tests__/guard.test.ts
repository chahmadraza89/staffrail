import { describe, expect, it } from "vitest"

import { analyzeAdminSession } from "@/lib/auth/guard"
import { AppAuthError, type DecodedCredential, type VerifySessionFn } from "@/lib/auth/types"

/**
 * Unit tests for the server authorization helper with injected fakes —
 * no real Firebase, no credentials needed.
 */

const baseCredential = {
  uid: "admin-uid-1",
  email: "admin@staffrail.test",
  email_verified: true,
} as DecodedCredential

const adminProfile = { role: "admin", isActive: true }

const asVerify =
  (impl: () => Promise<Partial<DecodedCredential> & { uid: string }>): VerifySessionFn =>
  async () =>
    ((await impl()) as DecodedCredential)

const okDeps = {
  sessionCookie: "valid-session-cookie-value",
  verifySession: asVerify(async () => baseCredential),
  getProfile: async () => adminProfile,
}

function expectFailure(promise: Promise<unknown>, failure: string, statusCode: number) {
  return expect(promise).rejects.toMatchObject({
    name: "AppAuthError",
    failure,
    statusCode,
  })
}

describe("requireAdmin (analyzeAdminSession)", () => {
  it("passes for a verified, active admin profile", async () => {
    const context = await analyzeAdminSession(okDeps)
    expect(context).toMatchObject({
      uid: "admin-uid-1",
      email: "admin@staffrail.test",
      emailVerified: true,
      profile: adminProfile,
    })
  })

  /* ── session layer ─────────────────────────────────────────────────── */

  it("denies with no_session when the cookie is missing", async () => {
    await expectFailure(analyzeAdminSession({ ...okDeps, sessionCookie: null }), "no_session", 401)
  })

  it("denies when the session cookie is invalid or expired", async () => {
    const fail = async () => {
      throw new Error("auth/session-cookie-expired: expired")
    }
    await expectFailure(
      analyzeAdminSession({ ...okDeps, verifySession: fail }),
      "invalid_session",
      401,
    )
  })

  it("denies when the session was revoked in Firebase", async () => {
    const revoked = async () => {
      const error = new Error("auth/session-cookie-revoked: token revoked")
      throw error
    }
    await expectFailure(
      analyzeAdminSession({ ...okDeps, verifySession: revoked }),
      "invalid_session",
      401,
    )
  })

  it("denies when Admin SDK is unconfigured (503, not a deny spoof)", async () => {
    const configError = async () => {
      throw new Error("please initializeApp with credential")
    }
    await expectFailure(
      analyzeAdminSession({ ...okDeps, verifySession: configError }),
      "not_configured",
      503,
    )
  })

  /* ── email verification requirement ────────────────────────────────── */

  it("denies an unverified email (same requirement as the Flutter app)", async () => {
    await expectFailure(
      analyzeAdminSession({
        ...okDeps,
        verifySession: asVerify(async () => ({ ...baseCredential, email_verified: false })),
      }),
      "email_not_verified",
      403,
    )
  })

  /* ── Firestore profile layer ───────────────────────────────────────── */

  it("denies when users/{uid} does not exist", async () => {
    await expectFailure(
      analyzeAdminSession({ ...okDeps, getProfile: async () => null }),
      "profile_missing",
      403,
    )
  })

  it("denies an employee role", async () => {
    await expectFailure(
      analyzeAdminSession({
        ...okDeps,
        getProfile: async () => ({ role: "employee", isActive: true }),
      }),
      "not_admin",
      403,
    )
  })

  it("denies a deactivated (isActive=false) admin profile", async () => {
    await expectFailure(
      analyzeAdminSession({
        ...okDeps,
        getProfile: async () => ({ role: "admin", isActive: false }),
      }),
      "account_inactive",
      403,
    )
  })

  it("denies a tampered profile whose role claim got mutated client-side", async () => {
    // Role is re-read from Firestore on every request — client claims are
    // never trusted for authorization.
    await expectFailure(
      analyzeAdminSession({
        ...okDeps,
        verifySession: asVerify(async () => ({ ...baseCredential, role: "admin" })),
        getProfile: async () => ({ role: "employee", isActive: true }),
      }),
      "not_admin",
      403,
    )
  })

  it("reports availability problems without pretending the caller lacks access", async () => {
    const failure = async () => {
      const error = new Error("short read") as Error & { code: string }
      error.code = "unavailable"
      throw error
    }
    const promise = analyzeAdminSession({ ...okDeps, getProfile: failure })
    await expectFailure(promise, "profile_lookup_failed", 500)

    try {
      await analyzeAdminSession({ ...okDeps, getProfile: failure })
    } catch (error) {
      expect(error).toBeInstanceOf(AppAuthError)
      // Distinguishable from a *policy* deny so the UI shows a retry, not
      // "access denied".
      expect((error as AppAuthError).failure).not.toBe("not_admin")
    }
  })
})
