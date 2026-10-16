import Link from "next/link"
import { redirect } from "next/navigation"

import { SignOutButton } from "@/components/auth/sign-out-button"
import { requireAdmin } from "@/lib/auth/guard"
import { AppAuthError } from "@/lib/auth/types"
import { fetchAdminSummary } from "@/app/dashboard/actions"

// Auth gate reads cookies per-request — a blocking (non-streamed) route.
export const instant = false


export default async function DashboardPage() {
  let context
  try {
    context = await requireAdmin()
  } catch (error) {
    if (error instanceof AppAuthError) {
      // Session expired/revoked/changed mid-use → bounce with reason.
      redirect("/login?redirect=%2Fdashboard&state=expired")
    }
    throw error
  }

  const summary = await fetchAdminSummary()

  return (
    <main className="bg-background min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="font-semibold">
            StaffRail Admin
          </Link>
          <SignOutButton />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Signed in as <strong>{summary.email}</strong>({summary.role})
        </p>

        <section className="mt-6 rounded-lg border p-4">
          <h2 className="font-medium">Session verified</h2>
          <ul className="text-muted-foreground mt-2 space-y-1 text-sm">
            <li>uid: {context.uid}</li>
            <li>role: {context.profile.role}</li>
            <li>e-mail verified: {context.emailVerified ? "yes" : "no"}</li>
            <li>workspace adminId: {context.profile.adminId ?? "—"}</li>
          </ul>
        </section>

        <p className="text-muted-foreground mt-8 text-xs">
          Feature screens (Home, Directory, Clearance, Training, Profile) are
          built in the next phase — they will live under this layout and use
          the same <code>requireAdmin()</code> guard for every data access.
        </p>
      </div>
    </main>
  )
}
