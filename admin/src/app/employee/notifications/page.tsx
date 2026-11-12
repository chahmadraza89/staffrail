import { requireEmployeePageSession } from "@/lib/auth/employee-guard"
import { EmployeeNotificationsView } from "./employee-notifications-view"

export const instant = false

export default async function EmployeeNotificationsPage() {
  const session = await requireEmployeePageSession()
  return <EmployeeNotificationsView employeeUid={session.uid} />
}
