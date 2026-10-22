import { redirect } from "next/navigation"

import { TrainingView } from "@/app/dashboard/training/training-view"
import { requireAdmin } from "@/lib/auth/guard"
import { AppAuthError } from "@/lib/auth/types"

export const instant = false

export default async function TrainingPage() {
  let context
  try {
    context = await requireAdmin()
  } catch (error) {
    if (error instanceof AppAuthError) {
      redirect("/login?redirect=%2Fdashboard%2Ftraining&state=expired")
    }
    throw error
  }

  return <TrainingView adminUid={context.uid} adminEmail={context.email ?? "admin"} />
}
