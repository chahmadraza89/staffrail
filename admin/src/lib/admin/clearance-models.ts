/**
 * Admin Clearance (Verify) domain models and derivations — the web subset of
 * the Flutter `admin_clearance` feature:
 *
 *   AdminClearanceDomain.mapToActions / computeStats /
 *   mapToRecentApprovals        → buildClearanceActions / deriveClearanceStats /
 *                                 buildRecentApprovals
 *   AdminClearanceViewData._buildHistory → buildClearanceHistory
 *
 * Pure TypeScript, no Firebase imports, so ordering and counters are
 * unit-testable without a Firestore double. `now` is injectable wherever the
 * Flutter code called `DateTime.now()`.
 */

import type { ClearanceStatusRaw } from "@/lib/admin/employee-detail-streams"

export const CLEARANCE_STATUS_LABELS: Record<ClearanceStatusRaw, string> = {
  pending: "Pending",
  underReview: "Under Review",
  verified: "Verified",
  expired: "Expired",
  actionRequired: "Action Required",
}

export function clearanceStatusLabel(status: ClearanceStatusRaw): string {
  return CLEARANCE_STATUS_LABELS[status]
}

/** users/{uid}/clearance/{id} — the subset the admin console consumes. */
export interface ClearanceRecord {
  id: string
  employeeId: string | null
  employeeName: string | null
  adminId: string | null
  title: string
  description: string
  status: ClearanceStatusRaw
  fileUrl: string | null
  rejectionReason: string | null
  dueDate: Date | null
  submittedAt: Date | null
  verifiedAt: Date | null
  updatedAt: Date | null
  /** Full-document fingerprint captured with this snapshot (review guard). */
  revision: string
}

/** One "Action Required" list row (only `underReview` items appear). */
export interface ClearanceActionItem {
  id: string
  employeeId: string
  employeeName: string | null
  title: string
  subtitle: string
  updatedAt: Date | null
  timeAgo: string
}

export interface ClearanceStats {
  pendingReview: number
  verified: number
  /** Rejected OR expired — the Flutter grouping (clearance_domain.dart). */
  actionRequired: number
  total: number
}

export const RECENT_APPROVAL_TONES = [
  "blue",
  "green",
  "purple",
  "yellow",
  "rose",
] as const
export type RecentApprovalTone = (typeof RECENT_APPROVAL_TONES)[number]

export interface RecentApproval {
  employeeId: string
  name: string
  initials: string
  tone: RecentApprovalTone
}

export interface ClearanceRecentApprovals {
  approvals: RecentApproval[]
  additionalCount: number
}

export type ClearanceHistoryTone = "green" | "blue" | "red" | "amber"

export interface ClearanceHistoryEvent {
  title: string
  timestamp: string
  author: string
  tone: ClearanceHistoryTone
  isLast: boolean
}

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

function isUsableDate(date: Date | null | undefined): date is Date {
  return date instanceof Date && !Number.isNaN(date.getTime())
}

function clockParts(date: Date): { hours: string; minutes: string; meridiem: string } {
  const hours24 = date.getHours()
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  return {
    hours: String(hours12).padStart(2, "0"),
    minutes: String(date.getMinutes()).padStart(2, "0"),
    meridiem: hours24 >= 12 ? "PM" : "AM",
  }
}

/** Dart `DateFormat('MMM dd, yyyy at hh:mm a')`. */
export function formatClearanceDateTime(date: Date | null): string {
  if (!isUsableDate(date)) {
    return "N/A"
  }
  const clock = clockParts(date)
  return `${MONTHS_SHORT[date.getMonth()]} ${String(date.getDate()).padStart(2, "0")}, ${date.getFullYear()} at ${clock.hours}:${clock.minutes} ${clock.meridiem}`
}

/** Dart `DateFormat('MMM dd, hh:mm a')` used by the history card. */
export function formatClearanceHistoryDate(date: Date | null): string {
  if (!isUsableDate(date)) {
    return "Recently"
  }
  const clock = clockParts(date)
  return `${MONTHS_SHORT[date.getMonth()]} ${String(date.getDate()).padStart(2, "0")}, ${clock.hours}:${clock.minutes} ${clock.meridiem}`
}

/** Dart `_formatTimeAgo`: "3d ago" / "2h ago" / "5m ago" / "Just now". */
export function formatTimeAgo(date: Date | null, now: Date = new Date()): string {
  if (!isUsableDate(date)) {
    return "Recently"
  }
  const difference = now.getTime() - date.getTime()
  if (difference >= 24 * 60 * 60 * 1000) {
    return `${Math.floor(difference / (24 * 60 * 60 * 1000))}d ago`
  }
  if (difference >= 60 * 60 * 1000) {
    return `${Math.floor(difference / (60 * 60 * 1000))}h ago`
  }
  if (difference >= 60 * 1000) {
    return `${Math.floor(difference / (60 * 1000))}m ago`
  }
  return "Just now"
}

/** Dart `_getInitials`; empty names render as "??". */
export function initialsOf(name: string | null | undefined): string {
  if (!name) {
    return "??"
  }
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return "??"
  }
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return parts[0][0].toUpperCase()
}

