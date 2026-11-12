"use client"

import { callLocalServerAction, getClientDataStore } from "@/lib/data/client-store"
import { DATA_COLLECTIONS } from "@/lib/data/collections"
import { serverNow } from "@/lib/data/memory-store"
import type { DataDocument, DataStore } from "@/lib/data/types"
import {
  DEFAULT_CLEARANCES,
  DEFAULT_ONBOARDING_TASKS,
  DEFAULT_TRAININGS,
  clearanceFields,
  onboardingTaskFields,
  trainingFields,
} from "@/lib/admin/seed-templates"

export class EmployeeActionError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message)
    this.name = "EmployeeActionError"
  }
}

export type SetupStatus = "complete" | "incomplete"

export interface RegisteredStaffResult {
  uid: string
  resetLink: string | null
  setup: SetupStatus
  setupError?: string
  retainedLegacy?: string[]
}

export interface ProvisionOutcome {
  created: number
  overlaid: number
  removed: number
  retainedLegacy: string[]
}

export type RegisterStaffFn = (payload: {
  email: string
  name: string
  role: string
  webProvisioning: boolean
}) => Promise<{ uid: string; resetLink?: string | null }>

export const REGISTER_STAFF_TIMEOUT_MS = 45_000

function unwrapActionError(error: unknown): EmployeeActionError {
  if (error instanceof EmployeeActionError) {
    return error
  }
  const code = (error as { code?: string })?.code ?? "unknown"
  const rawMessage = ((error as { message?: string })?.message ?? "").replace(
    /^(functions\/|Cloud Firestore: |Firebase: )/,
    "",
  )
  return new EmployeeActionError(rawMessage || "Staff registration failed.", code)
}

const LEGACY_ONBOARDING_DOC_IDS = ["personal_details", "employee_handbook"] as const
const LEGACY_TRAINING_DOC_IDS = ["hipaa_compliance"] as const

const TASK_OVERLAY_KEYS = ["title", "subtitle", "actionType", "employeeName", "employeeId", "adminId"] as const
const TRAINING_OVERLAY_KEYS = ["title", "description", "durationText", "employeeId", "adminId"] as const
const CLEARANCE_OVERLAY_KEYS = ["title", "description", "employeeName", "employeeId", "adminId"] as const

function pickFields(
  fields: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  const overlay: Record<string, unknown> = {}
  for (const key of keys) {
    overlay[key] = fields[key]
  }
  return overlay
}

function isPristineOnboarding(data: DataDocument): boolean {
  return (
    data.status === "notStarted" &&
    data.isCompleted !== true &&
    !data.fileUrl &&
    !data.signatureUrl &&
    !data.formData &&
    !data.completedAt &&
    !data.signedAt &&
    data.adminFormData == null
  )
}

function isPristineTraining(data: DataDocument): boolean {
  return (
    data.status === "notStarted" &&
    !data.certificateUrl &&
    (!Array.isArray(data.certificateUrls) || data.certificateUrls.length === 0) &&
    !data.completedAt &&
    !data.completionDate
  )
}

