"use client"

/**
 * Browser client for `/api/audit-pdf` generation and PDF validation.
 */

import { sanitizePdfFilename } from "@/lib/pdf/filename"

export { sanitizePdfFilename }

export type AuditPdfErrorCode =
  | "invalid-input"
  | "not-signed-in"
  | "session-mismatch"
  | "not-deployed"
  | "permission-denied"
  | "not-found"
  | "failed-precondition"
  | "invalid-argument"
  | "conflict"
  | "unavailable"
  | "invalid-response"
  | "unknown"

const ERROR_MESSAGES: Record<AuditPdfErrorCode, string> = {
  "invalid-input": "An employee and requirement are required.",
  "not-signed-in": "Your browser session has expired. Sign in again and retry.",
  "session-mismatch":
    "This browser is signed in as a different account. Sign in again before downloading this audit record.",
  "not-deployed":
    "The audit PDF endpoint is unavailable right now.",
  "permission-denied":
    "Only an active admin who owns this employee can download the audit record.",
  "not-found": "This requirement no longer exists. Refresh the page.",
  "failed-precondition":
    "This requirement cannot produce an audit record in its current state.",
  "invalid-argument": "The audit record request was rejected as invalid.",
  conflict: "The employee record changed while the audit record was generated. Refresh and retry.",
  unavailable: "The audit record service is unavailable. Check your connection and retry.",
  "invalid-response": "The audit record service returned an invalid document.",
  unknown: "The audit record could not be generated. Please try again.",
}

export class AuditPdfError extends Error {
  readonly code: AuditPdfErrorCode

  constructor(code: AuditPdfErrorCode, message?: string) {
    super(message ?? ERROR_MESSAGES[code])
    this.name = "AuditPdfError"
    this.code = code
  }
}

export interface TaskAuditPdfInput {
  employeeId: string
  taskId: string
  adminUid: string
}

export interface TaskAuditPdf {
  blob: Blob
  filename: string
}

export interface AuditPdfCallableResponse {
  filename: string
  contentType: "application/pdf"
  base64: string
}

function decodeBase64(value: string): Uint8Array {
  const normalized = value.replace(/\s+/g, "")
  if (
    normalized.length === 0 ||
    normalized.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)
  ) {
    throw new AuditPdfError("invalid-response")
  }
  let binary: string
  try {
    binary = atob(normalized)
  } catch {
    throw new AuditPdfError("invalid-response")
  }
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.length)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

export function decodeAuditPdfResponse(value: unknown): TaskAuditPdf {
  if (value === null || typeof value !== "object") {
    throw new AuditPdfError("invalid-response")
  }
  const record = value as Record<string, unknown>
  if (record.contentType !== "application/pdf" || typeof record.base64 !== "string") {
    throw new AuditPdfError("invalid-response")
  }

  const bytes = decodeBase64(record.base64)
  const magic = String.fromCharCode(
    bytes[0] ?? 0,
    bytes[1] ?? 0,
    bytes[2] ?? 0,
    bytes[3] ?? 0,
    bytes[4] ?? 0,
  )
  if (bytes.length < 5 || magic !== "%PDF-") {
    throw new AuditPdfError("invalid-response")
  }

  return {
    blob: new Blob([copyToArrayBuffer(bytes)], { type: "application/pdf" }),
    filename: sanitizePdfFilename(record.filename),
  }
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") {
    throw new AuditPdfError("unavailable", "This browser cannot save the generated PDF.")
  }
  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    anchor.rel = "noreferrer"
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

export async function fetchTaskAuditPdfFromApi(
  input: TaskAuditPdfInput & { taskSource?: "onboarding" | "training" | "clearance" },
): Promise<{ filename: string; blob: Blob }> {
  const { requestTaskAuditPdfPayload } = await import("@/lib/pdf/client-audit-pdf")
  const result = await requestTaskAuditPdfPayload(input)
  if (!result.ok) {
    const validCodes: Set<string> = new Set([
      "invalid-input",
      "not-signed-in",
      "session-mismatch",
      "permission-denied",
      "not-found",
      "failed-precondition",
      "conflict",
      "unavailable",
      "not-deployed",
      "invalid-response",
      "unknown",
    ])
    const mappedCode = validCodes.has(result.code)
      ? (result.code as AuditPdfErrorCode)
      : "unknown"
    throw new AuditPdfError(mappedCode, result.message)
  }
  return decodeAuditPdfResponse(result.data)
}

export async function downloadTaskAuditPdf(
  input: TaskAuditPdfInput & { taskSource?: "onboarding" | "training" | "clearance" },
): Promise<string> {
  const { blob, filename } = await fetchTaskAuditPdfFromApi(input)
  triggerBlobDownload(blob, filename)
  return filename
}
