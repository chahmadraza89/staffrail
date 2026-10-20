"use client"

import {
  doc,
  runTransaction,
  serverTimestamp,
  type DocumentData,
  type DocumentSnapshot,
  type Firestore,
  type Transaction,
} from "firebase/firestore"

import { getFirebaseFirestore } from "@/lib/firebase/client"
import { FIREBASE_COLLECTIONS } from "@/lib/firebase/collections"
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

/**
 * Task review actions — port of acceptTask / rejectTask / skipTask /
 * updateBlankFormLink in
 * lib/features/admin/admin_directory/presentation/provider/admin_directory_actions.dart.
 *
 * Payload parity is load-bearing (the employee app reads these fields):
 *   - onboarding accept/reject sets `employeeName` from the employee profile;
 *   - training accept writes status/updatedAt only (Dart stamps no
 *     completedAt — kept verbatim);
 *   - clearance accept adds `verifiedAt`;
 *   - rejects never clear a previous completion timestamp;
 *   - skip/unskip is ONBOARDING-only.
 *
 * Corrections carried over from the first port (documented in README):
 *   - skip never mutates the wrong collection for training/clearance;
 *   - blank-form links write ONLY `blankFormLink` + `updatedAt` and require
 *     an existing document (no accidental un-completion, no recreation).
 *
 * Concurrency/authorization hardening added after review:
 *   - Every write runs in a transaction that reads the employee profile and
 *     the task FIRST. The profile must still belong to the signed-in admin
 *     (`adminId`) and still be an active `employee` account.
 *   - `expectedRevision` is the full-document fingerprint the reviewer saw.
 *     The transaction recomputes it at the write boundary, so a deletion, a
 *     replacement upload that leaves status `"submitted"`, another admin's
 *     decision, or any other payload change is rejected with a conflict.
 *     Transaction retries re-run this comparison against the ORIGINAL
 *     revision — a newer submission is never auto-approved.
 *   - Approvals/rejections require an existing document. Updates use
 *     `transaction.update`, never a merge-set, so a deleted task is never
 *     recreated. Skip is the only intentional creation path, and only for a
 *     canonical ONBOARDING TEMPLATE row that was reviewed as missing
 *     (`expectedRevision === null`); it writes the complete template +
 *     ownership metadata via `onboardingTaskFields`.
 *   - Every other field on the task document (attachments, forms,
 *     signatures, unrelated progress) is preserved by the field-level update.
 *
 * These client guards are defense in depth, NOT a substitute for Firestore
 * security rules: the rules remain the server-side authority and must allow
 * only an admin to write tasks of employees they own.
 */

export type ReviewTaskSource = "onboarding" | "training" | "clearance"

export interface TaskActionTarget {
  employeeId: string
  taskId: string
  taskSource: ReviewTaskSource
  /** Signed-in admin uid taken from the established session context. */
  adminUid: string
  /**
   * Full-document revision the reviewer actually saw. `null` means the row
   * was a canonical template default with NO document at review time (only
   * skip may materialize it).
   */
  expectedRevision: string | null
}

export interface TaskReviewInput extends TaskActionTarget {
  /** Fallback profile name (the employee doc's name wins when present). */
  employeeName?: string | null
}

function taskCollection(source: ReviewTaskSource): string {
  switch (source) {
    case "onboarding":
      return FIREBASE_COLLECTIONS.onboardingTasks
    case "training":
      return FIREBASE_COLLECTIONS.trainings
    case "clearance":
      return FIREBASE_COLLECTIONS.clearanceItems
    default: {
      // Exhaustiveness guard for untyped callers.
      const never: never = source
      throw new EmployeeActionError(`Unknown task source: ${String(never)}`, "invalid-argument")
    }
  }
}

function taskReference(db: Firestore, target: TaskActionTarget) {
  assertTarget(target)
  return doc(
    db,
    FIREBASE_COLLECTIONS.users,
    target.employeeId,
    taskCollection(target.taskSource),
    target.taskId,
  )
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
    // Transaction contention exhausted its retries. The exact revision may
    // have changed; never assume the write is still valid.
    return changedAfterReview()
  }
  return new EmployeeActionError(fallback, code)
}

interface EmployeeContext {
  name: string
  adminId: string
}

/**
 * Reads the employee profile INSIDE the transaction, enforcing ownership and
 * activation at the write boundary (the detail page's subscription gate is a
 * UI convenience, not an authorization source).
 */
