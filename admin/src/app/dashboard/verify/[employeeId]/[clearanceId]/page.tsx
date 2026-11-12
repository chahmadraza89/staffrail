import { redirect } from "next/navigation"

import { ClearanceDetailView } from "@/app/dashboard/verify/[employeeId]/[clearanceId]/clearance-detail-view"
import { requireAdmin } from "@/lib/auth/guard"
import { AppAuthError } from "@/lib/auth/types"

export const instant = false

/**
 * Clearance review screen — port of the Flutter
 * `AdminClearanceDetailWeb` / `AdminReviewClearancePage`.
 *
 * Params are an employee document id and a `users/{uid}/clearance/{id}`
 * document id. The client subscription re-checks ownership; this route only
 * guarantees an authenticated admin session.
 */
export default async function ClearanceDetailPage({
  params,
}: PageProps<"/dashboard/verify/[employeeId]/[clearanceId]">) {
  const { employeeId, clearanceId } = await params

  let context
  try {
    context = await requireAdmin()
  } catch (error) {
    if (error instanceof AppAuthError) {
      const target = `/dashboard/verify/${encodeURIComponent(employeeId)}/${encodeURIComponent(clearanceId)}`
      redirect(`/login?redirect=${encodeURIComponent(target)}&state=expired`)
    }
    throw error
  }

  return (
    <ClearanceDetailView
      employeeId={employeeId}
      clearanceId={clearanceId}
      adminUid={context.uid}
      adminEmail={context.email ?? "admin"}
    />
  )
}
