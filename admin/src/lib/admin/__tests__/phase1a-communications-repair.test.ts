import { beforeEach, describe, expect, it } from "vitest"

import { MemoryDataStore } from "@/lib/data/memory-store"
import { mapAuditLogDoc } from "@/lib/admin/audit-actions"
import {
  adminCounterSignTask,
  saveAdminSplitDraft,
} from "@/lib/admin/split-field-actions"
import { submissionRevision } from "@/lib/admin/task-revision"
import {
  clearAllNotifications,
  markAllNotificationsRead,
  publishStaffMessage,
} from "@/lib/admin/communication-actions"
import { runAdminComplianceAndRepair } from "@/lib/admin/compliance-repair"
import { EmployeeActionError } from "@/lib/admin/employee-actions"

const ADMIN = "adm-1"
const EMP = "emp-1"

let store: MemoryDataStore

beforeEach(() => {
  store = new MemoryDataStore()
  store.docs.set(`users/${EMP}`, {
    name: "Jane Doe",
    email: "jane@staffrail.test",
    role: "employee",
    isActive: true,
    adminId: ADMIN,
  })
})

function entriesIn(prefix: string) {
  return Array.from(store.docs.entries()).filter(([path]) => path.startsWith(`${prefix}/`))
}

describe("split-field transactions", () => {
  it("saves admin draft and completes counter-sign cleanly with audit + notification", async () => {
    const taskPath = `users/${EMP}/onboarding_tasks/tax_documents_i_9`
    store.docs.set(taskPath, {
      title: "Tax Documents (I-9)",
      actionType: "splitField",
      status: "pendingEmployerSignature",
      isCompleted: false,
      formData: { completedVirtually: true },
    })

    const rev1 = submissionRevision(store.docs.get(taskPath))
    await saveAdminSplitDraft({
      employeeId: EMP,
      taskId: "tax_documents_i_9",
      adminUid: ADMIN,
      adminFormData: { authRepName: "Dana Admin" },
      expectedRevision: rev1,
      db: store,
    })
    expect(store.docs.get(taskPath)?.status).toBe("pendingEmployerSignature")
    expect(
      (store.docs.get(taskPath)?.adminFormData as Record<string, unknown>)?.authRepName,
    ).toBe("Dana Admin")

    const rev2 = submissionRevision(store.docs.get(taskPath))
    await adminCounterSignTask({
      employeeId: EMP,
      taskId: "tax_documents_i_9",
      adminUid: ADMIN,
      adminName: "Dana Admin",
      employeeName: "Jane Doe",
      taskTitle: "Tax Documents (I-9)",
      adminFormData: {
        authRepName: "Dana Admin",
        authRepTitle: "HR Director",
        orgName: "Example Health Clinic",
        verificationDate: "2026-11-11",
      },
      adminSignatureUrl: "typed:Dana Admin",
      expectedRevision: rev2,
      db: store,
    })

    const saved = store.docs.get(taskPath)!
    expect(saved.status).toBe("completed")
    expect(saved.isCompleted).toBe(true)
    expect(saved.adminSignatureUrl).toBe("typed:Dana Admin")
    expect(entriesIn("audit_logs").length).toBeGreaterThan(0)
    expect(entriesIn(`users/${EMP}/notifications`).length).toBeGreaterThan(0)
  })

  it("rejects mismatched expectedRevision when employee modified submission", async () => {
    const taskPath = `users/${EMP}/onboarding_tasks/annual_training`
    store.docs.set(taskPath, {
      title: "Annual Training",
      status: "pendingEmployerSignature",
      formData: { fullName: "Jane Doe" },
    })

    await expect(
      adminCounterSignTask({
        employeeId: EMP,
        taskId: "annual_training",
        adminUid: ADMIN,
        adminFormData: { supervisorTrainer: "Dana", verificationDate: "2026-11-11" },
        adminSignatureUrl: "typed:Dana",
        expectedRevision: "stale-rev",
        db: store,
      }),
    ).rejects.toThrow(EmployeeActionError)
  })

  it("blocks counter-signing and draft saves on rejected, completed, or expired tasks", async () => {
    for (const status of ["rejected", "completed", "expired", "noActionRequired"]) {
      const taskPath = `users/${EMP}/onboarding_tasks/i9_${status}`
      store.docs.set(taskPath, {
        title: "Tax Documents (I-9)",
        actionType: "splitField",
        status,
        isCompleted: status === "completed",
      })

      await expect(
        saveAdminSplitDraft({
          employeeId: EMP,
          taskId: `i9_${status}`,
          adminUid: ADMIN,
          adminFormData: { authRepName: "Dana" },
          db: store,
        }),
      ).rejects.toThrow(EmployeeActionError)

      await expect(
        adminCounterSignTask({
          employeeId: EMP,
          taskId: `i9_${status}`,
          adminUid: ADMIN,
          adminFormData: {
            authRepName: "Dana",
            authRepTitle: "HR",
            orgName: "Example Health Clinic",
          },
          adminSignatureUrl: "typed:Dana",
          db: store,
        }),
      ).rejects.toThrow(EmployeeActionError)
    }
  })
})

