// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

const mocks = vi.hoisted(() => ({
  saveAdminSplitDraft: vi.fn().mockResolvedValue(undefined),
  adminCounterSignTask: vi.fn().mockResolvedValue(undefined),
  rejectTask: vi.fn().mockResolvedValue(undefined),
  logAuditAction: vi.fn().mockResolvedValue(undefined),
  triggerNotification: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/admin/split-field-actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/split-field-actions")>()
  return {
    ...actual,
    saveAdminSplitDraft: mocks.saveAdminSplitDraft,
    adminCounterSignTask: mocks.adminCounterSignTask,
  }
})

vi.mock("@/lib/admin/task-actions", () => ({
  rejectTask: mocks.rejectTask,
}))

vi.mock("@/lib/admin/audit-actions", () => ({
  logAuditAction: mocks.logAuditAction,
}))

vi.mock("@/lib/admin/notification-actions", () => ({
  triggerNotification: mocks.triggerNotification,
}))

import {
  COMPETENCY_AREAS,
  competencyAreaSlug,
  getAdminSplitFieldSpecs,
} from "@/lib/admin/split-field-schemas"
import { SplitFieldCounterSignPanel } from "@/app/dashboard/directory/[employeeId]/split-field-counter-sign"

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe("split-field schemas", () => {
  it("defines 8 competency areas for CSSP, QMHP-CS, and LPHA", () => {
    expect(COMPETENCY_AREAS.cssp_competency).toHaveLength(8)
    expect(COMPETENCY_AREAS.qmhp_cs_competency).toHaveLength(8)
    expect(COMPETENCY_AREAS.lpha_competency).toHaveLength(8)

    const lphaSpecs = getAdminSplitFieldSpecs("lpha_competency", "LPHA Competency")
    expect(lphaSpecs.some((s) => s.key === "supervisorName" && s.required)).toBe(true)
    expect(
      lphaSpecs.some(
        (s) => s.key === `rating_${competencyAreaSlug(COMPETENCY_AREAS.lpha_competency[0])}`,
      ),
    ).toBe(true)
  })

  it("uses authorized representative fields for I-9 and trainer fields for annual training", () => {
    const i9 = getAdminSplitFieldSpecs("tax_documents_i_9")
    expect(i9.map((f) => f.key)).toEqual([
      "authRepName",
      "authRepTitle",
      "orgName",
      "verificationDate",
    ])
    const annual = getAdminSplitFieldSpecs("annual_training")
    expect(annual.map((f) => f.key)).toEqual(["supervisorTrainer", "verificationDate", "comments"])
  })
})

describe("SplitFieldCounterSignPanel", () => {
  it("stays locked until employee submits when task is notStarted", () => {
    render(
      <SplitFieldCounterSignPanel
        employeeId="emp-1"
        employeeName="Jane Doe"
        taskId="tax_documents_i_9"
        taskTitle="Tax Documents (I-9)"
        taskStatus="notStarted"
        isCompleted={false}
        adminFormData={null}
        adminSignatureUrl={null}
        revision="rev-1"
        adminUid="adm-1"
        disabled={false}
      />,
    )
    expect(screen.getByTestId("split-field-counter-sign").textContent).toContain(
      "after the employee submits",
    )
    expect(screen.queryByTestId("split-counter-sign")).toBeNull()
  })

  it("validates required I-9 fields and signature before calling adminCounterSignTask", async () => {
    render(
      <SplitFieldCounterSignPanel
        employeeId="emp-1"
        employeeName="Jane Doe"
        taskId="tax_documents_i_9"
        taskTitle="Tax Documents (I-9)"
        taskStatus="pendingEmployerSignature"
        isCompleted={false}
        adminFormData={{ orgName: "Example Health Clinic" }}
        adminSignatureUrl={null}
        revision="rev-2"
        adminUid="adm-1"
        disabled={false}
      />,
    )

    fireEvent.click(screen.getByTestId("split-counter-sign"))
    expect(screen.getByTestId("split-action-error").textContent).toContain("Authorized Representative")
    expect(mocks.adminCounterSignTask).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/Authorized Representative Name/i), {
      target: { value: "Dana Admin" },
    })
    fireEvent.change(screen.getByLabelText(/Title of Authorized Representative/i), {
      target: { value: "HR Director" },
    })
    fireEvent.change(screen.getByTestId("split-admin-signature-input"), {
      target: { value: "Dana Admin" },
    })

    fireEvent.click(screen.getByTestId("split-counter-sign"))
    await waitFor(() => expect(mocks.adminCounterSignTask).toHaveBeenCalledTimes(1))
    expect(mocks.adminCounterSignTask.mock.calls[0][0]).toMatchObject({
      employeeId: "emp-1",
      taskId: "tax_documents_i_9",
      adminUid: "adm-1",
      adminSignatureUrl: "typed:Dana Admin",
      expectedRevision: "rev-2",
    })
    expect(screen.getByTestId("split-action-success").textContent).toContain("counter-signed")
  })

  it("saves admin draft and allows rejecting with reason", async () => {
    render(
      <SplitFieldCounterSignPanel
        employeeId="emp-1"
        employeeName="Jane Doe"
        taskId="annual_training"
        taskTitle="Annual Training"
        taskStatus="submitted"
        isCompleted={false}
        adminFormData={null}
        adminSignatureUrl={null}
        revision="rev-3"
        adminUid="adm-1"
        disabled={false}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Supervisor \/ Trainer Name/i), {
      target: { value: "Dana Trainer" },
    })
    fireEvent.click(screen.getByTestId("split-save-draft"))
    await waitFor(() => expect(mocks.saveAdminSplitDraft).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByTestId("split-reject-open"))
    fireEvent.change(screen.getByTestId("split-reject-reason"), {
      target: { value: "Missing date on topic 3" },
    })
    fireEvent.click(screen.getByTestId("split-reject-confirm"))
    await waitFor(() => expect(mocks.rejectTask).toHaveBeenCalledTimes(1))
    expect(mocks.rejectTask.mock.calls[0][0]).toMatchObject({
      employeeId: "emp-1",
      taskId: "annual_training",
      reason: "Missing date on topic 3",
    })
  })

  it("preserves image signature URLs on draft save, renders canonical competency labels, and locks completed or rejected tasks", async () => {
    const { rerender } = render(
      <SplitFieldCounterSignPanel
        employeeId="emp-1"
        employeeName="Jane Doe"
        taskId="cssp_competency"
        taskTitle="CSSP Competency Evaluation"
        taskStatus="submitted"
        isCompleted={false}
        adminFormData={null}
        adminSignatureUrl="https://cdn.example.com/sig.png"
        revision="rev-4"
        adminUid="adm-1"
        disabled={false}
      />,
    )

    expect(screen.getByText("Client Engagement")).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("split-save-draft"))
    await waitFor(() => expect(mocks.saveAdminSplitDraft).toHaveBeenCalledTimes(1))
    expect(mocks.saveAdminSplitDraft.mock.calls[0][0].adminSignatureUrl).toBe(
      "https://cdn.example.com/sig.png",
    )

    rerender(
      <SplitFieldCounterSignPanel
        employeeId="emp-1"
        employeeName="Jane Doe"
        taskId="cssp_competency"
        taskTitle="CSSP Competency Evaluation"
        taskStatus="completed"
        isCompleted={true}
        adminFormData={null}
        adminSignatureUrl="typed:Dana Admin"
        revision="rev-5"
        adminUid="adm-1"
        disabled={false}
      />,
    )
    expect(screen.queryByTestId("split-counter-sign")).toBeNull()
    expect(screen.queryByTestId("split-reject-open")).toBeNull()
    expect(screen.getByTestId("split-admin-signature-input")).toBeDisabled()

    rerender(
      <SplitFieldCounterSignPanel
        employeeId="emp-1"
        employeeName="Jane Doe"
        taskId="cssp_competency"
        taskTitle="CSSP Competency Evaluation"
        taskStatus="rejected"
        isCompleted={false}
        adminFormData={null}
        adminSignatureUrl={null}
        revision="rev-6"
        adminUid="adm-1"
        disabled={false}
      />,
    )
    expect(screen.getByTestId("split-field-counter-sign").textContent).toContain("returned to the employee")
    expect(screen.queryByTestId("split-counter-sign")).toBeNull()
  })

  it("propagates optional adminName to adminCounterSignTask and reject audit logs (defaulting to Administrator)", async () => {
    const { unmount } = render(
      <SplitFieldCounterSignPanel
        employeeId="emp-1"
        employeeName="Jane Doe"
        taskId="annual_training"
        taskTitle="Annual Training"
        taskStatus="submitted"
        isCompleted={false}
        adminFormData={{ supervisorTrainer: "Dana Admin", verificationDate: "2026-11-11" }}
        adminSignatureUrl="typed:Dana Admin"
        revision="rev-7"
        adminUid="adm-1"
        adminName="Dana Admin"
        disabled={false}
      />,
    )

    fireEvent.click(screen.getByTestId("split-counter-sign"))
    await waitFor(() => expect(mocks.adminCounterSignTask).toHaveBeenCalledTimes(1))
    expect(mocks.adminCounterSignTask.mock.calls[0][0]).toMatchObject({
      adminName: "Dana Admin",
    })

    fireEvent.click(screen.getByTestId("split-reject-open"))
    fireEvent.change(screen.getByTestId("split-reject-reason"), {
      target: { value: "Missing topic" },
    })
    fireEvent.click(screen.getByTestId("split-reject-confirm"))
    await waitFor(() => expect(mocks.logAuditAction).toHaveBeenCalledTimes(1))
    expect(mocks.logAuditAction.mock.calls[0][0]).toMatchObject({
      actorName: "Dana Admin",
      actionType: "SPLIT_FIELD_REJECTED",
    })
    expect(mocks.triggerNotification).toHaveBeenCalledTimes(1)
    unmount()

    vi.clearAllMocks()
    render(
      <SplitFieldCounterSignPanel
        employeeId="emp-1"
        employeeName="Jane Doe"
        taskId="annual_training"
        taskTitle="Annual Training"
        taskStatus="submitted"
        isCompleted={false}
        adminFormData={{ supervisorTrainer: "Admin", verificationDate: "2026-11-11" }}
        adminSignatureUrl="typed:Admin"
        revision="rev-8"
        adminUid="adm-1"
        disabled={false}
      />,
    )
    fireEvent.click(screen.getByTestId("split-counter-sign"))
    await waitFor(() => expect(mocks.adminCounterSignTask).toHaveBeenCalledTimes(1))
    expect(mocks.adminCounterSignTask.mock.calls[0][0]).toMatchObject({
      adminName: "Administrator",
    })
  })
})
