import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mockState = vi.hoisted(() => ({
  requireAdminResult: {
    uid: "adm-1",
    email: "admin@staffrail.test",
    profile: { role: "admin", isActive: true, name: "Dana Admin", adminId: "adm-1" },
    session: { uid: "adm-1" },
  } as unknown,
  requireAdminError: null as Error | null,
  docs: new Map<string, Record<string, unknown>>(),
}))

vi.mock("@/lib/auth/guard", () => ({
  requireAdmin: async () => {
    if (mockState.requireAdminError) {
      throw mockState.requireAdminError
    }
    return mockState.requireAdminResult
  },
}))

vi.mock("@/lib/data/server-store", () => ({
  getServerDataStore: () => ({
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        get: async (path: string) => {
          const data = mockState.docs.get(path)
          return {
            exists: () => data !== undefined,
            data: () => (data ? { ...data } : undefined),
          }
        },
      }
      return fn(tx)
    },
  }),
}))

import { SimplePdfDocument, escapePdfLiteral, wrapPdfText } from "@/lib/pdf/simple-pdf"
import { buildTaskAuditPdf } from "@/lib/pdf/audit-pdf-document"
import { POST } from "@/app/api/audit-pdf/route"
import { AppAuthError } from "@/lib/auth/types"

describe("SimplePdfDocument", () => {
  it("escapes literals and wraps long text across lines and pages cleanly", () => {
    expect(escapePdfLiteral("A (test) \\ ok")).toBe("A \\(test\\) \\\\ ok")
    expect(wrapPdfText("word ".repeat(30), 120, "regular", 10).length).toBeGreaterThan(2)

    const pdf = new SimplePdfDocument()
    pdf.addHeaderBanner("Example Health Clinic", "Audit Title", ["Subtitle 1"])
    pdf.addSectionHeading("Long Content")
    for (let i = 0; i < 40; i++) {
      pdf.addParagraph(`Line item ${i + 1}: ` + "Compliance attestation text ".repeat(4))
    }
    const buffer = pdf.toBuffer()
    const raw = buffer.toString("latin1")

    expect(raw.startsWith("%PDF-1.4")).toBe(true)
    expect(raw.trimEnd().endsWith("%%EOF")).toBe(true)
    expect(raw).toContain("Page 1 of ")
    expect(raw).toContain("xref")
  })
})

describe("buildTaskAuditPdf", () => {
  it("builds a valid PDF buffer including metadata, legal policy, responses, signatures and rejection", () => {
    const result = buildTaskAuditPdf({
      employee: { uid: "emp-1", name: "Jane Doe", email: "jane@staffrail.test", department: "Clinical" },
      task: {
        id: "onboarding_acknowledgment_form",
        title: "Onboarding Acknowledgment form",
        taskSource: "onboarding",
        status: "completed",
        isCompleted: true,
        dueDate: new Date("2026-10-20T00:00:00Z"),
        updatedAt: new Date("2026-10-12T10:00:00Z"),
        completedAt: new Date("2026-10-12T12:00:00Z"),
        signedAt: new Date("2026-10-12T10:00:00Z"),
        signatureUrl: "typed:Jane Doe",
        adminSignatureUrl: "typed:Dana Admin",
        fileUrl: "https://storage.test/form.pdf",
        formData: { fullName: "Jane Doe", position: "Counselor" },
        adminFormData: { supervisorName: "Dana Admin", verificationDate: "2026-10-12" },
        rejectionReason: null,
      },
      generatedAt: new Date("2026-10-15T00:00:00Z"),
    })

    expect(result.filename).toBe("Onboarding_Acknowledgment_form_Jane_Doe.pdf")
    const text = result.bytes.toString("latin1")
    expect(text.startsWith("%PDF-1.4")).toBe(true)
    expect(text).toContain("Jane Doe")
    expect(text).toContain("Dana Admin")
    expect(text).toContain("Counselor")
  })

  it("formats formData.witnessSignature cleanly under Employee Signature & Attestation", () => {
    const result = buildTaskAuditPdf({
      employee: { uid: "emp-1", name: "Jane Doe" },
      task: {
        id: "authorization_for_emergency_medical_care",
        title: "Authorization for Emergency Medical Care",
        taskSource: "onboarding",
        status: "submitted",
        isCompleted: false,
        signatureUrl: "typed:Jane Doe",
        formData: {
          emergencyContact1Name: "Ann Contact",
          emergencyContact1Phone: "555-0199",
          witnessSignature: "typed:John Witness",
        },
        adminFormData: {},
      },
      generatedAt: new Date("2026-10-15T00:00:00Z"),
    })
    const raw = result.bytes.toString("latin1")
    expect(raw).toContain("Witness Signature")
    expect(raw).toContain("Typed e-signature: John Witness")
    expect(raw).not.toContain("typed:John Witness")
  })
})

