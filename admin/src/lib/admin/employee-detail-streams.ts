"use client"

import {
  collection,
  doc,
  onSnapshot,
  type DocumentData,
} from "firebase/firestore"

import { getFirebaseFirestore } from "@/lib/firebase/client"
import { FIREBASE_COLLECTIONS } from "@/lib/firebase/collections"
import { parseTaskStatus, type TaskStatus } from "@/lib/admin/task-status"
import { str } from "@/lib/admin/dashboard-streams"
import type { LiveStreamController } from "@/lib/admin/stream-protocol"

/**
 * Live documents for ONE employee's detail page — the web counterpart of
 * the Flutter providers in
 * lib/features/admin/admin_directory/presentation/provider/admin_directory_provider.dart:
 *   employeeProfileProvider/employeeTasksProvider/employeeTrainingsProvider/
 *   employeeClearanceProvider
 *
 * Subscription design (fix: the page must NOT carry the whole workspace):
 *   - exactly FOUR listeners, independent of staff count:
 *       profile         → doc(users/{employeeId}) — the ownership gate
 *       onboardingTasks → users/{employeeId}/onboarding_tasks
 *       trainings       → users/{employeeId}/trainings
 *       clearance       → users/{employeeId}/clearance
 *   - The DOCUMENT-MODULE listeners attach only after the profile listener
 *     verified that the doc exists AND belongs to the signed-in admin
 *     (doc.adminId === adminUid && role === "employee"). No profile → no
 *     document listeners, so an unrelated employee's slow/failed listeners
 *     can never affect this page.
 *   - Any profile change that breaks the gate (deletion, ownership change,
 *     role change) STOPS the module listeners and forgets them; if the doc
 *     ever becomes valid again they re-attach fresh. Late callbacks from a
 *     previous attach generation are ignored by a generation token.
 *
 * Listener protocol: every emit publishes the FULLY merged snapshot (the
 * engine is latest-wins), so a single failed module is distinguishable from
 * the others; per-listener readiness/errors come from the engine state.
 */

export type Unsubscribe = () => void

/* ── per-module listener ids (also used by the view to label states) ───── */

export const MODULE_IDS = ["onboardingTasks", "trainings", "clearance"] as const
export type ModuleId = (typeof MODULE_IDS)[number]

export const MODULE_LABELS: Record<ModuleId, string> = {
  onboardingTasks: "onboarding tasks",
  trainings: "training records",
  clearance: "clearance records",
}

/** Firestore subcollection name per module listener id. */
const MODULE_COLLECTIONS: Record<ModuleId, string> = {
  onboardingTasks: FIREBASE_COLLECTIONS.onboardingTasks,
  trainings: FIREBASE_COLLECTIONS.trainings,
  clearance: FIREBASE_COLLECTIONS.clearanceItems,
}

/** Which detail-listener owns each ComplianceCategory taskSource. */
export function moduleForSource(source: "onboarding" | "training" | "clearance"): ModuleId {
  return source === "training" ? "trainings" : source === "clearance" ? "clearance" : "onboardingTasks"
}

/* ── parsed document records (the detail-page subset of the DTOs) ──────── */

/** Dart TrainingStatus (training_model.dart) — Firestore stores the name. */
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

/** Dart ClearanceStatus (clearance_model.dart). */
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

/**
 * users/{uid}/onboarding_tasks/{taskId} — subset of OnboardingTaskDTO the
 * checklist consumes; raw string fields are kept untransformed (the
 * template merge lives in compliance-helpers.ts, matching the Flutter
 * Builder layering).
 */
export interface EmployeeTaskDoc {
  id: string
  title: string
  subtitle: string | null
  /** Raw onboarding status — the FULL Dart TaskStatus domain. */
  status: TaskStatus
  /** Raw actionType string (Dart TaskActionType — broader than templates). */
  actionType: string | null
  isCompleted: boolean
  updatedAt: Date | null
  completedAt: Date | null
  dueDate: Date | null
  fileUrl: string | null
  signatureUrl: string | null
  /** Raw split/dual-role signatures written by the admin counter-sign flow. */
  adminSignatureUrl: string | null
  rejectionReason: string | null
  /** Full submitted employee form payload (task review panel / form views). */
  formData: Record<string, unknown> | null
  /** Full administrative review payload (counter-signature fields). */
  adminFormData: Record<string, unknown> | null
  blankFormLink: string | null
  signedAt: Date | null
  hasFormData: boolean
  hasAdminFormData: boolean
}