export async function provisionEmployeeDocuments(
  store: DataStore,
  context: { uid: string; name: string; adminId: string },
): Promise<ProvisionOutcome> {
  const seedContext = {
    employeeId: context.uid,
    employeeName: context.name,
    adminId: context.adminId,
  }

  return store.runTransaction(async (transaction) => {
    const assignedAt = new Date()
    const outcome: ProvisionOutcome = { created: 0, overlaid: 0, removed: 0, retainedLegacy: [] }

    const userPath = `${DATA_COLLECTIONS.users}/${context.uid}`
    const userSnapshot = await transaction.get(userPath)
    if (!userSnapshot.exists()) {
      throw new EmployeeActionError("Employee profile not found.", "not-found")
    }

    interface ExistingDoc {
      path: string
      exists: boolean
      data: DataDocument | null
    }

    const readTemplate = async (collectionName: string, id: string): Promise<ExistingDoc> => {
      const path = `${DATA_COLLECTIONS.users}/${context.uid}/${collectionName}/${id}`
      const snapshot = await transaction.get(path)
      return {
        path,
        exists: snapshot.exists(),
        data: snapshot.exists() ? (snapshot.data() ?? {}) : null,
      }
    }

    const templateDocs: Array<{
      collectionName: string
      id: string
      doc: ExistingDoc
      fields: Record<string, unknown>
      overlayKeys: readonly string[]
    }> = []

    for (const task of DEFAULT_ONBOARDING_TASKS) {
      templateDocs.push({
        collectionName: DATA_COLLECTIONS.onboardingTasks,
        id: task.id,
        doc: await readTemplate(DATA_COLLECTIONS.onboardingTasks, task.id),
        fields: onboardingTaskFields(task, seedContext),
        overlayKeys: TASK_OVERLAY_KEYS,
      })
    }
    for (const training of DEFAULT_TRAININGS) {
      templateDocs.push({
        collectionName: DATA_COLLECTIONS.trainings,
        id: training.id,
        doc: await readTemplate(DATA_COLLECTIONS.trainings, training.id),
        fields: trainingFields(training, seedContext, assignedAt),
        overlayKeys: TRAINING_OVERLAY_KEYS,
      })
    }
    for (const clearance of DEFAULT_CLEARANCES) {
      templateDocs.push({
        collectionName: DATA_COLLECTIONS.clearanceItems,
        id: clearance.id,
        doc: await readTemplate(DATA_COLLECTIONS.clearanceItems, clearance.id),
        fields: clearanceFields(clearance, seedContext),
        overlayKeys: CLEARANCE_OVERLAY_KEYS,
      })
    }

    const legacyDocs: Array<{ doc: ExistingDoc; pristine: (data: DataDocument) => boolean }> = []
    for (const id of LEGACY_ONBOARDING_DOC_IDS) {
      legacyDocs.push({
        doc: await readTemplate(DATA_COLLECTIONS.onboardingTasks, id),
        pristine: isPristineOnboarding,
      })
    }
    for (const id of LEGACY_TRAINING_DOC_IDS) {
      legacyDocs.push({
        doc: await readTemplate(DATA_COLLECTIONS.trainings, id),
        pristine: isPristineTraining,
      })
    }

    for (const entry of templateDocs) {
      if (!entry.doc.exists) {
        transaction.set(entry.doc.path, {
          ...entry.fields,
          updatedAt: serverNow(),
        })
        outcome.created += 1
      } else {
        transaction.set(
          entry.doc.path,
          pickFields(entry.fields, entry.overlayKeys),
          { merge: true },
        )
        outcome.overlaid += 1
      }
    }

    for (const legacy of legacyDocs) {
      if (!legacy.doc.exists) {
        continue
      }
      if (legacy.pristine(legacy.doc.data ?? {})) {
        transaction.delete(legacy.doc.path)
        outcome.removed += 1
      } else {
        outcome.retainedLegacy.push(legacy.doc.path.split("/").slice(-2).join("/"))
      }
    }

    transaction.set(userPath, { setupStatus: "complete" }, { merge: true })

    return outcome
  })
}

async function ensureSetupStatusIncomplete(store: DataStore, uid: string): Promise<void> {
  try {
    await store.runTransaction(async (transaction) => {
      const path = `${DATA_COLLECTIONS.users}/${uid}`
      const snapshot = await transaction.get(path)
      if (!snapshot.exists()) {
        return
      }
      if (snapshot.data()?.setupStatus !== undefined) {
        return
      }
      transaction.set(path, { setupStatus: "incomplete" }, { merge: true })
    })
  } catch (error) {
    console.warn("[employee-actions] could not fill a missing setup-status marker:", error)
  }
}

async function assertActiveAdmin(store: DataStore, adminUid: string): Promise<void> {
  const snapshot = await store.getDoc(`${DATA_COLLECTIONS.users}/${adminUid}`)
  const veto = (() => {
    if (!snapshot.exists()) {
      return "Your admin profile could not be found."
    }
    const data = snapshot.data()
    if (data?.role !== "admin" || data?.isActive === false || data?.deletedAt != null) {
      return "Only active admins may provision employee setup."
    }
    return null
  })()
  if (veto) {
    throw new EmployeeActionError(veto, "permission-denied")
  }
}

async function assertEmployeeOwnership(
  store: DataStore,
  uid: string,
  adminUid: string,
): Promise<DataDocument> {
  const snapshot = await store.getDoc(`${DATA_COLLECTIONS.users}/${uid}`)
  if (!snapshot.exists()) {
    throw new EmployeeActionError("Employee not found", "not-found")
  }
  const data = snapshot.data()
  if (data?.adminId !== adminUid) {
    throw new EmployeeActionError(
      "This employee does not belong to your workspace.",
      "permission-denied",
    )
  }
  return data ?? {}
}