describe("POST /api/audit-pdf", () => {
  beforeEach(() => {
    mockState.requireAdminError = null
    mockState.docs.clear()
    mockState.docs.set("users/adm-1", { role: "admin", isActive: true, name: "Dana Admin" })
    mockState.docs.set("users/emp-1", {
      role: "employee",
      isActive: true,
      adminId: "adm-1",
      name: "Jane Doe",
      email: "jane@staffrail.test",
    })
    mockState.docs.set("users/emp-1/onboarding_tasks/code_of_conduct_ethics", {
      title: "Code of Conduct",
      status: "submitted",
      isCompleted: false,
      formData: { fullName: "Jane Doe" },
      signatureUrl: "typed:Jane Doe",
    })
  })

  function makeReq(body: unknown, origin = "http://localhost:3000"): NextRequest {
    return new NextRequest("http://localhost:3000/api/audit-pdf", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "localhost:3000",
        origin,
      },
      body: JSON.stringify(body),
    })
  }

  it("rejects cross-origin calls", async () => {
    const res = await POST(
      makeReq({ employeeId: "emp-1", taskId: "code_of_conduct_ethics" }, "https://evil.example"),
    )
    expect(res.status).toBe(403)
  })

  it("maps unauthenticated caller to 401 not-signed-in", async () => {
    mockState.requireAdminError = new AppAuthError("invalid_session")
    const res = await POST(makeReq({ employeeId: "emp-1", taskId: "code_of_conduct_ethics" }))
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ code: "not-signed-in" })
  })

  it("blocks access to employees owned by another admin", async () => {
    mockState.docs.set("users/emp-1", {
      role: "employee",
      isActive: true,
      adminId: "other-adm",
      name: "Jane",
    })
    const res = await POST(makeReq({ employeeId: "emp-1", taskId: "code_of_conduct_ethics" }))
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ code: "permission-denied" })
  })

  it("blocks unsubmitted onboarding requirements with 412 failed-precondition", async () => {
    mockState.docs.set("users/emp-1/onboarding_tasks/code_of_conduct_ethics", {
      title: "Code of Conduct",
      status: "notStarted",
      isCompleted: false,
    })
    const res = await POST(makeReq({ employeeId: "emp-1", taskId: "code_of_conduct_ethics" }))
    expect(res.status).toBe(412)
    expect(await res.json()).toMatchObject({ code: "failed-precondition" })
  })

  it("returns base64 PDF for a valid submitted requirement and uses signatureData fallback", async () => {
    mockState.docs.set("users/emp-1/onboarding_tasks/code_of_conduct_ethics", {
      title: "Code of Conduct\n2026",
      status: "submitted",
      isCompleted: false,
      formData: {
        fullName: "Jane Doe",
        signatureData: "typed:Jane SignatureData",
      },
      adminFormData: {
        adminSignatureData: "typed:Dana Counter",
      },
    })

    const res = await POST(makeReq({ employeeId: "emp-1", taskId: "code_of_conduct_ethics" }))
    expect(res.status).toBe(200)
    const json = (await res.json()) as { filename: string; contentType: string; base64: string }
    expect(json.contentType).toBe("application/pdf")
    expect(json.filename).toBe("Code_of_Conduct_2026_Jane_Doe.pdf")
    const bytes = Buffer.from(json.base64, "base64").toString("latin1")
    expect(bytes.startsWith("%PDF-1.4")).toBe(true)
    expect(bytes).toContain("Jane SignatureData")
    expect(bytes).toContain("Dana Counter")
  })

  it("blocks non-employee targets, inactive employees, and upload-only tasks", async () => {
    mockState.docs.set("users/emp-1", {
      role: "admin",
      isActive: true,
      adminId: "adm-1",
      name: "Other Admin",
    })
    const nonEmpRes = await POST(makeReq({ employeeId: "emp-1", taskId: "code_of_conduct_ethics" }))
    expect(nonEmpRes.status).toBe(403)

    mockState.docs.set("users/emp-1", {
      role: "employee",
      isActive: false,
      adminId: "adm-1",
      name: "Inactive Jane",
    })
    const inactiveRes = await POST(
      makeReq({ employeeId: "emp-1", taskId: "code_of_conduct_ethics" }),
    )
    expect(inactiveRes.status).toBe(412)

    mockState.docs.set("users/emp-1", {
      role: "employee",
      isActive: true,
      adminId: "adm-1",
      name: "Jane Doe",
    })
    mockState.docs.set("users/emp-1/onboarding_tasks/driver's_license", {
      title: "Driver's License",
      actionType: "upload",
      status: "submitted",
      isCompleted: false,
      fileUrl: "https://example.com/dl.pdf",
    })
    const uploadRes = await POST(makeReq({ employeeId: "emp-1", taskId: "driver's_license" }))
    expect(uploadRes.status).toBe(412)

    mockState.docs.set("users/adm-1", {
      role: "admin",
      isActive: true,
      deletedAt: "2026-11-11T00:00:00Z",
      name: "Deleted Admin",
    })
    mockState.docs.set("users/emp-1/onboarding_tasks/code_of_conduct_ethics", {
      title: "Code of Conduct",
      status: "submitted",
      isCompleted: false,
    })
    const deletedAdminRes = await POST(
      makeReq({ employeeId: "emp-1", taskId: "code_of_conduct_ethics" }),
    )
    expect(deletedAdminRes.status).toBe(403)
  })
})
