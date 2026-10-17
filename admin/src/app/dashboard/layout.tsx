import { redirect } from "next/navigation"

import { AdminShell } from "@/components/admin/admin-shell"
import { requireAdmin } from "@/lib/auth/guard"
import { AppAuthError } from "@/lib/auth/types"

/**
 * Dashboard layout — mounts the admin shell (sidebar + topbar) around all
 * dashboard sub-routes and enforces admin authorization once per navigation.
 */
export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  let context
  try {
    context = await requireAdmin()
  } catch (error) {
    if (error instanceof AppAuthError) {
      redirect("/login?redirect=%2Fdashboard&state=expired")
    }
    throw error
  }

  return (
    <AdminShell
      adminEmail={context.email ?? "admin"}
      adminName={context.profile.name ?? "StaffRail Admin"}
    >
      {children}
    </AdminShell>
  )
}
