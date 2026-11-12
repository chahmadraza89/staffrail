"use client"

import { getClientDataStore } from "@/lib/data/client-store"
import { DATA_COLLECTIONS } from "@/lib/data/collections"
import { serverNow } from "@/lib/data/memory-store"
import type { DataDocument, DataStore } from "@/lib/data/types"
import { EmployeeActionError } from "@/lib/admin/employee-actions"
import {
  isTrainingRequirementType,
  type TrainingRequirementType,
} from "@/lib/admin/training-models"

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
  skippedExisting: number
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

export async function createTrainingTemplate(
  input: CreateTrainingTemplateInput,
  store: DataStore = getClientDataStore(),
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

  try {
    const ref = await store.addDoc(DATA_COLLECTIONS.trainingTemplates, {
      title,
      description,
      durationText,
      requirementType,
      isActive: true,
      adminId: adminUid,
      createdAt: serverNow(),
      updatedAt: serverNow(),
    })
    return { id: ref.id }
  } catch (error) {
    throw new EmployeeActionError(
      "The training template could not be published. Try again.",
      (error as { code?: string })?.code ?? "unknown",
    )
  }
}

function assignmentPayload(
  template: { title: string; description: string; durationText: string },
  instructions: string,
  deadline: Date | null,
  adminUid: string,
): DataDocument {
  const trimmedInstructions = instructions.trim()
  const description =
    trimmedInstructions.length > 0
      ? `${trimmedInstructions}\n\n${template.description}`
      : template.description

  return {
    title: template.title,
    description,
    durationText: template.durationText,
    status: "notStarted",
    certificateUrl: null,
    dueDate: deadline === null ? null : deadline,
    completedAt: null,
    updatedAt: serverNow(),
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
  store: DataStore = getClientDataStore(),
): Promise<AssignTrainingResult> {
  const adminUid = requireAdminUid(input.adminUid)
  const templateId = requireText(input.templateId, "Training template")
  const employeeIds = normalizeEmployeeIds(input.employeeIds)
  const deadline = requireDeadline(input.deadline)
  const instructions = typeof input.instructions === "string" ? input.instructions : ""

  const templatePath = `${DATA_COLLECTIONS.trainingTemplates}/${templateId}`

  try {
    return await store.runTransaction(async (transaction) => {
      const templateSnapshot = await transaction.get(templatePath)
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
        const employeeSnapshot = await transaction.get(`${DATA_COLLECTIONS.users}/${uid}`)
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
            "One of the selected employees no longer belongs to your organization. Reload the list and try again.",
            "permission-denied",
          )
        }

        if (employee.isActive === false || employee.deletedAt != null) {
          skippedInactive += 1
          continue
        }

        const trainingSnapshot = await transaction.get(
          `${DATA_COLLECTIONS.users}/${uid}/${DATA_COLLECTIONS.trainings}/${templateId}`,
        )
        if (trainingSnapshot.exists()) {
          skippedExisting += 1
          continue
        }

        toAssign.push(uid)
      }

      const payload = assignmentPayload(template, instructions, deadline, adminUid)
      for (const uid of toAssign) {
        transaction.set(
          `${DATA_COLLECTIONS.users}/${uid}/${DATA_COLLECTIONS.trainings}/${templateId}`,
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
