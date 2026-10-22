"use client"

import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentData,
  type Firestore,
} from "firebase/firestore"

import { getFirebaseFirestore } from "@/lib/firebase/client"
import { FIREBASE_COLLECTIONS } from "@/lib/firebase/collections"
import { EmployeeActionError } from "@/lib/admin/employee-actions"
import {
  isTrainingRequirementType,
  type TrainingRequirementType,
} from "@/lib/admin/training-models"

/**
 * Training template + assignment actions — port of
 * `AdminTrainingService.createTrainingTemplate` / `assignTraining`
 * (lib/features/admin/admin_training/data/data_scource/admin_training_service.dart).
 *
 * Payloads stay byte-compatible with the Dart DTOs the employee app reads:
 *   - a template is `{title, description, durationText, requirementType,
 *     isActive: true, createdAt, updatedAt}`;
 *   - an assignment is written to `users/{uid}/trainings/{templateId}` with
 *     the initial TrainingDTO map (nulls included, `certificateUrls`
 *     deliberately absent — see below) plus `adminId` for the
 *     collection-group query. The description is
 *     `"<instructions>\n\n<template description>"` when instructions exist,
 *     otherwise just the template description.
 *
 * Documented corrections (see admin/README.md):
 *   - Assignments never overwrite an existing training. Flutter's
 *     `batch.set` replaced the employee's whole document, so re-assigning a
 *     template reset real progress (uploads, status, completion dates).
 *     Existing documents are reported as `skippedExisting` and left intact.
 *   - `certificateUrls` is not written for new assignments. The Flutter
 *     upload DTO updates only the legacy `certificateUrl`; a stored empty
 *     array would take precedence over it and hide the upload forever.
 *     Omitting the array preserves the established legacy fallback without
 *     changing either reader's rule that an explicitly stored array wins.
 *   - Inactive employees are never assigned new work (`skippedInactive`),
 *     and ownership/role are re-verified inside the transaction.
 *   - A single transaction reads the template, every employee profile and
 *     every existing assignment BEFORE writing anything, so a selection
 *     that no longer belongs to this admin aborts without partial writes.
 *
 * These client-side guards are defense in depth, not a replacement for
 * Firestore security rules.
 */

/** Firestore's transactional write ceiling minus headroom for retries. */
export const MAX_ASSIGNMENT_RECIPIENTS = 200

export interface CreateTrainingTemplateInput {
  adminUid: string
  title: string
  description: string
  durationText: string
  requirementType: string
}

export interface AssignTrainingInput {
  adminUid: string
  templateId: string
  employeeIds: readonly string[]
  deadline: Date | null
  instructions: string
}

export interface AssignTrainingResult {
  assigned: number
  /** Employees who already hold this training and were left untouched. */
  skippedExisting: number
  /** Inactive employees removed from the audience. */
  skippedInactive: number
}

function invalid(message: string): never {
  throw new EmployeeActionError(message, "invalid-argument")
}

function requireAdminUid(adminUid: string): string {
  if (typeof adminUid !== "string" || adminUid.trim().length === 0) {
    throw new EmployeeActionError(
      "Your admin session could not be verified. Sign in again.",
      "unauthenticated",
    )
  }
  return adminUid
}

function requireText(value: string, label: string): string {
  const trimmed = typeof value === "string" ? value.trim() : ""
  if (trimmed.length === 0) {
    invalid(`${label} is required.`)
  }
  return trimmed
}

function requireDeadline(deadline: Date | null): Date | null {
  if (deadline === null) {
    return null
  }
  if (!(deadline instanceof Date) || Number.isNaN(deadline.getTime())) {
    invalid("Choose a valid deadline.")
  }
  return deadline
}

function normalizeEmployeeIds(ids: readonly string[]): string[] {
  if (!Array.isArray(ids)) {
    invalid("Choose at least one employee.")
  }

  const seen = new Set<string>()
  const normalized: string[] = []
  for (const id of ids) {
    if (typeof id !== "string" || id.length === 0) {
      invalid("Choose at least one employee.")
    }
    if (seen.has(id)) {
      continue
    }
    seen.add(id)
    normalized.push(id)
  }

  if (normalized.length === 0) {
    invalid("Choose at least one employee.")
  }
  if (normalized.length > MAX_ASSIGNMENT_RECIPIENTS) {
    invalid(
      `Select ${MAX_ASSIGNMENT_RECIPIENTS} employees or fewer per assignment. ` +
        "Split larger audiences into multiple batches.",
    )
  }

  return normalized
}

