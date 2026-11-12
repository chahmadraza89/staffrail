import { getClientDataStore } from "@/lib/data/client-store"
import { DATA_COLLECTIONS } from "@/lib/data/collections"
import { serverNow } from "@/lib/data/memory-store"
import type { DataStore } from "@/lib/data/types"
import { UploadValidationError, validateUploadPayload } from "@/lib/data/upload-policy"
import { EmployeeActionError } from "@/lib/admin/employee-actions"
import { logAuditAction } from "@/lib/admin/audit-actions"
import { triggerNotification } from "@/lib/admin/notification-actions"
import { publishStaffMessage } from "@/lib/admin/communication-actions"

export const MAX_EMPLOYEE_UPLOAD_BYTES = 10 * 1024 * 1024
export const EMPLOYEE_UPLOAD_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"

const ALLOWED_EXTS = new Set(["pdf", "png", "jpg", "jpeg", "webp", "doc", "docx"])

function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "")
  return cleaned || "document.pdf"
}

export function validateEmployeeUploadFile(file: File): string {
  if (!file || file.size <= 0) {
    throw new EmployeeActionError("The selected file is empty.", "invalid-argument")
  }
  if (file.size > MAX_EMPLOYEE_UPLOAD_BYTES) {
    throw new EmployeeActionError(
      "File exceeds the 10 MB maximum upload limit.",
      "invalid-argument",
    )
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (!ALLOWED_EXTS.has(ext)) {
    throw new EmployeeActionError(
      "Unsupported file type. Upload a PDF, PNG, JPG, WEBP, or Word document.",
      "invalid-argument",
    )
  }
  try {
    return validateUploadPayload(file.name, file.type, file.size)
  } catch (err) {
    if (err instanceof UploadValidationError) {
      throw new EmployeeActionError(err.message, "invalid-argument")
    }
    throw err
  }
}

async function readFileBytes(file: File): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === "function") {
    return new Uint8Array(await file.arrayBuffer())
  }
  return new Uint8Array(Math.max(1, Math.min(file.size ?? 1, 64)))
}

export async function uploadEmployeeFile({
  employeeId,
  scope,
  itemId,
  file,
  storage,
}: {
  employeeId: string
  scope: "onboarding" | "trainings" | "clearance"
  itemId: string
  file: File
  storage?: DataStore
}): Promise<{ fileUrl: string; fileName: string }> {
  if (!employeeId.trim() || !itemId.trim()) {
    throw new EmployeeActionError("Employee and item identifiers are required.", "invalid-argument")
  }
  const contentType = validateEmployeeUploadFile(file)
  const store = storage ?? getClientDataStore()
  const safeName = sanitizeFilename(file.name)
  const storagePath = `users/${employeeId}/${scope}/${itemId}/${Date.now()}_${safeName}`
  const bytes = await readFileBytes(file)
  const fileUrl = await store.uploadFile(
    storagePath,
    bytes,
    contentType,
  )
  return { fileUrl, fileName: safeName }
}

export async function saveEmployeeTaskDraft({
  employeeId,
  taskId,
  formData,
  fileUrl,
  fileUrls,
  db,
}: {
  employeeId: string
  taskId: string
  formData: Record<string, unknown>
  fileUrl?: string | null
  fileUrls?: string[]
  db?: DataStore
}): Promise<void> {
  if (!employeeId.trim() || !taskId.trim()) {
    throw new EmployeeActionError("Employee and task identifiers are required.", "invalid-argument")
  }
  const store = db ?? getClientDataStore()
  const path = `${DATA_COLLECTIONS.users}/${employeeId}/${DATA_COLLECTIONS.onboardingTasks}/${taskId}`
  await store.updateDoc(path, {
    formData,
    status: "pending",
    isCompleted: false,
    ...(fileUrl !== undefined ? { fileUrl } : {}),
    ...(fileUrls !== undefined ? { fileUrls } : {}),
    updatedAt: serverNow(),
  })
}

