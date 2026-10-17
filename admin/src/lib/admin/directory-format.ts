/**
 * Pure formatting helpers for the Employee Directory — faithful ports of
 * the Flutter implementations in
 * lib/features/admin/admin_directory/presentation/admin_directory_profile_card_data.dart
 * (_getInitials, _formatLastActivity, _getPhaseText, _getPhaseColor) and
 * screens/widgets/admin_directory_helpers.dart (getInitials).
 *
 * Text/color semantics are load-bearing for admin UX parity — do not
 * "improve" thresholds or labels without noting the Flutter source.
 */

import type { AdminEmployeeProgress } from "@/lib/admin/dashboard-models"

/** "John Doe" → "JD", single word → first two letters, empty → "??". */
export function getInitials(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim()
  if (trimmed.length === 0) {
    return "??"
  }
  const parts = trimmed.split(/\s+/)
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return trimmed.slice(0, 2).toUpperCase()
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Flutter: "Active just now" / "Active 5m ago" / "Active 3h ago" /
 * "Active 2d ago" / "Active on D/M". Deactivated employees get a fixed
 * "Deactivated" label set by the caller.
 */
export function formatLastActivity(
  time: Date | null | undefined,
  now: Date = new Date(),
): string {
  if (!time) {
    return "Active just now"
  }
  const difference = now.getTime() - time.getTime()
  if (Number.isNaN(difference)) {
    return "Active just now"
  }
  if (difference < MINUTE) {
    return "Active just now"
  }
  if (difference < HOUR) {
    return `Active ${Math.floor(difference / MINUTE)}m ago`
  }
  if (difference < DAY) {
    return `Active ${Math.floor(difference / HOUR)}h ago`
  }
  if (difference < 7 * DAY) {
    return `Active ${Math.floor(difference / DAY)}d ago`
  }
  return `Active on ${time.getDate()}/${time.getMonth() + 1}`
}

export type DirectoryPhase = {
  text: "Onboarding Phase" | "Training Phase" | "Final Review" | "Compliant"
  tone: "orange" | "blue" | "purple" | "green"
}

/** Flutter thresholds: <0.33 onboarding, <0.66 training, <1 final, else compliant. */
export function getPhase(progress: number): DirectoryPhase {
  if (progress < 0.33) {
    return { text: "Onboarding Phase", tone: "orange" }
  }
  if (progress < 0.66) {
    return { text: "Training Phase", tone: "blue" }
  }
  if (progress < 1) {
    return { text: "Final Review", tone: "purple" }
  }
  return { text: "Compliant", tone: "green" }
}

export type DirectoryFilter = "active" | "deactivated" | "all"

/** Flutter default is DirectoryFilter.active. */
export const DEFAULT_DIRECTORY_FILTER: DirectoryFilter = "active"

export function applyDirectoryFilter(
  employees: AdminEmployeeProgress[],
  filter: DirectoryFilter,
): AdminEmployeeProgress[] {
  if (filter === "active") {
    return employees.filter((employee) => employee.isActive)
  }
  if (filter === "deactivated") {
    return employees.filter((employee) => !employee.isActive)
  }
  return employees
}

export function matchesDirectorySearch(
  employee: AdminEmployeeProgress,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase()
  if (normalized.length === 0) {
    return true
  }
  return (
    employee.name.toLowerCase().includes(normalized) ||
    (employee.email ?? "").toLowerCase().includes(normalized)
  )
}
