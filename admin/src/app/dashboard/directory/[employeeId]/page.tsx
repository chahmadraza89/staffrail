import { redirect } from "next/navigation"

import { EmployeeDetailView } from "@/app/dashboard/directory/[employeeId]/employee-detail-view"
import { requireAdmin } from "@/lib/auth/guard"
import { AppAuthError } from "@/lib/auth/types"

export const instant = false

/**
 * Employee Profile Detail — port of the Flutter
 * admin_directory/admin_inner_card_page.dart (web title
 * "Employee Profile Detail"): profile header, progress overview and the
 * 7-category compliance checklist for ONE employee. Task review actions
 * land with the task panel step.
 */
export default async function EmployeeDetailPage({
  params,
}: PageProps<"/dashboard/directory/[employeeId]">) {
  let context
  try {
    context = await requireAdmin()
  } catch (error) {
    if (error instanceof AppAuthError) {
      redirect("/login?redirect=%2Fdashboard%2Fdirectory&state=expired")
    }
    throw error
  }

  const { employeeId } = await params
  return (
    <EmployeeDetailView
      employeeId={employeeId}
      adminUid={context.uid}
      adminEmail={context.email ?? "admin"}
      adminName={context.profile.name?.trim() || context.email || "Administrator"}
    />
  )
}
