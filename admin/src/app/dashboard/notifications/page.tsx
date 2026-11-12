import { redirect } from "next/navigation"

import { requireAdmin } from "@/lib/auth/guard"
import { AppAuthError } from "@/lib/auth/types"
import { AdminNotificationsView } from "./notifications-view"

export const instant = false

export default async function AdminNotificationsPage() {
  let auth
  try {
    auth = await requireAdmin()
  } catch (error) {
    if (error instanceof AppAuthError) {
      redirect("/login?redirect=%2Fdashboard%2Fnotifications&state=expired")
    }
    throw error
  }
  return (
    <AdminNotificationsView
      adminUid={auth.uid}
      adminName={auth.profile.name?.trim() || auth.email || "Administrator"}
      adminEmail={auth.email ?? ""}
    />
  )
}
