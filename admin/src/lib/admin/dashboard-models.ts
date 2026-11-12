/**
 * Dashboard domain models — ported from
 * lib/features/admin/admin_home/data/model/admin_dashboard_models.dart.
 */

import type { TaskStatus } from "@/lib/admin/task-status"

export interface AdminEmployeeProgress {
  uid: string
  name: string
  email?: string | null
  /** 0..1 averages over the modules that contain data (mirrors Flutter). */
  overallProgress: number
  onboardingProgress: number
  trainingProgress: number
  clearanceProgress: number
  lastLogin: Date
  isActive: boolean
  /**
   * Web-only provisioning status: "incomplete" means the Auth account exists
   * but its template documents still need `completeEmployeeSetup`. Absent /
   * "complete" for every normal (and all Flutter-created) employee.
   */
  setupStatus?: "complete" | "incomplete"
}

export type ComplianceAlertCategory = "Overdue" | "Signature Needed"

export interface ComplianceAlert {
  id: string
  employeeId: string
  employeeName: string
  taskTitle: string
  category: ComplianceAlertCategory
  dueDate?: Date | null
}

/** (onboarding30d, completedToday, active) — mirrors streamAdminDashboardStats. */
export interface AdminDashboardStats {
  onboarding: number
  completedToday: number
  active: number
}

/** Minimal subset of CompilationSubTask the dashboard consumes. */
export interface ActionRequiredTask {
  id: string
  title: string
  employeeId: string | null
  employeeName: string | null
  status: TaskStatus
  isCompleted: boolean
  dueDate?: Date | null
  updatedAt?: Date | null
  taskSource: "onboarding" | "training" | "clearance"
}