/** Generates an id exactly like the Dart `collection.doc()` call. */
export async function createTrainingTemplate(
  input: CreateTrainingTemplateInput,
  db: Firestore = getFirebaseFirestore(),
): Promise<{ id: string }> {
  const adminUid = requireAdminUid(input.adminUid)
  const title = requireText(input.title, "Title")
  const description = requireText(input.description, "Description")
  const durationText = requireText(input.durationText, "Duration")

  const requirementType: TrainingRequirementType = isTrainingRequirementType(
    input.requirementType,
  )
    ? input.requirementType
    : invalid("Choose a valid requirement type.")

  const reference = doc(
    collection(db, FIREBASE_COLLECTIONS.trainingTemplates),
  )

  try {
    await setDoc(reference, {
      title,
      description,
      durationText,
      requirementType,
      isActive: true,
      // Templates are global in the Flutter data model; the owning admin is
      // recorded for auditing/rules without changing how Flutter reads them.
      adminId: adminUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    throw new EmployeeActionError(
      "The training template could not be published. Try again.",
      (error as { code?: string })?.code ?? "unknown",
    )
  }

  return { id: reference.id }
}

function assignmentPayload(
  template: { title: string; description: string; durationText: string },
  instructions: string,
  deadline: Date | null,
  adminUid: string,
): DocumentData {
  const trimmedInstructions = instructions.trim()
  const description =
    trimmedInstructions.length > 0
      ? `${trimmedInstructions}\n\n${template.description}`
      : template.description

  // Field-for-field initial TrainingDTO.toFirestore output (minus
  // `certificateUrls`, explained below) plus adminId. `updatedAt` is the only
  // server timestamp the Dart payload writes.
  //
  // `certificateUrls` is deliberately OMITTED. The Flutter upload path
  // (`TrainingDTO.updateCertificateToFirestore` via `submitCertificate`)
  // writes only the legacy `certificateUrl` field on an existing document.
  // Both readers give a present `certificateUrls` array precedence, so an
  // empty array written here would permanently hide every future upload.
  // With no array stored, `resolveCertificateUrls` falls back to
  // `certificateUrl` exactly like the Dart DTO. Existing documents are never
  // migrated; an explicitly stored array (including an intentionally empty
  // one) remains authoritative.
  return {
    title: template.title,
    description,
    durationText: template.durationText,
    status: "notStarted",
    certificateUrl: null,
    dueDate: deadline === null ? null : Timestamp.fromDate(deadline),
    completedAt: null,
    updatedAt: serverTimestamp(),
    expirationDate: null,
    completionDate: null,
    noExpiration: false,
    rejectionReason: null,
    employeeId: null,
    adminId: adminUid,
    assignedAt: null,
  }
}

export async function assignTraining(
  input: AssignTrainingInput,
  db: Firestore = getFirebaseFirestore(),
): Promise<AssignTrainingResult> {
  const adminUid = requireAdminUid(input.adminUid)
  const templateId = requireText(input.templateId, "Training template")
  const employeeIds = normalizeEmployeeIds(input.employeeIds)
  const deadline = requireDeadline(input.deadline)
  const instructions = typeof input.instructions === "string" ? input.instructions : ""

  const templateRef = doc(db, FIREBASE_COLLECTIONS.trainingTemplates, templateId)

  try {
    return await runTransaction(db, async (transaction) => {
      // ── read phase (Firestore requires every read before the first write) ──
      const templateSnapshot = await transaction.get(templateRef)
      if (!templateSnapshot.exists()) {
        throw new EmployeeActionError(
          "This training template no longer exists. Close the dialog and choose another.",
          "not-found",
        )
      }

      const rawTemplate = templateSnapshot.data() ?? {}
      const template = {
        title: typeof rawTemplate.title === "string" ? rawTemplate.title : "",
        description:
          typeof rawTemplate.description === "string" ? rawTemplate.description : "",
        durationText:
          typeof rawTemplate.durationText === "string" ? rawTemplate.durationText : "",
      }

      const toAssign: string[] = []
      let skippedExisting = 0
      let skippedInactive = 0

      for (const uid of employeeIds) {
        const employeeSnapshot = await transaction.get(
          doc(db, FIREBASE_COLLECTIONS.users, uid),
        )
        if (!employeeSnapshot.exists()) {
          throw new EmployeeActionError(
            "One of the selected employees no longer exists. Reload the list and try again.",
            "not-found",
          )
        }

        const employee = employeeSnapshot.data() ?? {}
        if (
          typeof employee.adminId !== "string" ||
          employee.adminId !== adminUid ||
          employee.role !== "employee"
        ) {
          throw new EmployeeActionError(
            "One of the selected employees no longer belongs to your clinic. Reload the list and try again.",
            "permission-denied",
          )
        }

        if (employee.isActive === false) {
          skippedInactive += 1
          continue
        }

        const trainingSnapshot = await transaction.get(
          doc(db, FIREBASE_COLLECTIONS.users, uid, FIREBASE_COLLECTIONS.trainings, templateId),
        )
        if (trainingSnapshot.exists()) {
          skippedExisting += 1
          continue
        }

        toAssign.push(uid)
      }

      // ── write phase ──────────────────────────────────────────────────────
      const payload = assignmentPayload(template, instructions, deadline, adminUid)
      for (const uid of toAssign) {
        transaction.set(
          doc(db, FIREBASE_COLLECTIONS.users, uid, FIREBASE_COLLECTIONS.trainings, templateId),
          payload,
        )
      }

      return {
        assigned: toAssign.length,
        skippedExisting,
        skippedInactive,
      }
    })
  } catch (error) {
    if (error instanceof EmployeeActionError) {
      throw error
    }
    throw new EmployeeActionError(
      "The training could not be assigned. Try again.",
      (error as { code?: string })?.code ?? "unknown",
    )
  }
}
