import { requireEmployeePageSession } from "@/lib/auth/employee-guard"
import { EmployeeGuideView } from "./employee-guide-view"

export const instant = false

export default async function EmployeeGuidePage() {
  const session = await requireEmployeePageSession()
  return <EmployeeGuideView employeeUid={session.uid} />
}
