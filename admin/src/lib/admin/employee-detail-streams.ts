"use client"

import { getClientDataStore } from "@/lib/data/client-store"
import { DATA_COLLECTIONS } from "@/lib/data/collections"
import { toDateOrNull } from "@/lib/data/dates"
import type { DataDocument, DataStore, Unsubscribe } from "@/lib/data/types"
import { parseTaskStatus, type TaskStatus } from "@/lib/admin/task-status"
import { submissionRevision } from "@/lib/admin/task-revision"
import { str } from "@/lib/admin/dashboard-streams"
import type { LiveStreamController } from "@/lib/admin/stream-protocol"

export type { Unsubscribe }

export const MODULE_IDS = ["onboardingTasks", "trainings", "clearance"] as const
export type ModuleId = (typeof MODULE_IDS)[number]

export const MODULE_LABELS: Record<ModuleId, string> = {
  onboardingTasks: "onboarding tasks",
  trainings: "training records",
  clearance: "clearance records",
}

const MODULE_COLLECTIONS: Record<ModuleId, string> = {
  onboardingTasks: DATA_COLLECTIONS.onboardingTasks,
  trainings: DATA_COLLECTIONS.trainings,
  clearance: DATA_COLLECTIONS.clearanceItems,
}

export function moduleForSource(source: "onboarding" | "training" | "clearance"): ModuleId {
  return source === "training" ? "trainings" : source === "clearance" ? "clearance" : "onboardingTasks"
}

export const TRAINING_STATUSES = [
  "completed",
  "pending",
  "overdue",
  "inProgress",
  "notStarted",
  "underReview",
  "verified",
  "actionRequired",
] as const
export type TrainingStatusRaw = (typeof TRAINING_STATUSES)[number]

export function parseTrainingStatus(value: unknown): TrainingStatusRaw {
  return typeof value === "string" && (TRAINING_STATUSES as readonly string[]).includes(value)
    ? (value as TrainingStatusRaw)
    : "notStarted"
}

export const CLEARANCE_STATUSES = [
  "pending",
  "underReview",
  "verified",
  "expired",
  "actionRequired",
] as const
export type ClearanceStatusRaw = (typeof CLEARANCE_STATUSES)[number]

export function parseClearanceStatus(value: unknown): ClearanceStatusRaw {
  return typeof value === "string" && (CLEARANCE_STATUSES as readonly string[]).includes(value)
    ? (value as ClearanceStatusRaw)
    : "pending"
}

export interface EmployeeTaskDoc {
  id: string
  title: string
  subtitle: string | null
  status: TaskStatus
  actionType: string | null
  isCompleted: boolean
  updatedAt: Date | null
  completedAt: Date | null
  dueDate: Date | null
  fileUrl: string | null
  signatureUrl: string | null
  adminSignatureUrl: string | null
  rejectionReason: string | null
  formData: Record<string, unknown> | null
  adminFormData: Record<string, unknown> | null
  blankFormLink: string | null
  signedAt: Date | null
  hasFormData: boolean
  hasAdminFormData: boolean
  revision: string
}

