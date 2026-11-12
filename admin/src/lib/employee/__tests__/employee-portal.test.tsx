// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

const mocks = vi.hoisted(() => ({
  saveEmployeeTaskDraft: vi.fn().mockResolvedValue(undefined),
  submitEmployeeTask: vi.fn().mockResolvedValue(undefined),
  uploadEmployeeFile: vi.fn(),
  callLocalServerAction: vi.fn().mockResolvedValue({
    ok: true,
    demoResetPath: "/forgot-password?token=demo-token",
  }),
}))

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/lib/data/client-store", () => ({
  callLocalServerAction: mocks.callLocalServerAction,
}))

vi.mock("@/lib/employee/employee-actions", () => ({
  EMPLOYEE_UPLOAD_ACCEPT: ".pdf,.png,.jpg",
  saveEmployeeTaskDraft: mocks.saveEmployeeTaskDraft,
  submitEmployeeTask: mocks.submitEmployeeTask,
  uploadEmployeeFile: mocks.uploadEmployeeFile,
}))

vi.mock("@/lib/employee/employee-streams", () => ({
  EMPTY_EMPLOYEE_WORKSPACE: {
    profile: null,
    tasks: [],
    trainings: [],
    clearances: [],
    progress: { overall: 0.5, onboarding: 0.5, training: 0.5, clearance: 0.5 },
    compliance: { categories: [], summary: { completed: 0, total: 0 } },
    ready: { profile: true, tasks: true, trainings: true, clearances: true },
  },
  subscribeEmployeeWorkspace: vi.fn((_uid, onData) => {
    onData({
      profile: {
        uid: "emp-1",
        name: "Jane Doe",
        email: "jane@staffrail.test",
        role: "employee",
        isActive: true,
        adminId: "adm-1",
        photoUrl: null,
        department: "Clinical",
        phoneNumber: null,
        notificationPreferences: {
          pushEnabled: true,
          emailEnabled: true,
          taskReminders: true,
          adminAlerts: true,
        },
      },
      tasks: [
        {
          id: "onboarding_acknowledgment_form",
          title: "Onboarding Acknowledgment form",
          subtitle: "Signature Required",
          status: "rejected",
          actionType: "acknowledgeSign",
          isCompleted: false,
          updatedAt: null,
          completedAt: null,
          dueDate: null,
          fileUrl: null,
          signatureUrl: null,
          adminSignatureUrl: null,
          rejectionReason: "Missing signature",
          formData: null,
          adminFormData: null,
          blankFormLink: null,
          signedAt: null,
          hasFormData: false,
          hasAdminFormData: false,
          revision: "r1",
        },
      ],
      trainings: [],
      clearances: [],
      progress: { overall: 0.25, onboarding: 0.25, training: 1, clearance: 1 },
      compliance: { categories: [], summary: { completed: 0, total: 1 } },
      ready: { profile: true, tasks: true, trainings: true, clearances: true },
    })
    return () => {}
  }),
}))

vi.mock("@/lib/admin/communication-streams", () => ({
  subscribeEmployeeMessages: vi.fn((_uid, onData) => {
    onData([])
    return () => {}
  }),
}))

import { EmployeeTaskDispatcher } from "@/components/employee/employee-task-dispatcher"
import { EmployeeDashboardView } from "@/app/employee/employee-dashboard-view"
import { ForgotPasswordForm } from "@/app/forgot-password/forgot-password-form"
import type { EmployeeTaskDoc } from "@/lib/admin/employee-detail-streams"