/**
 * Stable newest-first ordering. Documents without `updatedAt` sort last
 * (Flutter treats them as epoch 0); the id tiebreaker keeps snapshots
 * deterministic.
 */
export function sortClearances(
  records: readonly ClearanceRecord[],
): ClearanceRecord[] {
  return [...records].sort((left, right) => {
    const leftTime = left.updatedAt?.getTime() ?? 0
    const rightTime = right.updatedAt?.getTime() ?? 0
    if (leftTime !== rightTime) {
      return rightTime - leftTime
    }
    const byEmployee = (left.employeeId ?? "").localeCompare(right.employeeId ?? "")
    return byEmployee !== 0 ? byEmployee : left.id.localeCompare(right.id)
  })
}

/** Mirrors `AdminClearanceDomain.computeStats`. */
export function deriveClearanceStats(
  records: readonly Pick<ClearanceRecord, "status">[],
): ClearanceStats {
  let pendingReview = 0
  let verified = 0
  let actionRequired = 0

  for (const record of records) {
    if (record.status === "underReview") {
      pendingReview += 1
    }
    if (record.status === "verified") {
      verified += 1
    }
    if (record.status === "actionRequired" || record.status === "expired") {
      actionRequired += 1
    }
  }

  return {
    pendingReview,
    verified,
    actionRequired,
    total: records.length,
  }
}

/**
 * Pending-review rows in newest-first order. Records without an
 * `employeeId` cannot be opened (Flutter shows a "being repaired" notice);
 * they stay visible so an admin can see that work is waiting.
 */
export function buildClearanceActions(
  records: readonly ClearanceRecord[],
  now: Date = new Date(),
): ClearanceActionItem[] {
  return records
    .filter((record) => record.status === "underReview")
    .map((record) => ({
      id: record.id,
      employeeId: record.employeeId ?? "",
      employeeName: record.employeeName,
      title: record.title,
      subtitle: `Submitted by ${record.employeeName ?? "Unknown"}`,
      updatedAt: record.updatedAt,
      timeAgo: record.updatedAt ? formatTimeAgo(record.updatedAt, now) : "Recently",
    }))
    .sort((left, right) => {
      const leftTime = left.updatedAt?.getTime() ?? 0
      const rightTime = right.updatedAt?.getTime() ?? 0
      if (leftTime !== rightTime) {
        return rightTime - leftTime
      }
      return left.id.localeCompare(right.id)
    })
}

/**
 * Unique employees with at least one verified clearance, newest approval
 * first. Only the three most recent are shown; the remainder becomes a "+N"
 * chip (Flutter `mapToRecentApprovals`).
 */
export function buildRecentApprovals(
  records: readonly Pick<
    ClearanceRecord,
    "employeeId" | "employeeName" | "status" | "verifiedAt"
  >[],
): ClearanceRecentApprovals {
  const verified = records
    .filter(
      (record) =>
        record.status === "verified" &&
        record.verifiedAt !== null &&
        record.employeeId !== null,
    )
    .sort(
      (left, right) =>
        (right.verifiedAt?.getTime() ?? 0) - (left.verifiedAt?.getTime() ?? 0),
    )

  const seen = new Set<string>()
  const approvals: RecentApproval[] = []

  for (const record of verified) {
    const employeeId = record.employeeId
    if (employeeId === null || seen.has(employeeId)) {
      continue
    }
    seen.add(employeeId)
    if (approvals.length >= 3) {
      continue
    }
    const name = record.employeeName ?? "Unknown Employee"
    approvals.push({
      employeeId,
      name,
      initials: initialsOf(name),
      tone: RECENT_APPROVAL_TONES[approvals.length % RECENT_APPROVAL_TONES.length],
    })
  }

  return {
    approvals,
    additionalCount: Math.max(0, seen.size - approvals.length),
  }
}

/**
 * Timeline events, exactly like Flutter's `_buildHistory`: upload, then
 * verification or rejection, otherwise "Pending Review".
 */
export function buildClearanceHistory(
  clearance: Pick<
    ClearanceRecord,
    "status" | "submittedAt" | "verifiedAt" | "updatedAt"
  >,
): ClearanceHistoryEvent[] {
  const events: ClearanceHistoryEvent[] = []

  if (clearance.submittedAt) {
    events.push({
      title: "Document Uploaded",
      timestamp: formatClearanceHistoryDate(clearance.submittedAt),
      author: "Employee",
      tone: "green",
      isLast: false,
    })
  }

  if (clearance.verifiedAt) {
    events.push({
      title: "Clearance Verified",
      timestamp: formatClearanceHistoryDate(clearance.verifiedAt),
      author: "Admin",
      tone: "blue",
      isLast: true,
    })
  } else if (clearance.status === "actionRequired") {
    events.push({
      title: "Clearance Rejected",
      timestamp: formatClearanceHistoryDate(clearance.updatedAt),
      author: "Admin",
      tone: "red",
      isLast: true,
    })
  } else if (clearance.status === "underReview") {
    events.push({
      title: "Pending Review",
      timestamp: "Awaiting signature",
      author: "Admin",
      tone: "amber",
      isLast: true,
    })
  }

  return events
}
