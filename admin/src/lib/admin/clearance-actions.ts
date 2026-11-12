"use client"

import { getClientDataStore } from "@/lib/data/client-store"
import { DATA_COLLECTIONS } from "@/lib/data/collections"
import { serverNow } from "@/lib/data/memory-store"
import type { DataDocSnapshot, DataDocument, DataStore, DataTransaction } from "@/lib/data/types"
import { EmployeeActionError } from "@/lib/admin/employee-actions"
import { parseClearanceStatus } from "@/lib/admin/employee-detail-streams"
import { submissionRevision } from "@/lib/admin/task-revision"

export interface ClearanceActionTarget {
  adminUid: string
  employeeId: string
  clearanceId: string
  expectedRevision: string
}

export interface VerifyClearanceInput extends ClearanceActionTarget {
  signatureData?: string | null
}

export interface RejectClearanceInput extends ClearanceActionTarget {
  reason: string
}

export const MAX_CLEARANCE_SIGNATURE_LENGTH = 700_000

function invalid(message: string): never {
  throw new EmployeeActionError(message, "invalid-argument")
}

function assertTarget(target: ClearanceActionTarget): void {
  if (
    typeof target.employeeId !== "string" ||
    target.employeeId.length === 0 ||
    typeof target.clearanceId !== "string" ||
    target.clearanceId.length === 0
  ) {
    invalid("A clearance record and employee are required.")
  }
  if (typeof target.adminUid !== "string" || target.adminUid.length === 0) {
    throw new EmployeeActionError(
      "Your admin session could not be verified. Sign in again.",
      "unauthenticated",
    )
  }
  if (
    typeof target.expectedRevision !== "string" ||
    target.expectedRevision.length === 0
  ) {
    invalid("A reviewed clearance revision is required.")
  }
}

function normalizeSignature(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value !== "string") {
    invalid("The signature could not be read. Clear it and sign again.")
  }
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }
  if (trimmed.length > MAX_CLEARANCE_SIGNATURE_LENGTH) {
    invalid("The signature image is too large. Clear it and sign again.")
  }
  return trimmed
}

function clearancePath(target: ClearanceActionTarget): string {
  assertTarget(target)
  return `${DATA_COLLECTIONS.users}/${target.employeeId}/${DATA_COLLECTIONS.clearanceItems}/${target.clearanceId}`
}

function deletedAfterReview(): EmployeeActionError {
  return new EmployeeActionError(
    "This clearance was deleted or moved after you opened it. Return to Verify and refresh the list.",
    "not-found",
  )
}

function changedAfterReview(): EmployeeActionError {
  return new EmployeeActionError(
    "This clearance changed since you reviewed it. Return to Verify and review the latest document.",
    "conflict",
  )
}

function invalidTransition(action: string): EmployeeActionError {
  return new EmployeeActionError(
    `This clearance can no longer be ${action}. Return to Verify to see its current status.`,
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
  adminId: string
}

async function readEmployeeContext(
  transaction: DataTransaction,
  target: ClearanceActionTarget,
): Promise<EmployeeContext> {
  const employeeSnapshot = await transaction.get(
    `${DATA_COLLECTIONS.users}/${target.employeeId}`,
  )
  if (!employeeSnapshot.exists()) {
    throw new EmployeeActionError(
      "Employee profile not found. Refresh the Directory.",
      "not-found",
    )
  }

  const data = employeeSnapshot.data() ?? {}
  if (data.role !== "employee" || data.adminId !== target.adminUid) {
    throw new EmployeeActionError(
      "You no longer have access to this employee's records. Refresh the page.",
      "permission-denied",
    )
  }
  if (data.isActive === false || data.deletedAt != null) {
    throw new EmployeeActionError(
      "This employee is inactive. Reactivate the employee before reviewing clearances.",
      "failed-precondition",
    )
  }

  return { adminId: target.adminUid }
}

function assertReviewedRevision(
  snapshot: DataDocSnapshot,
  expectedRevision: string,
): DataDocument {
  if (!snapshot.exists()) {
    throw deletedAfterReview()
  }
  const data = snapshot.data() ?? {}
  if (submissionRevision(data) !== expectedRevision) {
    throw changedAfterReview()
  }
  return data
}

function assertReviewable(data: DataDocument, action: string): void {
  if (parseClearanceStatus(data.status) !== "underReview") {
    throw invalidTransition(action)
  }
}

export async function verifyClearance(
  input: VerifyClearanceInput,
  store: DataStore = getClientDataStore(),
): Promise<void> {
  const signature = normalizeSignature(input.signatureData)
  try {
    const path = clearancePath(input)
    await store.runTransaction(async (transaction) => {
      const employee = await readEmployeeContext(transaction, input)
      const snapshot = await transaction.get(path)
      const data = assertReviewedRevision(snapshot, input.expectedRevision)
      assertReviewable(data, "verified")

      transaction.update(path, {
        status: "verified",
        verifiedAt: serverNow(),
        updatedAt: serverNow(),
        verifiedBy: employee.adminId,
        ...(signature !== null ? { adminSignature: signature } : {}),
      })
    })
  } catch (error) {
    throw wrapFailure(error, "The clearance could not be verified. Try again.")
  }
}

export async function rejectClearance(
  input: RejectClearanceInput,
  store: DataStore = getClientDataStore(),
): Promise<void> {
  const reason = typeof input.reason === "string" ? input.reason.trim() : ""
  if (reason.length === 0) {
    invalid("A rejection reason is required.")
  }

  try {
    const path = clearancePath(input)
    await store.runTransaction(async (transaction) => {
      await readEmployeeContext(transaction, input)
      const snapshot = await transaction.get(path)
      const data = assertReviewedRevision(snapshot, input.expectedRevision)
      assertReviewable(data, "rejected")

      transaction.update(path, {
        status: "actionRequired",
        rejectionReason: reason,
        updatedAt: serverNow(),
      })
    })
  } catch (error) {
    throw wrapFailure(error, "The clearance could not be rejected. Try again.")
  }
}
