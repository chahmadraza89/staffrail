import { EditProfileView } from "@/app/dashboard/profile/edit/edit-profile-view"
import { requireAdminProfile } from "@/lib/auth/profile-context"

export const instant = false

export default async function EditProfilePage() {
  const profile = await requireAdminProfile("/dashboard/profile/edit")
  return <EditProfileView profile={profile} />
}
