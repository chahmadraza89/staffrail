/**
 * Shared per-employee progress calculations — the single source for the
 * Dashboard stats, the Directory cards and the employee Detail page so all
 * three preserve the EXACT formulas ported from the Flutter
 * streamAdminEmployeesProgress implementation
 * (lib/features/employee/on_boarding/data/data_source/onboarding_service.dart):
 *
 *   - onboarding: completed (`isCompleted` flag — NOT status-derived) over
 *     tasks whose status is not `noActionRequired`; a zero-total module
 *     contributes 0 and is excluded from the overall average.
 *   - training: raw status === "completed" over ALL training docs.
 *   - clearance: raw status === "verified" over ALL clearance docs.
 *   - overall: the average of ONLY the modules that contain data.
 *
 * Pure TypeScript, no Firebase imports — unit-testable in isolation.
 */

export interface OnboardingProgressItem {
  /** Parsed onboarding task status (dashboard callers use parseTaskStatus). */
  status: string
  /** The DTO's isCompleted flag — the dashboard formula counts THIS. */
  isCompleted: boolean
}

export interface RawStatusProgressItem {
  /** Raw Firestore status string (training: "completed", clearance: "verified"). */
  status: unknown
}

export interface ProgressModuleItems {
  tasks: ReadonlyArray<OnboardingProgressItem>
  trainings: ReadonlyArray<RawStatusProgressItem>
  clearances: ReadonlyArray<RawStatusProgressItem>
}

export interface ModuleProgress {
  /** 0..1 per module; zero-total modules yield 0. */
  onboarding: number
  training: number
  clearance: number
  /** Average over ONLY the modules that contain data (0 if all empty). */
  overall: number
}

export const NO_ACTION_REQUIRED_STATUS = "noActionRequired"

export function computeModuleProgress(items: ProgressModuleItems): ModuleProgress {
  // ── onboarding tasks (noActionRequired excluded, mirrors Flutter) ──
  const relevantTasks = items.tasks.filter(
    (task) => task.status !== NO_ACTION_REQUIRED_STATUS,
  )
  const totalTasks = relevantTasks.length
  const completedTasks = relevantTasks.filter((task) => task.isCompleted === true).length
  const onboardingPct = totalTasks === 0 ? 0 : completedTasks / totalTasks

  // ── trainings ──
  const totalTrainings = items.trainings.length
  const completedTrainings = items.trainings.filter(
    (training) => training.status === "completed",
  ).length
  const trainingPct = totalTrainings === 0 ? 0 : completedTrainings / totalTrainings

  // ── clearance ──
  const totalClearances = items.clearances.length
  const completedClearances = items.clearances.filter(
    (clearance) => clearance.status === "verified",
  ).length
  const clearancePct = totalClearances === 0 ? 0 : completedClearances / totalClearances

  // ── overall (average of modules that contain data) ──
  let activeModules = 0
  let sumProgress = 0
  if (totalTasks > 0) {
    activeModules++
    sumProgress += onboardingPct
  }
  if (totalTrainings > 0) {
    activeModules++
    sumProgress += trainingPct
  }
  if (totalClearances > 0) {
    activeModules++
    sumProgress += clearancePct
  }
  const overallPct = activeModules === 0 ? 0 : sumProgress / activeModules

  return {
    onboarding: onboardingPct,
    training: trainingPct,
    clearance: clearancePct,
    overall: overallPct,
  }
}
