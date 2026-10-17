import { AppAuthError } from "@/lib/auth/types"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth/guard"

export const instant = false

/**
 * Training management — content ported later within Phase 4
 * (source: admin_training/web screens). Currently a guarded placeholder.
 */
export default async function TrainingPage() {
  await guard()
  return (
    <PlaceholderScreen
      title="Training"
      reference="admin_training/web"
    />
  )
}

async function guard() {
  try {
    await requireAdmin()
  } catch (error) {
    if (error instanceof AppAuthError) {
      redirect("/login?redirect=%2Fdashboard%2Ftraining&state=expired")
    }
    throw error
  }
}

function PlaceholderScreen({ title, reference }: { title: string; reference: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Ported within Phase 4 from <code className="mx-1">{reference}</code>.
      </p>
      <p className="text-muted-foreground mt-4 text-xs">
        This route is already protected: the layout and this page both verify
        the admin session and Firestore profile on every request.
      </p>
    </div>
  )
}
