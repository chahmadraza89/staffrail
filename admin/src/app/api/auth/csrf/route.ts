import { NextResponse } from "next/server"

import { issueCsrfToken } from "@/lib/auth/session"


/**
 * GET /api/auth/csrf
 *
 * Mints the double-submit CSRF cookie and returns the raw token the client
 * must echo in x-staffrail-csrf on state-changing auth requests.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const token = await issueCsrfToken()
    return NextResponse.json({ token })
  } catch (error) {
    const isConfig = (error as { failure?: string })?.failure === "not_configured"
    return NextResponse.json(
      { error: isConfig ? "not_configured" : "unexpected" },
      { status: isConfig ? 503 : 500 },
    )
  }
}