function objectField(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function mapTaskDoc(id: string, data: DataDocument): EmployeeTaskDoc {
  return {
    id,
    title: typeof data.title === "string" && data.title.length > 0 ? data.title : "Untitled task",
    subtitle: typeof data.subtitle === "string" && data.subtitle.length > 0 ? data.subtitle : null,
    status: parseTaskStatus(data.status),
    actionType: typeof data.actionType === "string" ? data.actionType : null,
    isCompleted: data.isCompleted === true,
    updatedAt: toDateOrNull(data.updatedAt),
    completedAt: toDateOrNull(data.completedAt),
    dueDate: toDateOrNull(data.dueDate),
    fileUrl: typeof data.fileUrl === "string" && data.fileUrl.length > 0 ? data.fileUrl : null,
    signatureUrl:
      typeof data.signatureUrl === "string" && data.signatureUrl.length > 0
        ? data.signatureUrl
        : null,
    adminSignatureUrl:
      typeof data.adminSignatureUrl === "string" && data.adminSignatureUrl.length > 0
        ? data.adminSignatureUrl
        : null,
    rejectionReason:
      typeof data.rejectionReason === "string" && data.rejectionReason.length > 0
        ? data.rejectionReason
        : null,
    formData: objectField(data.formData),
    adminFormData: objectField(data.adminFormData),
    blankFormLink:
      typeof data.blankFormLink === "string" && data.blankFormLink.length > 0
        ? data.blankFormLink
        : null,
    signedAt: toDateOrNull(data.signedAt),
    hasFormData: data.formData != null,
    hasAdminFormData: data.adminFormData != null,
    revision: submissionRevision(data),
  }
}

export function resolveCertificateUrls(data: DataDocument): string[] {
  const raw = data.certificateUrls
  if (raw !== null && raw !== undefined) {
    const values = Array.isArray(raw) ? raw : null
    const seen = new Set<string>()
    const urls: string[] = []
    for (const value of values ?? []) {
      if (typeof value !== "string" || value.length === 0 || seen.has(value)) {
        continue
      }
      seen.add(value)
      urls.push(value)
    }
    if (values !== null) {
      return urls
    }
  }
  const legacy = data.certificateUrl
  return typeof legacy === "string" && legacy.length > 0 ? [legacy] : []
}

export interface EmployeeTrainingDoc {
  id: string
  title: string
  description: string | null
  durationText: string | null
  status: TrainingStatusRaw
  certificateUrl: string | null
  certificateUrls: string[]
  completedAt: Date | null
  dueDate: Date | null
  assignedAt: Date | null
  rejectionReason: string | null
  revision: string
}

export function mapTrainingDoc(id: string, data: DataDocument): EmployeeTrainingDoc {
  return {
    id,
    title: typeof data.title === "string" && data.title.length > 0 ? data.title : "Untitled training",
    description:
      typeof data.description === "string" && data.description.length > 0
        ? data.description
        : null,
    durationText:
      typeof data.durationText === "string" && data.durationText.length > 0
        ? data.durationText
        : null,
    status: parseTrainingStatus(data.status),
    certificateUrl:
      typeof data.certificateUrl === "string" && data.certificateUrl.length > 0
        ? data.certificateUrl
        : null,
    certificateUrls: resolveCertificateUrls(data),
    completedAt: toDateOrNull(data.completedAt),
    dueDate: toDateOrNull(data.dueDate),
    assignedAt: toDateOrNull(data.assignedAt),
    rejectionReason:
      typeof data.rejectionReason === "string" && data.rejectionReason.length > 0
        ? data.rejectionReason
        : null,
    revision: submissionRevision(data),
  }
}

export interface EmployeeClearanceDoc {
  id: string
  title: string
  description: string | null
  status: ClearanceStatusRaw
  fileUrl: string | null
  rejectionReason: string | null
  dueDate: Date | null
  submittedAt: Date | null
  verifiedAt: Date | null
  revision: string
}

export function mapClearanceDoc(id: string, data: DataDocument): EmployeeClearanceDoc {
  return {
    id,
    title: typeof data.title === "string" && data.title.length > 0 ? data.title : "Untitled clearance",
    description:
      typeof data.description === "string" && data.description.length > 0
        ? data.description
        : null,
    status: parseClearanceStatus(data.status),
    fileUrl: typeof data.fileUrl === "string" && data.fileUrl.length > 0 ? data.fileUrl : null,
    rejectionReason:
      typeof data.rejectionReason === "string" && data.rejectionReason.length > 0
        ? data.rejectionReason
        : null,
    dueDate: toDateOrNull(data.dueDate),
    submittedAt: toDateOrNull(data.submittedAt),
    verifiedAt: toDateOrNull(data.verifiedAt),
    revision: submissionRevision(data),
  }
}

export interface EmployeeProfileDetail {
  uid: string
  name: string
  email: string | null
  lastLogin: Date
  isActive: boolean
  setupStatus: "complete" | "incomplete"
  adminId: string | null
}

export function parseEmployeeProfile(id: string, data: DataDocument): EmployeeProfileDetail {
  return {
    uid: id,
    name: typeof data.name === "string" && data.name.length > 0 ? data.name : "Employee",
    email: str(data.email),
    lastLogin: toDateOrNull(data.lastLogin) ?? toDateOrNull(data.createdAt) ?? new Date(),
    isActive: data.isActive !== false,
    setupStatus: data.setupStatus === "incomplete" ? "incomplete" : "complete",
    adminId: typeof data.adminId === "string" && data.adminId.length > 0 ? data.adminId : null,
  }
}

export type EmployeeDetailStage =
  | { state: "active"; employee: EmployeeProfileDetail }
  | { state: "not-found" }
  | { state: "not-owned" }

export interface EmployeeDetailSnapshot {
  profile: EmployeeDetailStage | null
  tasks: EmployeeTaskDoc[]
  trainings: EmployeeTrainingDoc[]
  clearances: EmployeeClearanceDoc[]
}

export const EMPTY_DETAIL: EmployeeDetailSnapshot = {
  profile: null,
  tasks: [],
  trainings: [],
  clearances: [],
}

export function subscribeEmployeeDetail(
  employeeId: string,
  adminUid: string,
  ctrl: LiveStreamController<EmployeeDetailSnapshot>,
  store: DataStore = getClientDataStore(),
): Unsubscribe {
  ctrl.listen("profile")

  let stage: EmployeeDetailStage | null = null
  const retained = {
    tasks: [] as EmployeeTaskDoc[],
    trainings: [] as EmployeeTrainingDoc[],
    clearances: [] as EmployeeClearanceDoc[],
  }

  const snapshot = (): EmployeeDetailSnapshot => ({
    profile: stage,
    tasks: retained.tasks,
    trainings: retained.trainings,
    clearances: retained.clearances,
  })

  let attached = false
  let generation = 0
  const moduleUnsubs: Unsubscribe[] = []

  const isStaleGeneration = (token: number): boolean => token !== generation

  const detachModules = (): void => {
    generation += 1
    for (const unsub of moduleUnsubs) {
      unsub()
    }
    moduleUnsubs.length = 0
    attached = false
    retained.tasks = []
    retained.trainings = []
    retained.clearances = []
    for (const id of MODULE_IDS) {
      ctrl.forget(id)
    }
  }

  const attachModules = (): void => {
    if (attached) {
      return
    }
    attached = true
    const token = ++generation
    const mapping: Array<[ModuleId, (docs: Array<{ id: string; data: DataDocument }>) => void]> = [
      ["onboardingTasks", (docs) => (retained.tasks = docs.map((entry) => mapTaskDoc(entry.id, entry.data)))],
      ["trainings", (docs) => (retained.trainings = docs.map((entry) => mapTrainingDoc(entry.id, entry.data)))],
      ["clearance", (docs) => (retained.clearances = docs.map((entry) => mapClearanceDoc(entry.id, entry.data)))],
    ]
    for (const [id] of mapping) {
      ctrl.listen(id)
    }
    for (const [id, setCache] of mapping) {
      moduleUnsubs.push(
        store.subscribeCollection(
          `${DATA_COLLECTIONS.users}/${employeeId}/${MODULE_COLLECTIONS[id]}`,
          (querySnapshot) => {
            if (isStaleGeneration(token)) {
              return
            }
            setCache(
              querySnapshot.docs.map((docSnapshot) => ({
                id: docSnapshot.id,
                data: docSnapshot.data() ?? {},
              })),
            )
            ctrl.emit(id, snapshot())
          },
          (error) => {
            if (isStaleGeneration(token)) {
              return
            }
            ctrl.fail(id, error)
          },
        ),
      )
    }
  }

  const profileUnsub = store.subscribeDoc(
    `${DATA_COLLECTIONS.users}/${employeeId}`,
    (profileSnapshot) => {
      if (!profileSnapshot.exists()) {
        stage = { state: "not-found" }
        detachModules()
        ctrl.emit("profile", snapshot())
        return
      }

      const data = profileSnapshot.data() ?? {}
      const isOwnedEmployee = data.adminId === adminUid && data.role === "employee"
      if (!isOwnedEmployee) {
        stage = { state: "not-owned" }
        detachModules()
        ctrl.emit("profile", snapshot())
        return
      }

      stage = { state: "active", employee: parseEmployeeProfile(profileSnapshot.id, data) }
      attachModules()
      ctrl.emit("profile", snapshot())
    },
    (error) => {
      detachModules()
      ctrl.fail("profile", error)
    },
  )

  return () => {
    profileUnsub()
    detachModules()
  }
}
