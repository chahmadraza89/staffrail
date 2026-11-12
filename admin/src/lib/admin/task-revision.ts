/**
 * Submission revision fingerprints.
 *
 * A review decision is only valid for the EXACT submission the admin saw.
 * Comparing status alone is not enough: an employee can replace a file while
 * the task stays `"submitted"`, or another admin can alter the form payload
 * without changing the status. Every live task document therefore carries a
 * canonical revision string derived from its full Firestore payload, and the
 * write transaction recomputes the same string before touching the document.
 *
 * The canonicalisation sorts object keys (Firestore map field order is not
 * part of the value), preserves array order (attachment order matters) and
 * normalises Firestore Timestamp/Bytes/GeoPoint/Reference values so a
 * snapshot read from a live listener and a transaction read of the same
 * document produce identical output.
 *
 * Pure TypeScript — no Firebase imports, unit-testable.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function timestampParts(value: Record<string, unknown>): string | null {
  // Firestore Timestamp exposes seconds/nanoseconds; prefer them so
  // sub-millisecond precision is not lost (toDate() truncates to ms).
  if (typeof value.seconds === "number" && typeof value.nanoseconds === "number") {
    return `${value.seconds}:${value.nanoseconds}`
  }
  if (typeof value.toDate === "function") {
    try {
      const date = (value.toDate as () => Date)()
      const millis = date.getTime()
      return `${Math.floor(millis / 1000)}:${(millis % 1000) * 1_000_000}`
    } catch {
      return null
    }
  }
  return null
}

function canonicalValue(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value
  }
  if (typeof value === "number") {
    // NaN/Infinity are not storable in Firestore; keep them distinguishable.
    return Number.isFinite(value) ? value : `__number:${String(value)}`
  }
  if (typeof value === "undefined") {
    return { __undefined: true }
  }
  if (value instanceof Date) {
    const millis = value.getTime()
    return { __timestamp: `${Math.floor(millis / 1000)}:${(millis % 1000) * 1_000_000}` }
  }
  if (Array.isArray(value)) {
    return value.map(canonicalValue)
  }
  if (!isRecord(value)) {
    return String(value)
  }

  const timestamp = timestampParts(value)
  if (timestamp !== null) {
    return { __timestamp: timestamp }
  }
  // Firestore Bytes: web SDK class with toUint8Array(), or a raw Uint8Array.
  if (typeof value.toUint8Array === "function") {
    return { __bytes: Array.from((value.toUint8Array as () => Uint8Array)()) }
  }
  if (value instanceof Uint8Array) {
    return { __bytes: Array.from(value) }
  }
  // DocumentReference: never walk into the client instance.
  if (typeof value.path === "string" && "firestore" in value) {
    return { __reference: value.path }
  }
  // GeoPoint.
  if (typeof value.latitude === "number" && typeof value.longitude === "number") {
    return { __geopoint: [value.latitude, value.longitude] }
  }

  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(value).sort()) {
    sorted[key] = canonicalValue(value[key])
  }
  return sorted
}

/**
 * Stable, full-document revision. `null`/`undefined` (a canonical template
 * row with no document yet) returns `""` so it can never equal a real doc.
 */
export function submissionRevision(data: unknown): string {
  if (data === null || data === undefined) {
    return ""
  }
  return JSON.stringify(canonicalValue(data))
}
