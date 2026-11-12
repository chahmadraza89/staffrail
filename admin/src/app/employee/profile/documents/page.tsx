import { requireEmployeePageSession } from "@/lib/auth/employee-guard"
import { EmployeeDocumentCenterView } from "./employee-document-center-view"

export const instant = false

export default async function EmployeeDocumentCenterPage() {
  const session = await requireEmployeePageSession()
  return <EmployeeDocumentCenterView employeeUid={session.uid} />
}
