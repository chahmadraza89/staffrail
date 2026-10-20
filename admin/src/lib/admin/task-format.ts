/**
 * Pure formatting/predicate helpers for the employee task review panel.
 * Every Dart quirk below is intentionally preserved (they are visible in the
 * Flutter web reference):
 *
 *  - `ActivityTimeline` dates are LOCAL and use short month names, no
 *    zero-padding (`Oct 5`), while the acknowledge form uses
 *    `MMMM dd, yyyy` (zero-padded day) and tax/vehicle dates use
 *    `MM/dd/yyyy` / `yyyy-mm-dd`.
 *  - `_buildDataRow` labels insert a space before EVERY uppercase letter and
 *    replace underscores, then uppercase (no whitespace collapsing) —
 *    "ssnLast4" → "SSN LAST4".
 *  - A typed signature is stored as `typed:<name>`; a drawn signature is an
 *    uploaded URL and is labelled "Digital Signature captured".
 *  - Accept/reject availability mirrors the TaskDetailPanel status sets.
 */
import type { TaskStatus } from "@/lib/admin/task-status"

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

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

function isUsableDate(date: Date | null | undefined): date is Date {
  return date instanceof Date && !Number.isNaN(date.getTime())
}

/** ActivityTimeline `_formatDate`: "Oct 5", or "Pending" when null. */
export function formatTimelineDate(date: Date | null): string {
  if (!isUsableDate(date)) {
    return "Pending"
  }
  return `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`
}

/** Acknowledge form `DateFormat('MMMM dd, yyyy')`: "October 05, 2026". */
export function formatLongDate(date: Date | null): string {
  if (!isUsableDate(date)) {
    return "N/A"
  }
  return `${MONTHS_LONG[date.getMonth()]} ${String(date.getDate()).padStart(2, "0")}, ${date.getFullYear()}`
}

/** Acknowledge form `DateFormat('MM/dd/yyyy')`: "10/05/2026". */
export function formatShortDate(date: Date | null): string {
  if (!isUsableDate(date)) {
    return "N/A"
  }
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`
}

/** Vehicle doc fallback: `yyyy-mm-dd` (zero-padded month/day). */
export function formatIsoDate(date: Date | null): string {
  if (!isUsableDate(date)) {
    return "N/A"
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

/** Training log table: `M/D/YYYY` (no padding), em dash when unsigned. */
export function formatTrainingDate(date: Date | null): string {
  if (!isUsableDate(date)) {
    return "—"
  }
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
}

/** Dart `_buildDataRow` label transform (space before each capital). */
export function formatFormLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/(?=[A-Z])/g, " ").trim().toUpperCase()
}

/**
 * Display-only rendering of a form value. Dart calls `.toString()`; arrays
 * of maps (acknowledgments/skills) become unreadable in that form, so they
 * are JSON-rendered here. Primitive rendering is identical.
 */
export function formatFormValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ""
  }
  if (Array.isArray(value) || typeof value === "object") {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

/**
 * `getCleanFileName()`: Firebase Storage URLs wrap the path in `/o/<encoded>`,
 * the timestamp prefix (`1779348558389_`) is stripped, and the query removed.
 */
export function fileNameFromUrl(url: string): string {
  if (url.length === 0) {
    return ""
  }
  try {
    let pathSegment = url.split("/o/").pop()!.split("?")[0]
    if (pathSegment === url) {
      pathSegment = url.split("/").pop()!.split("?")[0]
    }
    const decoded = decodeURIComponent(pathSegment)
    const rawFileName = decoded.split("/").pop() ?? decoded
    return rawFileName.replace(/^\d+_/, "")
  } catch {
    return url.split("/").pop()?.split("?")[0] ?? url
  }
}

/** TaskDetailPanel `_buildFilePreview` image detection. */
export function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|webp|gif|bmp)/i.test(url)
}

export interface SignatureDisplay {
  isTyped: boolean
  text: string
}

/** `signatureUrl ?? formData.signatureData`, with the `typed:` prefix. */
export function formatSignature(signature: string | null | undefined): SignatureDisplay {
  if (typeof signature !== "string" || signature.length === 0) {
    return { isTyped: false, text: "" }
  }
  if (signature.startsWith("typed:")) {
    return { isTyped: true, text: signature.slice("typed:".length) }
  }
  return { isTyped: false, text: "Digital Signature captured" }
}

/** Statuses the TaskDetailPanel treats as "submitted" in the timeline. */
export function isSubmittedStatus(status: TaskStatus): boolean {
  return status !== "pending" && status !== "notStarted" && status !== "rejected"
}

/** Timeline "Verified" step. */
export function isVerifiedStatus(status: TaskStatus): boolean {
  return status === "verified" || status === "completed"
}

/** `canAccept` in TaskDetailPanel. */
export function canAcceptTask(status: TaskStatus): boolean {
  return (
    status === "submitted" ||
    status === "signed" ||
    status === "pendingEmployerSignature" ||
    status === "waitingForApprover" ||
    status === "rejected"
  )
}

/** `canReject` in TaskDetailPanel. */
export function canRejectTask(status: TaskStatus): boolean {
  return canAcceptTask(status) || status === "completed" || status === "verified"
}

/**
 * `_isDownloadAvailable`: uploads need a file; forms only become downloadable
 * after the employee submitted them.
 */
export function isDownloadAvailable(task: {
  actionType: string | null
  fileUrl: string | null
  status: TaskStatus
}): boolean {
  if (task.actionType === "upload") {
    return task.fileUrl !== null
  }
  return (
    task.status === "submitted" ||
    task.status === "pendingEmployerSignature" ||
    task.status === "waitingForApprover" ||
    task.status === "completed" ||
    task.status === "verified" ||
    task.status === "signed" ||
    task.status === "acknowledged"
  )
}

export type StatusTone = "slate" | "blue" | "green" | "orange" | "red"

/** AdminDirectoryHelpers.getStatusColor (tone form). */
export function statusTone(status: TaskStatus): StatusTone {
  if (status === "completed" || status === "verified" || status === "cleared") {
    return "green"
  }
  if (
    status === "submitted" ||
    status === "signed" ||
    status === "pendingEmployerSignature" ||
    status === "underReview"
  ) {
    return "blue"
  }
  if (status === "pending") {
    return "orange"
  }
  if (status === "rejected" || status === "expired") {
    return "red"
  }
  return "slate"
}

/** The two tax tasks whose blank-form URL is admin-configurable in Dart. */
export const BLANK_FORM_TASK_IDS = ["tax_documents_i_9", "tax_documents_w_9"] as const

export const DEFAULT_BLANK_FORM_LINKS: Record<string, string> = {
  tax_documents_i_9: "https://www.uscis.gov/sites/default/files/document/forms/i-9.pdf",
  tax_documents_w_9: "https://www.irs.gov/pub/irs-pdf/fw9.pdf",
}
