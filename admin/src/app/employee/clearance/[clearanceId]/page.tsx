import { requireEmployeePageSession } from "@/lib/auth/employee-guard"
import { EmployeeClearanceDetailView } from "./employee-clearance-detail-view"

export const instant = false

export default async function EmployeeClearanceDetailPage({
  params,
}: {
  params: Promise<{ clearanceId: string }>
}) {
  const session = await requireEmployeePageSession()
  const { clearanceId } = await params
  return (
    <EmployeeClearanceDetailView
      employeeUid={session.uid}
      employeeName={session.profile.name}
      adminId={session.profile.adminId}
      clearanceId={decodeURIComponent(clearanceId)}
    />
  )
}
