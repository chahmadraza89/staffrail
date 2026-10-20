// @vitest-environment jsdom
/**
 * TaskDetailPanel tests — the review actions and read-only document views
 * are exercised through the REAL component (no internal mocks) while the
 * Firestore writers are module-mocked so payloads are asserted.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

import * as taskActions from "@/lib/admin/task-actions"
import type { DetailSubTask } from "@/lib/admin/compliance-helpers"
import type { EmployeeTaskDoc } from "@/lib/admin/employee-detail-streams"

import { TaskDetailPanel } from "@/app/dashboard/directory/[employeeId]/task-manager"

vi.mock("@/lib/admin/task-actions", () => ({
  acceptTask: vi.fn().mockResolvedValue(undefined),
  rejectTask: vi.fn().mockResolvedValue(undefined),
  skipTask: vi.fn().mockResolvedValue(undefined),
  updateBlankFormLink: vi.fn().mockResolvedValue(undefined),
}))

function makeTask(overrides: Partial<DetailSubTask> = {}): DetailSubTask {
  return {
    id: "onboarding_acknowledgment_form",
    taskSource: "onboarding",
    title: "Onboarding Acknowledgment form",
    subtitle: "Signature Required",
    status: "submitted",
    actionType: "acknowledgeSign",
    isCompleted: false,
    fileUrl: null,
    fileUrls: [],
    updatedAt: new Date(2026, 9, 12),
    completedAt: null,
    rejectionReason: null,
    revision: "rev-1",
    ...overrides,
  }
}

function makeDoc(overrides: Partial<EmployeeTaskDoc> = {}): EmployeeTaskDoc {
  return {
    id: "onboarding_acknowledgment_form",
    title: "Onboarding Acknowledgment form",
    subtitle: null,
    status: "submitted",
    actionType: "acknowledgeSign",
    isCompleted: false,
    updatedAt: new Date(2026, 9, 12),
    completedAt: null,
    dueDate: null,
    fileUrl: null,
    signatureUrl: null,
    adminSignatureUrl: null,
    rejectionReason: null,
    formData: null,
    adminFormData: null,
    blankFormLink: null,
    signedAt: null,
    hasFormData: false,
    hasAdminFormData: false,
    revision: "rev-1",
    ...overrides,
  }
}

interface PanelOptions {
  task?: DetailSubTask
  doc?: EmployeeTaskDoc | null
  actionsEnabled?: boolean
  employeeActive?: boolean
  adminUid?: string
  employeeAdminId?: string | null
}

function panelElement({
  task = makeTask(),
  doc = null,
  actionsEnabled = true,
  employeeActive = true,
  adminUid = "adm-1",
  employeeAdminId = "adm-1",
}: PanelOptions = {}) {
  return (
    <TaskDetailPanel
      task={task}
      employeeId="emp-1"
      employeeName="Jane Doe"
      adminUid={adminUid}
      employeeAdminId={employeeAdminId}
      employeeActive={employeeActive}
      taskDoc={doc}
      actionsEnabled={actionsEnabled}
    />
  )
}

function renderPanel(options: PanelOptions = {}) {
  return render(panelElement(options))
}

beforeEach(() => {
  vi.mocked(taskActions.acceptTask).mockReset().mockResolvedValue(undefined)
  vi.mocked(taskActions.rejectTask).mockReset().mockResolvedValue(undefined)
  vi.mocked(taskActions.skipTask).mockReset().mockResolvedValue(undefined)
  vi.mocked(taskActions.updateBlankFormLink).mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
})

describe("TaskDetailPanel — header, previews, timeline", () => {
  it("shows the title, raw status badge, module and timeline dates", () => {
    renderPanel()
    expect(screen.getByRole("heading", { name: "Onboarding Acknowledgment form" })).toBeTruthy()
    expect(screen.getByTestId("task-status-badge").textContent).toBe("submitted")
    expect(screen.getByTestId("task-timeline").textContent).toContain("Assigned")
    expect(screen.getByTestId("task-timeline").textContent).toContain("Oct 12")
    expect(screen.getByTestId("task-timeline").textContent).toContain("Submitted")
    expect(screen.getByTestId("task-timeline").textContent).toContain("Verified")
  })

  it("renders typed signatures and file previews (image vs document)", () => {
    const { unmount } = renderPanel({
      task: makeTask({
        actionType: "upload",
        fileUrl: "https://x/photo.JPG",
        fileUrls: ["https://x/photo.JPG"],
      }),
      doc: makeDoc({ signatureUrl: "typed:Jane Doe" }),
    })
    expect(screen.getByTestId("task-file-image").getAttribute("src")).toBe("https://x/photo.JPG")
    expect(screen.getByTestId("task-signature-preview").textContent).toContain("Jane Doe")
    unmount()

    renderPanel({
      task: makeTask({
        actionType: "upload",
        fileUrl: "https://x/scan_1777_Resume.pdf",
        fileUrls: ["https://x/scan_1777_Resume.pdf"],
      }),
    })
    expect(screen.queryByTestId("task-file-image")).toBeNull()
    expect(screen.getByTestId("task-file-preview").textContent).toContain("scan_1777_Resume.pdf")
    expect(screen.getByTestId("task-file-preview").textContent).toContain("Open")
  })

  it("renders the activity timeline verified date from completedAt", () => {
    renderPanel({
      task: makeTask({
        status: "verified",
        isCompleted: true,
        completedAt: new Date(2026, 9, 15),
      }),
    })
    expect(screen.getByTestId("task-timeline").textContent).toContain("Oct 15")
  })
})

describe("TaskDetailPanel — accept / reject", () => {
  it("verifies through the confirmation dialog with employee ownership", async () => {
    renderPanel({ doc: makeDoc() })
    fireEvent.click(screen.getByTestId("task-verify"))
    expect(screen.getByTestId("verify-dialog").textContent).toContain("Verify Task?")
    fireEvent.click(screen.getByTestId("confirm-verify"))
    await waitFor(() =>
      expect(taskActions.acceptTask).toHaveBeenCalledWith({
        employeeId: "emp-1",
        taskId: "onboarding_acknowledgment_form",
        taskSource: "onboarding",
        adminUid: "adm-1",
        expectedRevision: "rev-1",
        employeeName: "Jane Doe",
      }),
    )
    await waitFor(() => expect(screen.getByTestId("task-action-success")).toBeTruthy())
    expect(screen.queryByTestId("verify-dialog")).toBeNull()
  })

  it("does not offer verification for notStarted rows", () => {
    renderPanel({ task: makeTask({ status: "notStarted" }) })
    expect(screen.getByTestId("task-verify")).toBeDisabled()
    fireEvent.click(screen.getByTestId("task-verify"))
    expect(screen.queryByTestId("verify-dialog")).toBeNull()
  })

  it("requires a trimmed rejection reason and only then calls rejectTask", async () => {
    renderPanel({ doc: makeDoc() })
    fireEvent.click(screen.getByTestId("task-reject"))
    const confirm = screen.getByTestId("confirm-reject")
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByTestId("reject-reason"), { target: { value: "   " } })
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByTestId("reject-reason"), {
      target: { value: "  signature missing  " },
    })
    expect(confirm).not.toBeDisabled()
    fireEvent.click(confirm)
    await waitFor(() =>
      expect(taskActions.rejectTask).toHaveBeenCalledWith({
        employeeId: "emp-1",
        taskId: "onboarding_acknowledgment_form",
        taskSource: "onboarding",
        adminUid: "adm-1",
        expectedRevision: "rev-1",
        employeeName: "Jane Doe",
        reason: "signature missing",
      }),
    )
    await waitFor(() => expect(screen.queryByTestId("reject-dialog")).toBeNull())
  })

  it("allows rejection of an already verified row but not verification", () => {
    renderPanel({ task: makeTask({ status: "verified", isCompleted: true }) })
    expect(screen.getByTestId("task-verify")).toBeDisabled()
    expect(screen.getByTestId("task-reject")).not.toBeDisabled()
  })

  it("shows action errors without closing the dialog", async () => {
    vi.mocked(taskActions.acceptTask).mockRejectedValueOnce(new Error("offline"))
    renderPanel({ doc: makeDoc() })
    fireEvent.click(screen.getByTestId("task-verify"))
    fireEvent.click(screen.getByTestId("confirm-verify"))
    await waitFor(() => expect(screen.getByTestId("task-action-error")).toBeTruthy())
    expect(screen.getByTestId("verify-dialog")).toBeTruthy()
  })
})

describe("TaskDetailPanel — skip / blank form link", () => {
  it("skips only after confirmation and sends title/owner", async () => {
    renderPanel()
    fireEvent.click(screen.getByTestId("task-skip-switch"))
    expect(screen.getByTestId("skip-dialog").textContent).toContain("Skip Form?")
    fireEvent.click(screen.getByTestId("confirm-skip"))
    await waitFor(() =>
      expect(taskActions.skipTask).toHaveBeenCalledWith({
        employeeId: "emp-1",
        taskId: "onboarding_acknowledgment_form",
        taskSource: "onboarding",
        adminUid: "adm-1",
        expectedRevision: null,
        employeeName: "Jane Doe",
        skip: true,
      }),
    )
  })

  it("offers unskip for noActionRequired rows", async () => {
    renderPanel({ task: makeTask({ status: "noActionRequired" }) })
    const toggle = screen.getByTestId("task-skip-switch")
    expect(toggle.getAttribute("aria-checked")).toBe("true")
    fireEvent.click(toggle)
    expect(screen.getByTestId("skip-dialog").textContent).toContain("Unskip Form?")
    fireEvent.click(screen.getByTestId("confirm-skip"))
    await waitFor(() => expect(taskActions.skipTask).toHaveBeenCalledWith(
      expect.objectContaining({ skip: false }),
    ))
  })

  it("never shows the onboarding skip control for training rows", () => {
    renderPanel({
      task: makeTask({
        id: "start",
        taskSource: "training",
        actionType: "upload",
        title: "START",
      }),
    })
    expect(screen.queryByTestId("task-skip-card")).toBeNull()
  })

  it("shows the blank-form card only for I-9/W-9 and saves a valid URL", async () => {
    const { unmount } = renderPanel({
      task: makeTask({
        id: "tax_documents_i_9",
        title: "Tax Documents (I-9)",
        actionType: "splitField",
      }),
      doc: makeDoc({ id: "tax_documents_i_9" }),
    })
    const input = screen.getByTestId("blank-form-link-input")
    expect((input as HTMLInputElement).value).toBe(
      "https://www.uscis.gov/sites/default/files/document/forms/i-9.pdf",
    )
    fireEvent.change(input, { target: { value: " https://example.test/i9.pdf " } })
    fireEvent.click(screen.getByTestId("blank-form-link-save"))
    await waitFor(() =>
      expect(taskActions.updateBlankFormLink).toHaveBeenCalledWith({
        employeeId: "emp-1",
        taskId: "tax_documents_i_9",
        taskSource: "onboarding",
        adminUid: "adm-1",
        expectedRevision: "rev-1",
        newLink: "https://example.test/i9.pdf",
      }),
    )
    unmount()

    renderPanel()
    expect(screen.queryByTestId("task-blank-link-card")).toBeNull()
  })

  it("prefers the stored blank-form link over the USCIS/IRS default", () => {
    renderPanel({
      task: makeTask({
        id: "tax_documents_i_9",
        title: "Tax Documents (I-9)",
        actionType: "splitField",
      }),
      doc: makeDoc({
        id: "tax_documents_i_9",
        blankFormLink: "https://storage.example/forms/custom-i9.pdf",
      }),
    })
    expect((screen.getByTestId("blank-form-link-input") as HTMLInputElement).value).toBe(
      "https://storage.example/forms/custom-i9.pdf",
    )
  })

  it("rejects a non-http(s) blank-form URL client-side", () => {
    renderPanel({
      task: makeTask({
        id: "tax_documents_w_9",
        title: "Tax Documents (W-9)",
        actionType: "splitField",
      }),
      doc: makeDoc({ id: "tax_documents_w_9" }),
    })
    fireEvent.change(screen.getByTestId("blank-form-link-input"), {
      target: { value: "javascript:alert(1)" },
    })
    fireEvent.click(screen.getByTestId("blank-form-link-save"))
    expect(screen.getByTestId("task-action-error").textContent).toContain("valid http(s) URL")
    expect(taskActions.updateBlankFormLink).not.toHaveBeenCalled()
  })
})

describe("TaskDetailPanel — open confirmations are invalidated", () => {
  it("disables an open verify confirmation when the owning module goes stale", () => {
    const view = renderPanel({ doc: makeDoc() })
    fireEvent.click(screen.getByTestId("task-verify"))
    const confirm = screen.getByTestId("confirm-verify")
    expect(confirm).not.toBeDisabled()

    view.rerender(panelElement({ doc: makeDoc(), actionsEnabled: false }))

    expect(screen.getByTestId("verify-stale-note")).toBeTruthy()
    expect(screen.getByTestId("task-actions-unavailable")).toBeTruthy()
    expect(confirm).toBeDisabled()
    fireEvent.click(confirm)
    expect(taskActions.acceptTask).not.toHaveBeenCalled()
  })

  it("rejects acting on a replacement upload until the reviewer reopens the confirmation", async () => {
    const view = renderPanel({ doc: makeDoc() })
    fireEvent.click(screen.getByTestId("task-verify"))
    const confirm = screen.getByTestId("confirm-verify")

    // Same status ("submitted") but a new file → a different submission.
    view.rerender(
      panelElement({
        doc: makeDoc({ revision: "rev-2", fileUrl: "https://x/replacement.pdf" }),
      }),
    )

    expect(screen.getByTestId("verify-stale-note")).toBeTruthy()
    expect(confirm).toBeDisabled()
    fireEvent.click(confirm)
    expect(taskActions.acceptTask).not.toHaveBeenCalled()

    // A fresh confirmation captures the NEW revision.
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    fireEvent.click(screen.getByTestId("task-verify"))
    fireEvent.click(screen.getByTestId("confirm-verify"))
    await waitFor(() =>
      expect(taskActions.acceptTask).toHaveBeenCalledWith(
        expect.objectContaining({ expectedRevision: "rev-2" }),
      ),
    )
  })

  it("invalidates verify when the reviewer's ownership changes", () => {
    const view = renderPanel({ doc: makeDoc() })
    fireEvent.click(screen.getByTestId("task-verify"))
    const confirm = screen.getByTestId("confirm-verify")

    view.rerender(panelElement({ doc: makeDoc(), adminUid: "adm-2" }))

    expect(screen.getByTestId("verify-stale-note")).toBeTruthy()
    expect(confirm).toBeDisabled()
    fireEvent.click(confirm)
    expect(taskActions.acceptTask).not.toHaveBeenCalled()
  })

  it("invalidates verify when the employee profile's owner changes", () => {
    const view = renderPanel({ doc: makeDoc() })
    fireEvent.click(screen.getByTestId("task-verify"))
    const confirm = screen.getByTestId("confirm-verify")

    view.rerender(panelElement({ doc: makeDoc(), employeeAdminId: "other-admin" }))

    expect(screen.getByTestId("verify-stale-note")).toBeTruthy()
    expect(confirm).toBeDisabled()
    fireEvent.click(confirm)
    expect(taskActions.acceptTask).not.toHaveBeenCalled()
  })

  it("invalidates verify when the employee is deactivated", () => {
    const view = renderPanel({ doc: makeDoc() })
    fireEvent.click(screen.getByTestId("task-verify"))
    const confirm = screen.getByTestId("confirm-verify")

    view.rerender(panelElement({ doc: makeDoc(), employeeActive: false }))

    expect(screen.getByTestId("task-actions-inactive")).toBeTruthy()
    expect(screen.getByTestId("verify-stale-note")).toBeTruthy()
    expect(confirm).toBeDisabled()
    fireEvent.click(confirm)
    expect(taskActions.acceptTask).not.toHaveBeenCalled()
  })

  it("invalidates verify when the status is no longer reviewable", () => {
    const view = renderPanel({ doc: makeDoc() })
    fireEvent.click(screen.getByTestId("task-verify"))
    const confirm = screen.getByTestId("confirm-verify")

    view.rerender(
      panelElement({
        task: makeTask({ status: "verified", isCompleted: true }),
        doc: makeDoc(),
      }),
    )

    expect(screen.getByTestId("verify-stale-note")).toBeTruthy()
    expect(confirm).toBeDisabled()
    fireEvent.click(confirm)
    expect(taskActions.acceptTask).not.toHaveBeenCalled()
  })

  it("invalidates an open rejection when the status changes, preserving reason validation", async () => {
    const view = renderPanel({ doc: makeDoc() })
    fireEvent.click(screen.getByTestId("task-reject"))
    fireEvent.change(screen.getByTestId("reject-reason"), {
      target: { value: "needs a clearer scan" },
    })
    const confirm = screen.getByTestId("confirm-reject")
    expect(confirm).not.toBeDisabled()

    view.rerender(
      panelElement({
        task: makeTask({ status: "notStarted" }),
        doc: makeDoc(),
      }),
    )

    expect(screen.getByTestId("reject-stale-note")).toBeTruthy()
    expect(confirm).toBeDisabled()
    fireEvent.click(confirm)
    expect(taskActions.rejectTask).not.toHaveBeenCalled()

    // Close → restore a reviewable status → reopen: the typed reason is
    // still required and still enforced.
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    view.rerender(panelElement({ doc: makeDoc() }))
    fireEvent.click(screen.getByTestId("task-reject"))
    const reopened = screen.getByTestId("confirm-reject")
    expect(reopened).not.toBeDisabled()
    fireEvent.click(reopened)
    await waitFor(() =>
      expect(taskActions.rejectTask).toHaveBeenCalledWith(
        expect.objectContaining({ reason: "needs a clearer scan" }),
      ),
    )
  })

  it("invalidates an open skip confirmation when the task changes", () => {
    const view = renderPanel()
    fireEvent.click(screen.getByTestId("task-skip-switch"))
    const confirm = screen.getByTestId("confirm-skip")
    expect(confirm).not.toBeDisabled()

    view.rerender(panelElement({ task: makeTask({ status: "noActionRequired" }) }))

    expect(screen.getByTestId("skip-stale-note")).toBeTruthy()
    expect(confirm).toBeDisabled()
    fireEvent.click(confirm)
    expect(taskActions.skipTask).not.toHaveBeenCalled()
  })

  it("captures the blank-form revision when editing starts", async () => {
    const view = renderPanel({
      task: makeTask({
        id: "tax_documents_i_9",
        title: "Tax Documents (I-9)",
        actionType: "splitField",
      }),
      doc: makeDoc({ id: "tax_documents_i_9" }),
    })
    fireEvent.change(screen.getByTestId("blank-form-link-input"), {
      target: { value: "https://example.test/i9.pdf" },
    })

    view.rerender(
      panelElement({
        task: makeTask({
          id: "tax_documents_i_9",
          title: "Tax Documents (I-9)",
          actionType: "splitField",
        }),
        doc: makeDoc({ id: "tax_documents_i_9", revision: "rev-2" }),
      }),
    )

    fireEvent.click(screen.getByTestId("blank-form-link-save"))
    await waitFor(() =>
      expect(taskActions.updateBlankFormLink).toHaveBeenCalledWith(
        expect.objectContaining({ expectedRevision: "rev-1" }),
      ),
    )
  })
})

describe("TaskDetailPanel — read states and module safety", () => {
  it("disables ALL review controls when the owning module is stale", () => {
    renderPanel({ actionsEnabled: false })
    expect(screen.getByTestId("task-actions-unavailable")).toBeTruthy()
    expect(screen.getByTestId("task-verify")).toBeDisabled()
    expect(screen.getByTestId("task-reject")).toBeDisabled()
    expect(screen.getByTestId("task-skip-switch")).toBeDisabled()
    fireEvent.click(screen.getByTestId("task-skip-switch"))
    expect(screen.queryByTestId("skip-dialog")).toBeNull()
  })

  it("disables ALL review controls for an inactive employee", () => {
    renderPanel({ actionsEnabled: true, employeeActive: false, doc: makeDoc() })
    expect(screen.getByTestId("task-actions-inactive")).toBeTruthy()
    expect(screen.getByTestId("task-verify")).toBeDisabled()
    expect(screen.getByTestId("task-reject")).toBeDisabled()
    expect(screen.getByTestId("task-skip-switch")).toBeDisabled()
    fireEvent.click(screen.getByTestId("task-skip-switch"))
    expect(screen.queryByTestId("skip-dialog")).toBeNull()
  })

  it("disables ALL review controls when the employee's owner no longer matches the session", () => {
    renderPanel({
      actionsEnabled: true,
      employeeAdminId: "other-admin",
      doc: makeDoc(),
    })
    expect(screen.getByTestId("task-actions-not-owner")).toBeTruthy()
    expect(screen.getByTestId("task-verify")).toBeDisabled()
    expect(screen.getByTestId("task-reject")).toBeDisabled()
    expect(screen.getByTestId("task-skip-switch")).toBeDisabled()
    fireEvent.click(screen.getByTestId("task-skip-switch"))
    expect(screen.queryByTestId("skip-dialog")).toBeNull()
  })
})

describe("TaskDetailPanel — document dispatch / split fields", () => {
  it("shows a read-only split-field summary and hides approve/reject", () => {
    renderPanel({
      task: makeTask({
        id: "tax_documents_w_4",
        title: "Tax Documents (W-4)",
        actionType: "splitField",
      }),
      doc: makeDoc({
        id: "tax_documents_w_4",
        actionType: "splitField",
        formData: { fullName: "Jane Doe", filingStatus: "Single" },
        adminFormData: { position: "Therapist", verificationDate: "2026-10-01" },
        adminSignatureUrl: "typed:Dana Admin",
      }),
    })
    expect(screen.getByTestId("split-field-summary")).toBeTruthy()
    expect(screen.getByTestId("split-field-summary").textContent).toContain("Jane Doe")
    expect(screen.getByTestId("split-field-summary").textContent).toContain("FILING STATUS")
    expect(screen.getByTestId("split-field-summary").textContent).toContain("Dana Admin")
    expect(screen.queryByTestId("task-actions")).toBeNull()
  })

  it("renders an acknowledge document for non-split forms", () => {
    renderPanel({
      doc: makeDoc({ formData: { fullName: "Jane Doe" }, signatureUrl: "typed:Jane Doe" }),
    })
    expect(screen.getByTestId("task-form-view")).toBeTruthy()
    // The document footer shows the typed signature name.
    expect(screen.getByTestId("task-form-view").textContent).toContain("Jane Doe")
    expect(screen.getByTestId("task-form-view").textContent).toContain(
      "Bright Horizons Mental Health, LLC",
    )
  })

  it("shows raw form data and the administrative review payload", () => {
    renderPanel({
      task: makeTask({
        actionType: "upload",
        fileUrl: "https://x/file.pdf",
        fileUrls: ["https://x/file.pdf"],
      }),
      doc: makeDoc({
        actionType: "upload",
        formData: { fullName: "Jane Doe", customField: "value" },
        adminFormData: { position: "Therapist", verificationDate: "2026-10-01" },
        adminSignatureUrl: "typed:Dana Admin",
        rejectionReason: "needs signature",
      }),
    })
    expect(screen.getByTestId("task-form-data").textContent).toContain("customField:")
    expect(screen.getByTestId("task-form-data").textContent).toContain("value")
    expect(screen.getByTestId("task-admin-review").textContent).toContain(
      "Rejected: needs signature",
    )
    expect(screen.getByTestId("task-admin-review").textContent).toContain("POSITION")
    expect(screen.getByTestId("task-admin-review").textContent).toContain("Dana Admin")
  })

  it("shows a download link for uploaded training files and no form view", () => {
    renderPanel({
      task: makeTask({
        id: "start",
        taskSource: "training",
        title: "START",
        actionType: "upload",
        status: "submitted",
        fileUrl: "https://x/cert.pdf",
        fileUrls: ["https://x/cert.pdf"],
      }),
    })
    expect(screen.getByTestId("task-download").getAttribute("href")).toBe("https://x/cert.pdf")
    expect(screen.getByTestId("task-download").textContent).toContain("Download Original")
    expect(screen.queryByTestId("task-form-view")).toBeNull()
    expect(screen.getByTestId("task-actions")).toBeTruthy()
  })

  it("shows the empty-submission state when nothing was submitted", () => {
    renderPanel({
      task: makeTask({ status: "notStarted", actionType: "upload" }),
    })
    expect(screen.getByText("No submission data yet.")).toBeTruthy()
  })
})
