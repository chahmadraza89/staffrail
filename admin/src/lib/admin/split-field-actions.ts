import { getClientDataStore } from "@/lib/data/client-store"
import { DATA_COLLECTIONS } from "@/lib/data/collections"
import { serverNow } from "@/lib/data/memory-store"
import type { DataStore } from "@/lib/data/types"
import { EmployeeActionError } from "@/lib/admin/employee-actions"
import { submissionRevision } from "@/lib/admin/task-revision"
import { getAdminSplitFieldSpecs } from "@/lib/admin/split-field-schemas"
import { logAuditAction } from "@/lib/admin/audit-actions"
import { triggerNotification } from "@/lib/admin/notification-actions"

export interface SaveAdminSplitDraftInput {
  employeeId: string
  taskId: string
  adminUid: string
  adminFormData: Record<string, unknown>
  adminSignatureUrl?: string | null
  expectedRevision?: string
  db?: DataStore
}

export interface AdminCounterSignTaskInput {
  employeeId: string
  taskId: string
  adminUid: string
  adminName?: string | null
  employeeName?: string | null
  taskTitle?: string | null
  adminFormData: Record<string, unknown>
  adminSignatureUrl: string
  expectedRevision?: string
  db?: DataStore
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function assertValidIds(employeeId: string, taskId: string, adminUid: string): void {
  if (!adminUid.trim()) {
    throw new EmployeeActionError("Admin session expired. Sign in again.", "permission-denied")
  }
  if (!employeeId.trim() || !taskId.trim()) {
    throw new EmployeeActionError("Employee and requirement identifiers are required.", "invalid-argument")
  }
}

function assertVerifiedEmployeeTask(
  empSnapExists: boolean,
  empData: Record<string, unknown> | undefined,
  taskSnapExists: boolean,
  taskData: Record<string, unknown> | undefined,
  adminUid: string,
  expectedRevision?: string,
): Record<string, unknown> {
  if (!empSnapExists || !empData) {
    throw new EmployeeActionError("This employee profile no longer exists.", "not-found")
  }
  if (empData.adminId !== adminUid) {
    throw new EmployeeActionError(
      "This employee is no longer assigned to your admin account.",
      "permission-denied",
    )
  }
  if (empData.role !== "employee") {
    throw new EmployeeActionError("Target account is not an active employee.", "failed-precondition")
  }
  if (empData.isActive !== true || empData.deletedAt != null) {
    throw new EmployeeActionError(
      "Employee account is inactive; review actions are disabled.",
      "failed-precondition",
    )
  }
  if (!taskSnapExists || !taskData) {
    throw new EmployeeActionError("This requirement no longer exists.", "not-found")
  }
  if (expectedRevision !== undefined && expectedRevision.length > 0) {
    const currentRevision = submissionRevision(taskData)
    if (currentRevision !== expectedRevision) {
      throw new EmployeeActionError(
        "The employee updated this submission while you were reviewing it. Refresh and verify the new submission first.",
        "aborted",
      )
    }
  }
  return taskData
}

function sanitizeFormDataMap(input: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) {
      continue
    }
    clean[key] = typeof value === "string" ? value.trim() : value
  }
  return clean
}

function normalizeTypedOrUrlSignature(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    return ""
  }
  if (
    trimmed.startsWith("typed:") ||
    trimmed.startsWith("data:image/") ||
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith("/")
  ) {
    return trimmed
  }
  return `typed:${trimmed}`
}

export function validateCounterSignFields(
  taskId: string,
  taskTitle: string,
  adminFormData: Record<string, unknown>,
  adminSignatureUrl: string,
): string | null {
  const specs = getAdminSplitFieldSpecs(taskId, taskTitle)
  for (const spec of specs) {
    if (!spec.required) {
      continue
    }
    const raw = adminFormData[spec.key]
    if (raw === undefined || raw === null || String(raw).trim().length === 0) {
      return `Please complete required field: ${spec.label}.`
    }
  }
  if (!normalizeTypedOrUrlSignature(adminSignatureUrl)) {
    return "An authorized representative signature is required to complete this document."
  }
  return null
}

