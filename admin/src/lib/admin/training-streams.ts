"use client"

import {
  collection,
  collectionGroup,
  onSnapshot,
  query,
  where,
  type DocumentData,
} from "firebase/firestore"

import { getFirebaseFirestore } from "@/lib/firebase/client"
import { FIREBASE_COLLECTIONS } from "@/lib/firebase/collections"
import { parseTrainingStatus } from "@/lib/admin/employee-detail-streams"
import { isTrainingCompleted } from "@/lib/admin/progress-models"
import {
  sortTrainingTemplates,
  type AdminTrainingStats,
  type AdminTrainingTemplate,
  type TemplateCompliance,
  type TrainingAssignment,
  type TrainingComplianceMap,
  type TrainingStaffMember,
} from "@/lib/admin/training-models"
import type { LiveStreamController } from "@/lib/admin/stream-protocol"

/**
 * Real-time Firestore subscriptions for the Training screen — a faithful
 * port of:
 *
 *   adminClinicTrainingsProvider  → subscribeTrainingTemplates
 *   adminAllAssignmentsProvider   → subscribeTrainingAssignments
 *   adminEmployeesProgressProvider → subscribeTrainingStaff
 *   adminTrainingStatsProvider /
 *   adminTrainingComplianceProvider → deriveTrainingStats /
 *                                     buildTrainingCompliance
 *
 * Every builder reports readiness/errors per listener through
 * `LiveStreamController`, so the panel can distinguish "still connecting",
 * "ready but empty" and "failed with retained data" for each source.
 *
 * Correctness notes (documented corrections in admin/README.md):
 *  - Templates are read WITHOUT `orderBy('createdAt')`. The Flutter query
 *    silently hides any template whose `createdAt` is missing, and it forces
 *    a composite index. Ordering is applied client-side instead, with
 *    missing timestamps sorting last (never dropped).
 *  - Completion counts BOTH terminal statuses (`completed` and `verified`).
 *    The admin approval writes `"verified"`; counting only `"completed"`
 *    made approved trainings look outstanding on the Training screen.
 *  - Assignments are scoped to the signed-in admin (`adminId`), matching the
 *    Flutter collection-group query and the Firestore rules model.
 *  - Malformed documents map to safe defaults instead of being dropped.
 */

export type Unsubscribe = () => void

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

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

/* ── pure mappers ──────────────────────────────────────────────────────── */

export function mapTrainingTemplate(id: string, data: DocumentData): AdminTrainingTemplate {
  return {
    id,
    title: text(data.title) || "Untitled Training",
    description: text(data.description),
    durationText: text(data.durationText),
    requirementType: text(data.requirementType) || "certificate",
    isActive: data.isActive !== false,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  }
}

export function mapTrainingAssignment(id: string, data: DocumentData): TrainingAssignment {
  return {
    id,
    employeeId: typeof data.employeeId === "string" ? data.employeeId : null,
    adminId: typeof data.adminId === "string" ? data.adminId : null,
    title: text(data.title),
    description: text(data.description),
    durationText: text(data.durationText),
    status: parseTrainingStatus(data.status),
    dueDate: toDate(data.dueDate),
    updatedAt: toDate(data.updatedAt),
    assignedAt: toDate(data.assignedAt),
  }
}

export function mapTrainingStaff(uid: string, data: DocumentData): TrainingStaffMember {
  return {
    uid,
    name: text(data.name) || "Employee",
    email: typeof data.email === "string" && data.email.length > 0 ? data.email : null,
    isActive: data.isActive !== false,
  }
}

/* ── pure derivations ──────────────────────────────────────────────────── */

/**
 * Template-id → completion map. Every assignment counts toward its stored
 * id (the assign flow uses the template id as the training document id).
 * Orphaned assignments remain in the map but are never rendered; they still
 * count toward the global stats, exactly like Flutter.
 */
