import { requireEmployeePageSession } from "@/lib/auth/employee-guard"
import { EmployeeChangePasswordView } from "./change-password-view"

export const instant = false

export default async function EmployeeChangePasswordPage() {
  const session = await requireEmployeePageSession()
  return <EmployeeChangePasswordView email={session.email} />
}