export async function submitEmployeeTask({
  employeeId,
  employeeName,
  adminId,
  taskId,
  taskTitle,
  actionType,
  formData,
  signatureUrl,
  fileUrl,
  fileUrls,
  db,
}: {
  employeeId: string
  employeeName: string
  adminId: string | null
  taskId: string
  taskTitle: string
  actionType: string
  formData: Record<string, unknown>
  signatureUrl?: string | null
  fileUrl?: string | null
  fileUrls?: string[]
  db?: DataStore
}): Promise<void> {
  if (!employeeId.trim() || !taskId.trim()) {
    throw new EmployeeActionError("Employee and task identifiers are required.", "invalid-argument")
  }

  const store = db ?? getClientDataStore()
  const path = `${DATA_COLLECTIONS.users}/${employeeId}/${DATA_COLLECTIONS.onboardingTasks}/${taskId}`

  const targetStatus =
    actionType === "splitField" ? "pendingEmployerSignature" : "submitted"

  const payload: Record<string, unknown> = {
    formData,
    status: targetStatus,
    isCompleted: false,
    rejectionReason: null,
    updatedAt: serverNow(),
    signedAt: serverNow(),
  }
  if (signatureUrl !== undefined && signatureUrl !== null) {
    payload.signatureUrl = signatureUrl
  }
  if (fileUrl !== undefined) {
    payload.fileUrl = fileUrl
  }
  if (fileUrls !== undefined) {
    payload.fileUrls = fileUrls
  }

  await store.updateDoc(path, payload)

  await logAuditAction({
    actorId: employeeId,
    actorName: employeeName || "Employee",
    actionType: "TASK_SUBMITTED",
    targetId: taskId,
    description: `${employeeName || employeeId} submitted "${taskTitle || taskId}"`,
    metadata: { taskId, targetStatus },
    db: store,
  })

  if (adminId) {
    await triggerNotification({
      targetUserId: adminId,
      title:
        targetStatus === "pendingEmployerSignature"
          ? "Counter-Signature Required"
          : "Onboarding Task Submitted",
      body: `${employeeName || "An employee"} submitted "${taskTitle || taskId}".`,
      type: "info",
      metadata: { employeeId, taskId, type: "task_submitted" },
      db: store,
    })
  }
}

export async function submitEmployeeTraining({
  employeeId,
  employeeName,
  adminId,
  trainingId,
  trainingTitle,
  requirementType,
  completedDate,
  expirationDate,
  noExpiration,
  fileUrl,
  fileUrls,
  db,
}: {
  employeeId: string
  employeeName: string
  adminId: string | null
  trainingId: string
  trainingTitle: string
  requirementType: string
  completedDate: string
  expirationDate?: string | null
  noExpiration: boolean
  fileUrl?: string | null
  fileUrls?: string[]
  db?: DataStore
}): Promise<void> {
  if (!employeeId.trim() || !trainingId.trim()) {
    throw new EmployeeActionError("Training identifier is required.", "invalid-argument")
  }
  if (!completedDate.trim()) {
    throw new EmployeeActionError("Please enter the training completion date.", "invalid-argument")
  }
  if (requirementType === "certificate" && !fileUrl?.trim() && (!fileUrls || fileUrls.length === 0)) {
    throw new EmployeeActionError(
      "Please upload a training certificate file before submitting.",
      "invalid-argument",
    )
  }

  const parsedCompleted = new Date(`${completedDate}T00:00:00`)
  if (Number.isNaN(parsedCompleted.getTime())) {
    throw new EmployeeActionError("Invalid completion date format.", "invalid-argument")
  }

  let parsedExp: Date | null = null
  if (!noExpiration && expirationDate && expirationDate.trim()) {
    parsedExp = new Date(`${expirationDate}T00:00:00`)
    if (Number.isNaN(parsedExp.getTime())) {
      throw new EmployeeActionError("Invalid expiration date format.", "invalid-argument")
    }
  }

  const resolvedUrls =
    fileUrls && fileUrls.length > 0
      ? fileUrls.filter((u) => u.trim().length > 0)
      : fileUrl?.trim()
        ? [fileUrl.trim()]
        : undefined
  const resolvedUrl = fileUrl?.trim() || resolvedUrls?.[0]

  const store = db ?? getClientDataStore()
  await store.updateDoc(
    `${DATA_COLLECTIONS.users}/${employeeId}/${DATA_COLLECTIONS.trainings}/${trainingId}`,
    {
      status: "underReview",
      isCompleted: false,
      completionDate: parsedCompleted,
      completedAt: parsedCompleted,
      expirationDate: parsedExp ?? null,
      noExpiration,
      ...(resolvedUrl !== undefined ? { certificateUrl: resolvedUrl } : {}),
      ...(resolvedUrls !== undefined ? { certificateUrls: resolvedUrls } : {}),
      rejectionReason: null,
      updatedAt: serverNow(),
    },
  )

  await logAuditAction({
    actorId: employeeId,
    actorName: employeeName || "Employee",
    actionType: "TRAINING_SUBMITTED",
    targetId: trainingId,
    description: `${employeeName || employeeId} submitted training "${trainingTitle || trainingId}"`,
    metadata: { trainingId },
    db: store,
  })

  if (adminId) {
    await triggerNotification({
      targetUserId: adminId,
      title: "Training Submitted for Verification",
      body: `${employeeName || "An employee"} submitted "${trainingTitle || trainingId}".`,
      type: "info",
      metadata: { employeeId, trainingId, type: "training_submitted" },
      db: store,
    })
  }
}

