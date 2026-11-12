import { beforeEach, describe, expect, it, vi } from "vitest"

const mockState = vi.hoisted(() => ({
  cookieValue: undefined as string | undefined,
  verifyResult: {
    uid: "emp-1",
    email: "emp@staffrail.test",
    email_verified: true,
    auth_time: Math.floor(Date.now() / 1000),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  } as Record<string, unknown>,
  verifyError: null as Error | null,
  account: {
    uid: "emp-1",
    email: "emp@staffrail.test",
    emailVerified: true,
    disabled: false,
    tokenValidAfter: 0,
  } as Record<string, unknown> | null,
  profileExists: true,
  profileData: {
    name: "Jane Doe",
    email: "emp@staffrail.test",
    role: "employee",
    isActive: true,
    adminId: "adm-1",
  } as Record<string, unknown>,
}))

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "staffrail_admin_session" && mockState.cookieValue
        ? { value: mockState.cookieValue }
        : undefined,
  }),
}))

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`)
  },
}))

vi.mock("@/lib/auth/local-token", () => ({
  verifyLocalSessionCookie: () => {
    if (mockState.verifyError) throw mockState.verifyError
    return mockState.verifyResult
  },
}))

vi.mock("@/lib/data/server-store", () => ({
  getAuthAccountByUid: () => mockState.account,
  getServerDataStore: () => ({
    getDoc: async () => ({
      exists: () => mockState.profileExists,
      data: () => (mockState.profileExists ? { ...mockState.profileData } : undefined),
    }),
  }),
}))

import {
  analyzePortalSession,
  requireEmployeeApi,
  requireEmployeePageSession,
} from "@/lib/auth/employee-guard"
import { AppAuthError } from "@/lib/auth/types"

beforeEach(() => {
  mockState.cookieValue = "session-cookie"
  mockState.verifyError = null
  mockState.verifyResult = {
    uid: "emp-1",
    email: "emp@staffrail.test",
    email_verified: true,
  }
  mockState.account = {
    uid: "emp-1",
    email: "emp@staffrail.test",
    emailVerified: true,
    disabled: false,
    tokenValidAfter: 0,
  }
  mockState.profileExists = true
  mockState.profileData = {
    name: "Jane Doe",
    email: "emp@staffrail.test",
    role: "employee",
    isActive: true,
    adminId: "adm-1",
  }
})

describe("employee-guard / portal session analysis", () => {
  it("authenticates active verified employees cleanly", async () => {
    const analysis = await analyzePortalSession()
    expect(analysis.status).toBe("authenticated")
    if (analysis.status === "authenticated") {
      expect(analysis.context.uid).toBe("emp-1")
      expect(analysis.context.role).toBe("employee")
      expect(analysis.context.profile.adminId).toBe("adm-1")
    }
  })

  it("rejects missing cookies, revoked sessions, and unverified emails", async () => {
    mockState.cookieValue = undefined
    expect(await analyzePortalSession()).toEqual({ status: "rejected", reason: "invalid_session" })

    mockState.cookieValue = "cookie"
    mockState.verifyError = Object.assign(new Error("revoked"), {
      code: "auth/session-cookie-revoked",
    })
    expect(await analyzePortalSession()).toEqual({ status: "rejected", reason: "invalid_session" })

    mockState.verifyError = null
    mockState.account = {
      uid: "emp-1",
      email: "emp@staffrail.test",
      emailVerified: false,
      disabled: false,
      tokenValidAfter: 0,
    }
    expect(await analyzePortalSession()).toEqual({
      status: "rejected",
      reason: "email_not_verified",
    })

    mockState.account = null
    mockState.verifyResult = { uid: "emp-1", email: "emp@staffrail.test" }
    expect(await analyzePortalSession()).toEqual({
      status: "rejected",
      reason: "email_not_verified",
    })
  })

  it("redirects admins on /employee routes cleanly to /dashboard", async () => {
    mockState.profileData = {
      name: "Dana Admin",
      email: "admin@staffrail.test",
      role: "admin",
      isActive: true,
    }
    await expect(requireEmployeePageSession()).rejects.toThrow("REDIRECT:/dashboard")
    await expect(requireEmployeeApi()).rejects.toThrow(AppAuthError)
  })

  it("blocks inactive and soft-deleted accounts cleanly", async () => {
    mockState.profileData.isActive = false
    const analysis = await analyzePortalSession()
    expect(analysis).toMatchObject({ status: "rejected", reason: "account_inactive" })

    mockState.profileData = {
      name: "Jane Doe",
      email: "emp@staffrail.test",
      role: "employee",
      isActive: true,
      deletedAt: "2026-11-11T00:00:00Z",
    }
    expect(await analyzePortalSession()).toMatchObject({
      status: "rejected",
      reason: "account_inactive",
    })
  })
})
