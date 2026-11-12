import { requireEmployeePageSession } from "@/lib/auth/employee-guard"
import { EmployeeTaskDetailView } from "./employee-task-detail-view"

export const instant = false

export default async function EmployeeTaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>
}) {
  const session = await requireEmployeePageSession()
  const { taskId } = await params
  return (
    <EmployeeTaskDetailView
      employeeUid={session.uid}
      employeeName={session.profile.name}
      adminId={session.profile.adminId}
      taskId={decodeURIComponent(taskId)}
    />
  )
}