export async function submitEmployeeClearance({
  employeeId,
  employeeName,
  adminId,
  clearanceId,
  clearanceTitle,
  fileUrl,
  expirationDate,
  db,
}: {
  employeeId: string
  employeeName: string
  adminId: string | null
  clearanceId: string
  clearanceTitle: string
  fileUrl: string
  expirationDate?: string | null
  db?: DataStore
}): Promise<void> {
  if (!employeeId.trim() || !clearanceId.trim()) {
    throw new EmployeeActionError("Clearance identifier is required.", "invalid-argument")
  }
  if (!fileUrl.trim()) {
    throw new EmployeeActionError(
      "Please upload your clearance document before submitting.",
      "invalid-argument",
    )
  }

  let parsedExp: Date | null = null
  if (expirationDate && expirationDate.trim()) {
    parsedExp = new Date(`${expirationDate}T00:00:00`)
    if (Number.isNaN(parsedExp.getTime())) {
      throw new EmployeeActionError("Invalid expiration date.", "invalid-argument")
    }
  }

  const store = db ?? getClientDataStore()
  await store.updateDoc(
    `${DATA_COLLECTIONS.users}/${employeeId}/${DATA_COLLECTIONS.clearanceItems}/${clearanceId}`,
    {
      status: "underReview",
      isCleared: false,
      fileUrl: fileUrl.trim(),
      submittedAt: serverNow(),
      rejectionReason: null,
      ...(parsedExp ? { expirationDate: parsedExp } : {}),
      updatedAt: serverNow(),
    },
  )

  await logAuditAction({
    actorId: employeeId,
    actorName: employeeName || "Employee",
    actionType: "CLEARANCE_SUBMITTED",
    targetId: clearanceId,
    description: `${employeeName || employeeId} uploaded clearance "${clearanceTitle || clearanceId}"`,
    metadata: { clearanceId },
    db: store,
  })

  if (adminId) {
    await triggerNotification({
      targetUserId: adminId,
      title: "Clearance Document Uploaded",
      body: `${employeeName || "An employee"} submitted "${clearanceTitle || clearanceId}" for verification.`,
      type: "info",
      metadata: { employeeId, clearanceId, type: "clearance_submitted" },
      db: store,
    })
  }
}

export async function updateEmployeeProfileDetails({
  employeeId,
  name,
  phoneNumber,
  department,
  db,
}: {
  employeeId: string
  name: string
  phoneNumber?: string
  department?: string
  db?: DataStore
}): Promise<void> {
  const cleanName = name.trim()
  if (!cleanName) {
    throw new EmployeeActionError("Full name is required.", "invalid-argument")
  }
  const store = db ?? getClientDataStore()
  await store.updateDoc(`${DATA_COLLECTIONS.users}/${employeeId}`, {
    name: cleanName,
    phoneNumber: phoneNumber?.trim() || null,
    department: department?.trim() || null,
    updatedAt: serverNow(),
  })
}

export async function updateEmployeeNotificationPreferences({
  employeeId,
  preferences,
  db,
}: {
  employeeId: string
  preferences: {
    pushEnabled: boolean
    emailEnabled: boolean
    taskReminders: boolean
    adminAlerts: boolean
  }
  db?: DataStore
}): Promise<void> {
  if (!employeeId.trim()) {
    throw new EmployeeActionError("User identifier is required.", "invalid-argument")
  }
  const store = db ?? getClientDataStore()
  await store.updateDoc(`${DATA_COLLECTIONS.users}/${employeeId}`, {
    notificationPreferences: preferences,
    updatedAt: serverNow(),
  })
}

export async function deactivateEmployeeAccount({
  employeeId,
  employeeName,
  reason,
  db,
}: {
  employeeId: string
  employeeName: string
  reason?: string
  db?: DataStore
}): Promise<void> {
  if (!employeeId.trim()) {
    throw new EmployeeActionError("User identifier is required.", "invalid-argument")
  }
  const store = db ?? getClientDataStore()
  await store.updateDoc(`${DATA_COLLECTIONS.users}/${employeeId}`, {
    isActive: false,
    deletedAt: serverNow(),
    deletionReason: reason?.trim() || "Self-service account deactivation",
    updatedAt: serverNow(),
  })
  await logAuditAction({
    actorId: employeeId,
    actorName: employeeName || "Employee",
    actionType: "ACCOUNT_DEACTIVATED",
    targetId: employeeId,
    description: `Employee self-deactivated account${reason?.trim() ? `: ${reason.trim()}` : ""}`,
    db: store,
  })
}

export async function sendSupportTicketMessage({
  employeeId,
  employeeName,
  adminId,
  category,
  subject,
  message,
  db,
}: {
  employeeId: string
  employeeName: string
  adminId: string | null
  category: string
  subject: string
  message: string
  db?: DataStore
}): Promise<string> {
  const target = adminId?.trim() || "broadcast"
  return publishStaffMessage({
    title: `[${category}] ${subject.trim()}`,
    content: message.trim(),
    authorId: employeeId,
    authorName: employeeName || "Employee",
    recipientId: target,
    recipientName: "Management",
    isPushEnabled: true,
    db,
  })
}
