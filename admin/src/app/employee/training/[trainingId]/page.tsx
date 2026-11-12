import { requireEmployeePageSession } from "@/lib/auth/employee-guard"
import { EmployeeTrainingDetailView } from "./employee-training-detail-view"

export const instant = false

export default async function EmployeeTrainingDetailPage({
  params,
}: {
  params: Promise<{ trainingId: string }>
}) {
  const session = await requireEmployeePageSession()
  const { trainingId } = await params
  return (
    <EmployeeTrainingDetailView
      employeeUid={session.uid}
      employeeName={session.profile.name}
      adminId={session.profile.adminId}
      trainingId={decodeURIComponent(trainingId)}
    />
  )
}
