import { NextRequest, NextResponse } from "next/server"

import { requireAdmin } from "@/lib/auth/guard"
import { assertSameOrigin, OriginError } from "@/lib/auth/origin"
import { requireHttpsOrigins } from "@/lib/auth/session"
import { AppAuthError } from "@/lib/auth/types"
import { DATA_COLLECTIONS } from "@/lib/data/collections"
import { toDateOrNull } from "@/lib/data/dates"
import { getServerDataStore } from "@/lib/data/server-store"
import { buildTaskAuditPdf } from "@/lib/pdf/audit-pdf-document"

type AuditTaskSource = "onboarding" | "training" | "clearance"

class RouteError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "RouteError"
  }
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function isSafeDocId(id: string): boolean {
  return id.length > 0 && !id.includes("/") && !id.includes("..")
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : []
}

function subcollectionForSource(source: AuditTaskSource): string {
  switch (source) {
    case "training":
      return DATA_COLLECTIONS.trainings
    case "clearance":
      return DATA_COLLECTIONS.clearanceItems
    default:
      return DATA_COLLECTIONS.onboardingTasks
  }
}

function normalizeSource(value: unknown): AuditTaskSource {
  if (value === "training" || value === "clearance" || value === "onboarding") {
    return value
  }
  return "onboarding"
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? ""
    assertSameOrigin({
      originHeader: request.headers.get("origin"),
      refererHeader: request.headers.get("referer"),
      host,
      requireHttps: requireHttpsOrigins({
        host,
        forwardedProto: request.headers.get("x-forwarded-proto"),
      }),
    })

    const auth = await requireAdmin()

    let body: unknown
    try {
      body = await request.json()
    } catch {
      throw new RouteError(400, "invalid-input", "Request body must be valid JSON.")
    }

    const payload = asRecord(body)
    const employeeId = asTrimmedString(payload.employeeId)
    const taskId = asTrimmedString(payload.taskId)
    const taskSource = normalizeSource(payload.taskSource)

    if (!isSafeDocId(employeeId) || !isSafeDocId(taskId)) {
      throw new RouteError(
        400,
        "invalid-input",
        "A valid employeeId and taskId are required to generate an audit PDF.",
      )
    }

    const store = getServerDataStore()
    const adminPath = `${DATA_COLLECTIONS.users}/${auth.uid}`
    const employeePath = `${DATA_COLLECTIONS.users}/${employeeId}`
    const taskPath = `${employeePath}/${subcollectionForSource(taskSource)}/${taskId}`

    const generated = await store.runTransaction(async (transaction) => {
      const [adminSnap, employeeSnap, taskSnap] = await Promise.all([
        transaction.get(adminPath),
        transaction.get(employeePath),
        transaction.get(taskPath),
      ])

      if (!adminSnap.exists()) {
        throw new RouteError(403, "permission-denied", "Admin profile no longer exists.")
      }
      const adminData = adminSnap.data() ?? {}
      if (adminData.role !== "admin" || adminData.isActive !== true || adminData.deletedAt != null) {
        throw new RouteError(
          403,
          "permission-denied",
          "Only an active admin can download audit records.",
        )
      }

      if (!employeeSnap.exists()) {
        throw new RouteError(404, "not-found", "This employee record no longer exists.")
      }
      const employeeData = employeeSnap.data() ?? {}
      if (employeeData.role !== "employee") {
        throw new RouteError(
          403,
          "permission-denied",
          "Audit records can only be exported for employee accounts.",
        )
      }
      if (employeeData.adminId !== auth.uid) {
        throw new RouteError(
          403,
          "permission-denied",
          "You do not have permission to access records for this employee.",
        )
      }
      if (employeeData.isActive === false || employeeData.deletedAt != null) {
        throw new RouteError(
          412,
          "failed-precondition",
          "Cannot generate an audit record for an inactive employee account.",
        )
      }

      if (!taskSnap.exists()) {
        throw new RouteError(404, "not-found", "This requirement no longer exists.")
      }
      const taskData = taskSnap.data() ?? {}
      const actionType = asTrimmedString(taskData.actionType) || null
      if (taskSource === "onboarding" && actionType === "upload") {
        throw new RouteError(
          412,
          "failed-precondition",
          "Upload-only requirements do not have a form audit PDF; download the uploaded attachment instead.",
        )
      }

      const rawStatus = typeof taskData.status === "string" ? taskData.status.trim() : ""
      const isCompleted = taskData.isCompleted === true
      const status = rawStatus || (isCompleted ? "completed" : "notStarted")

      if (
        taskSource === "onboarding" &&
        !isCompleted &&
        (status === "notStarted" || status === "pending")
      ) {
        throw new RouteError(
          412,
          "failed-precondition",
          "This requirement has not been submitted yet.",
        )
      }

      return buildTaskAuditPdf({
        employee: {
          uid: employeeId,
          name: asTrimmedString(employeeData.name) || asTrimmedString(employeeData.email) || employeeId,
          email: asTrimmedString(employeeData.email) || null,
          department: asTrimmedString(employeeData.department) || null,
        },
        task: {
          id: taskId,
          title: asTrimmedString(taskData.title) || taskId,
          subtitle: asTrimmedString(taskData.subtitle) || null,
          category: asTrimmedString(taskData.category) || null,
          taskSource,
          actionType,
          status,
          isCompleted: taskData.isCompleted === true,
          dueDate: toDateOrNull(taskData.dueDate),
          updatedAt: toDateOrNull(taskData.updatedAt),
          completedAt: toDateOrNull(taskData.completedAt),
          signedAt: toDateOrNull(taskData.signedAt),
          rejectionReason: asTrimmedString(taskData.rejectionReason) || null,
          signatureUrl:
            asTrimmedString(taskData.signatureUrl) ||
            asTrimmedString(asRecord(taskData.formData).signature) ||
            asTrimmedString(asRecord(taskData.formData).signatureData) ||
            null,
          adminSignatureUrl:
            asTrimmedString(taskData.adminSignatureUrl) ||
            asTrimmedString(taskData.adminSignature) ||
            asTrimmedString(asRecord(taskData.adminFormData).adminSignatureUrl) ||
            asTrimmedString(asRecord(taskData.adminFormData).adminSignatureData) ||
            null,
          fileUrl: asTrimmedString(taskData.fileUrl) || null,
          fileUrls: asStringArray(taskData.fileUrls),
          blankFormUrl: asTrimmedString(taskData.blankFormUrl) || null,
          formData: asRecord(taskData.formData),
          adminFormData: asRecord(taskData.adminFormData),
        },
      })
    })

    return NextResponse.json({
      filename: generated.filename,
      contentType: "application/pdf",
      base64: generated.bytes.toString("base64"),
    })
  } catch (error) {
    if (error instanceof OriginError) {
      return NextResponse.json({ code: "permission-denied", error: error.message }, { status: 403 })
    }
    if (error instanceof AppAuthError) {
      if (error.failure === "not_configured") {
        return NextResponse.json({ code: "unavailable", error: error.message }, { status: 503 })
      }
      if (
        error.failure === "email_not_verified" ||
        error.failure === "profile_missing" ||
        error.failure === "not_admin" ||
        error.failure === "account_inactive"
      ) {
        return NextResponse.json({ code: "permission-denied", error: error.message }, { status: 403 })
      }
      return NextResponse.json({ code: "not-signed-in", error: error.message }, { status: 401 })
    }
    if (error instanceof RouteError) {
      return NextResponse.json({ code: error.code, error: error.message }, { status: error.status })
    }
    const rawCode = (error as { code?: unknown })?.code
    const message = error instanceof Error ? error.message : "Failed to generate audit PDF."
    if (rawCode === "aborted" || rawCode === 10) {
      return NextResponse.json({ code: "conflict", error: message }, { status: 409 })
    }
    return NextResponse.json({ code: "unknown", error: message }, { status: 500 })
  }
}
