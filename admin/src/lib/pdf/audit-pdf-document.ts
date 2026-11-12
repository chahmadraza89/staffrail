/**
 * Pure audit PDF assembler — builds a clean, self-contained compliance PDF for
 * an employee onboarding/training/clearance record using `SimplePdfDocument`.
 */

import { ORG_CONFIG } from "@/lib/config/organization"
import { getLegalContent } from "@/lib/admin/legal-content"
import {
  formatFormLabel,
  formatFormValue,
  formatLongDate,
  formatSignature,
} from "@/lib/admin/task-format"
import { sanitizePdfFilename } from "@/lib/pdf/filename"
import { SimplePdfDocument } from "@/lib/pdf/simple-pdf"

export interface AuditPdfTaskInput {
  id: string
  title: string
  subtitle?: string | null
  category?: string | null
  taskSource: "onboarding" | "training" | "clearance"
  actionType?: string | null
  status: string
  isCompleted: boolean
  dueDate?: Date | null
  updatedAt?: Date | null
  completedAt?: Date | null
  signedAt?: Date | null
  rejectionReason?: string | null
  signatureUrl?: string | null
  adminSignatureUrl?: string | null
  fileUrl?: string | null
  fileUrls?: string[]
  blankFormUrl?: string | null
  formData: Record<string, unknown>
  adminFormData: Record<string, unknown>
}

export interface AuditPdfEmployeeInput {
  uid: string
  name: string
  email?: string | null
  department?: string | null
}

export interface BuildTaskAuditPdfInput {
  employee: AuditPdfEmployeeInput
  task: AuditPdfTaskInput
  generatedAt?: Date
  legalContent?: string | null
}

const SKIP_KEYS = new Set(["signedAt", "signature", "signatureData", "witnessSignature", "adminSignatureUrl"])

function formatTimestampDisplay(date: Date | null | undefined): string {
  if (!date || Number.isNaN(date.getTime())) {
    return "N/A"
  }
  return `${formatLongDate(date)} ${date.toISOString().slice(11, 16)} UTC`
}

function formatSignatureDisplay(signature: string | null | undefined): string {
  if (!signature || !signature.trim()) {
    return "Not signed"
  }
  const formatted = formatSignature(signature.trim())
  if (formatted.isTyped) {
    return `Typed e-signature: ${formatted.text}`
  }
  if (/^https?:\/\//i.test(signature.trim())) {
    return `Digital Signature captured (${signature.trim()})`
  }
  return formatted.text || "Signature image recorded"
}

function collectOrderedEntries(data: Record<string, unknown>): Array<{ label: string; value: string }> {
  return Object.entries(data)
    .filter(([key, value]) => !SKIP_KEYS.has(key) && value !== undefined && value !== null && String(value).trim() !== "")
    .map(([key, value]) => ({
      label: formatFormLabel(key),
      value: formatFormValue(value),
    }))
}

export function buildTaskAuditFilename(taskTitle: string, employeeName: string): string {
  const safeTask = taskTitle.trim().replace(/\s+/g, "_") || "Requirement"
  const safeEmp = employeeName.trim().replace(/\s+/g, "_") || "Employee"
  return sanitizePdfFilename(`${safeTask}_${safeEmp}.pdf`)
}

export function buildTaskAuditPdf({
  employee,
  task,
  generatedAt = new Date(),
  legalContent,
}: BuildTaskAuditPdfInput): { filename: string; bytes: Buffer } {
  const doc = new SimplePdfDocument({
    footerText: `${ORG_CONFIG.name} — Compliance Audit Record (${task.id})`,
  })

  doc.addHeaderBanner(`${ORG_CONFIG.name} (${ORG_CONFIG.shortName})`, task.title || "Compliance Record", [
    ORG_CONFIG.address,
    `Generated: ${formatTimestampDisplay(generatedAt)}`,
  ])

  doc.addSectionHeading("Employee & Requirement Metadata")
  doc.addKeyValueRows([
    { label: "Employee Name", value: employee.name || "Unknown Employee" },
    { label: "Employee Email", value: employee.email || "Not provided" },
    { label: "Employee UID", value: employee.uid },
    ...(employee.department ? [{ label: "Department", value: employee.department }] : []),
    { label: "Requirement", value: task.title || task.id },
    { label: "Requirement ID", value: task.id },
    { label: "Module / Category", value: `${task.taskSource}${task.category ? ` (${task.category})` : ""}` },
    { label: "Status", value: task.status },
    { label: "Due Date", value: formatLongDate(task.dueDate ?? null) },
    { label: "Last Updated", value: formatTimestampDisplay(task.updatedAt ?? null) },
    { label: "Completed At", value: formatTimestampDisplay(task.completedAt ?? null) },
  ])

  if (task.rejectionReason && task.rejectionReason.trim().length > 0) {
    doc.addCallout("Admin Review Feedback / Rejection Reason", task.rejectionReason.trim(), "warning")
  }

  const resolvedLegal = legalContent ?? getLegalContent(task.id)
  if (typeof resolvedLegal === "string" && resolvedLegal.trim().length > 0) {
    doc.addSectionHeading("Policy & Legal Text")
    for (const block of resolvedLegal.split(/\n\s*\n/)) {
      const cleaned = block.trim()
      if (cleaned.length > 0) {
        doc.addParagraph(cleaned, { size: 9, spaceAfter: 5 })
      }
    }
  }

  const employeeRows = collectOrderedEntries(task.formData)
  if (employeeRows.length > 0) {
    doc.addSectionHeading("Employee Submission Responses")
    doc.addKeyValueRows(employeeRows)
  }

  const rawWitnessSig =
    typeof task.formData.witnessSignature === "string" && task.formData.witnessSignature.trim().length > 0
      ? task.formData.witnessSignature.trim()
      : null

  doc.addSectionHeading("Employee Signature & Attestation")
  doc.addKeyValueRows([
    { label: "Employee Signature", value: formatSignatureDisplay(task.signatureUrl) },
    ...(rawWitnessSig
      ? [{ label: "Witness Signature", value: formatSignatureDisplay(rawWitnessSig) }]
      : []),
    { label: "Signed Timestamp", value: formatTimestampDisplay(task.signedAt ?? null) },
  ])

  const adminRows = collectOrderedEntries(task.adminFormData)
  if (adminRows.length > 0 || task.adminSignatureUrl) {
    doc.addSectionHeading("Supervisor / Agency Verification")
    if (adminRows.length > 0) {
      doc.addKeyValueRows(adminRows)
    }
    doc.addKeyValueRows([
      {
        label: "Authorized Agency Representative Signature",
        value: formatSignatureDisplay(task.adminSignatureUrl),
      },
    ])
  }

  const attachments = [
    ...(task.fileUrl ? [task.fileUrl] : []),
    ...(task.fileUrls ?? []).filter((url) => url && url !== task.fileUrl),
  ]
  if (attachments.length > 0) {
    doc.addSectionHeading("Uploaded Supporting Documents")
    attachments.forEach((url, index) => {
      doc.addBullet(`Attachment ${index + 1}: ${url}`)
    })
  }

  return {
    filename: buildTaskAuditFilename(task.title || task.id, employee.name || employee.uid),
    bytes: doc.toBuffer(),
  }
}
