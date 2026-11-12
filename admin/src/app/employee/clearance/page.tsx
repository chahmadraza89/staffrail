import { requireEmployeePageSession } from "@/lib/auth/employee-guard"
import { EmployeeClearanceView } from "./employee-clearance-view"

export const instant = false

export default async function EmployeeClearancePage() {
  const session = await requireEmployeePageSession()
  return <EmployeeClearanceView employeeUid={session.uid} />
}
