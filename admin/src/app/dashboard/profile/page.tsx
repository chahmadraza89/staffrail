import { AppAuthError } from "@/lib/auth/types"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth/guard"

export const instant = false

/**
 * Admin's own profile — ported later within Phase 4
 * (source: admin_profile/web screens). Currently a guarded placeholder.
 */
export default async function AdminProfilePage() {
  let context
  try {
    context = await requireAdmin()
  } catch (error) {
    if (error instanceof AppAuthError) {
      redirect("/login?redirect=%2Fdashboard%2Fprofile&state=expired")
    }
    throw error
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        {context.email} · role {context.profile.role}
      </p>
      <p className="text-muted-foreground mt-6 text-xs">
        Change-password / edit-profile screens are ported within Phase 4 from
        <code className="mx-1">admin_profile/web</code>.
      </p>
    </div>
  )
}