export async function registerStaff(
  input: { name: string; email: string; adminUid: string },
  registerFn?: RegisterStaffFn,
  db?: DataStore,
): Promise<RegisteredStaffResult> {
  const store = db ?? getClientDataStore()

  let resultUid: string
  let resetLink: string | null = null
  try {
    const result = registerFn
      ? await registerFn({
          email: input.email,
          name: input.name,
          role: "employee",
          webProvisioning: true,
        })
      : await callLocalServerAction<{ uid: string; resetLink?: string | null }>(
          "registerStaff",
          {
            email: input.email,
            name: input.name,
            role: "employee",
            webProvisioning: true,
          },
        )
    if (!result?.uid) {
      throw new EmployeeActionError("Registration function returned no account id.", "internal")
    }
    resultUid = result.uid
    resetLink = result.resetLink ?? null
  } catch (error) {
    throw unwrapActionError(error)
  }

  try {
    await assertActiveAdmin(store, input.adminUid)
    const outcome = await provisionEmployeeDocuments(store, {
      uid: resultUid,
      name: input.name,
      adminId: input.adminUid,
    })
    return {
      uid: resultUid,
      resetLink,
      setup: "complete",
      ...(outcome.retainedLegacy.length > 0 ? { retainedLegacy: outcome.retainedLegacy } : {}),
    }
  } catch (setupFailure) {
    const setupError =
      setupFailure instanceof EmployeeActionError
        ? setupFailure.message
        : ((setupFailure as { message?: string } | null)?.message ??
          "Employee setup could not be completed.")
    console.warn("[employee-actions] employee document setup warning:", setupFailure)
    await ensureSetupStatusIncomplete(store, resultUid)
    return { uid: resultUid, resetLink, setup: "incomplete", setupError }
  }
}

export async function completeEmployeeSetup(
  input: { uid: string; adminUid: string },
  db?: DataStore,
): Promise<ProvisionOutcome> {
  const store = db ?? getClientDataStore()
  try {
    await assertActiveAdmin(store, input.adminUid)
    const employee = await assertEmployeeOwnership(store, input.uid, input.adminUid)
    const name = typeof employee.name === "string" ? employee.name : ""
    return await provisionEmployeeDocuments(store, {
      uid: input.uid,
      name,
      adminId: input.adminUid,
    })
  } catch (error) {
    const skipFallback =
      error instanceof EmployeeActionError &&
      (error.code === "not-found" || error.code === "permission-denied")
    if (!skipFallback) {
      await ensureSetupStatusIncomplete(store, input.uid)
    }
    throw error
  }
}

export async function updateEmployee(
  input: { uid: string; name: string; email: string },
  db?: DataStore,
): Promise<void> {
  const store = db ?? getClientDataStore()
  try {
    await store.runTransaction(async (transaction) => {
      const path = `${DATA_COLLECTIONS.users}/${input.uid}`
      const snapshot = await transaction.get(path)
      if (!snapshot.exists()) {
        throw new EmployeeActionError("Employee not found", "not-found")
      }
      const data = snapshot.data()
      if (data?.isActive !== true || data?.deletedAt != null) {
        throw new EmployeeActionError(
          "This employee is deactivated and can no longer be edited.",
          "employee-inactive",
        )
      }
      transaction.update(path, {
        name: input.name,
        email: input.email,
      })
    })
  } catch (error) {
    if (error instanceof EmployeeActionError) {
      throw error
    }
    const code = (error as { code?: string })?.code ?? "unknown"
    throw new EmployeeActionError("Failed to update employee.", code)
  }
}

export async function deactivateEmployee(uid: string, db?: DataStore): Promise<void> {
  const store = db ?? getClientDataStore()
  try {
    await store.updateDoc(`${DATA_COLLECTIONS.users}/${uid}`, {
      isActive: false,
      deletedAt: serverNow(),
    })
  } catch (error) {
    const code = (error as { code?: string })?.code ?? "unknown"
    throw new EmployeeActionError(
      "Failed to deactivate employee.",
      /permission-denied/.test(code) ? "permission-denied" : code,
    )
  }
}
