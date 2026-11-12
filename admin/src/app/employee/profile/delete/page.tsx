import { requireEmployeePageSession } from "@/lib/auth/employee-guard"
import { EmployeeDeleteAccountView } from "./delete-account-view"

export const instant = false

export default async function EmployeeDeleteAccountPage() {
  const session = await requireEmployeePageSession()
  return (
    <EmployeeDeleteAccountView
      employeeUid={session.uid}
      employeeName={session.profile.name}
    />
  )
}
