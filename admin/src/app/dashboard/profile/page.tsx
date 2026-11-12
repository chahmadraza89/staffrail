import { AdminProfileView } from "@/app/dashboard/profile/profile-view"
import { requireAdminProfile } from "@/lib/auth/profile-context"

export const instant = false

/**
 * Admin's own profile — port of the Flutter `admin_profile` web screen:
 * header, personal information, settings, password/security, privacy and
 * workspace dissolution.
 */
export default async function AdminProfilePage() {
  const profile = await requireAdminProfile("/dashboard/profile")
  return <AdminProfileView profile={profile} />
}
