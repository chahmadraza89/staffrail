/**
 * Browser client adapter for Node.js `/api/audit-pdf` generation.
 */

export interface FetchNodeAuditPdfInput {
  employeeId: string
  taskId: string
  adminUid: string
  taskSource?: "onboarding" | "training" | "clearance"
}

export async function requestTaskAuditPdfPayload({
  employeeId,
  taskId,
  adminUid,
  taskSource = "onboarding",
}: FetchNodeAuditPdfInput): Promise<
  | { ok: true; data: unknown }
  | { ok: false; status: number; code: string; message: string }
> {
  if (!employeeId.trim() || !taskId.trim() || !adminUid.trim()) {
    return {
      ok: false,
      status: 400,
      code: "invalid-input",
      message: "Employee, requirement, and admin IDs are required.",
    }
  }

  const response = await fetch("/api/audit-pdf", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeId, taskId, taskSource }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const record =
      payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {}
    return {
      ok: false,
      status: response.status,
      code: typeof record.code === "string" ? record.code : "unknown",
      message:
        typeof record.error === "string" && record.error.trim().length > 0
          ? record.error
          : `PDF export failed (${response.status}).`,
    }
  }

  return { ok: true, data: payload }
}
