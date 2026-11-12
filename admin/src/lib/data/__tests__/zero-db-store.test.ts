import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createLocalSessionCookie, verifyLocalSessionCookie } from "@/lib/auth/local-token"
import { isLoopbackHost, requireHttpsOrigins } from "@/lib/auth/session"
import { MemoryDataStore, serverNow } from "@/lib/data/memory-store"
import { DEMO_CREDENTIALS, seedDemoWorkspace } from "@/lib/data/seed"
import {
  authenticateWithPassword,
  confirmPasswordResetWithToken,
  createPasswordResetRequest,
  dissolveWorkspaceLocal,
  getAuthAccountByUid,
  getServerDataStore,
  registerStaffLocal,
  resetServerStoreForTests,
  syncAuthAccountFromProfileWrite,
} from "@/lib/data/server-store"
import { DataError } from "@/lib/data/types"
import {
  MAX_PORTAL_UPLOAD_BYTES,
  UploadValidationError,
  sanitizeContentDispositionFilename,
  validateUploadPayload,
} from "@/lib/data/upload-policy"

describe("MemoryDataStore", () => {
  it("supports CRUD, subcollections, collectionGroup queries, transactions, and file storage", async () => {
    const store = new MemoryDataStore()

    await store.setDoc("users/u1", { name: "Alice", role: "employee", createdAt: serverNow() })
    await store.updateDoc("users/u1", { department: "Care" })
    const snap = await store.getDoc("users/u1")
    expect(snap.exists()).toBe(true)
    expect(snap.data()?.name).toBe("Alice")
    expect(snap.data()?.department).toBe("Care")
    expect(snap.data()?.createdAt).toBeInstanceOf(Date)

    await store.setDoc("users/u1/onboarding_tasks/t1", { status: "submitted", adminId: "a1" })
    await store.setDoc("users/u2/onboarding_tasks/t2", { status: "notStarted", adminId: "a1" })
    const groupSnap = await store.getCollectionGroup("onboarding_tasks", {
      filters: [{ field: "status", op: "in", value: ["submitted", "pendingEmployerSignature"] }],
    })
    expect(groupSnap.docs.map((d) => d.id)).toEqual(["t1"])

    await expect(store.updateDoc("users/missing", { name: "Nope" })).rejects.toBeInstanceOf(
      DataError,
    )

    const bytes = new Uint8Array([37, 80, 68, 70])
    const url = await store.uploadFile("users/u1/resume.pdf", bytes, "application/pdf")
    expect(url).toBe("/api/files/users/u1/resume.pdf")
    expect(store.getFile("users/u1/resume.pdf")?.bytes).toEqual(bytes)
    await store.deleteFile("users/u1/resume.pdf")
    expect(store.getFile("users/u1/resume.pdf")).toBeNull()
  })

  it("retries or aborts optimistic transactions on concurrent modification", async () => {
    const store = new MemoryDataStore()
    await store.setDoc("users/u1", { count: 1 })

    let injectedConflict = false
    await expect(
      store.runTransaction(async (tx) => {
        await tx.get("users/u1")
        if (!injectedConflict) {
          injectedConflict = true
        }
        await store.setDoc("users/u1", { count: 99 })
        tx.update("users/u1", { count: 2 })
      }),
    ).rejects.toMatchObject({ code: "aborted" })
  })
})

