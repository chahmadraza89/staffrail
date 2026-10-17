import { DirectoryView } from "@/app/dashboard/directory/directory-view"
import { redirect } from "next/navigation"

import { requireAdmin } from "@/lib/auth/guard"
import { AppAuthError } from "@/lib/auth/types"

export const instant = false

/**
 * Employee Directory (list) — Angular of the Flutter
 * admin_directory/admin_directory_home_web.dart: live employee cards,
 * filter chips, search, Add/Edit/Deactivate lifecycle actions.
 */
export default async function DirectoryPage() {
  let context
  try {
    context = await requireAdmin()
  } catch (error) {
    if (error instanceof AppAuthError) {
      redirect("/login?redirect=%2Fdashboard%2Fdirectory&state=expired")
    }
    throw error
  }

  return <DirectoryView adminUid={context.uid} adminEmail={context.email ?? "admin"} />
}
