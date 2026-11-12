import { DeleteWorkspaceView } from "@/app/dashboard/profile/delete/delete-workspace-view"
import { requireAdminProfile } from "@/lib/auth/profile-context"

export const instant = false

export default async function DeleteWorkspacePage() {
  const profile = await requireAdminProfile("/dashboard/profile/delete")
  return <DeleteWorkspaceView uid={profile.uid} email={profile.email} />
}
