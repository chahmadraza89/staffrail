/**
 * Pure timestamp/date normalization helper supporting Date instances,
 * ISO strings, epoch numbers, and legacy timestamp-like objects.
 */
export function toDateOrNull(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") {
    return null
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === "string") {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (typeof value === "object") {
    const candidate = value as {
      toDate?: unknown
      seconds?: unknown
      _seconds?: unknown
    }
    if (typeof candidate.toDate === "function") {
      const date = (candidate as { toDate: () => Date }).toDate()
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null
    }
    const seconds =
      typeof candidate.seconds === "number"
        ? candidate.seconds
        : typeof candidate._seconds === "number"
          ? candidate._seconds
          : null
    if (seconds !== null && Number.isFinite(seconds)) {
      const parsed = new Date(seconds * 1000)
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }
  }
  return null
}
