import { getClientDataStore } from "@/lib/data/client-store"
import { DATA_COLLECTIONS } from "@/lib/data/collections"
import { toDateOrNull } from "@/lib/data/dates"
import { serverNow } from "@/lib/data/memory-store"
import type { DataStore } from "@/lib/data/types"
import { EmployeeActionError } from "@/lib/admin/employee-actions"
import { logAuditAction } from "@/lib/admin/audit-actions"
import { triggerNotification } from "@/lib/admin/notification-actions"

export interface ComplianceRepairSummary {
  employeesScanned: number
  repairedCount: number
  expiredCount: number
}

const EXEMPT_STATUSES = new Set([
  "completed",
  "verified",
  "cleared",
  "waived",
  "noActionRequired",
  "expired",
  "overdue",
  "underReview",
  "submitted",
  "signed",
  "acknowledged",
  "pendingEmployerSignature",
  "waitingForApprover",
])

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export async function runAdminComplianceAndRepair({
  adminUid,
  adminName,
  now = new Date(),
  db,
}: {
  adminUid: string
  adminName?: string
  now?: Date
  db?: DataStore
}): Promise<ComplianceRepairSummary> {
  if (!adminUid.trim()) {
    throw new EmployeeActionError("Admin session expired. Sign in again.", "permission-denied")
  }

  const store = db ?? getClientDataStore()
  const empSnap = await store.getCollection(DATA_COLLECTIONS.users, {
    filters: [{ field: "adminId", op: "==", value: adminUid }],
  })

  let employeesScanned = 0
  let repairedCount = 0
  let expiredCount = 0

  const subcollections = [
    DATA_COLLECTIONS.onboardingTasks,
    DATA_COLLECTIONS.trainings,
    DATA_COLLECTIONS.clearanceItems,
  ] as const

  for (const empDoc of empSnap.docs) {
    const empData = (empDoc.data() ?? {}) as Record<string, unknown>
    if (empData.role !== "employee") {
      continue
    }
    employeesScanned += 1
    const employeeName = asString(empData.name) || asString(empData.email) || empDoc.id
    const expiredTitles: string[] = []

    for (const sub of subcollections) {
      const subSnap = await store.getCollection(`${DATA_COLLECTIONS.users}/${empDoc.id}/${sub}`)

      for (const itemDoc of subSnap.docs) {
        const data = (itemDoc.data() ?? {}) as Record<string, unknown>
        const patch: Record<string, unknown> = {}

        if (asString(data.adminId) !== adminUid) {
          patch.adminId = adminUid
        }
        if (!asString(data.employeeName) && employeeName) {
          patch.employeeName = employeeName
        }
        if (asString(data.employeeId) !== empDoc.id) {
          patch.employeeId = empDoc.id
        }

        if (
          sub === DATA_COLLECTIONS.onboardingTasks &&
          itemDoc.id === "driver's_license" &&
          asString(data.actionType) === "splitField" &&
          asString(data.title).toLowerCase().includes("license")
        ) {
          patch.title = "Driver's Verification"
        }

        const status = asString(data.status) || "notStarted"
        const isCompleted = data.isCompleted === true || data.isCleared === true
        const isTraining = sub === DATA_COLLECTIONS.trainings
        const skipNoExpiration = isTraining && data.noExpiration === true
        const dueDate = isTraining
          ? toDateOrNull(data.expirationDate ?? data.dueDate)
          : toDateOrNull(data.dueDate ?? data.expirationDate)

        if (
          !isCompleted &&
          !skipNoExpiration &&
          !EXEMPT_STATUSES.has(status) &&
          dueDate &&
          dueDate.getTime() < now.getTime()
        ) {
          patch.status = isTraining ? "overdue" : "expired"
          expiredCount += 1
          expiredTitles.push(asString(data.title) || itemDoc.id)
        }

        if (Object.keys(patch).length > 0) {
          const onlyBackfill = !("status" in patch)
          if (onlyBackfill) {
            repairedCount += 1
          }
          patch.updatedAt = serverNow()
          await store.updateDoc(
            `${DATA_COLLECTIONS.users}/${empDoc.id}/${sub}/${itemDoc.id}`,
            patch,
          )
        }
      }
    }

    if (expiredTitles.length > 0) {
      await triggerNotification({
        targetUserId: empDoc.id,
        title: "Overdue Requirement Expired",
        body: `${expiredTitles.length} requirement(s) passed due date (${expiredTitles.slice(0, 2).join(", ")}). Please renew or contact management.`,
        type: "warning",
        metadata: { type: "compliance_expired", count: expiredTitles.length },
        db: store,
      })
    }
  }

  await logAuditAction({
    actorId: adminUid,
    actorName: adminName?.trim() || "Administrator",
    actionType: "COMPLIANCE_SYNC_REPAIR",
    targetId: adminUid,
    description: `Scanned ${employeesScanned} employee(s): repaired ${repairedCount} record(s), marked ${expiredCount} overdue item(s) expired.`,
    metadata: { employeesScanned, repairedCount, expiredCount },
    db: store,
  })

  return { employeesScanned, repairedCount, expiredCount }
}
