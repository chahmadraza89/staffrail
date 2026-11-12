import { requireEmployeePageSession } from "@/lib/auth/employee-guard"
import { EmployeeSupportView } from "./support-view"

export const instant = false

export default async function EmployeeSupportPage() {
  const session = await requireEmployeePageSession()
  return (
    <EmployeeSupportView
      employeeUid={session.uid}
      employeeName={session.profile.name}
      adminId={session.profile.adminId}
    />
  )
}
