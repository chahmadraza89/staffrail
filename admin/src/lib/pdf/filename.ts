/**
 * Shared filename sanitizer usable from both Server Route Handlers and Client components.
 */
export function sanitizePdfFilename(value: unknown): string {
  if (typeof value !== "string") {
    return "audit_record.pdf"
  }
  const withoutPath = value.split(/[\\/]/).pop() ?? ""
  const cleaned = withoutPath
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 140)
  const base = cleaned.length > 0 ? cleaned : "audit_record"
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`
}
