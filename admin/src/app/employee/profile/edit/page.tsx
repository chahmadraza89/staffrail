import { requireEmployeePageSession } from "@/lib/auth/employee-guard"
import { EmployeeEditProfileView } from "./edit-profile-view"

export const instant = false

export default async function EmployeeEditProfilePage() {
  const session = await requireEmployeePageSession()
  return (
    <EmployeeEditProfileView
      employeeUid={session.uid}
      initialName={session.profile.name}
      initialPhone={session.profile.phoneNumber ?? ""}
      initialDepartment={session.profile.department ?? ""}
    />
  )
}
