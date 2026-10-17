import { requireAdmin } from "@/lib/auth/guard"
import { AppAuthError } from "@/lib/auth/types"
import { redirect } from "next/navigation"

export const instant = false

/**
 * Employee Directory — content ported in the next Phase 4 step
 * (source: admin_directory/web screens). Currently a guarded placeholder.
 */
export default async function DirectoryPage() {
  await guard()
  return <PlaceholderScreen title="Directory" reference="admin_directory/web" nextStep />
}

async function guard() {
  try {
    await requireAdmin()
  } catch (error) {
    if (error instanceof AppAuthError) {
      redirect("/login?redirect=%2Fdashboard%2Fdirectory&state=expired")
    }
    throw error
  }
}

function PlaceholderScreen({
  title,
  reference,
  nextStep = false,
}: {
  title: string
  reference: string
  nextStep?: boolean
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Phase 4 continues here — ported from
        <code className="mx-1">{reference}</code>
        {nextStep ? "(next step in this phase)." : "."}
      </p>
      <p className="text-muted-foreground mt-4 text-xs">
        This route is already protected: the layout and this page both verify
        the admin session and Firestore profile on every request.
      </p>
    </div>
  )
}