/** Firestore maps are plain objects; arrays/nulls never qualify. */
function objectField(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function mapTaskDoc(id: string, data: DocumentData): EmployeeTaskDoc {
  return {
    id,
    title: typeof data.title === "string" && data.title.length > 0 ? data.title : "Untitled task",
    subtitle: typeof data.subtitle === "string" && data.subtitle.length > 0 ? data.subtitle : null,
    status: parseTaskStatus(data.status),
    actionType: typeof data.actionType === "string" ? data.actionType : null,
    isCompleted: data.isCompleted === true,
    updatedAt: toDate(data.updatedAt),
    completedAt: toDate(data.completedAt),
    dueDate: toDate(data.dueDate),
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
    signedAt: toDate(data.signedAt),
    hasFormData: data.formData != null,
    hasAdminFormData: data.adminFormData != null,
  }
}

export interface EmployeeTrainingDoc {
  id: string
  title: string
  description: string | null
  durationText: string | null
  status: TrainingStatusRaw
  certificateUrl: string | null
  completedAt: Date | null
  dueDate: Date | null
  assignedAt: Date | null
  rejectionReason: string | null
}

export function mapTrainingDoc(id: string, data: DocumentData): EmployeeTrainingDoc {
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
    completedAt: toDate(data.completedAt),
    dueDate: toDate(data.dueDate),
    assignedAt: toDate(data.assignedAt),
    rejectionReason:
      typeof data.rejectionReason === "string" && data.rejectionReason.length > 0
        ? data.rejectionReason
        : null,
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
}

export function mapClearanceDoc(id: string, data: DocumentData): EmployeeClearanceDoc {
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
    dueDate: toDate(data.dueDate),
    submittedAt: toDate(data.submittedAt),
    verifiedAt: toDate(data.verifiedAt),
  }
}

/* ── employee profile (users/{uid}) ────────────────────────────────────── */

export interface EmployeeProfileDetail {
  uid: string
  name: string
  email: string | null
  lastLogin: Date
  isActive: boolean
  setupStatus: "complete" | "incomplete"
  adminId: string | null
}

/**
 * Pure mapping with the EXACT field semantics of the Dashboard's
 * employee-list parse (dashboard-streams.ts → EmployeeData) so header and
 * badge behavior match the Directory cards:
 *   name fallback "Employee", email str(), lastLogin → createdAt → now,
 *   isActive !== false, setupStatus === "incomplete" (else complete).
 */
export function parseEmployeeProfile(id: string, data: DocumentData): EmployeeProfileDetail {
  return {
    uid: id,
    name: typeof data.name === "string" && data.name.length > 0 ? data.name : "Employee",
    email: str(data.email),
    lastLogin: toDate(data.lastLogin) ?? toDate(data.createdAt) ?? new Date(),
    isActive: data.isActive !== false,
    setupStatus: data.setupStatus === "incomplete" ? "incomplete" : "complete",
    adminId: typeof data.adminId === "string" && data.adminId.length > 0 ? data.adminId : null,
  }
}

/**
 * The employee-detail gate, derived from the profile listener's latest doc
 * state. `null` stage (in the snapshot below) means the profile listener
 * has not delivered yet.
 */
export type EmployeeDetailStage =
  | { state: "active"; employee: EmployeeProfileDetail }
  | { state: "not-found" }
  /** Missing/foreign adminId, or not an employee account. */
  | { state: "not-owned" }

