"use server"

/**
 * An example of a protected Server Action.
 *
 * Server Actions are publicly reachable HTTP endpoints — always authorize
 * with requireAdmin() inside the action; never rely on page-level checks.
 */
import { AppAuthError } from "@/lib/auth/types"
import { requireAdmin } from "@/lib/auth/guard"

export interface AdminSummary {
  email: string
  name: string
  role: string
}

/**Throws for unauthorized callers; the client surfaces the error state. */
export async function fetchAdminSummary(): Promise<AdminSummary> {
  const context = await requireAdmin()

  return {
    email: context.email ?? "",
    name: context.profile.name ?? "StaffRail admin",
    role: context.profile.role,
  }
}

/** Utility wrapper for actions that must deny (not throw) unauthorized use. */
export async function withAdminGuard<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    await requireAdmin()
    return await fn()
  } catch (error) {
    if (error instanceof AppAuthError) {
      return null
    }
    throw error
  }
}
