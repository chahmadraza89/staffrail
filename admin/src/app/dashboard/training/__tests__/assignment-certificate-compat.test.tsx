// @vitest-environment jsdom
/**
 * Certificate compatibility between a web assignment and a legacy upload.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"

import { MemoryDataStore } from "@/lib/data/memory-store"

vi.mock("@/lib/admin/task-actions", () => ({
  acceptTask: vi.fn().mockResolvedValue(undefined),
  rejectTask: vi.fn().mockResolvedValue(undefined),
  skipTask: vi.fn().mockResolvedValue(undefined),
  updateBlankFormLink: vi.fn().mockResolvedValue(undefined),
}))

import { TaskDetailPanel } from "@/app/dashboard/directory/[employeeId]/task-manager"
import { buildComplianceModel } from "@/lib/admin/compliance-helpers"
import { mapTrainingDoc } from "@/lib/admin/employee-detail-streams"
import { assignTraining } from "@/lib/admin/training-actions"

const store = new MemoryDataStore()
const ADMIN = "adm-1"
const EMPLOYEE = "emp-1"
const TEMPLATE_ID = "cpr"
const CERTIFICATE_URL = "/api/files/users/emp-1/trainings/cpr/cpr.pdf"

function trainingPath(): string {
  return `users/${EMPLOYEE}/trainings/${TEMPLATE_ID}`
}

beforeEach(() => {
  store.clear()
  store.docs.set(`training_templates/${TEMPLATE_ID}`, {
    title: "CPR",
    description: "Cardiopulmonary resuscitation",
    durationText: "45 mins",
    requirementType: "certificate",
    isActive: true,
  })
  store.docs.set(`users/${EMPLOYEE}`, {
    name: "Sara Khan",
    role: "employee",
    adminId: ADMIN,
    isActive: true,
  })
})

afterEach(() => {
  cleanup()
})

describe("web assignment → legacy upload → review panel", () => {
  it("renders the certificate uploaded through the legacy field", async () => {
    const result = await assignTraining(
      {
        adminUid: ADMIN,
        templateId: TEMPLATE_ID,
        employeeIds: [EMPLOYEE],
        deadline: null,
        instructions: "",
      },
      store,
    )
    expect(result.assigned).toBe(1)

    const assigned = store.docs.get(trainingPath())!
    expect("certificateUrls" in assigned).toBe(false)

    const legacyCertificateUpdate = {
      certificateUrl: CERTIFICATE_URL,
      status: "underReview",
      updatedAt: new Date(),
      completedAt: new Date(),
      noExpiration: false,
    }
    const afterUpload = { ...assigned, ...legacyCertificateUpdate }

    const doc = mapTrainingDoc(TEMPLATE_ID, afterUpload)
    expect(doc.certificateUrl).toBe(CERTIFICATE_URL)
    expect(doc.certificateUrls).toEqual([CERTIFICATE_URL])
    expect(doc.status).toBe("underReview")

    const { allTasks } = buildComplianceModel({
      tasks: { kind: "ready", items: [] },
      trainings: { kind: "ready", items: [doc] },
      clearances: { kind: "ready", items: [] },
    })
    const task = allTasks.find(
      (row) => row.taskSource === "training" && row.id === TEMPLATE_ID,
    )!
    expect(task.fileUrls).toEqual([CERTIFICATE_URL])

    render(
      <TaskDetailPanel
        task={task}
        employeeId={EMPLOYEE}
        employeeName="Sara Khan"
        adminUid={ADMIN}
        employeeAdminId={ADMIN}
        employeeActive
        taskDoc={null}
        actionsEnabled
      />,
    )

    expect(screen.getAllByTestId("task-file-preview")).toHaveLength(1)
    expect(screen.getByTestId("task-file-open").getAttribute("href")).toBe(
      CERTIFICATE_URL,
    )
    expect(screen.getByTestId("task-file-download").getAttribute("href")).toBe(
      CERTIFICATE_URL,
    )
    expect(screen.queryByText("No submission data yet.")).toBeNull()
  })
})