export function buildTrainingCompliance(
  assignments: readonly Pick<TrainingAssignment, "id" | "status">[],
): TrainingComplianceMap {
  const counts: Record<string, { completed: number; total: number }> = {}

  for (const assignment of assignments) {
    const entry = counts[assignment.id] ?? { completed: 0, total: 0 }
    counts[assignment.id] = {
      completed: entry.completed + (isTrainingCompleted(assignment.status) ? 1 : 0),
      total: entry.total + 1,
    }
  }

  const map: TrainingComplianceMap = {}
  for (const [id, entry] of Object.entries(counts)) {
    map[id] = {
      ...entry,
      rate: entry.total === 0 ? 0 : (entry.completed / entry.total) * 100,
    }
  }

  return map
}

export function trainingComplianceFor(
  map: TrainingComplianceMap,
  templateId: string,
): TemplateCompliance {
  return map[templateId] ?? { completed: 0, total: 0, rate: 0 }
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * Mirrors the Flutter `adminTrainingStatsProvider`:
 *   totalActive    = all template docs (inactive included — Dart parity)
 *   complianceRate = completed / all assignments × 100, 1 decimal
 *   overdueCount   = unfinished assignments whose due date has passed
 *
 * Completion includes `"verified"` (see the module docstring). `now` is
 * injectable so overdue behavior is deterministic in tests.
 */
export function deriveTrainingStats(
  templates: readonly AdminTrainingTemplate[],
  assignments: readonly Pick<TrainingAssignment, "status" | "dueDate">[],
  now: Date = new Date(),
): AdminTrainingStats {
  const total = assignments.length
  const completed = assignments.filter((assignment) =>
    isTrainingCompleted(assignment.status),
  ).length

  const rawRate = total === 0 ? 0 : (completed / total) * 100
  const safeRate = Number.isFinite(rawRate) ? rawRate : 0

  const overdueCount = assignments.filter(
    (assignment) =>
      !isTrainingCompleted(assignment.status) &&
      assignment.dueDate !== null &&
      assignment.dueDate.getTime() < now.getTime(),
  ).length

  return {
    totalActive: templates.length,
    complianceRate: round1(safeRate),
    overdueCount,
  }
}

/* ── subscriptions ─────────────────────────────────────────────────────── */

export function subscribeTrainingTemplates(
  _adminUid: string,
  ctrl: LiveStreamController<AdminTrainingTemplate[]>,
): Unsubscribe {
  const db = getFirebaseFirestore()

  ctrl.listen("templates")

  return onSnapshot(
    collection(db, FIREBASE_COLLECTIONS.trainingTemplates),
    (snapshot) => {
      const templates = snapshot.docs.map((entry) =>
        mapTrainingTemplate(entry.id, entry.data()),
      )
      ctrl.emit("templates", sortTrainingTemplates(templates))
    },
    (error) => ctrl.fail("templates", error),
  )
}

export function subscribeTrainingAssignments(
  adminUid: string,
  ctrl: LiveStreamController<TrainingAssignment[]>,
): Unsubscribe {
  const db = getFirebaseFirestore()

  ctrl.listen("assignments")

  return onSnapshot(
    query(
      collectionGroup(db, FIREBASE_COLLECTIONS.trainings),
      where("adminId", "==", adminUid),
    ),
    (snapshot) => {
      ctrl.emit(
        "assignments",
        snapshot.docs.map((entry) => mapTrainingAssignment(entry.id, entry.data())),
      )
    },
    (error) => ctrl.fail("assignments", error),
  )
}

export function subscribeTrainingStaff(
  adminUid: string,
  ctrl: LiveStreamController<TrainingStaffMember[]>,
): Unsubscribe {
  const db = getFirebaseFirestore()

  ctrl.listen("staff")

  return onSnapshot(
    query(
      collection(db, FIREBASE_COLLECTIONS.users),
      where("adminId", "==", adminUid),
      where("role", "==", "employee"),
    ),
    (snapshot) => {
      const staff = snapshot.docs.map((entry) => mapTrainingStaff(entry.id, entry.data()))
      staff.sort((left, right) => {
        if (left.isActive !== right.isActive) {
          return left.isActive ? -1 : 1
        }
        const byName = left.name.localeCompare(right.name)
        return byName !== 0 ? byName : left.uid.localeCompare(right.uid)
      })
      ctrl.emit("staff", staff)
    },
    (error) => ctrl.fail("staff", error),
  )
}
