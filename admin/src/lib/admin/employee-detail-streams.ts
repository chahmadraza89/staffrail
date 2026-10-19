"use client"

import { collection, onSnapshot, type DocumentData } from "firebase/firestore"

import { getFirebaseFirestore } from "@/lib/firebase/client"
import { FIREBASE_COLLECTIONS } from "@/lib/firebase/collections"
import { parseTaskStatus, type TaskStatus } from "@/lib/admin/task-status"
import type { LiveStreamController } from "@/lib/admin/stream-protocol"

/**
 * Live documents for ONE employee's detail page — the web counterpart of
 * the Flutter providers in
 * lib/features/admin/admin_directory/presentation/provider/admin_directory_provider.dart:
 *   employeeTasksProvider      → users/{uid}/onboarding_tasks
 *   employeeTrainingsProvider  → users/{uid}/trainings
 *   employeeClearanceProvider  → users/{uid}/clearance
 *
 * The EMPLOYEE PROFILE itself (name/isActive/progress) is NOT read here:
 * the detail view reuses `subscribeAdminEmployeesProgress` so header
 * progress stays single-sourced with the Directory cards. This builder
 * only streams the three document modules.
 *
 * Listener protocol: three listeners ("onboardingTasks", "trainings",
 * "clearance"); every snapshot emits the fully merged snapshot under its
 * own id, so one failed module is distinguishable from the others.
 */

export type Unsubscribe = () => void

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
  rejectionReason: string | null
  hasFormData: boolean
  hasAdminFormData: boolean
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
    rejectionReason:
      typeof data.rejectionReason === "string" && data.rejectionReason.length > 0
        ? data.rejectionReason
        : null,
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

export interface EmployeeDetailSnapshot {
  tasks: EmployeeTaskDoc[]
  trainings: EmployeeTrainingDoc[]
  clearances: EmployeeClearanceDoc[]
}

export const EMPTY_DETAIL: EmployeeDetailSnapshot = { tasks: [], trainings: [], clearances: [] }

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

const MODULES = [
  { id: "onboardingTasks", collection: FIREBASE_COLLECTIONS.onboardingTasks },
  { id: "trainings", collection: FIREBASE_COLLECTIONS.trainings },
  { id: "clearance", collection: FIREBASE_COLLECTIONS.clearanceItems },
] as const

/**
 * Streams the three document modules of one employee. All three listeners
 * attach up front; each snapshot emits a merged snapshot under its own
 * listener id (latest-wins), so the first successful module becomes
 * visible while the others are still connecting — and a single failed
 * module is reported individually without masking the others.
 */
export function subscribeEmployeeDetail(
  employeeId: string,
  ctrl: LiveStreamController<EmployeeDetailSnapshot>,
): Unsubscribe {
  const db = getFirebaseFirestore()

  const latest: EmployeeDetailSnapshot = { ...EMPTY_DETAIL }

  const unsubs = MODULES.map((module) => {
    const moduleId = module.id
    ctrl.listen(moduleId)
    return onSnapshot(
      collection(db, FIREBASE_COLLECTIONS.users, employeeId, module.collection),
      (snapshot) => {
        if (moduleId === "onboardingTasks") {
          latest.tasks = snapshot.docs.map((doc) => mapTaskDoc(doc.id, doc.data()))
        } else if (moduleId === "trainings") {
          latest.trainings = snapshot.docs.map((doc) => mapTrainingDoc(doc.id, doc.data()))
        } else {
          latest.clearances = snapshot.docs.map((doc) => mapClearanceDoc(doc.id, doc.data()))
        }
        ctrl.emit(moduleId, { tasks: latest.tasks, trainings: latest.trainings, clearances: latest.clearances })
      },
      (error) => ctrl.fail(moduleId, error),
    )
  })

  return () => {
    for (const unsub of unsubs) {
      unsub()
    }
  }
}
