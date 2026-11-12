export const MAX_PORTAL_UPLOAD_BYTES = 10 * 1024 * 1024

export const EXTENSION_CONTENT_TYPES: Readonly<Record<string, string>> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  txt: "text/plain",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  rtf: "application/rtf",
  odt: "application/vnd.oasis.opendocument.text",
}

export const ALLOWED_UPLOAD_MIME_TYPES: ReadonlySet<string> = new Set(
  Object.values(EXTENSION_CONTENT_TYPES),
)

export const INLINE_SAFE_MIME_TYPES: ReadonlySet<string> = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/bmp",
])

export class UploadValidationError extends Error {
  readonly code = "invalid-argument"

  constructor(message: string) {
    super(message)
    this.name = "UploadValidationError"
  }
}

export function validateUploadPayload(
  fileNameOrPath: string,
  declaredContentType: string | null | undefined,
  byteLength: number,
): string {
  if (!Number.isFinite(byteLength) || byteLength <= 0) {
    throw new UploadValidationError("The selected file is empty.")
  }
  if (byteLength > MAX_PORTAL_UPLOAD_BYTES) {
    throw new UploadValidationError(
      `The selected file is larger than ${Math.floor(MAX_PORTAL_UPLOAD_BYTES / (1024 * 1024))} MB.`,
    )
  }

  const baseName = fileNameOrPath.split(/[\\/]/).pop()?.trim() ?? ""
  const dot = baseName.lastIndexOf(".")
  const ext = dot > 0 ? baseName.slice(dot + 1).toLowerCase() : ""
  const inferred = EXTENSION_CONTENT_TYPES[ext]
  if (!inferred) {
    throw new UploadValidationError(
      "Unsupported file type. Choose a PDF, image, or office document.",
    )
  }

  const declared = (declaredContentType ?? "").split(";")[0].trim().toLowerCase()
  if (declared.length > 0 && declared !== "application/octet-stream") {
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(declared)) {
      throw new UploadValidationError("This file MIME type is not allowed.")
    }
    return declared
  }

  return inferred
}

export function sanitizeContentDispositionFilename(rawName: string): string {
  const base = (rawName.split(/[\\/]/).pop() ?? "").trim()
  const cleaned = base
    .replace(/[\r\n"\\]/g, "_")
    .replace(/[^A-Za-z0-9._ -]/g, "_")
    .slice(0, 140)
  return cleaned.length > 0 ? cleaned : "file"
}
