"use client"

import {
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
} from "firebase/firestore"

import { getFirebaseFirestore } from "@/lib/firebase/client"
import { FIREBASE_COLLECTIONS } from "@/lib/firebase/collections"
import { EmployeeActionError } from "@/lib/admin/employee-actions"
import { BLANK_FORM_TASK_IDS } from "@/lib/admin/task-format"

/**
 * Task review actions — port of acceptTask / rejectTask / skipTask /
 * updateBlankFormLink in
 * lib/features/admin/admin_directory/presentation/provider/admin_directory_actions.dart.
 *
 * Write payloads are byte-identical to the Dart services
 * (OnboardingTaskDTO.updateStatusToFirestore, TrainingDTO/ClearanceDTO
 * updateStatusToFirestore), including the quirks:
 *   - onboarding writes are MERGED set() calls, so a template row without a
 *     document can materialize (skip does this with its title/owner fields);
 *   - training/clearance writes use update(), which fails on a missing doc;
 *   - accept stamps completedAt for onboarding, verifiedAt for clearance, and
 *     (Dart quirk) nothing beyond status/updatedAt for training;
 *   - reject writes status/rejectionReason but never clears a previous
 *     completedAt;
 *   - employeeName/title overlays are written only when supplied.
 *
 * Two deliberate corrections (documented in admin/README.md):
 *  1. skipTask is ONBOARDING-only. The Flutter panel renders the skip switch
 *     for training/clearance rows too, but the action always wrote to the
 *     onboarding_tasks subcollection — i.e. it mutated the WRONG document.
 *  2. updateBlankFormLink writes ONLY `blankFormLink` + `updatedAt`.
 *     Dart re-sent `status` and the default `isCompleted:false`, so saving a
 *     URL on a verified I-9/W-9 silently un-completed the task while leaving
 *     its status verified. It also used a merge-set that could recreate a
 *     deleted task as a metadata-less stub; update() refuses instead.
 */

export type ReviewTaskSource = "onboarding" | "training" | "clearance"

export interface TaskActionTarget {
  employeeId: string
  taskId: string
  taskSource: ReviewTaskSource
}

export interface TaskReviewInput extends TaskActionTarget {
  /** Profile name — Dart stamps it on every reviewed row. */
  employeeName?: string | null
  taskTitle?: string | null
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
}

function wrapFailure(error: unknown, fallback: string): EmployeeActionError {
  if (error instanceof EmployeeActionError) {
    return error
  }
  const code = (error as { code?: string } | null)?.code ?? "unknown"
  return new EmployeeActionError(fallback, code)
}

/** Optional owner/title metadata, matching Dart's null-conditional writes. */
function ownershipFields(input: TaskReviewInput): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  if (typeof input.employeeName === "string" && input.employeeName.length > 0) {
    fields.employeeName = input.employeeName
  }
  if (typeof input.taskTitle === "string" && input.taskTitle.length > 0) {
    fields.title = input.taskTitle
  }
  return fields
}

/** Marks a submitted/rejected task verified (accept & approve). */
export async function acceptTask(
  input: TaskReviewInput,
  db: Firestore = getFirebaseFirestore(),
): Promise<void> {
  try {
    const reference = taskReference(db, input)
    if (input.taskSource === "onboarding") {
      await setDoc(
        reference,
        {
          status: "verified",
          isCompleted: true,
          updatedAt: serverTimestamp(),
          completedAt: serverTimestamp(),
          ...ownershipFields({ ...input, taskTitle: null }),
        },
        { merge: true },
      )
      return
    }
    if (input.taskSource === "training") {
      await updateDoc(reference, {
        status: "verified",
        updatedAt: serverTimestamp(),
      })
      return
    }
    await updateDoc(reference, {
      status: "verified",
      verifiedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
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
  try {
    const reference = taskReference(db, input)
    if (input.taskSource === "onboarding") {
      await setDoc(
        reference,
        {
          status: "rejected",
          isCompleted: false,
          updatedAt: serverTimestamp(),
          rejectionReason: reason,
          ...ownershipFields({ ...input, taskTitle: null }),
        },
        { merge: true },
      )
      return
    }
    await updateDoc(reference, {
      status: "actionRequired",
      updatedAt: serverTimestamp(),
      rejectionReason: reason,
    })
  } catch (error) {
    throw wrapFailure(error, "Failed to reject task.")
  }
}

/**
 * Skips or un-skips an ONBOARDING requirement (noActionRequired ⇄ notStarted).
 * Never called for training/clearance rows — see the module comment.
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
  try {
    const reference = taskReference(db, input)
    await setDoc(
      reference,
      {
        status: input.skip ? "noActionRequired" : "notStarted",
        isCompleted: false,
        updatedAt: serverTimestamp(),
        ...ownershipFields(input),
      },
      { merge: true },
    )
  } catch (error) {
    throw wrapFailure(error, "Failed to update task.")
  }
}

/**
 * Saves the admin-configured blank-form URL for the I-9 / W-9 tasks.
 * Writes only the URL (+ updatedAt) — see correction 2 above.
 */
export async function updateBlankFormLink(
  input: Pick<TaskActionTarget, "employeeId" | "taskId" | "taskSource"> & {
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
  try {
    const reference = taskReference(db, input)
    await updateDoc(reference, {
      blankFormLink: link,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    throw wrapFailure(error, "Failed to save blank form link.")
  }
}
