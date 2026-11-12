/**
 * Task status model — ported from the Flutter app
 * (lib/features/employee/on_boarding/data/model/on_boarding_model.dart).
 * The string values are exactly what Firestore stores: never rename.
 */

export const TASK_STATUSES = [
  "notStarted",
  "pending",
  "submitted",
  "waitingForApprover",
  "pendingEmployerSignature",
  "rejected",
  "acknowledged",
  "completed",
  "verified",
  "signed",
  "confirmed",
  "cleared",
  "required",
  "expired",
  "underReview",
  "noActionRequired",
] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]

export function parseTaskStatus(value: unknown): TaskStatus {
  return typeof value === "string" && (TASK_STATUSES as readonly string[]).includes(value)
    ? (value as TaskStatus)
    : "notStarted"
}

/** Statuses pending admin intervention (mirrors dashboard_provider.dart). */
export const ACTION_REQUIRED_STATUSES: readonly TaskStatus[] = [
  "submitted",
  "signed",
  "pendingEmployerSignature",
  "waitingForApprover",
]

/** Status labels/colors used by the dashboard action tiles. */
export const STATUS_UI: Record<TaskStatus, { label: string; tone: "blue" | "green" | "orange" | "red" | "slate" }> = {
  submitted: { label: "Submitted", tone: "blue" },
  signed: { label: "Signed", tone: "green" },
  waitingForApprover: { label: "Waiting For Approver", tone: "orange" },
  rejected: { label: "Rejected", tone: "red" },
  completed: { label: "Completed", tone: "green" },
  pending: { label: "Pending", tone: "slate" },
  notStarted: { label: "Not Started", tone: "slate" },
  pendingEmployerSignature: { label: "Awaiting Counter-Sign", tone: "orange" },
  acknowledged: { label: "Acknowledged", tone: "green" },
  verified: { label: "Verified", tone: "green" },
  confirmed: { label: "Confirmed", tone: "green" },
  cleared: { label: "Cleared", tone: "green" },
  required: { label: "Required", tone: "slate" },
  expired: { label: "Expired", tone: "red" },
  underReview: { label: "Under Review", tone: "blue" },
  noActionRequired: { label: "No Action Required", tone: "slate" },
}
