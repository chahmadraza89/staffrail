import "server-only"

import { redirect } from "next/navigation"

import { requireAdmin } from "@/lib/auth/guard"
import { AppAuthError } from "@/lib/auth/types"
import { adminSelfProfile, type AdminSelfProfile } from "@/lib/admin/profile-models"

/**
 * Server-side context for the profile routes. The dashboard layout guards the
 * subtree as a whole; each page still re-checks its own request so it can send
 * an expired session back to the correct login redirect.
 */
export async function requireAdminProfile(
  redirectTarget: string,
): Promise<AdminSelfProfile> {
  try {
    const context = await requireAdmin()
    return adminSelfProfile({
      uid: context.uid,
      email: context.email,
      name: context.profile.name,
      photoUrl: context.profile.photoUrl,
      role: context.profile.role,
    })
  } catch (error) {
    if (error instanceof AppAuthError) {
      redirect(`/login?redirect=${encodeURIComponent(redirectTarget)}&state=expired`)
    }
    throw error
  }
}