describe("communication actions & audit mapping", () => {
  it("maps both canonical AuditService and legacy OnboardingService log records", () => {
    const modern = mapAuditLogDoc("l1", {
      actorId: "adm-1",
      actorName: "Dana",
      actionType: "CLEARANCE_VERIFIED",
      targetId: "emp-1",
      description: "Verified clearance",
    })
    expect(modern.actionType).toBe("CLEARANCE_VERIFIED")

    const legacy = mapAuditLogDoc("l2", {
      uid: "emp-1",
      taskId: "w4",
      action: "SUBMITTED_TASK",
      details: "Submitted W-4",
      platform: "mobile",
    })
    expect(legacy.actorId).toBe("emp-1")
    expect(legacy.targetId).toBe("w4")
    expect(legacy.actionType).toBe("SUBMITTED_TASK")
    expect(legacy.description).toBe("Submitted W-4")
  })

  it("publishes broadcast message and cleans up notifications cleanly", async () => {
    const id = await publishStaffMessage({
      title: "Policy Reminder",
      content: "Complete annual training by Friday.",
      authorId: ADMIN,
      authorName: "Dana Admin",
      recipientId: "broadcast",
      broadcastRecipientUids: [EMP],
      db: store,
    })
    expect(id).toBeTruthy()
    expect(entriesIn("messages").length).toBe(1)
    expect(entriesIn(`users/${EMP}/notifications`).length).toBe(1)

    store.docs.set(`users/${EMP}/notifications/n1`, { isRead: false })
    await markAllNotificationsRead(EMP, ["n1"], store)
    expect(store.docs.get(`users/${EMP}/notifications/n1`)?.isRead).toBe(true)

    await clearAllNotifications(EMP, ["n1"], store)
    expect(store.docs.has(`users/${EMP}/notifications/n1`)).toBe(false)

    const beforeNotifs = entriesIn(`users/${EMP}/notifications`).length
    await publishStaffMessage({
      title: "Silent Memo",
      content: "FYI only",
      authorId: ADMIN,
      authorName: "Dana Admin",
      recipientId: EMP,
      isPushEnabled: false,
      db: store,
    })
    expect(entriesIn("messages").length).toBe(2)
    expect(entriesIn(`users/${EMP}/notifications`).length).toBe(beforeNotifs)

    const manyIds = Array.from({ length: 500 }, (_, i) => `bulk-${i}`)
    for (const nid of manyIds) {
      store.docs.set(`users/${EMP}/notifications/${nid}`, { isRead: false })
    }
    await markAllNotificationsRead(EMP, manyIds, store)
    expect(
      manyIds.every((nid) => store.docs.get(`users/${EMP}/notifications/${nid}`)?.isRead === true),
    ).toBe(true)
  })
})

describe("compliance repair & expiration sweep", () => {
  it("repairs missing adminId/employeeName and expires overdue incomplete items only", async () => {
    const yesterday = new Date("2026-11-01T00:00:00Z")
    const today = new Date("2026-11-11T00:00:00Z")

    store.docs.set(`users/${EMP}/onboarding_tasks/overdue_form`, {
      title: "Overdue Form",
      status: "notStarted",
      isCompleted: false,
      dueDate: yesterday,
    })
    store.docs.set(`users/${EMP}/trainings/done_training`, {
      title: "CPR",
      status: "verified",
      isCompleted: true,
      dueDate: yesterday,
      adminId: ADMIN,
      employeeName: "Jane Doe",
      employeeId: EMP,
    })
    store.docs.set(`users/${EMP}/onboarding_tasks/driver's_license`, {
      title: "Driver's License",
      actionType: "upload",
      status: "underReview",
      isCompleted: false,
      dueDate: yesterday,
    })
    store.docs.set(`users/${EMP}/trainings/overdue_training`, {
      title: "HIPAA Annual",
      status: "notStarted",
      isCompleted: false,
      noExpiration: false,
      expirationDate: yesterday,
    })
    store.docs.set(`users/${EMP}/trainings/no_exp_training`, {
      title: "Orientation Video",
      status: "notStarted",
      isCompleted: false,
      noExpiration: true,
      expirationDate: yesterday,
    })
    store.docs.set(`users/${EMP}/clearance/bg_check`, {
      title: "Background Check",
      status: "pending",
      isCompleted: false,
      dueDate: yesterday,
    })

    const summary = await runAdminComplianceAndRepair({
      adminUid: ADMIN,
      adminName: "Dana Admin",
      now: today,
      db: store,
    })

    expect(summary.employeesScanned).toBe(1)
    expect(summary.expiredCount).toBe(3)
    expect(store.docs.get(`users/${EMP}/onboarding_tasks/overdue_form`)?.status).toBe("expired")
    expect(store.docs.get(`users/${EMP}/onboarding_tasks/overdue_form`)?.adminId).toBe(ADMIN)
    expect(store.docs.get(`users/${EMP}/onboarding_tasks/driver's_license`)?.title).toBe(
      "Driver's License",
    )
    expect(store.docs.get(`users/${EMP}/onboarding_tasks/driver's_license`)?.status).toBe(
      "underReview",
    )
    expect(store.docs.get(`users/${EMP}/trainings/done_training`)?.status).toBe("verified")
    expect(store.docs.get(`users/${EMP}/trainings/overdue_training`)?.status).toBe("overdue")
    expect(store.docs.get(`users/${EMP}/trainings/no_exp_training`)?.status).toBe("notStarted")
    expect(store.docs.get(`users/${EMP}/clearance/bg_check`)?.status).toBe("expired")
    expect(entriesIn("audit_logs").length).toBeGreaterThan(0)
  })
})
