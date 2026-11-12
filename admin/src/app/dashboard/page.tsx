import { DashboardView } from "@/app/dashboard/dashboard-view"
import { redirect } from "next/navigation"

import { requireAdmin } from "@/lib/auth/guard"
import { AppAuthError } from "@/lib/auth/types"

export const instant = false

export default async function DashboardPage() {
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
    <DashboardView
      adminUid={context.uid}
      adminEmail={context.email ?? "admin"}
      adminName={context.profile.name?.trim() || context.email || "Administrator"}
    />
  )
}
