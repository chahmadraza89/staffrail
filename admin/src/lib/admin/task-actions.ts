"use client"

import { getClientDataStore } from "@/lib/data/client-store"
import { DATA_COLLECTIONS } from "@/lib/data/collections"
import { serverNow } from "@/lib/data/memory-store"
import type { DataDocSnapshot, DataDocument, DataStore, DataTransaction } from "@/lib/data/types"
import { EmployeeActionError } from "@/lib/admin/employee-actions"
import {
  mapClearanceStatus,
  mapTrainingStatus,
} from "@/lib/admin/compliance-helpers"
import {
  parseClearanceStatus,
  parseTrainingStatus,
} from "@/lib/admin/employee-detail-streams"
import { parseTaskStatus, type TaskStatus } from "@/lib/admin/task-status"
import { submissionRevision } from "@/lib/admin/task-revision"
import {
  BLANK_FORM_TASK_IDS,
  canAcceptTask,
  canRejectTask,
} from "@/lib/admin/task-format"
import {
  DEFAULT_ONBOARDING_TASKS,
  onboardingTaskFields,
} from "@/lib/admin/seed-templates"

export type ReviewTaskSource = "onboarding" | "training" | "clearance"

export interface TaskActionTarget {
  employeeId: string
  taskId: string
  taskSource: ReviewTaskSource
  adminUid: string
  expectedRevision: string | null
}

export interface TaskReviewInput extends TaskActionTarget {
  employeeName?: string | null
}

export const MAX_ADMIN_UPLOAD_BYTES = 10 * 1024 * 1024

export const ADMIN_UPLOAD_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,.txt,.doc,.docx,.rtf,.odt"

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  txt: "text/plain",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  rtf: "application/rtf",
  odt: "application/vnd.oasis.opendocument.text",
}

const ALLOWED_UPLOAD_MIME_TYPES = new Set(Object.values(EXTENSION_CONTENT_TYPES))

export interface AdminUploadInput extends TaskActionTarget {
  file: File
  employeeName?: string | null
  taskTitle?: string | null
}

export interface AdminUploadResult {
  fileUrl: string
  fileName: string
}

export function sanitizeUploadFileName(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? "").trim()
  const dot = base.lastIndexOf(".")
  const extension = dot > 0 ? base.slice(dot + 1).toLowerCase() : ""
  const stem = dot > 0 ? base.slice(0, dot) : base

  const cleanStem = stem
    .replace(/[^A-Za-z0-9._ -]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 80)
  const safeStem = cleanStem.length > 0 ? cleanStem : "document"
  return extension.length > 0 ? `${safeStem}.${extension}` : safeStem
}

function uploadExtension(name: string): string {
  const dot = name.lastIndexOf(".")
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : ""
}

export function resolveUploadContentType(file: File): string {
  const fileName = sanitizeUploadFileName(file.name)
  const extension = uploadExtension(fileName)
  const inferred = EXTENSION_CONTENT_TYPES[extension]
  if (!inferred) {
    throw new EmployeeActionError(
      "Choose a PDF, image, or office document (.pdf, .png, .jpg, .webp, .gif, .bmp, .txt, .doc, .docx, .rtf, .odt).",
      "invalid-argument",
    )
  }

  const declared = file.type.split(";")[0].trim().toLowerCase()
  if (declared.length > 0) {
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(declared)) {
      throw new EmployeeActionError(
        "This file type is not allowed. Choose a PDF, image, or office document.",
        "invalid-argument",
      )
    }
    return declared
  }
  return inferred
}

function validateUploadFile(file: File): void {
  if (
    !file ||
    typeof file.name !== "string" ||
    typeof file.size !== "number" ||
    file.name.length === 0
  ) {
    throw new EmployeeActionError("Choose a document to upload.", "invalid-argument")
  }
  if (file.size <= 0) {
    throw new EmployeeActionError("The selected file is empty.", "invalid-argument")
  }
  if (file.size > MAX_ADMIN_UPLOAD_BYTES) {
    throw new EmployeeActionError(
      `The selected file is larger than ${Math.floor(MAX_ADMIN_UPLOAD_BYTES / (1024 * 1024))} MB.`,
      "invalid-argument",
    )
  }
}