export async function saveAdminSplitDraft({
  employeeId,
  taskId,
  adminUid,
  adminFormData,
  adminSignatureUrl,
  expectedRevision,
  db,
}: SaveAdminSplitDraftInput): Promise<void> {
  assertValidIds(employeeId, taskId, adminUid)
  const store = db ?? getClientDataStore()
  const empPath = `${DATA_COLLECTIONS.users}/${employeeId}`
  const taskPath = `${DATA_COLLECTIONS.users}/${employeeId}/${DATA_COLLECTIONS.onboardingTasks}/${taskId}`

  const sanitized = sanitizeFormDataMap(adminFormData)
  const normalizedSig = adminSignatureUrl ? normalizeTypedOrUrlSignature(adminSignatureUrl) : null

  await store.runTransaction(async (transaction) => {
    const [empSnap, taskSnap] = await Promise.all([
      transaction.get(empPath),
      transaction.get(taskPath),
    ])
    const taskData = assertVerifiedEmployeeTask(
      empSnap.exists(),
      empSnap.data() as Record<string, unknown> | undefined,
      taskSnap.exists(),
      taskSnap.data() as Record<string, unknown> | undefined,
      adminUid,
      expectedRevision,
    )

    const existingStatus = asTrimmedString(taskData.status)
    if (existingStatus === "notStarted" || existingStatus === "pending" || existingStatus === "rejected") {
      throw new EmployeeActionError(
        "The employee must submit their portion before saving admin verification fields.",
        "failed-precondition",
      )
    }
    if (taskData.isCompleted === true || existingStatus === "completed" || existingStatus === "verified") {
      throw new EmployeeActionError(
        "This completed task is locked and cannot be modified.",
        "failed-precondition",
      )
    }
    if (existingStatus === "expired" || existingStatus === "noActionRequired") {
      throw new EmployeeActionError(
        "Cannot save verification fields on an expired or waived task.",
        "failed-precondition",
      )
    }

    const patch: Record<string, unknown> = {
      adminFormData: {
        ...(taskData.adminFormData && typeof taskData.adminFormData === "object"
          ? (taskData.adminFormData as Record<string, unknown>)
          : {}),
        ...sanitized,
      },
      updatedAt: serverNow(),
    }
    if (normalizedSig) {
      patch.adminSignatureUrl = normalizedSig
    }

    transaction.update(taskPath, patch)
  })
}

export async function adminCounterSignTask({
  employeeId,
  taskId,
  adminUid,
  adminName,
  employeeName,
  taskTitle,
  adminFormData,
  adminSignatureUrl,
  expectedRevision,
  db,
}: AdminCounterSignTaskInput): Promise<void> {
  assertValidIds(employeeId, taskId, adminUid)
  const sanitized = sanitizeFormDataMap(adminFormData)
  const normalizedSig = normalizeTypedOrUrlSignature(adminSignatureUrl)
  const validationError = validateCounterSignFields(
    taskId,
    taskTitle ?? taskId,
    sanitized,
    normalizedSig,
  )
  if (validationError) {
    throw new EmployeeActionError(validationError, "invalid-argument")
  }

  const store = db ?? getClientDataStore()
  const empPath = `${DATA_COLLECTIONS.users}/${employeeId}`
  const taskPath = `${DATA_COLLECTIONS.users}/${employeeId}/${DATA_COLLECTIONS.onboardingTasks}/${taskId}`

  let resolvedTitle = taskTitle?.trim() || taskId
  let resolvedEmpName = employeeName?.trim() || employeeId

  await store.runTransaction(async (transaction) => {
    const [empSnap, taskSnap] = await Promise.all([
      transaction.get(empPath),
      transaction.get(taskPath),
    ])
    const empData = empSnap.data() as Record<string, unknown> | undefined
    const taskData = assertVerifiedEmployeeTask(
      empSnap.exists(),
      empData,
      taskSnap.exists(),
      taskSnap.data() as Record<string, unknown> | undefined,
      adminUid,
      expectedRevision,
    )

    resolvedTitle = asTrimmedString(taskData.title) || resolvedTitle
    resolvedEmpName = asTrimmedString(empData?.name) || resolvedEmpName

    const existingStatus = asTrimmedString(taskData.status)
    if (existingStatus === "notStarted" || existingStatus === "pending" || existingStatus === "rejected") {
      throw new EmployeeActionError(
        "The employee must submit their portion before an admin can counter-sign.",
        "failed-precondition",
      )
    }
    if (taskData.isCompleted === true || existingStatus === "completed" || existingStatus === "verified") {
      throw new EmployeeActionError(
        "This task has already been completed and locked.",
        "failed-precondition",
      )
    }
    if (existingStatus === "expired" || existingStatus === "noActionRequired") {
      throw new EmployeeActionError(
        "Cannot counter-sign an expired or waived task.",
        "failed-precondition",
      )
    }

    transaction.update(taskPath, {
      adminFormData: sanitized,
      adminSignatureUrl: normalizedSig,
      status: "completed",
      isCompleted: true,
      rejectionReason: null,
      completedAt: serverNow(),
      updatedAt: serverNow(),
      ...(taskData.signedAt ? {} : { signedAt: serverNow() }),
    })
  })

  await Promise.all([
    logAuditAction({
      actorId: adminUid,
      actorName: adminName?.trim() || "Administrator",
      actionType: "SPLIT_FIELD_COUNTER_SIGNED",
      targetId: employeeId,
      description: `Counter-signed ${resolvedTitle} for ${resolvedEmpName}`,
      metadata: { taskId, taskTitle: resolvedTitle },
      db: store,
    }),
    triggerNotification({
      targetUserId: employeeId,
      title: "Document Completed",
      body: `Your submission for "${resolvedTitle}" has been counter-signed and completed.`,
      type: "success",
      metadata: { taskId, type: "task_completed" },
      db: store,
    }),
  ])
}
