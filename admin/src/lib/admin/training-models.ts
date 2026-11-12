/**
 * Admin Training domain models — the subset of the Flutter admin_training
 * feature (`admin_training_model.dart`, `TrainingEntity`,
 * `admin_training_provider.dart`) the web panel consumes.
 *
 * Pure TypeScript, no Firebase imports: the mappings/derivations can be
 * unit-tested without a Firestore double.
 */

import type { TrainingStatusRaw } from "@/lib/admin/employee-detail-streams"

/** Dart AdminTrainingModel.requirementType values offered by the dialog. */
export const TRAINING_REQUIREMENT_TYPES = ["certificate", "acknowledgement"] as const
export type TrainingRequirementType = (typeof TRAINING_REQUIREMENT_TYPES)[number]

export function isTrainingRequirementType(
  value: unknown,
): value is TrainingRequirementType {
  return (
    typeof value === "string" &&
    (TRAINING_REQUIREMENT_TYPES as readonly string[]).includes(value)
  )
}

/** training_templates/{id} — a master template created by an admin. */
export interface AdminTrainingTemplate {
  id: string
  title: string
  description: string
  durationText: string
  /** Raw string; unknown values are preserved for display (Dart default: certificate). */
  requirementType: string
  isActive: boolean
  createdAt: Date | null
  updatedAt: Date | null
}

/** users/{uid}/trainings/{id} — one employee's copy of a template. */
export interface TrainingAssignment {
  /** Training entity id. The admin assign flow uses the template id. */
  id: string
  employeeId: string | null
  adminId: string | null
  title: string
  description: string
  durationText: string
  status: TrainingStatusRaw
  dueDate: Date | null
  updatedAt: Date | null
  assignedAt: Date | null
}

/** Active staff member offered in the assign dialog. */
export interface TrainingStaffMember {
  uid: string
  name: string
  email: string | null
  isActive: boolean
}

/** Per-template completion, derived from every assignment doc. */
export interface TemplateCompliance {
  completed: number
  total: number
  /** 0..100; 0 when no employee holds the template (never NaN). */
  rate: number
}

export type TrainingComplianceMap = Record<string, TemplateCompliance>

/** Top counters — mirrors `AdminTrainingStatsModel` in Flutter. */
export interface AdminTrainingStats {
  /**
   * Flutter names this `totalActive` but counts EVERY template document
   * (inactive ones included). Kept verbatim so both clients agree.
   */
  totalActive: number
  /** One decimal place, exactly like the Flutter provider. */
  complianceRate: number
  overdueCount: number
}

export const EMPTY_TRAINING_COMPLIANCE: TemplateCompliance = {
  completed: 0,
  total: 0,
  rate: 0,
}

/** Stable newest-first ordering; templates without `createdAt` sort last. */
export function sortTrainingTemplates(
  templates: readonly AdminTrainingTemplate[],
): AdminTrainingTemplate[] {
  return [...templates].sort((left, right) => {
    const leftTime = left.createdAt?.getTime() ?? null
    const rightTime = right.createdAt?.getTime() ?? null

    if (leftTime !== null && rightTime !== null && leftTime !== rightTime) {
      return rightTime - leftTime
    }
    if (leftTime !== null && rightTime === null) {
      return -1
    }
    if (leftTime === null && rightTime !== null) {
      return 1
    }

    const byTitle = left.title.localeCompare(right.title)
    return byTitle !== 0 ? byTitle : left.id.localeCompare(right.id)
  })
}
