import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mockSession = vi.hoisted(() => ({
  status: "authenticated" as "authenticated" | "rejected",
  uid: "demo-emp-1",
  role: "employee" as "admin" | "employee",
}))

vi.mock("@/lib/auth/employee-guard", () => ({
  analyzePortalSession: async () => {
    if (mockSession.status !== "authenticated") {
      return { status: "rejected", reason: "invalid_session" }
    }
    return {
      status: "authenticated",
      context: {
        uid: mockSession.uid,
        email: `${mockSession.uid}@staffrail.local`,
        role: mockSession.role,
        profile: {
          name: "Test User",
          email: `${mockSession.uid}@staffrail.local`,
          role: mockSession.role,
          isActive: true,
          adminId: mockSession.role === "employee" ? "demo-admin-1" : null,
          photoUrl: null,
          department: null,
          phoneNumber: null,
          notificationPreferences: {
            pushEnabled: true,
            emailEnabled: true,
            taskReminders: true,
            adminAlerts: true,
          },
        },
      },
    }
  },
}))

import { POST as postData } from "@/app/api/data/route"
import { GET as getFile } from "@/app/api/files/[...path]/route"
import { getServerDataStore, resetServerStoreForTests } from "@/lib/data/server-store"

function jsonReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/data", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "localhost:3000",
      origin: "http://localhost:3000",
    },
    body: JSON.stringify(body),
  })
}

describe("/api/data & /api/files authorization and upload hardening", () => {
  beforeEach(() => {
    resetServerStoreForTests()
    mockSession.status = "authenticated"
    mockSession.uid = "demo-emp-1"
    mockSession.role = "employee"
  })

  it("blocks employees from reading audit_logs or mutating/deleting messages, while allowing audit_logs append", async () => {
    const readAuditRes = await postData(jsonReq({ op: "getCollection", path: "audit_logs" }))
    expect(readAuditRes.status).toBe(403)

    const delMsgRes = await postData(jsonReq({ op: "deleteDoc", path: "messages/msg-1" }))
    expect(delMsgRes.status).toBe(403)

    const addAuditRes = await postData(
      jsonReq({
        op: "addDoc",
        collectionPath: "audit_logs",
        data: { actorId: "demo-emp-1", actionType: "TASK_SUBMITTED" },
      }),
    )
    expect(addAuditRes.status).toBe(200)
  })

  it("rejects HTML/script multipart uploads and enforces per-user read access with nosniff/sandbox headers on /api/files", async () => {
    await getServerDataStore().uploadFile(
      "users/demo-emp-2/onboarding/resume/secret.pdf",
      new TextEncoder().encode("%PDF-1.4 secret"),
      "application/pdf",
    )
    await getServerDataStore().uploadFile(
      "users/demo-emp-1/onboarding/resume/mine.txt",
      new TextEncoder().encode("hello"),
      "text/plain",
    )

    // Cross-employee read denied for demo-emp-1
    const otherRes = await getFile(
      new NextRequest("http://localhost:3000/api/files/users/demo-emp-2/onboarding/resume/secret.pdf"),
      { params: Promise.resolve({ path: ["users", "demo-emp-2", "onboarding", "resume", "secret.pdf"] }) },
    )
    expect(otherRes.status).toBe(403)

    // Own text file downloads as attachment with nosniff + CSP sandbox
    const ownRes = await getFile(
      new NextRequest("http://localhost:3000/api/files/users/demo-emp-1/onboarding/resume/mine.txt"),
      { params: Promise.resolve({ path: ["users", "demo-emp-1", "onboarding", "resume", "mine.txt"] }) },
    )
    expect(ownRes.status).toBe(200)
    expect(ownRes.headers.get("X-Content-Type-Options")).toBe("nosniff")
    expect(ownRes.headers.get("Content-Security-Policy")).toContain("sandbox")
    expect(ownRes.headers.get("Content-Disposition")).toContain("attachment")

    // Demo file allowed for authenticated employee inline
    const demoRes = await getFile(
      new NextRequest("http://localhost:3000/api/files/demo/signed_offer_letter.pdf"),
      { params: Promise.resolve({ path: ["demo", "signed_offer_letter.pdf"] }) },
    )
    expect(demoRes.status).toBe(200)
    expect(demoRes.headers.get("Content-Disposition")).toContain("inline")

    // Admin can read emp-2's file
    mockSession.uid = "demo-admin-1"
    mockSession.role = "admin"
    const adminReadRes = await getFile(
      new NextRequest("http://localhost:3000/api/files/users/demo-emp-2/onboarding/resume/secret.pdf"),
      { params: Promise.resolve({ path: ["users", "demo-emp-2", "onboarding", "resume", "secret.pdf"] }) },
    )
    expect(adminReadRes.status).toBe(200)

    // Multipart upload rejects HTML payload
    const badForm = new FormData()
    badForm.append("file", new Blob(["<script>alert(1)</script>"], { type: "text/html" }), "evil.html")
    badForm.append("path", "users/demo-emp-1/onboarding/resume/evil.html")
    badForm.append("contentType", "text/html")
    const badUpload = await postData(
      new NextRequest("http://localhost:3000/api/data", {
        method: "POST",
        headers: { host: "localhost:3000", origin: "http://localhost:3000" },
        body: badForm,
      }),
    )
    expect(badUpload.status).toBe(400)
  })
})
