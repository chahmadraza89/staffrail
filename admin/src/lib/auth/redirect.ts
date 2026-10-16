/**
 * Safe redirect target validation (open-redirect prevention).
 *
 * Only same-site, same-origin relative paths starting with a single "/" are
 * accepted. Anything else falls back to the default post-login destination.
 * Dependency-free — also imported by the edge-runtime proxy.
 */

export const DEFAULT_REDIRECT_TARGET = "/dashboard"

export function isSafeRedirectTarget(target: string | null | undefined): boolean {
  if (typeof target !== "string") {
    return false
  }

  // Trim, and reject empty targets.
  const candidate = target.trim()
  if (candidate.length === 0) {
    return false
  }

  // Must be a *relative* URL: starts with exactly one "/" (not "//", "\\", etc.)
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.startsWith("/\\")) {
    return false
  }

  // Reject control characters or suspicious encodings of them.
  if (/[\u0000-\u001f\u007f]/.test(candidate)) {
    return false
  }

  // Reject percent-encoded smuggling: decode once and re-check.
  let decoded = candidate
  try {
    decoded = decodeURIComponent(candidate)
  } catch {
    return false // malformed encoding
  }
  if (/[\u0000-\u001f\u007f]/.test(decoded)) {
    return false
  }

  // A colon anywhere signals a scheme/host/port we did not intend to
  // redirect into — simplest and strongest stand-in for a scheme regex.
  if (decoded.includes(":")) {
    return false
  }

  return true
}

/** Returns a validated redirect target, or the safe default. */
export function normalizeRedirectTarget(target: string | null | undefined): string {
  return isSafeRedirectTarget(target) ? (target as string) : DEFAULT_REDIRECT_TARGET
}

/** Encodes a target for use in ?redirect= parameters. */
export function encodeRedirectTarget(target: string): string {
  return encodeURIComponent(normalizeRedirectTarget(target))
}
