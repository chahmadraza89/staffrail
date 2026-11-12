"use client"

import { getClientDataStore } from "@/lib/data/client-store"
import { DATA_COLLECTIONS } from "@/lib/data/collections"
import { toDateOrNull } from "@/lib/data/dates"
import type { DataDocument, DataStore, Unsubscribe } from "@/lib/data/types"
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

export type { Unsubscribe }

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

export function mapTrainingTemplate(id: string, data: DataDocument): AdminTrainingTemplate {
  return {
    id,
    title: text(data.title) || "Untitled Training",
    description: text(data.description),
    durationText: text(data.durationText),
    requirementType: text(data.requirementType) || "certificate",
    isActive: data.isActive !== false,
    createdAt: toDateOrNull(data.createdAt),
    updatedAt: toDateOrNull(data.updatedAt),
  }
}

export function mapTrainingAssignment(id: string, data: DataDocument): TrainingAssignment {
  return {
    id,
    employeeId: typeof data.employeeId === "string" ? data.employeeId : null,
    adminId: typeof data.adminId === "string" ? data.adminId : null,
    title: text(data.title),
    description: text(data.description),
    durationText: text(data.durationText),
    status: parseTrainingStatus(data.status),
    dueDate: toDateOrNull(data.dueDate),
    updatedAt: toDateOrNull(data.updatedAt),
    assignedAt: toDateOrNull(data.assignedAt),
  }
}

export function mapTrainingStaff(uid: string, data: DataDocument): TrainingStaffMember {
  return {
    uid,
    name: text(data.name) || "Employee",
    email: typeof data.email === "string" && data.email.length > 0 ? data.email : null,
    isActive: data.isActive !== false,
  }
}

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

export function subscribeTrainingTemplates(
  _adminUid: string,
  ctrl: LiveStreamController<AdminTrainingTemplate[]>,
  store: DataStore = getClientDataStore(),
): Unsubscribe {
  ctrl.listen("templates")

  return store.subscribeCollection(
    DATA_COLLECTIONS.trainingTemplates,
    (snapshot) => {
      const templates = snapshot.docs.map((entry) =>
        mapTrainingTemplate(entry.id, entry.data() ?? {}),
      )
      ctrl.emit("templates", sortTrainingTemplates(templates))
    },
    (error) => ctrl.fail("templates", error),
  )
}

export function subscribeTrainingAssignments(
  adminUid: string,
  ctrl: LiveStreamController<TrainingAssignment[]>,
  store: DataStore = getClientDataStore(),
): Unsubscribe {
  ctrl.listen("assignments")

  return store.subscribeCollectionGroup(
    DATA_COLLECTIONS.trainings,
    (snapshot) => {
      ctrl.emit(
        "assignments",
        snapshot.docs.map((entry) => mapTrainingAssignment(entry.id, entry.data() ?? {})),
      )
    },
    (error) => ctrl.fail("assignments", error),
    { filters: [{ field: "adminId", op: "==", value: adminUid }] },
  )
}

export function subscribeTrainingStaff(
  adminUid: string,
  ctrl: LiveStreamController<TrainingStaffMember[]>,
  store: DataStore = getClientDataStore(),
): Unsubscribe {
  ctrl.listen("staff")

  return store.subscribeCollection(
    DATA_COLLECTIONS.users,
    (snapshot) => {
      const staff = snapshot.docs.map((entry) =>
        mapTrainingStaff(entry.id, entry.data() ?? {}),
      )
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
    {
      filters: [
        { field: "adminId", op: "==", value: adminUid },
        { field: "role", op: "==", value: "employee" },
      ],
    },
  )
}
