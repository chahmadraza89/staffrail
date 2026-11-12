import { requireEmployeePageSession } from "@/lib/auth/employee-guard"
import { EmployeeDashboardView } from "./employee-dashboard-view"

export const instant = false

export default async function EmployeeHomePage() {
  const session = await requireEmployeePageSession()
  return (
    <EmployeeDashboardView
      employeeUid={session.uid}
      employeeName={session.profile.name}
      employeeEmail={session.email}
      adminId={session.profile.adminId}
    />
  )
}
