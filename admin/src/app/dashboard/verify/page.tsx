import { redirect } from "next/navigation"

import { VerifyView } from "@/app/dashboard/verify/verify-view"
import { requireAdmin } from "@/lib/auth/guard"
import { AppAuthError } from "@/lib/auth/types"

export const instant = false

/**
 * Verify (clearance management) — port of the Flutter `AdminClearanceWeb`
 * screen. The live collection-group query, counters and recent approvals are
 * described in `verify-view.tsx`.
 */
export default async function VerifyPage() {
  let context
  try {
    context = await requireAdmin()
  } catch (error) {
    if (error instanceof AppAuthError) {
      redirect("/login?redirect=%2Fdashboard%2Fverify&state=expired")
    }
    throw error
  }

  return (
    <VerifyView adminUid={context.uid} adminEmail={context.email ?? "admin"} />
  )
}
