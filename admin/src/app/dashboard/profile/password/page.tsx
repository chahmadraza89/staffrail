import { ChangePasswordView } from "@/app/dashboard/profile/password/change-password-view"
import { requireAdminProfile } from "@/lib/auth/profile-context"

export const instant = false

export default async function ChangePasswordPage() {
  const profile = await requireAdminProfile("/dashboard/profile/password")
  return <ChangePasswordView uid={profile.uid} email={profile.email} />
}
