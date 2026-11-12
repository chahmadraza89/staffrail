import { requireEmployeePageSession } from "@/lib/auth/employee-guard"
import { EmployeeMessagesView } from "./employee-messages-view"

export const instant = false

export default async function EmployeeMessagesPage() {
  const session = await requireEmployeePageSession()
  return (
    <EmployeeMessagesView
      employeeUid={session.uid}
      employeeName={session.profile.name}
      adminId={session.profile.adminId}
    />
  )
}