export interface EmployeeDetailSnapshot {
  /** `null` while the profile listener has not delivered a first snapshot. */
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

function toDate(value: unknown): Date | null {
  if (!value || typeof value !== "object") {
    return null
  }
  const candidate = value as { toDate?: unknown; seconds?: unknown }
  if (typeof candidate.toDate === "function") {
    return (candidate as { toDate: () => Date }).toDate()
  }
  if (typeof candidate.seconds === "number") {
    return new Date(candidate.seconds * 1000)
  }
  return null
}

/**
 * Streams ONE employee's profile + document modules for the detail page.
 *
 * Module listeners attach lazily (only after the ownership gate passes) and
 * detach on every gate violation. Every emit carries the full merged
 * snapshot; per-module readiness/availability is read from the engine state
 * (pending/ready/errors), where `ready` survives a later failure —
 * "failed but ready" means real data was retained (stale), and "failed but
 * never ready" means nothing was ever loaded (never label that stale).
 */
export function subscribeEmployeeDetail(
  employeeId: string,
  adminUid: string,
  ctrl: LiveStreamController<EmployeeDetailSnapshot>,
): Unsubscribe {
  const db = getFirebaseFirestore()

  // The profile listener is the anchor; module listeners attach dynamically
  // inside the gate handler.
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

  /* ── document-module attach/detach (generation-token guarded) ────────── */

  let attached = false
  let generation = 0
  const moduleUnsubs: Unsubscribe[] = []

  const isStaleGeneration = (token: number): boolean => token !== generation

  const detachModules = (): void => {
    generation += 1 // late callbacks from the old attach are ignored
    for (const unsub of moduleUnsubs) {
      unsub()
    }
    moduleUnsubs.length = 0
    attached = false
    // Reset semantics: a violating doc's module data must not leak into the
    // new state either.
    retained.tasks = []
    retained.trainings = []
    retained.clearances = []
    // Forget the dynamic listeners so stale ids cannot keep the page in
    // "connecting" or keep a false error after the gate closed.
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
    const mapping: Array<[ModuleId, (docs: Array<{ id: string; data: DocumentData }>) => void]> = [
      ["onboardingTasks", (docs) => (retained.tasks = docs.map((entry) => mapTaskDoc(entry.id, entry.data)))],
      ["trainings", (docs) => (retained.trainings = docs.map((entry) => mapTrainingDoc(entry.id, entry.data)))],
      ["clearance", (docs) => (retained.clearances = docs.map((entry) => mapClearanceDoc(entry.id, entry.data)))],
    ]
    // Announce BEFORE the raw listeners can fire their first snapshots.
    for (const [id] of mapping) {
      ctrl.listen(id)
    }
    for (const [id, setCache] of mapping) {
      moduleUnsubs.push(
        onSnapshot(
          collection(db, FIREBASE_COLLECTIONS.users, employeeId, MODULE_COLLECTIONS[id]),
          (querySnapshot) => {
            if (isStaleGeneration(token)) {
              return // replaced/reset mid-flight — never touch state
            }
            setCache(querySnapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, data: docSnapshot.data() })))
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

  /* ── the ownership-gated profile listener ────────────────────────────── */

  const profileUnsub = onSnapshot(
    doc(db, FIREBASE_COLLECTIONS.users, employeeId),
    (profileSnapshot) => {
      if (!profileSnapshot.exists()) {
        stage = { state: "not-found" }
        detachModules() // existence changed → stop + reset subscriptions
        ctrl.emit("profile", snapshot())
        return
      }

      const data = profileSnapshot.data()
      const isOwnedEmployee = data.adminId === adminUid && data.role === "employee"
      if (!isOwnedEmployee) {
        stage = { state: "not-owned" }
        detachModules() // ownership changed → stop + reset subscriptions
        ctrl.emit("profile", snapshot())
        return
      }

      stage = { state: "active", employee: parseEmployeeProfile(profileSnapshot.id, data) }
      attachModules()
      ctrl.emit("profile", snapshot())
    },
    (error) => {
      // The ownership gate can no longer be asserted — stop the module
      // listeners (the profile keeps its last known stage so the header can
      // show retained data labelled stale).
      detachModules()
      ctrl.fail("profile", error)
    },
  )

  return () => {
    profileUnsub()
    detachModules()
  }
}