function makeTask(overrides: Partial<EmployeeTaskDoc> = {}): EmployeeTaskDoc {
  return {
    id: "onboarding_acknowledgment_form",
    title: "Onboarding Acknowledgment form",
    subtitle: "Signature Required",
    status: "notStarted",
    actionType: "acknowledgeSign",
    isCompleted: false,
    updatedAt: null,
    completedAt: null,
    dueDate: null,
    fileUrl: null,
    signatureUrl: null,
    adminSignatureUrl: null,
    rejectionReason: null,
    formData: {},
    adminFormData: null,
    blankFormLink: null,
    signedAt: null,
    hasFormData: false,
    hasAdminFormData: false,
    revision: "rev-1",
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe("EmployeeTaskDispatcher", () => {
  it("enforces acknowledgment checkbox and typed signature on acknowledgeSign", async () => {
    render(
      <EmployeeTaskDispatcher
        employeeId="emp-1"
        employeeName="Jane Doe"
        adminId="adm-1"
        task={makeTask({ rejectionReason: "Please sign with full legal name" })}
        allTasks={[]}
      />,
    )

    expect(screen.getByTestId("employee-rejection-banner").textContent).toContain(
      "Please sign with full legal name",
    )

    fireEvent.click(screen.getByTestId("employee-submit-task"))
    expect(screen.getByTestId("employee-task-error").textContent).toContain(
      "acknowledgment checkbox",
    )

    fireEvent.click(screen.getByTestId("employee-ack-checkbox"))
    fireEvent.change(screen.getByTestId("employee-signature-input"), {
      target: { value: "Jane Doe" },
    })
    fireEvent.click(screen.getByTestId("employee-submit-task"))

    await waitFor(() => expect(mocks.submitEmployeeTask).toHaveBeenCalledTimes(1))
    expect(mocks.submitEmployeeTask.mock.calls[0][0]).toMatchObject({
      employeeId: "emp-1",
      taskId: "onboarding_acknowledgment_form",
      actionType: "acknowledgeSign",
      signatureUrl: "typed:Jane Doe",
    })
  })

  it("locks submitted tasks from further edits", () => {
    render(
      <EmployeeTaskDispatcher
        employeeId="emp-1"
        employeeName="Jane Doe"
        adminId="adm-1"
        task={makeTask({ status: "submitted" })}
        allTasks={[]}
      />,
    )
    expect(screen.getByTestId("employee-task-locked")).toBeInTheDocument()
    expect(screen.queryByTestId("employee-submit-task")).toBeNull()
  })

  it("supports virtual I-9 completion and triggers splitField supervisor submission", async () => {
    render(
      <EmployeeTaskDispatcher
        employeeId="emp-1"
        employeeName="Jane Doe"
        adminId="adm-1"
        task={makeTask({
          id: "tax_documents_i_9",
          title: "Tax Documents (I-9)",
          actionType: "splitField",
        })}
        allTasks={[]}
      />,
    )

    const virtualBox = screen.getByLabelText(/completed this form virtually/i)
    fireEvent.click(virtualBox)
    fireEvent.change(screen.getByTestId("employee-signature-input"), {
      target: { value: "Jane Doe" },
    })
    fireEvent.click(screen.getByTestId("employee-submit-task"))

    await waitFor(() => expect(mocks.submitEmployeeTask).toHaveBeenCalledTimes(1))
    expect(mocks.submitEmployeeTask.mock.calls[0][0]).toMatchObject({
      taskId: "tax_documents_i_9",
      actionType: "splitField",
    })
    expect(screen.getByTestId("employee-task-success").textContent).toContain(
      "counter-signature",
    )
  })

  it("does not render Driver's Verification checkboxes on Driver's License upload tasks", () => {
    render(
      <EmployeeTaskDispatcher
        employeeId="emp-1"
        employeeName="Jane Doe"
        adminId="adm-1"
        task={makeTask({
          id: "driver's_license",
          title: "Driver's License",
          actionType: "upload",
        })}
        allTasks={[]}
      />,
    )
    expect(screen.queryByText(/valid driver/i)).toBeNull()
    expect(screen.queryByTestId("employee-signature-input")).toBeNull()
  })

  it("validates Code of Conduct ethics commitments without duplicating generic ack checkbox", () => {
    render(
      <EmployeeTaskDispatcher
        employeeId="emp-1"
        employeeName="Jane Doe"
        adminId="adm-1"
        task={makeTask({
          id: "code_of_conduct_ethics",
          title: "Code of Conduct & Ethics",
          actionType: "acknowledgeSign",
        })}
        allTasks={[]}
      />,
    )
    expect(screen.queryByTestId("employee-ack-checkbox")).toBeNull()
    fireEvent.click(screen.getByTestId("employee-submit-task"))
    expect(screen.getByTestId("employee-task-error").textContent).toContain("Position")
  })

  it("renders employee metadata fields for generic splitField tasks and image preview for locked drawn signatures", () => {
    const { rerender } = render(
      <EmployeeTaskDispatcher
        employeeId="emp-1"
        employeeName="Jane Doe"
        adminId="adm-1"
        task={makeTask({
          id: "cultural_competency",
          title: "Cultural Competency",
          actionType: "splitField",
        })}
        allTasks={[]}
      />,
    )
    expect(screen.getByTestId("employee-generic-split-fields")).toBeInTheDocument()

    rerender(
      <EmployeeTaskDispatcher
        employeeId="emp-1"
        employeeName="Jane Doe"
        adminId="adm-1"
        task={makeTask({
          id: "org_signature",
          title: "Signature Policy",
          actionType: "signature",
          status: "completed",
          isCompleted: true,
          signatureUrl: "data:image/png;base64,AAA",
        })}
        allTasks={[]}
      />,
    )
    const img = screen.getByAltText("Employee signature") as HTMLImageElement
    expect(img.src).toContain("data:image/png;base64,AAA")
  })

  it("reads/writes formData.witnessSignature (typed:<name>) and validates witness signature for emergency medical care", async () => {
    const { rerender } = render(
      <EmployeeTaskDispatcher
        employeeId="emp-1"
        employeeName="Jane Doe"
        adminId="adm-1"
        task={makeTask({
          id: "authorization_for_emergency_medical_care",
          title: "Authorization for Emergency Medical Care",
          actionType: "fillAndSign",
        })}
        allTasks={[]}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Emergency Contact 1 Name/i), {
      target: { value: "Ann Contact" },
    })
    fireEvent.change(screen.getByLabelText(/Emergency Contact 1 Phone/i), {
      target: { value: "555-0199" },
    })
    fireEvent.change(screen.getByLabelText(/Emergency Contact 1 Relationship/i), {
      target: { value: "Spouse" },
    })
    fireEvent.change(screen.getByLabelText(/Emergency Contact 2 Relationship/i), {
      target: { value: "Sibling" },
    })
    fireEvent.change(screen.getByTestId("employee-signature-input"), {
      target: { value: "Jane Doe" },
    })

    // Missing witness signature is blocked on submit.
    fireEvent.click(screen.getByTestId("employee-submit-task"))
    expect(screen.getByTestId("employee-task-error").textContent).toMatch(/witness signature/i)
    expect(mocks.submitEmployeeTask).not.toHaveBeenCalled()

    // `typed:` prefix alone cannot bypass validation, and `typed:J` still fails >= 2 chars.
    fireEvent.change(screen.getByTestId("employee-witness-signature-input"), {
      target: { value: "typed:" },
    })
    fireEvent.click(screen.getByTestId("employee-submit-task"))
    expect(screen.getByTestId("employee-task-error").textContent).toMatch(/witness signature/i)
    expect(mocks.submitEmployeeTask).not.toHaveBeenCalled()

    fireEvent.change(screen.getByTestId("employee-witness-signature-input"), {
      target: { value: "typed:J" },
    })
    fireEvent.click(screen.getByTestId("employee-submit-task"))
    expect(screen.getByTestId("employee-task-error").textContent).toMatch(/at least 2 characters/i)
    expect(mocks.submitEmployeeTask).not.toHaveBeenCalled()

    // Valid witness signature (even if prefixed with `typed:`) normalizes once to `typed:<name>`.
    fireEvent.change(screen.getByTestId("employee-witness-signature-input"), {
      target: { value: "typed:John Witness" },
    })
    fireEvent.click(screen.getByTestId("employee-save-draft"))
    await waitFor(() => expect(mocks.saveEmployeeTaskDraft).toHaveBeenCalledTimes(1))
    const draftFormData = mocks.saveEmployeeTaskDraft.mock.calls[0][0].formData as Record<
      string,
      unknown
    >
    expect(draftFormData.witnessSignature).toBe("typed:John Witness")
    expect(draftFormData.emergencyContact1Relation).toBe("Spouse")
    expect(draftFormData.emergencyContact2Relation).toBe("Sibling")
    expect(draftFormData).not.toHaveProperty("witnessName")

    fireEvent.click(screen.getByTestId("employee-submit-task"))
    await waitFor(() => expect(mocks.submitEmployeeTask).toHaveBeenCalledTimes(1))
    const submitFormData = mocks.submitEmployeeTask.mock.calls[0][0].formData as Record<
      string,
      unknown
    >
    expect(submitFormData.witnessSignature).toBe("typed:John Witness")
    expect(submitFormData.emergencyContact1Relation).toBe("Spouse")
    expect(submitFormData).not.toHaveProperty("witnessName")

    // Re-hydrating from existing formData.witnessSignature strips the `typed:` prefix in the input.
    rerender(
      <EmployeeTaskDispatcher
        employeeId="emp-1"
        employeeName="Jane Doe"
        adminId="adm-1"
        task={makeTask({
          id: "authorization_for_emergency_medical_care",
          title: "Authorization for Emergency Medical Care",
          actionType: "fillAndSign",
          revision: "rev-2",
          formData: {
            emergencyContact1Name: "Ann Contact",
            emergencyContact1Phone: "555-0199",
            witnessSignature: "typed:Alice Witness",
          },
        })}
        allTasks={[]}
      />,
    )
    expect(
      (screen.getByTestId("employee-witness-signature-input") as HTMLInputElement).value,
    ).toBe("Alice Witness")

    // Legacy drafts with whitespace witnessSignature + witnessName fall back cleanly and migrate.
    rerender(
      <EmployeeTaskDispatcher
        employeeId="emp-1"
        employeeName="Jane Doe"
        adminId="adm-1"
        task={makeTask({
          id: "authorization_for_emergency_medical_care",
          title: "Authorization for Emergency Medical Care",
          actionType: "fillAndSign",
          revision: "rev-3",
          formData: {
            emergencyContact1Name: "Ann Contact",
            emergencyContact1Phone: "555-0199",
            witnessSignature: "   ",
            witnessName: "Bob Legacy",
          },
        })}
        allTasks={[]}
      />,
    )
    expect(
      (screen.getByTestId("employee-witness-signature-input") as HTMLInputElement).value,
    ).toBe("Bob Legacy")
    fireEvent.change(screen.getByTestId("employee-signature-input"), {
      target: { value: "Jane Doe" },
    })
    fireEvent.click(screen.getByTestId("employee-submit-task"))
    await waitFor(() => expect(mocks.submitEmployeeTask).toHaveBeenCalledTimes(2))
    const migratedFormData = mocks.submitEmployeeTask.mock.calls[1][0].formData as Record<
      string,
      unknown
    >
    expect(migratedFormData.witnessSignature).toBe("typed:Bob Legacy")
    expect(migratedFormData).not.toHaveProperty("witnessName")
  })
})

describe("EmployeeDashboardView", () => {
  it("renders progress tracker and prioritizes rejected action items", () => {
    render(
      <EmployeeDashboardView
        employeeUid="emp-1"
        employeeName="Jane Doe"
        employeeEmail="jane@staffrail.test"
        adminId="adm-1"
      />,
    )
    expect(screen.getByTestId("employee-progress-tracker").textContent).toContain("25%")
    expect(screen.getByTestId("employee-action-required").textContent).toContain(
      "Onboarding Acknowledgment form",
    )
    expect(screen.getByTestId("employee-action-required").textContent).toContain(
      "Missing signature",
    )
  })
})

describe("ForgotPasswordForm", () => {
  it("validates email and calls local password reset action cleanly", async () => {
    render(<ForgotPasswordForm />)

    fireEvent.click(screen.getByTestId("forgot-submit"))
    expect(screen.getByTestId("forgot-error").textContent).toContain("valid work email")

    fireEvent.change(screen.getByTestId("forgot-email-input"), {
      target: { value: "jane@staffrail.test" },
    })
    fireEvent.click(screen.getByTestId("forgot-submit"))

    await waitFor(() =>
      expect(mocks.callLocalServerAction).toHaveBeenCalledWith("requestPasswordReset", {
        email: "jane@staffrail.test",
      }),
    )
    expect(screen.getByTestId("forgot-password-success").textContent).toContain(
      "Reset link generated",
    )
  })
})