async function readFileBytes(file: File): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === "function") {
    return new Uint8Array(await file.arrayBuffer())
  }
  return new Uint8Array(Math.max(1, Math.min(file.size ?? 1, 64)))
}

function wrapUploadFailure(error: unknown, fallback: string): EmployeeActionError {
  if (error instanceof EmployeeActionError) {
    return error
  }
  const code = (error as { code?: string } | null)?.code ?? "unknown"
  if (code === "storage/unauthorized" || code === "storage/unauthenticated" || code === "permission-denied") {
    return new EmployeeActionError(
      "Storage denied this upload. Sign in again or verify your session.",
      "permission-denied",
    )
  }
  if (code === "storage/quota-exceeded" || code === "resource-exhausted") {
    return new EmployeeActionError(
      "The storage quota is exhausted. Contact support.",
      "resource-exhausted",
    )
  }
  if (code === "storage/canceled") {
    return new EmployeeActionError("The upload was canceled.", "aborted")
  }
  if (code === "storage/retry-limit-exceeded" || code === "storage/unknown" || code === "unavailable") {
    return new EmployeeActionError(
      "The upload could not be completed. Check your connection and retry.",
      "unavailable",
    )
  }
  return wrapFailure(error, fallback)
}

async function discardUploadedObject(store: DataStore, storagePath: string): Promise<void> {
  try {
    await store.deleteFile(storagePath)
  } catch (error) {
    console.warn("[task-actions] could not remove an orphaned admin upload:", error)
  }
}

function createUploadAttemptId(): string {
  const cryptoApi = globalThis.crypto
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID()
  }
  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    const bytes = new Uint8Array(16)
    cryptoApi.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("")
    return (
      `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-` +
      `${hex.slice(16, 20)}-${hex.slice(20)}`
    )
  }
  throw new EmployeeActionError(
    "This browser cannot create a safe upload identifier. Update the browser and retry.",
    "failed-precondition",
  )
}

const CONFIRMED_NON_COMMIT_CODES = new Set([
  "failed-precondition",
  "invalid-argument",
  "not-found",
  "permission-denied",
])

function isConfirmedFinalizeRejection(error: unknown): boolean {
  if (error instanceof EmployeeActionError) {
    return true
  }
  const code = (error as { code?: unknown } | null)?.code
  return typeof code === "string" && CONFIRMED_NON_COMMIT_CODES.has(code)
}

async function taskReferencesUpload(
  store: DataStore,
  input: TaskActionTarget,
  fileUrl: string,
): Promise<boolean> {
  const snapshot = await store.getDoc(taskPath(input))
  if (!snapshot.exists()) {
    return false
  }
  return snapshot.data()?.fileUrl === fileUrl
}

function uncertainUploadOutcome(error: unknown): EmployeeActionError {
  const wrapped = wrapUploadFailure(
    error,
    "Failed to attach the uploaded document.",
  )
  return new EmployeeActionError(
    "The data store did not confirm whether this upload was attached. The file was kept so an " +
      "attachment that committed cannot be deleted. Refresh the requirement before retrying.",
    wrapped.code,
  )
}

function taskCollection(source: ReviewTaskSource): string {
  switch (source) {
    case "onboarding":
      return DATA_COLLECTIONS.onboardingTasks
    case "training":
      return DATA_COLLECTIONS.trainings
    case "clearance":
      return DATA_COLLECTIONS.clearanceItems
    default: {
      const never: never = source
      throw new EmployeeActionError(`Unknown task source: ${String(never)}`, "invalid-argument")
    }
  }
}

function taskPath(target: TaskActionTarget): string {
  assertTarget(target)
  return `${DATA_COLLECTIONS.users}/${target.employeeId}/${taskCollection(target.taskSource)}/${target.taskId}`
}