async function readEmployeeContext(
  transaction: Transaction,
  db: Firestore,
  input: TaskActionTarget,
): Promise<EmployeeContext> {
  const employeeSnapshot = await transaction.get(
    doc(db, FIREBASE_COLLECTIONS.users, input.employeeId),
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
  if (data.isActive === false) {
    throw new EmployeeActionError(
      "This employee is inactive. Reactivate the employee before reviewing requirements.",
      "failed-precondition",
    )
  }
  return {
    // The profile is authoritative; the client-supplied name is only a
    // fallback for legacy docs without one.
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

/** The unified status the review panel evaluates for this source. */
function unifiedStatus(source: ReviewTaskSource, data: DocumentData): TaskStatus {
  if (source === "training") {
    return mapTrainingStatus(parseTrainingStatus(data.status))
  }
  if (source === "clearance") {
    return mapClearanceStatus(parseClearanceStatus(data.status))
  }
  return parseTaskStatus(data.status)
}

/**
 * Compares the transaction's current document with the reviewed revision.
 * Missing docs and missing/mismatched revisions are both hard failures.
 */
function assertReviewedRevision(
  snapshot: DocumentSnapshot<DocumentData>,
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

/** Marks a submitted/rejected task verified (accept & approve). */
export async function acceptTask(
  input: TaskReviewInput,
  db: Firestore = getFirebaseFirestore(),
): Promise<void> {
  assertTarget(input)
  try {
    const reference = taskReference(db, input)
    await runTransaction(db, async (transaction) => {
      const employee = await readEmployeeContext(transaction, db, input)
      const snapshot = await transaction.get(reference)
      assertReviewedRevision(snapshot, input.expectedRevision)
      const data = snapshot.data() ?? {}
      if (!canAcceptTask(unifiedStatus(input.taskSource, data))) {
        throw invalidTransition("verified")
      }

      if (input.taskSource === "onboarding") {
        const name = ownerName(employee, input)
        transaction.update(reference, {
          status: "verified",
          isCompleted: true,
          updatedAt: serverTimestamp(),
          completedAt: serverTimestamp(),
          ...(name !== null ? { employeeName: name } : {}),
        })
        return
      }
      if (input.taskSource === "training") {
        transaction.update(reference, {
          status: "verified",
          updatedAt: serverTimestamp(),
        })
        return
      }
      transaction.update(reference, {
        status: "verified",
        verifiedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    })
  } catch (error) {
    throw wrapFailure(error, "Failed to verify task.")
  }
}

/** Rejects a submitted task with a required, employee-visible reason. */
export async function rejectTask(
  input: TaskReviewInput & { reason: string },
  db: Firestore = getFirebaseFirestore(),
): Promise<void> {
  const reason = input.reason.trim()
  if (reason.length === 0) {
    throw new EmployeeActionError("A rejection reason is required.", "invalid-argument")
  }
  assertTarget(input)
  try {
    const reference = taskReference(db, input)
    await runTransaction(db, async (transaction) => {
      const employee = await readEmployeeContext(transaction, db, input)
      const snapshot = await transaction.get(reference)
      assertReviewedRevision(snapshot, input.expectedRevision)
      const data = snapshot.data() ?? {}
      if (!canRejectTask(unifiedStatus(input.taskSource, data))) {
        throw invalidTransition("rejected")
      }

      if (input.taskSource === "onboarding") {
        const name = ownerName(employee, input)
        transaction.update(reference, {
          status: "rejected",
          isCompleted: false,
          updatedAt: serverTimestamp(),
          rejectionReason: reason,
          ...(name !== null ? { employeeName: name } : {}),
        })
        return
      }
      transaction.update(reference, {
        status: "actionRequired",
        updatedAt: serverTimestamp(),
        rejectionReason: reason,
      })
    })
  } catch (error) {
    throw wrapFailure(error, "Failed to reject task.")
  }
}

/**
 * Skips or un-skips an ONBOARDING requirement (noActionRequired ⇄ notStarted).
 *
 * The ONLY creation path in task review: when the reviewer saw a canonical
 * template row that had no document (`expectedRevision === null`) and clicks
 * Skip, the transaction materializes that template row with the complete
 * template + ownership metadata. A row deleted after a confirmation opened
 * carries a non-null revision and is therefore never recreated.
 */
export async function skipTask(
  input: TaskReviewInput & { skip: boolean },
  db: Firestore = getFirebaseFirestore(),
): Promise<void> {
  if (input.taskSource !== "onboarding") {
    throw new EmployeeActionError(
      "Only onboarding requirements can be skipped.",
      "invalid-argument",
    )
  }
  assertTarget(input)
  try {
    const reference = taskReference(db, input)
    await runTransaction(db, async (transaction) => {
      const employee = await readEmployeeContext(transaction, db, input)
      const snapshot = await transaction.get(reference)
      const name = ownerName(employee, input)

      if (!snapshot.exists()) {
        if (!input.skip) {
          throw deletedAfterReview()
        }
        if (input.expectedRevision !== null) {
          // It existed when the confirmation opened → a deletion, not a
          // missing template row. Never recreate it.
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
        transaction.set(reference, {
          ...onboardingTaskFields(template, {
            employeeId: input.employeeId,
            employeeName: name ?? "",
            adminId: employee.adminId,
          }),
          status: "noActionRequired",
          isCompleted: false,
          updatedAt: serverTimestamp(),
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
      transaction.update(reference, {
        status: input.skip ? "noActionRequired" : "notStarted",
        isCompleted: false,
        updatedAt: serverTimestamp(),
        ...(name !== null ? { employeeName: name } : {}),
      })
    })
  } catch (error) {
    throw wrapFailure(error, "Failed to update task.")
  }
}

/**
 * Saves the admin-configured blank-form URL for the I-9 / W-9 tasks.
 * Writes only the URL (+ updatedAt), requires the task to still exist and to
 * match the revision the admin edited, and preserves every other field.
 */
export async function updateBlankFormLink(
  input: TaskActionTarget & {
    newLink: string
  },
  db: Firestore = getFirebaseFirestore(),
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
    const reference = taskReference(db, input)
    await runTransaction(db, async (transaction) => {
      await readEmployeeContext(transaction, db, input)
      const snapshot = await transaction.get(reference)
      assertReviewedRevision(snapshot, input.expectedRevision)
      transaction.update(reference, {
        blankFormLink: link,
        updatedAt: serverTimestamp(),
      })
    })
  } catch (error) {
    throw wrapFailure(error, "Failed to save blank form link.")
  }
}
