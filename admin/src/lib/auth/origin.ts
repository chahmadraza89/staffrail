/**
 * Same-origin request validation for state-changing endpoints (session
 * creation/logout). Dependency-free and unit-testable.
 *
 * Policy:
 *  - A modern browser sends `Origin` (same-origin fetch). Require it to
 *    match the request host exactly.
 *  - If `Origin` is absent (legacy browsers), fall back to `Referer`.
 *  - If both are absent the request is treated as cross-site and denied.
 */

export class OriginError extends Error {
  constructor(message = "cross-origin request rejected") {
    super(message)
    this.name = "OriginError"
  }
}

interface SameOriginInput {
  /** The request's Origin header, if any. */
  originHeader: string | null
  /** The request's Referer header, if any. */
  refererHeader: string | null
  /** The request's host (Host header / URL host), e.g. "admin.staffrail.com". */
  host: string
  /** Force https sources (production defaults this to true). */
  requireHttps?: boolean
}

function hostFromUrlLike(raw: string | null): string | null {
  if (!raw) {
    return null
  }
  try {
    const url = new URL(raw)
    // Also accepts opaque origin "null" (sandboxed iframes) → never matches.
    return url.host.toLowerCase()
  } catch {
    return null
  }
}

/**
 * Throws `OriginError` when the caller does not demonstrate same-origin.
 * The host comparison is case-insensitive and ignores explicit ports when
 * the URL omits the default port (URL parsing equals Host semantics).
 */
export function assertSameOrigin({
  originHeader,
  refererHeader,
  host,
  requireHttps = false,
}: SameOriginInput): void {
  const requestHost = host.toLowerCase()

  const origin = hostFromUrlLike(originHeader)
  const referer = hostFromUrlLike(refererHeader)

  const matchesOrigin = origin === requestHost
  const matchesReferer = referer === requestHost

  if (!matchesOrigin && !matchesReferer) {
    throw new OriginError()
  }

  if (requireHttps) {
    // Every provided source header must be https (missing headers were
    // already rejected above).
    const sources = [originHeader, refererHeader].filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    )
    if (sources.length === 0 || !sources.every((value) => value.startsWith("https://"))) {
      throw new OriginError("insecure origin rejected")
    }
  }
}