function assertTarget(target: TaskActionTarget): void {
  if (
    typeof target.employeeId !== "string" ||
    target.employeeId.length === 0 ||
    typeof target.taskId !== "string" ||
    target.taskId.length === 0
  ) {
    throw new EmployeeActionError("A task and employee are required.", "invalid-argument")
  }
  if (typeof target.adminUid !== "string" || target.adminUid.length === 0) {
    throw new EmployeeActionError(
      "Your admin session could not be verified. Sign in again.",
      "unauthenticated",
    )
  }
  if (target.expectedRevision !== null && typeof target.expectedRevision !== "string") {
    throw new EmployeeActionError(
      "A reviewed submission revision is required.",
      "invalid-argument",
    )
  }
}

function deletedAfterReview(): EmployeeActionError {
  return new EmployeeActionError(
    "This requirement was deleted or moved after you opened it. Refresh the page to review the current requirements.",
    "not-found",
  )
}

function changedAfterReview(): EmployeeActionError {
  return new EmployeeActionError(
    "This submission changed since you reviewed it. Refresh the page and review the latest submission.",
    "conflict",
  )
}

function invalidTransition(action: string): EmployeeActionError {
  return new EmployeeActionError(
    `This requirement can no longer be ${action}. Refresh the page to see its current status.`,
    "failed-precondition",
  )
}

function wrapFailure(error: unknown, fallback: string): EmployeeActionError {
  if (error instanceof EmployeeActionError) {
    return error
  }
  const code = (error as { code?: string } | null)?.code ?? "unknown"
  if (code === "not-found") {
    return deletedAfterReview()
  }
  if (code === "aborted") {
    return changedAfterReview()
  }
  return new EmployeeActionError(fallback, code)
}

interface EmployeeContext {
  name: string
  adminId: string
}

async function readEmployeeContext(
  transaction: DataTransaction,
  input: TaskActionTarget,
): Promise<EmployeeContext> {
  const employeeSnapshot = await transaction.get(
    `${DATA_COLLECTIONS.users}/${input.employeeId}`,
  )
  if (!employeeSnapshot.exists()) {
    throw new EmployeeActionError(
      "Employee profile not found. Refresh the Directory.",
      "not-found",
    )
  }
  const data = employeeSnapshot.data() ?? {}
  if (data.role !== "employee" || data.adminId !== input.adminUid) {
    throw new EmployeeActionError(
      "You no longer have access to this employee's records. Refresh the page.",
      "permission-denied",
    )
  }
  if (data.isActive === false || data.deletedAt != null) {
    throw new EmployeeActionError(
      "This employee is inactive. Reactivate the employee before reviewing requirements.",
      "failed-precondition",
    )
  }
  return {
    name: typeof data.name === "string" ? data.name : "",
    adminId: input.adminUid,
  }
}

function ownerName(employee: EmployeeContext, input: TaskReviewInput): string | null {
  if (employee.name.length > 0) {
    return employee.name
  }
  if (typeof input.employeeName === "string" && input.employeeName.length > 0) {
    return input.employeeName
  }
  return null
}

function unifiedStatus(source: ReviewTaskSource, data: DataDocument): TaskStatus {
  if (source === "training") {
    return mapTrainingStatus(parseTrainingStatus(data.status))
  }
  if (source === "clearance") {
    return mapClearanceStatus(parseClearanceStatus(data.status))
  }
  return parseTaskStatus(data.status)
}

function assertReviewedRevision(
  snapshot: DataDocSnapshot,
  expectedRevision: string | null,
): void {
  if (!snapshot.exists()) {
    throw deletedAfterReview()
  }
  if (
    expectedRevision === null ||
    submissionRevision(snapshot.data()) !== expectedRevision
  ) {
    throw changedAfterReview()
  }
}

