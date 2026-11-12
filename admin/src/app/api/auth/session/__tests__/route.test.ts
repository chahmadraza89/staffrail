import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mockState = vi.hoisted(() => ({
  sessionCookieValue: "session-cookie-1" as string | null,
  authAccount: {
    uid: "adm-1",
    email: "admin@staffrail.test",
    emailVerified: true,
    disabled: false,
    lastAuthTime: Math.floor(Date.now() / 1000),
    tokenValidAfter: 0,
  } as Record<string, unknown> | null,
  authError: null as Error | null,
  decodedClaims: {
    uid: "adm-1",
    email: "admin@staffrail.test",
    email_verified: true,
    auth_time: Math.floor(Date.now() / 1000),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  },
  verifyError: null as Error | null,
  profileExists: true,
  profileData: {
    role: "admin",
    isActive: true,
    name: "Dana Admin",
  } as Record<string, unknown>,
  createSessionCookie: vi.fn().mockReturnValue("minted-cookie"),
  setSessionCookie: vi.fn().mockResolvedValue(undefined),
  clearSessionCookie: vi.fn().mockResolvedValue(undefined),
  assertSafeStateChange: vi.fn().mockResolvedValue(undefined),
  assertRequestSameOrigin: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/auth/session", () => ({
  readSessionCookie: async () => mockState.sessionCookieValue,
  setSessionCookie: mockState.setSessionCookie,
  clearSessionCookie: mockState.clearSessionCookie,
  assertSafeStateChange: mockState.assertSafeStateChange,
  assertRequestSameOrigin: mockState.assertRequestSameOrigin,
  requireHttpsOrigins: () => false,
}))

vi.mock("@/lib/auth/local-token", () => ({
  createLocalSessionCookie: mockState.createSessionCookie,
  verifyLocalSessionCookie: () => {
    if (mockState.verifyError) {
      throw mockState.verifyError
    }
    return mockState.decodedClaims
  },
}))

vi.mock("@/lib/data/server-store", () => {
  class LocalAuthError extends Error {
    readonly code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
    }
  }
  return {
    LocalAuthError,
    authenticateWithPassword: async () => {
      if (mockState.authError) {
        throw mockState.authError
      }
      return mockState.authAccount
    },
    getAuthAccountByUid: () => mockState.authAccount,
    getServerDataStore: () => ({
      getDoc: async () => ({
        exists: () => mockState.profileExists,
        data: () => (mockState.profileExists ? { ...mockState.profileData } : undefined),
      }),
    }),
  }
})

import { GET, POST } from "@/app/api/auth/session/route"

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/session", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "localhost:3000",
      origin: "http://localhost:3000",
    },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockState.sessionCookieValue = "session-cookie-1"
  mockState.authError = null
  mockState.verifyError = null
  mockState.authAccount = {
    uid: "adm-1",
    email: "admin@staffrail.test",
    emailVerified: true,
    disabled: false,
    lastAuthTime: Math.floor(Date.now() / 1000),
    tokenValidAfter: 0,
  }
  mockState.decodedClaims = {
    uid: "adm-1",
    email: "admin@staffrail.test",
    email_verified: true,
    auth_time: Math.floor(Date.now() / 1000),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  }
  mockState.profileExists = true
  mockState.profileData = {
    role: "admin",
    isActive: true,
    name: "Dana Admin",
  }
})

describe("POST /api/auth/session", () => {
  it("mints a session cookie for an active non-deleted admin or employee", async () => {
    const adminRes = await POST(
      makePostRequest({
        email: "admin@staffrail.test",
        password: "DemoPassword123!",
        redirect: "/dashboard/audit",
      }),
    )
    expect(adminRes.status).toBe(201)
    expect(await adminRes.json()).toEqual({
      ok: true,
      redirect: "/dashboard/audit",
      role: "admin",
    })
    expect(mockState.createSessionCookie).toHaveBeenCalledTimes(1)
    expect(mockState.setSessionCookie).toHaveBeenCalledTimes(1)

    vi.clearAllMocks()
    mockState.profileData = {
      role: "employee",
      isActive: true,
      name: "Jane Doe",
    }
    const empRes = await POST(
      makePostRequest({
        email: "emp@staffrail.test",
        password: "DemoPassword123!",
        redirect: "/employee/profile",
      }),
    )
    expect(empRes.status).toBe(201)
    expect(await empRes.json()).toEqual({
      ok: true,
      redirect: "/employee/profile",
      role: "employee",
    })
    expect(mockState.createSessionCookie).toHaveBeenCalledTimes(1)
    expect(mockState.setSessionCookie).toHaveBeenCalledTimes(1)
  })

  it("rejects inactive accounts (isActive !== true) with 403 account_inactive", async () => {
    mockState.profileData = {
      role: "admin",
      isActive: false,
      name: "Dana Admin",
    }
    const res = await POST(
      makePostRequest({ email: "admin@staffrail.test", password: "DemoPassword123!" }),
    )
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: "account_inactive" })
    expect(mockState.createSessionCookie).not.toHaveBeenCalled()
    expect(mockState.setSessionCookie).not.toHaveBeenCalled()
  })

  it("rejects soft-deleted accounts (deletedAt != null) even when isActive=true", async () => {
    for (const role of ["admin", "employee"]) {
      vi.clearAllMocks()
      mockState.profileData = {
        role,
        isActive: true,
        deletedAt: { seconds: 1731369600 },
        name: "Soft Deleted",
      }
      const res = await POST(
        makePostRequest({ email: "user@staffrail.test", password: "DemoPassword123!" }),
      )
      expect(res.status).toBe(403)
      expect(await res.json()).toEqual({ error: "account_inactive" })
      expect(mockState.createSessionCookie).not.toHaveBeenCalled()
      expect(mockState.setSessionCookie).not.toHaveBeenCalled()
    }
  })

  it("maps disabled accounts to 403 account_inactive", async () => {
    mockState.authError = Object.assign(new Error("User is disabled"), {
      code: "auth/user-disabled",
    })
    const { LocalAuthError } = await import("@/lib/data/server-store")
    mockState.authError = new LocalAuthError("auth/user-disabled", "User is disabled")
    const res = await POST(
      makePostRequest({ email: "disabled@staffrail.test", password: "DemoPassword123!" }),
    )
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: "account_inactive" })
    expect(mockState.createSessionCookie).not.toHaveBeenCalled()
  })
})

describe("GET /api/auth/session (real requireAdmin + defaultDeps.getProfile)", () => {
  it("returns 200 with admin profile details for active non-deleted admin", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      ok: true,
      uid: "adm-1",
      email: "admin@staffrail.test",
      role: "admin",
      name: "Dana Admin",
    })
  })

  it("rejects soft-deleted admin documents (deletedAt != null)", async () => {
    mockState.profileData = {
      role: "admin",
      isActive: true,
      deletedAt: "2026-11-11T00:00:00Z",
      name: "Dana Admin",
    }
    const res = await GET()
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: "account_inactive" })
  })
})
