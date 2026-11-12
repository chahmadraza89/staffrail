import { redirect } from "next/navigation"

import { requireAdmin } from "@/lib/auth/guard"
import { AppAuthError } from "@/lib/auth/types"
import { AdminAuditView } from "./audit-view"

export const instant = false

export default async function AdminAuditPage() {
  let auth
  try {
    auth = await requireAdmin()
  } catch (error) {
    if (error instanceof AppAuthError) {
      redirect("/login?redirect=%2Fdashboard%2Faudit&state=expired")
    }
    throw error
  }
  return (
    <AdminAuditView
      adminUid={auth.uid}
      adminName={auth.profile.name?.trim() || auth.email || "Administrator"}
      adminEmail={auth.email ?? ""}
    />
  )
}