describe("local-token & server-store", () => {
  beforeEach(() => {
    resetServerStoreForTests()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("mints, verifies, and enforces revocation on HMAC session cookies", () => {
    const nowSec = Math.floor(Date.now() / 1000)
    const token = createLocalSessionCookie(
      { uid: "demo-admin-1", email: "admin@staffrail.local", emailVerified: true },
      3600,
    )
    const claims = verifyLocalSessionCookie(token)
    expect(claims.uid).toBe("demo-admin-1")
    expect(claims.email_verified).toBe(true)

    expect(() => verifyLocalSessionCookie(`${token}tamper`)).toThrow(/signature mismatch/)
    expect(() => verifyLocalSessionCookie(token, nowSec + 60)).toThrow(/revoked/)

    const expired = createLocalSessionCookie(
      { uid: "demo-admin-1", email: "admin@staffrail.local", emailVerified: true },
      -10,
    )
    expect(() => verifyLocalSessionCookie(expired)).toThrow(/expired/)
  })

  it("seeds demo workspace, registers staff, resets passwords, syncs profile writes, and dissolves workspace", async () => {
    const store = getServerDataStore()
    const adminSnap = await store.getDoc("users/demo-admin-1")
    expect(adminSnap.exists()).toBe(true)

    const authAcct = await authenticateWithPassword(
      DEMO_CREDENTIALS.adminEmail,
      DEMO_CREDENTIALS.password,
    )
    expect(authAcct.uid).toBe("demo-admin-1")

    const { uid, resetLink } = await registerStaffLocal({
      adminUid: "demo-admin-1",
      email: "new.staff@staffrail.local",
      name: "New Staff",
    })
    expect(uid).toMatch(/^emp_/)
    expect(resetLink).toContain("/forgot-password?token=")

    const { resetToken } = await createPasswordResetRequest("new.staff@staffrail.local")
    expect(resetToken).toBeTruthy()
    await confirmPasswordResetWithToken(resetToken!, "UpdatedPass#123")
    const updatedAcct = await authenticateWithPassword(
      "new.staff@staffrail.local",
      "UpdatedPass#123",
    )
    expect(updatedAcct.uid).toBe(uid)

    syncAuthAccountFromProfileWrite(`users/${uid}`, {
      email: "renamed.staff@staffrail.local",
      isActive: false,
    })
    expect(getAuthAccountByUid(uid)?.email).toBe("renamed.staff@staffrail.local")
    expect(getAuthAccountByUid(uid)?.disabled).toBe(true)

    syncAuthAccountFromProfileWrite(`users/${uid}`, { isActive: true, deletedAt: null })
    expect(getAuthAccountByUid(uid)?.disabled).toBe(false)

    const dissolved = await dissolveWorkspaceLocal({
      adminUid: "demo-admin-1",
      password: DEMO_CREDENTIALS.password,
    })
    expect(dissolved.cascaded).toBeGreaterThanOrEqual(3)
    await expect(
      authenticateWithPassword(DEMO_CREDENTIALS.adminEmail, DEMO_CREDENTIALS.password),
    ).rejects.toMatchObject({ code: "auth/user-disabled" })
  })

  it("seeds demo files cleanly in MemoryDataStore", () => {
    const store = new MemoryDataStore()
    seedDemoWorkspace(store)
    expect(store.getFile("demo/signed_offer_letter.pdf")?.contentType).toBe("application/pdf")
  })
})

describe("upload-policy & requireHttpsOrigins", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("accepts safe document/image payloads and rejects HTML, SVG, executables, empty, and oversized files", () => {
    expect(validateUploadPayload("users/u1/resume.pdf", "application/pdf", 1024)).toBe(
      "application/pdf",
    )
    expect(validateUploadPayload("users/u1/photo.png", "application/octet-stream", 512)).toBe(
      "image/png",
    )
    expect(() => validateUploadPayload("evil.html", "text/html", 100)).toThrow(
      UploadValidationError,
    )
    expect(() => validateUploadPayload("pic.svg", "image/svg+xml", 100)).toThrow(
      UploadValidationError,
    )
    expect(() => validateUploadPayload("virus.exe", "application/pdf", 100)).toThrow(
      UploadValidationError,
    )
    expect(() => validateUploadPayload("empty.pdf", "application/pdf", 0)).toThrow(
      UploadValidationError,
    )
    expect(() =>
      validateUploadPayload("huge.pdf", "application/pdf", MAX_PORTAL_UPLOAD_BYTES + 1),
    ).toThrow(UploadValidationError)
    expect(sanitizeContentDispositionFilename('a"b\r\nc.pdf')).toBe("a_b__c.pdf")
  })

  it("allows http://localhost in production when STAFFRAIL_REQUIRE_HTTPS_ORIGIN is unset or false, while enforcing HTTPS on non-local prod hosts", () => {
    vi.stubEnv("NODE_ENV", "production")
    expect(isLoopbackHost("localhost:3000")).toBe(true)
    expect(isLoopbackHost("127.0.0.1:3000")).toBe(true)
    expect(isLoopbackHost("portal.example.com")).toBe(false)

    expect(requireHttpsOrigins({ host: "localhost:3000", forwardedProto: null })).toBe(false)
    expect(requireHttpsOrigins({ host: "portal.example.com", forwardedProto: null })).toBe(true)

    vi.stubEnv("STAFFRAIL_REQUIRE_HTTPS_ORIGIN", "false")
    expect(requireHttpsOrigins({ host: "portal.example.com", forwardedProto: null })).toBe(false)

    vi.stubEnv("STAFFRAIL_REQUIRE_HTTPS_ORIGIN", "true")
    expect(requireHttpsOrigins({ host: "localhost:3000", forwardedProto: null })).toBe(true)
  })
})
