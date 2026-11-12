import { requireEmployeePageSession } from "@/lib/auth/employee-guard"
import { EmployeeTrainingView } from "./employee-training-view"

export const instant = false

export default async function EmployeeTrainingPage() {
  const session = await requireEmployeePageSession()
  return <EmployeeTrainingView employeeUid={session.uid} />
}
