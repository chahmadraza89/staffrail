import { EmployeeShell } from "@/components/employee/employee-shell"
import { requireEmployeePageSession } from "@/lib/auth/employee-guard"

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireEmployeePageSession()

  return (
    <EmployeeShell
      employeeUid={session.uid}
      employeeEmail={session.email}
      employeeName={session.profile.name}
    >
      {children}
    </EmployeeShell>
  )
}