export async function acceptTask(
  input: TaskReviewInput,
  store: DataStore = getClientDataStore(),
): Promise<void> {
  assertTarget(input)
  try {
    const path = taskPath(input)
    await store.runTransaction(async (transaction) => {
      const employee = await readEmployeeContext(transaction, input)
      const snapshot = await transaction.get(path)
      assertReviewedRevision(snapshot, input.expectedRevision)
      const data = snapshot.data() ?? {}
      if (!canAcceptTask(unifiedStatus(input.taskSource, data))) {
        throw invalidTransition("verified")
      }

      if (input.taskSource === "onboarding") {
        const name = ownerName(employee, input)
        transaction.update(path, {
          status: "verified",
          isCompleted: true,
          updatedAt: serverNow(),
          completedAt: serverNow(),
          ...(name !== null ? { employeeName: name } : {}),
        })
        return
      }
      if (input.taskSource === "training") {
        transaction.update(path, {
          status: "verified",
          updatedAt: serverNow(),
        })
        return
      }
      transaction.update(path, {
        status: "verified",
        verifiedAt: serverNow(),
        updatedAt: serverNow(),
      })
    })
  } catch (error) {
    throw wrapFailure(error, "Failed to verify task.")
  }
}

export async function rejectTask(
  input: TaskReviewInput & { reason: string },
  store: DataStore = getClientDataStore(),
): Promise<void> {
  const reason = input.reason.trim()
  if (reason.length === 0) {
    throw new EmployeeActionError("A rejection reason is required.", "invalid-argument")
  }
  assertTarget(input)
  try {
    const path = taskPath(input)
    await store.runTransaction(async (transaction) => {
      const employee = await readEmployeeContext(transaction, input)
      const snapshot = await transaction.get(path)
      assertReviewedRevision(snapshot, input.expectedRevision)
      const data = snapshot.data() ?? {}
      if (!canRejectTask(unifiedStatus(input.taskSource, data))) {
        throw invalidTransition("rejected")
      }

      if (input.taskSource === "onboarding") {
        const name = ownerName(employee, input)
        transaction.update(path, {
          status: "rejected",
          isCompleted: false,
          updatedAt: serverNow(),
          rejectionReason: reason,
          ...(name !== null ? { employeeName: name } : {}),
        })
        return
      }
      transaction.update(path, {
        status: "actionRequired",
        updatedAt: serverNow(),
        rejectionReason: reason,
      })
    })
  } catch (error) {
    throw wrapFailure(error, "Failed to reject task.")
  }
}

export async function skipTask(
  input: TaskReviewInput & { skip: boolean },
  store: DataStore = getClientDataStore(),
): Promise<void> {
  if (input.taskSource !== "onboarding") {
    throw new EmployeeActionError(
      "Only onboarding requirements can be skipped.",
      "invalid-argument",
    )
  }
  assertTarget(input)
  try {
    const path = taskPath(input)
    await store.runTransaction(async (transaction) => {
      const employee = await readEmployeeContext(transaction, input)
      const snapshot = await transaction.get(path)
      const name = ownerName(employee, input)

      if (!snapshot.exists()) {
        if (!input.skip) {
          throw deletedAfterReview()
        }
        if (input.expectedRevision !== null) {
          throw deletedAfterReview()
        }
        const template = DEFAULT_ONBOARDING_TASKS.find(
          (entry) => entry.id === input.taskId,
        )
        if (!template) {
          throw new EmployeeActionError(
            "Only canonical onboarding template requirements can be created by skipping. Refresh the page.",
            "not-found",
          )
        }
        transaction.set(path, {
          ...onboardingTaskFields(template, {
            employeeId: input.employeeId,
            employeeName: name ?? "",
            adminId: employee.adminId,
          }),
          status: "noActionRequired",
          isCompleted: false,
          updatedAt: serverNow(),
        })
        return
      }

      assertReviewedRevision(snapshot, input.expectedRevision)
      const status = parseTaskStatus(snapshot.data()?.status)
      if (input.skip && status === "noActionRequired") {
        throw invalidTransition("skipped again")
      }
      if (!input.skip && status !== "noActionRequired") {
        throw invalidTransition("marked required")
      }
      transaction.update(path, {
        status: input.skip ? "noActionRequired" : "notStarted",
        isCompleted: false,
        updatedAt: serverNow(),
        ...(name !== null ? { employeeName: name } : {}),
      })
    })
  } catch (error) {
    throw wrapFailure(error, "Failed to update task.")
  }
}

