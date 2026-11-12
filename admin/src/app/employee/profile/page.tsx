import { requireEmployeePageSession } from "@/lib/auth/employee-guard"
import { EmployeeProfileView } from "./employee-profile-view"

export const instant = false

export default async function EmployeeProfilePage() {
  const session = await requireEmployeePageSession()
  return (
    <EmployeeProfileView
      initialProfile={{
        uid: session.uid,
        name: session.profile.name,
        email: session.email,
        role: session.profile.role,
        isActive: session.profile.isActive,
        adminId: session.profile.adminId,
        photoUrl: session.profile.photoUrl,
        department: session.profile.department,
        phoneNumber: session.profile.phoneNumber,
        notificationPreferences: session.profile.notificationPreferences,
      }}
    />
  )
}
