import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  AuditPdfError,
  decodeAuditPdfResponse,
  fetchTaskAuditPdfFromApi,
  sanitizePdfFilename,
} from "@/lib/admin/audit-pdf"

const ADMIN = "adm-1"

function pdfBase64(content = "%PDF-1.4\n%fake\n%%EOF\n"): string {
  return Buffer.from(content, "latin1").toString("base64")
}

function response(overrides: Record<string, unknown> = {}) {
  return {
    filename: "Onboarding_Acknowledgment_form_Jane_Doe.pdf",
    contentType: "application/pdf",
    base64: pdfBase64(),
    ...overrides,
  }
}

const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal("fetch", fetchMock)
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => response(),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("sanitizePdfFilename", () => {
  it("strips paths and unsafe characters, preserving a single .pdf suffix", () => {
    expect(sanitizePdfFilename("../../evil name.pdf")).toBe("evil_name.pdf")
    expect(sanitizePdfFilename("report")).toBe("report.pdf")
    expect(sanitizePdfFilename("report.PDF")).toBe("report.PDF")
    expect(sanitizePdfFilename("")).toBe("audit_record.pdf")
    expect(sanitizePdfFilename(42)).toBe("audit_record.pdf")
  })
})

describe("decodeAuditPdfResponse", () => {
  it("accepts a real PDF payload and returns a typed Blob", () => {
    const decoded = decodeAuditPdfResponse(response())

    expect(decoded.filename).toBe("Onboarding_Acknowledgment_form_Jane_Doe.pdf")
    expect(decoded.blob.type).toBe("application/pdf")
    expect(decoded.blob.size).toBeGreaterThan(0)
  })

  it("rejects wrong content types, invalid base64 and non-PDF bytes", () => {
    for (const payload of [
      response({ contentType: "text/html" }),
      response({ base64: "not base64!" }),
      response({ base64: Buffer.from("GIF89a").toString("base64") }),
      response({ base64: "" }),
      null,
      "nope",
    ]) {
      expect(() => decodeAuditPdfResponse(payload)).toThrow(AuditPdfError)
    }
  })

  it("does not trust a server-provided path in the filename", () => {
    const decoded = decodeAuditPdfResponse(response({ filename: "../../inner/evil.pdf" }))
    expect(decoded.filename).toBe("evil.pdf")
  })
})

describe("fetchTaskAuditPdfFromApi", () => {
  it("requires an employee and requirement", async () => {
    await expect(
      fetchTaskAuditPdfFromApi({ employeeId: "", taskId: "task", adminUid: ADMIN }),
    ).rejects.toMatchObject({ code: "invalid-input" })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("calls /api/audit-pdf with employeeId, taskId, and taskSource", async () => {
    const decoded = await fetchTaskAuditPdfFromApi({
      employeeId: "emp-1",
      taskId: "onboarding_acknowledgment_form",
      adminUid: ADMIN,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/audit-pdf",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          employeeId: "emp-1",
          taskId: "onboarding_acknowledgment_form",
          taskSource: "onboarding",
        }),
      }),
    )
    expect(decoded.filename).toContain(".pdf")
  })

  it("maps API error codes to AuditPdfError", async () => {
    const cases: Array<[number, string, string, string]> = [
      [401, "not-signed-in", "Sign in required", "not-signed-in"],
      [403, "permission-denied", "Only an active admin can download audit records.", "permission-denied"],
      [404, "not-found", "This requirement no longer exists.", "not-found"],
      [412, "failed-precondition", "Not submitted", "failed-precondition"],
      [409, "conflict", "Changed", "conflict"],
      [503, "unavailable", "Down", "unavailable"],
      [500, "weird-code", "?", "unknown"],
    ]

    for (const [status, code, message, expected] of cases) {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status,
        json: async () => ({ code, error: message }),
      })
      await expect(
        fetchTaskAuditPdfFromApi({ employeeId: "emp-1", taskId: "task", adminUid: ADMIN }),
      ).rejects.toMatchObject({ code: expected })
    }
  })

  it("rejects an invalid payload without returning a Blob", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => response({ contentType: "application/json" }),
    })

    await expect(
      fetchTaskAuditPdfFromApi({ employeeId: "emp-1", taskId: "task", adminUid: ADMIN }),
    ).rejects.toMatchObject({ code: "invalid-response" })
  })
})