export async function updateBlankFormLink(
  input: TaskActionTarget & {
    newLink: string
  },
  store: DataStore = getClientDataStore(),
): Promise<void> {
  if (!(BLANK_FORM_TASK_IDS as readonly string[]).includes(input.taskId)) {
    throw new EmployeeActionError(
      "This task does not support a blank form link.",
      "invalid-argument",
    )
  }
  if (input.taskSource !== "onboarding") {
    throw new EmployeeActionError(
      "Blank form links belong to onboarding requirements.",
      "invalid-argument",
    )
  }
  const link = input.newLink.trim()
  if (!/^https?:\/\/\S+$/i.test(link)) {
    throw new EmployeeActionError(
      "Enter a valid http(s) URL.",
      "invalid-argument",
    )
  }
  assertTarget(input)
  try {
    const path = taskPath(input)
    await store.runTransaction(async (transaction) => {
      await readEmployeeContext(transaction, input)
      const snapshot = await transaction.get(path)
      assertReviewedRevision(snapshot, input.expectedRevision)
      transaction.update(path, {
        blankFormLink: link,
        updatedAt: serverNow(),
      })
    })
  } catch (error) {
    throw wrapFailure(error, "Failed to save blank form link.")
  }
}

export async function adminUploadTaskDocument(
  input: AdminUploadInput,
  store: DataStore = getClientDataStore(),
): Promise<AdminUploadResult> {
  if (input.taskSource !== "onboarding") {
    throw new EmployeeActionError(
      "Only onboarding requirements accept an administrator upload.",
      "invalid-argument",
    )
  }
  assertTarget(input)
  validateUploadFile(input.file)
  const contentType = resolveUploadContentType(input.file)
  const fileName = sanitizeUploadFileName(input.file.name)

  const attemptId = createUploadAttemptId()
  const storagePath =
    `users/${input.employeeId}/onboarding/${input.taskId}/` +
    `${Date.now()}_${attemptId}_${fileName}`

  let fileUrl: string
  try {
    const bytes = await readFileBytes(input.file)
    fileUrl = await store.uploadFile(storagePath, bytes, contentType, {
      taskId: input.taskId,
      uploadedBy: input.adminUid,
      isAdminUpload: "true",
    })
  } catch (error) {
    throw wrapUploadFailure(error, "Failed to upload the document.")
  }

  try {
    const path = taskPath(input)
    await store.runTransaction(async (transaction) => {
      const employee = await readEmployeeContext(transaction, input)
      const snapshot = await transaction.get(path)
      assertReviewedRevision(snapshot, input.expectedRevision)
      const data = snapshot.data() ?? {}
      if (data.actionType !== "upload") {
        throw new EmployeeActionError(
          "This requirement does not accept an administrator document.",
          "failed-precondition",
        )
      }

      const name = ownerName(employee, input)
      const title =
        typeof input.taskTitle === "string" && input.taskTitle.trim().length > 0
          ? input.taskTitle.trim()
          : null

      transaction.update(path, {
        status: "verified",
        isCompleted: true,
        fileUrl,
        adminId: input.adminUid,
        updatedAt: serverNow(),
        completedAt: serverNow(),
        ...(name !== null ? { employeeName: name } : {}),
        ...(title !== null ? { title } : {}),
      })
    })
  } catch (error) {
    if (isConfirmedFinalizeRejection(error)) {
      await discardUploadedObject(store, storagePath)
      throw wrapUploadFailure(error, "Failed to attach the uploaded document.")
    }

    try {
      if (await taskReferencesUpload(store, input, fileUrl)) {
        return { fileUrl, fileName }
      }
    } catch (readError) {
      console.warn(
        "[task-actions] could not reconcile an uncertain admin upload:",
        readError,
      )
    }
    throw uncertainUploadOutcome(error)
  }

  return { fileUrl, fileName }
}
