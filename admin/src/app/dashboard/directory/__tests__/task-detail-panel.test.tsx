// @vitest-environment jsdom
/**
 * TaskDetailPanel tests — the review actions and read-only document views
 * are exercised through the REAL component (no internal mocks) while the
 * DataStore writers are module-mocked so payloads are asserted.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

import * as taskActions from "@/lib/admin/task-actions"
import * as auditPdf from "@/lib/admin/audit-pdf"
import * as auditActions from "@/lib/admin/audit-actions"
import * as notificationActions from "@/lib/admin/notification-actions"
import { EmployeeActionError } from "@/lib/admin/employee-actions"
import type { DetailSubTask } from "@/lib/admin/compliance-helpers"
import type { EmployeeTaskDoc } from "@/lib/admin/employee-detail-streams"

import { TaskDetailPanel } from "@/app/dashboard/directory/[employeeId]/task-manager"

vi.mock("@/lib/admin/task-actions", () => ({
  MAX_ADMIN_UPLOAD_BYTES: 10 * 1024 * 1024,
  ADMIN_UPLOAD_ACCEPT: ".pdf,.png,.jpg",
  acceptTask: vi.fn().mockResolvedValue(undefined),
  rejectTask: vi.fn().mockResolvedValue(undefined),
  skipTask: vi.fn().mockResolvedValue(undefined),
  updateBlankFormLink: vi.fn().mockResolvedValue(undefined),
  adminUploadTaskDocument: vi.fn().mockResolvedValue({
    fileUrl: "https://storage.test/new.pdf",
    fileName: "new.pdf",
  }),
}))

vi.mock("@/lib/admin/audit-pdf", () => {
  class MockAuditPdfError extends Error {
    readonly code: string
    constructor(code: string, message?: string) {
      super(message ?? code)
      this.name = "AuditPdfError"
      this.code = code
    }
  }
  return {
    AuditPdfError: MockAuditPdfError,
    downloadTaskAuditPdf: vi.fn().mockResolvedValue("Onboarding_Acknowledgment_form_Jane_Doe.pdf"),
  }
})

vi.mock("@/lib/admin/audit-actions", () => ({
  logAuditAction: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/admin/notification-actions", () => ({
  triggerNotification: vi.fn().mockResolvedValue(undefined),
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
  adminName?: string
  employeeAdminId?: string | null
}

function panelElement({
  task = makeTask(),
  doc = null,
  actionsEnabled = true,
  employeeActive = true,
  adminUid = "adm-1",
  adminName,
  employeeAdminId = "adm-1",
}: PanelOptions = {}) {
  return (
    <TaskDetailPanel
      task={task}
      employeeId="emp-1"
      employeeName="Jane Doe"
      adminUid={adminUid}
      adminName={adminName}
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
  vi.mocked(taskActions.adminUploadTaskDocument)
    .mockReset()
    .mockResolvedValue({
      fileUrl: "https://storage.test/new.pdf",
      fileName: "new.pdf",
    })
  vi.mocked(auditPdf.downloadTaskAuditPdf)
    .mockReset()
    .mockResolvedValue("Onboarding_Acknowledgment_form_Jane_Doe.pdf")
  vi.mocked(auditActions.logAuditAction).mockReset().mockResolvedValue(undefined)
  vi.mocked(notificationActions.triggerNotification).mockReset().mockResolvedValue(undefined)
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
      "Example Health Clinic, LLC",
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

describe("TaskDetailPanel — admin upload", () => {
  function uploadTask(): DetailSubTask {
    return makeTask({
      id: "resume",
      title: "Resume",
      actionType: "upload",
      status: "notStarted",
    })
  }

  function uploadDoc(revision = "rev-1"): EmployeeTaskDoc {
    return makeDoc({
      id: "resume",
      title: "Resume",
      actionType: "upload",
      status: "notStarted",
      revision,
    })
  }

  it("shows the upload card only for onboarding document requirements", () => {
    const { unmount } = renderPanel({ task: uploadTask(), doc: uploadDoc() })
    expect(screen.getByTestId("task-admin-upload-card")).toBeTruthy()
    expect(screen.getByTestId("task-admin-upload").textContent).toContain("Upload Document")
    expect((screen.getByTestId("task-admin-upload-input") as HTMLInputElement).accept).toContain(
      ".pdf",
    )
    expect(screen.queryByTestId("task-audit-pdf")).toBeNull()
    unmount()

    // Form requirements have no admin upload control.
    const form = renderPanel()
    expect(screen.queryByTestId("task-admin-upload-card")).toBeNull()
    form.unmount()

    // Training uploads are also excluded (onboarding-only, Flutter parity).
    renderPanel({
      task: makeTask({
        id: "start",
        taskSource: "training",
        actionType: "upload",
        title: "START",
      }),
    })
    expect(screen.queryByTestId("task-admin-upload-card")).toBeNull()
  })

  it("offers replacement for a requirement that already has a file", () => {
    renderPanel({
      task: makeTask({
        id: "resume",
        title: "Resume",
        actionType: "upload",
        status: "verified",
        isCompleted: true,
        fileUrl: "https://x/old.pdf",
        fileUrls: ["https://x/old.pdf"],
      }),
      doc: uploadDoc(),
    })
    expect(screen.getByTestId("task-admin-upload").textContent).toContain("Replace Document")
  })

  it("uploads the selected file with the reviewed revision and ids", async () => {
    renderPanel({ task: uploadTask(), doc: uploadDoc("rev-9") })
    const file = new File(["%PDF-1.4"], "resume.pdf", { type: "application/pdf" })

    fireEvent.change(screen.getByTestId("task-admin-upload-input"), {
      target: { files: [file] },
    })

    await waitFor(() => expect(taskActions.adminUploadTaskDocument).toHaveBeenCalledTimes(1))
    const input = vi.mocked(taskActions.adminUploadTaskDocument).mock.calls[0][0]
    expect(input).toMatchObject({
      employeeId: "emp-1",
      taskId: "resume",
      taskSource: "onboarding",
      adminUid: "adm-1",
      expectedRevision: "rev-9",
      employeeName: "Jane Doe",
      taskTitle: "Resume",
    })
    expect(input.file).toBe(file)

    await waitFor(() =>
      expect(screen.getByTestId("task-action-success").textContent).toContain(
        "Document uploaded",
      ),
    )
    expect(screen.queryByTestId("task-action-error")).toBeNull()
  })

  it("surfaces a validation error and never reports success", async () => {
    vi.mocked(taskActions.adminUploadTaskDocument).mockRejectedValueOnce(
      new EmployeeActionError("The selected file is empty.", "invalid-argument"),
    )
    renderPanel({ task: uploadTask(), doc: uploadDoc() })

    fireEvent.change(screen.getByTestId("task-admin-upload-input"), {
      target: {
        files: [new File(["x"], "empty.pdf", { type: "application/pdf" })],
      },
    })

    await waitFor(() =>
      expect(screen.getByTestId("task-action-error").textContent).toContain(
        "The selected file is empty.",
      ),
    )
    expect(screen.queryByTestId("task-action-success")).toBeNull()
  })

  it("disables upload while the stream is stale or the employee is inactive", () => {
    const stale = renderPanel({ task: uploadTask(), actionsEnabled: false })
    expect(screen.getByTestId("task-admin-upload")).toBeDisabled()
    expect(screen.getByTestId("task-admin-upload-input")).toBeDisabled()
    stale.unmount()

    renderPanel({ task: uploadTask(), employeeActive: false })
    expect(screen.getByTestId("task-admin-upload")).toBeDisabled()
    expect(screen.getByTestId("task-admin-upload-input")).toBeDisabled()
  })

  it("disables upload when ownership changed", () => {
    renderPanel({ task: uploadTask(), employeeAdminId: "other-admin" })
    expect(screen.getByTestId("task-admin-upload")).toBeDisabled()
    expect(screen.getByTestId("task-actions-not-owner")).toBeTruthy()
  })
})

describe("TaskDetailPanel — audit PDF", () => {
  it("downloads the server-generated audit record for a submitted form", async () => {
    renderPanel({ doc: makeDoc() })

    fireEvent.click(screen.getByTestId("task-audit-pdf"))

    await waitFor(() =>
      expect(auditPdf.downloadTaskAuditPdf).toHaveBeenCalledWith({
        employeeId: "emp-1",
        taskId: "onboarding_acknowledgment_form",
        adminUid: "adm-1",
      }),
    )
    await waitFor(() =>
      expect(screen.getByTestId("task-action-success").textContent).toContain(
        "Audit record downloaded",
      ),
    )
  })

  it("shows an actionable error when the callable failures are mapped", async () => {
    vi.mocked(auditPdf.downloadTaskAuditPdf).mockRejectedValueOnce(
      new auditPdf.AuditPdfError(
        "not-deployed",
        "The server-side audit PDF function is not deployed yet.",
      ),
    )
    renderPanel({ doc: makeDoc() })

    fireEvent.click(screen.getByTestId("task-audit-pdf"))

    await waitFor(() =>
      expect(screen.getByTestId("task-action-error").textContent).toContain("not deployed"),
    )
    expect(screen.queryByTestId("task-action-success")).toBeNull()
  })

  it("does not offer an audit PDF before the requirement is submitted", () => {
    renderPanel({
      task: makeTask({ status: "notStarted" }),
      doc: makeDoc({ status: "notStarted" }),
    })
    expect(screen.queryByTestId("task-audit-pdf")).toBeNull()
  })

  it("does not offer the audit PDF for training form requirements", () => {
    renderPanel({
      task: makeTask({
        id: "start",
        taskSource: "training",
        title: "START",
        actionType: "acknowledgement",
        status: "completed",
        isCompleted: true,
      }),
    })
    expect(screen.queryByTestId("task-audit-pdf")).toBeNull()
  })

  it("disables the audit PDF for inactive employees and stale streams", () => {
    const inactive = renderPanel({ doc: makeDoc(), employeeActive: false })
    expect(screen.getByTestId("task-audit-pdf")).toBeDisabled()
    inactive.unmount()

    renderPanel({ doc: makeDoc(), actionsEnabled: false })
    expect(screen.getByTestId("task-audit-pdf")).toBeDisabled()
  })

  it("keeps the original-file download for upload requirements", () => {
    renderPanel({
      task: makeTask({
        id: "resume",
        title: "Resume",
        actionType: "upload",
        status: "verified",
        isCompleted: true,
        fileUrl: "https://x/resume.pdf",
        fileUrls: ["https://x/resume.pdf"],
      }),
      doc: makeDoc({
        id: "resume",
        title: "Resume",
        actionType: "upload",
        status: "verified",
        isCompleted: true,
      }),
    })
    expect(screen.queryByTestId("task-audit-pdf")).toBeNull()
    expect(screen.getByTestId("task-download").getAttribute("href")).toBe(
      "https://x/resume.pdf",
    )
    expect(screen.getByTestId("task-download").textContent).toContain("Download Original")
  })
})

describe("TaskDetailPanel — audit logging and notifications", () => {
  it("logs audit and triggers notification on accept across onboarding, training, and clearance", async () => {
    const first = renderPanel({ doc: makeDoc(), adminName: "Dana Admin" })
    fireEvent.click(screen.getByTestId("task-verify"))
    fireEvent.click(screen.getByTestId("confirm-verify"))
    await waitFor(() => expect(auditActions.logAuditAction).toHaveBeenCalledTimes(1))
    expect(auditActions.logAuditAction).toHaveBeenCalledWith({
      actorId: "adm-1",
      actorName: "Dana Admin",
      actionType: "TASK_VERIFIED",
      targetId: "emp-1",
      description: 'Verified "Onboarding Acknowledgment form" for Jane Doe',
      metadata: { taskId: "onboarding_acknowledgment_form", taskSource: "onboarding" },
    })
    expect(notificationActions.triggerNotification).toHaveBeenCalledWith({
      targetUserId: "emp-1",
      title: "Task Verified",
      body: 'Your task "Onboarding Acknowledgment form" has been verified.',
      type: "success",
      metadata: { taskId: "onboarding_acknowledgment_form", type: "onboarding_update" },
    })
    first.unmount()

    vi.clearAllMocks()
    const second = renderPanel({
      task: makeTask({
        id: "start",
        taskSource: "training",
        title: "START",
        actionType: "upload",
        status: "submitted",
      }),
    })
    fireEvent.click(screen.getByTestId("task-verify"))
    fireEvent.click(screen.getByTestId("confirm-verify"))
    await waitFor(() => expect(auditActions.logAuditAction).toHaveBeenCalledTimes(1))
    expect(auditActions.logAuditAction).toHaveBeenCalledWith({
      actorId: "adm-1",
      actorName: "Administrator",
      actionType: "TRAINING_VERIFIED",
      targetId: "emp-1",
      description: 'Verified training "START" for Jane Doe',
      metadata: { trainingId: "start", taskSource: "training" },
    })
    expect(notificationActions.triggerNotification).toHaveBeenCalledWith({
      targetUserId: "emp-1",
      title: "Training Verified",
      body: 'Your training "START" has been verified.',
      type: "success",
      metadata: { trainingId: "start", type: "training_update" },
    })
    second.unmount()

    vi.clearAllMocks()
    renderPanel({
      task: makeTask({
        id: "tb_test",
        taskSource: "clearance",
        title: "TB Status Report",
        actionType: "upload",
        status: "submitted",
      }),
    })
    fireEvent.click(screen.getByTestId("task-verify"))
    fireEvent.click(screen.getByTestId("confirm-verify"))
    await waitFor(() => expect(auditActions.logAuditAction).toHaveBeenCalledTimes(1))
    expect(auditActions.logAuditAction).toHaveBeenCalledWith({
      actorId: "adm-1",
      actorName: "Administrator",
      actionType: "CLEARANCE_VERIFIED",
      targetId: "emp-1",
      description: 'Verified clearance "TB Status Report" for Jane Doe',
      metadata: { clearanceId: "tb_test", taskSource: "clearance" },
    })
    expect(notificationActions.triggerNotification).toHaveBeenCalledWith({
      targetUserId: "emp-1",
      title: "Clearance Verified",
      body: 'Your clearance requirement "TB Status Report" has been verified.',
      type: "success",
      metadata: { clearanceId: "tb_test", type: "clearance_verified" },
    })
  })

  it("logs audit and triggers notification on reject with the trimmed reason", async () => {
    renderPanel({ doc: makeDoc(), adminName: "Dana Admin" })
    fireEvent.click(screen.getByTestId("task-reject"))
    fireEvent.change(screen.getByTestId("reject-reason"), {
      target: { value: "  signature unclear  " },
    })
    fireEvent.click(screen.getByTestId("confirm-reject"))

    await waitFor(() => expect(auditActions.logAuditAction).toHaveBeenCalledTimes(1))
    expect(auditActions.logAuditAction).toHaveBeenCalledWith({
      actorId: "adm-1",
      actorName: "Dana Admin",
      actionType: "TASK_REJECTED",
      targetId: "emp-1",
      description: 'Rejected "Onboarding Acknowledgment form" for Jane Doe: signature unclear',
      metadata: {
        taskId: "onboarding_acknowledgment_form",
        reason: "signature unclear",
        taskSource: "onboarding",
      },
    })
    expect(notificationActions.triggerNotification).toHaveBeenCalledWith({
      targetUserId: "emp-1",
      title: "Document Returned for Correction",
      body: 'Your submission for "Onboarding Acknowledgment form" needs changes: signature unclear',
      type: "error",
      metadata: {
        taskId: "onboarding_acknowledgment_form",
        reason: "signature unclear",
        type: "onboarding_update",
      },
    })
  })

  it("logs audit and triggers notification on skip and unskip", async () => {
    const view = renderPanel({ adminName: "Dana Admin" })
    fireEvent.click(screen.getByTestId("task-skip-switch"))
    fireEvent.click(screen.getByTestId("confirm-skip"))

    await waitFor(() => expect(auditActions.logAuditAction).toHaveBeenCalledTimes(1))
    expect(auditActions.logAuditAction).toHaveBeenCalledWith({
      actorId: "adm-1",
      actorName: "Dana Admin",
      actionType: "TASK_SKIPPED",
      targetId: "emp-1",
      description: 'Marked "Onboarding Acknowledgment form" as No Action Required for Jane Doe',
      metadata: {
        taskId: "onboarding_acknowledgment_form",
        skip: true,
        taskSource: "onboarding",
      },
    })
    expect(notificationActions.triggerNotification).toHaveBeenCalledWith({
      targetUserId: "emp-1",
      title: "Requirement Skipped",
      body: '"Onboarding Acknowledgment form" was marked as No Action Required by your administrator.',
      type: "info",
      metadata: {
        taskId: "onboarding_acknowledgment_form",
        skip: true,
        type: "onboarding_update",
      },
    })
    view.unmount()

    vi.clearAllMocks()
    renderPanel({ task: makeTask({ status: "noActionRequired" }) })
    fireEvent.click(screen.getByTestId("task-skip-switch"))
    fireEvent.click(screen.getByTestId("confirm-skip"))

    await waitFor(() => expect(auditActions.logAuditAction).toHaveBeenCalledTimes(1))
    expect(auditActions.logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "TASK_UNSKIPPED",
        metadata: expect.objectContaining({ skip: false }),
      }),
    )
    expect(notificationActions.triggerNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Requirement Restored",
        type: "warning",
        metadata: expect.objectContaining({ skip: false, type: "onboarding_update" }),
      }),
    )
  })

  it("logs audit and triggers notification on admin upload", async () => {
    renderPanel({
      task: makeTask({
        id: "resume",
        title: "Resume",
        actionType: "upload",
        status: "notStarted",
      }),
      doc: makeDoc({
        id: "resume",
        title: "Resume",
        actionType: "upload",
        status: "notStarted",
      }),
      adminName: "Dana Admin",
    })
    const file = new File(["%PDF-1.4"], "resume.pdf", { type: "application/pdf" })
    fireEvent.change(screen.getByTestId("task-admin-upload-input"), {
      target: { files: [file] },
    })

    await waitFor(() => expect(auditActions.logAuditAction).toHaveBeenCalledTimes(1))
    expect(auditActions.logAuditAction).toHaveBeenCalledWith({
      actorId: "adm-1",
      actorName: "Dana Admin",
      actionType: "ADMIN_DOCUMENT_UPLOADED",
      targetId: "emp-1",
      description: 'Uploaded document "new.pdf" for "Resume" (Jane Doe)',
      metadata: {
        taskId: "resume",
        taskSource: "onboarding",
        fileName: "new.pdf",
        fileUrl: "https://storage.test/new.pdf",
      },
    })
    expect(notificationActions.triggerNotification).toHaveBeenCalledWith({
      targetUserId: "emp-1",
      title: "Document Uploaded & Verified",
      body: 'An administrator uploaded "Resume" on your behalf and marked it verified.',
      type: "success",
      metadata: {
        taskId: "resume",
        type: "onboarding_update",
        fileName: "new.pdf",
      },
    })
  })

  it("does not log audit or send notifications when primary action fails", async () => {
    vi.mocked(taskActions.acceptTask).mockRejectedValueOnce(new Error("offline"))
    vi.mocked(taskActions.rejectTask).mockRejectedValueOnce(new Error("offline"))
    vi.mocked(taskActions.skipTask).mockRejectedValueOnce(new Error("offline"))
    vi.mocked(taskActions.adminUploadTaskDocument).mockRejectedValueOnce(new Error("offline"))

    const p1 = renderPanel({ doc: makeDoc() })
    fireEvent.click(screen.getByTestId("task-verify"))
    fireEvent.click(screen.getByTestId("confirm-verify"))
    await waitFor(() => expect(screen.getByTestId("task-action-error")).toBeTruthy())
    expect(auditActions.logAuditAction).not.toHaveBeenCalled()
    expect(notificationActions.triggerNotification).not.toHaveBeenCalled()
    p1.unmount()

    const p2 = renderPanel({ doc: makeDoc() })
    fireEvent.click(screen.getByTestId("task-reject"))
    fireEvent.change(screen.getByTestId("reject-reason"), { target: { value: "blurry" } })
    fireEvent.click(screen.getByTestId("confirm-reject"))
    await waitFor(() => expect(screen.getByTestId("task-action-error")).toBeTruthy())
    expect(auditActions.logAuditAction).not.toHaveBeenCalled()
    expect(notificationActions.triggerNotification).not.toHaveBeenCalled()
    p2.unmount()

    const p3 = renderPanel({ doc: makeDoc() })
    fireEvent.click(screen.getByTestId("task-skip-switch"))
    fireEvent.click(screen.getByTestId("confirm-skip"))
    await waitFor(() => expect(screen.getByTestId("task-action-error")).toBeTruthy())
    expect(auditActions.logAuditAction).not.toHaveBeenCalled()
    expect(notificationActions.triggerNotification).not.toHaveBeenCalled()
    p3.unmount()

    renderPanel({
      task: makeTask({
        id: "resume",
        title: "Resume",
        actionType: "upload",
        status: "notStarted",
      }),
      doc: makeDoc({
        id: "resume",
        title: "Resume",
        actionType: "upload",
        status: "notStarted",
      }),
    })
    fireEvent.change(screen.getByTestId("task-admin-upload-input"), {
      target: { files: [new File(["%PDF-1.4"], "resume.pdf", { type: "application/pdf" })] },
    })
    await waitFor(() => expect(screen.getByTestId("task-action-error")).toBeTruthy())
    expect(auditActions.logAuditAction).not.toHaveBeenCalled()
    expect(notificationActions.triggerNotification).not.toHaveBeenCalled()
  })

  it("propagates adminName into SplitFieldCounterSignPanel rejection audit logs", async () => {
    renderPanel({
      task: makeTask({
        id: "annual_training",
        title: "Annual Training",
        actionType: "splitField",
        status: "submitted",
      }),
      doc: makeDoc({
        id: "annual_training",
        title: "Annual Training",
        actionType: "splitField",
        status: "submitted",
      }),
      adminName: "Dana Admin",
    })

    fireEvent.click(screen.getByTestId("split-reject-open"))
    fireEvent.change(screen.getByTestId("split-reject-reason"), {
      target: { value: "Topic 2 incomplete" },
    })
    fireEvent.click(screen.getByTestId("split-reject-confirm"))

    await waitFor(() => expect(auditActions.logAuditAction).toHaveBeenCalledTimes(1))
    expect(auditActions.logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "adm-1",
        actorName: "Dana Admin",
        actionType: "SPLIT_FIELD_REJECTED",
        targetId: "emp-1",
      }),
    )
    expect(notificationActions.triggerNotification).toHaveBeenCalledTimes(1)
  })
})
