// @vitest-environment jsdom
/**
 * Clearance detail — read states and the verify/reject decision flows.
 *
 * The detail subscription and the transactional writers are mocked; the
 * signature pad is replaced with a one-click stub so the test can assert the
 * exact action input. The real models drive the rendered history and status.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"

import * as actions from "@/lib/admin/clearance-actions"
import * as streams from "@/lib/admin/clearance-streams"
import type { ClearanceRecord } from "@/lib/admin/clearance-models"

import { ClearanceDetailView } from "@/app/dashboard/verify/[employeeId]/[clearanceId]/clearance-detail-view"

const routerPush = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
}))

vi.mock("@/lib/admin/clearance-streams", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/clearance-streams")>()
  return {
    ...actual,
    subscribeClearanceDetail: vi.fn(),
  }
})

vi.mock("@/lib/admin/clearance-actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/clearance-actions")>()
  return {
    ...actual,
    verifyClearance: vi.fn(),
    rejectClearance: vi.fn(),
  }
})

vi.mock("@/components/admin/signature-pad", () => ({
  SignaturePad: ({
    onConfirm,
  }: {
    onConfirm: (signature: string) => void
  }) => (
    <button
      type="button"
      data-testid="mock-signature-confirm"
      onClick={() => onConfirm("BASE64_SIGNATURE")}
    >
      Mock sign
    </button>
  ),
}))

const subscribe = vi.mocked(streams.subscribeClearanceDetail)
const verifyMock = vi.mocked(actions.verifyClearance)
const rejectMock = vi.mocked(actions.rejectClearance)

type DetailCtrl = Parameters<typeof streams.subscribeClearanceDetail>[3]

let ctrl: DetailCtrl

const fire = (callback: () => void) => act(callback)

const employee: streams.ClearanceEmployee = {
  uid: "emp-1",
  name: "Sara Khan",
  department: "Nursing",
  role: "employee",
  adminId: "adm-1",
  isActive: true,
}

function record(overrides: Partial<ClearanceRecord> = {}): ClearanceRecord {
  return {
    id: "clearance-1",
    employeeId: "emp-1",
    employeeName: "Sara Khan",
    adminId: "adm-1",
    title: "Background Check",
    description: "",
    status: "underReview",
    fileUrl: "https://example.test/check.pdf",
    rejectionReason: null,
    dueDate: null,
    submittedAt: new Date("2026-10-20T09:00:00.000Z"),
    verifiedAt: null,
    updatedAt: new Date("2026-10-21T09:00:00.000Z"),
    revision: "revision-1",
    ...overrides,
  }
}

function renderDetail() {
  return render(
    <ClearanceDetailView
      employeeId="emp-1"
      clearanceId="clearance-1"
      adminUid="adm-1"
      adminEmail="admin@staffrail.test"
    />,
  )
}

function emitReady(
  clearance: ClearanceRecord = record(),
  profile: streams.ClearanceEmployee = employee,
) {
  fire(() => {
    ctrl.emit("employee", { employee: profile, clearance: null })
    ctrl.emit("clearance", { employee: profile, clearance })
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  routerPush.mockReset()
  subscribe.mockImplementation((_employeeId, _clearanceId, _adminUid, controller) => {
    ctrl = controller
    ctrl.listen("employee")
    ctrl.listen("clearance")
    return vi.fn()
  })
  verifyMock.mockResolvedValue(undefined)
  rejectMock.mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("ClearanceDetailView — read states", () => {
  it("subscribes to the ownership-gated detail and shows a loading state", () => {
    renderDetail()

    expect(subscribe).toHaveBeenCalledWith(
      "emp-1",
      "clearance-1",
      "adm-1",
      expect.anything(),
    )
    expect(screen.getByText("Loading clearance…")).toBeInTheDocument()
    expect(screen.queryByTestId("clearance-verify-open")).toBeNull()
  })

  it("shows not-found when the employee is missing or not owned", () => {
    renderDetail()
    fire(() => ctrl.emit("employee", { employee: null, clearance: null }))

    expect(screen.getByText("Clearance record not found.")).toBeInTheDocument()
  })

  it("shows a retryable error when the document cannot be loaded", () => {
    renderDetail()
    fire(() => ctrl.emit("employee", { employee, clearance: null }))
    fire(() =>
      ctrl.fail(
        "clearance",
        Object.assign(new Error("permission denied"), { code: "permission-denied" }),
      ),
    )

    expect(screen.getByTestId("clearance-detail-error")).toHaveTextContent(
      "This clearance could not be streamed.",
    )
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument()
    expect(screen.queryByTestId("clearance-verify-open")).toBeNull()
  })
})

describe("ClearanceDetailView — ready record", () => {
  it("renders employee, evidence, status and history", () => {
    renderDetail()
    emitReady()

    expect(screen.getByText("Sara Khan")).toBeInTheDocument()
    expect(screen.getByText("Background Check")).toBeInTheDocument()
    expect(screen.getByTestId("clearance-status")).toHaveTextContent("Under Review")
    expect(screen.getByTestId("clearance-file-open")).toHaveAttribute(
      "href",
      "https://example.test/check.pdf",
    )
    expect(screen.getByTestId("clearance-file-download")).toBeInTheDocument()
    expect(screen.getByTestId("clearance-history")).toHaveTextContent("Document Uploaded")
    expect(screen.getByTestId("clearance-history")).toHaveTextContent("Pending Review")
    expect(screen.getByTestId("clearance-verify-open")).toBeInTheDocument()
    expect(screen.getByTestId("clearance-reject-open")).toBeInTheDocument()
  })

  it("verifies with the reviewed revision and the exported signature", async () => {
    renderDetail()
    emitReady()

    fireEvent.click(screen.getByTestId("clearance-verify-open"))
    fireEvent.click(screen.getByTestId("mock-signature-confirm"))

    await waitFor(() =>
      expect(verifyMock).toHaveBeenCalledWith({
        adminUid: "adm-1",
        employeeId: "emp-1",
        clearanceId: "clearance-1",
        expectedRevision: "revision-1",
        signatureData: "BASE64_SIGNATURE",
      }),
    )
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/dashboard/verify"))
  })

  it("requires a rejection reason and trims it before writing", async () => {
    renderDetail()
    emitReady()

    fireEvent.click(screen.getByTestId("clearance-reject-open"))
    const submit = screen.getByTestId("clearance-reject-submit")
    expect(submit).toBeDisabled()

    fireEvent.change(screen.getByTestId("clearance-reject-reason"), {
      target: { value: "  The scan is unreadable.  " },
    })
    expect(submit).not.toBeDisabled()
    fireEvent.click(submit)

    await waitFor(() =>
      expect(rejectMock).toHaveBeenCalledWith({
        adminUid: "adm-1",
        employeeId: "emp-1",
        clearanceId: "clearance-1",
        expectedRevision: "revision-1",
        reason: "The scan is unreadable.",
      }),
    )
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/dashboard/verify"))
  })

  it("surfaces a conflict without navigating away", async () => {
    verifyMock.mockRejectedValueOnce(
      new Error("This clearance changed since you reviewed it."),
    )
    renderDetail()
    emitReady()

    fireEvent.click(screen.getByTestId("clearance-verify-open"))
    fireEvent.click(screen.getByTestId("mock-signature-confirm"))

    await waitFor(() =>
      expect(screen.getByTestId("clearance-action-error")).toHaveTextContent(
        "This clearance changed since you reviewed it.",
      ),
    )
    expect(routerPush).not.toHaveBeenCalled()
  })

  it("keeps verified records read-only", () => {
    renderDetail()
    emitReady(
      record({
        status: "verified",
        verifiedAt: new Date("2026-10-22T09:00:00.000Z"),
      }),
    )

    expect(screen.getByTestId("clearance-verified-note")).toHaveTextContent("Verified")
    expect(screen.queryByTestId("clearance-verify-open")).toBeNull()
    expect(screen.queryByTestId("clearance-reject-open")).toBeNull()
  })

  it("disables decisions when the stream failed with a retained record", () => {
    renderDetail()
    emitReady()
    fire(() =>
      ctrl.fail("clearance", Object.assign(new Error("offline"), { code: "unavailable" })),
    )

    expect(screen.getByTestId("clearance-detail-stale")).toHaveTextContent("Stale")
    expect(screen.getByTestId("clearance-detail-error")).toHaveTextContent("stale")
    expect(screen.queryByTestId("clearance-verify-open")).toBeNull()
    expect(screen.queryByTestId("clearance-reject-open")).toBeNull()
    expect(screen.getByText(/Review actions are unavailable/)).toBeInTheDocument()
  })

  it("shows an explicit inactive state without leaving the page loading", () => {
    renderDetail()
    fire(() =>
      ctrl.emit("employee", {
        employee: { ...employee, isActive: false },
        clearance: null,
      }),
    )

    expect(screen.getByTestId("clearance-employee-inactive")).toHaveTextContent(
      "Employee inactive.",
    )
    expect(screen.getByTestId("clearance-employee-inactive")).toHaveTextContent(
      "Reactivate the employee",
    )
    expect(screen.queryByText("Loading clearance…")).toBeNull()
    expect(screen.queryByTestId("clearance-verify-open")).toBeNull()
    expect(screen.queryByTestId("clearance-reject-open")).toBeNull()
  })

  it("waits for a fresh clearance snapshot after reactivation before enabling decisions", () => {
    renderDetail()
    fire(() =>
      ctrl.emit("employee", {
        employee: { ...employee, isActive: false },
        clearance: null,
      }),
    )
    fire(() => ctrl.emit("employee", { employee, clearance: null }))

    expect(screen.getByText("Loading clearance…")).toBeInTheDocument()
    expect(screen.queryByTestId("clearance-verify-open")).toBeNull()

    fire(() =>
      ctrl.emit("clearance", {
        employee,
        clearance: record({ revision: "revision-reactivated" }),
      }),
    )

    expect(screen.getByTestId("clearance-verify-open")).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("clearance-verify-open"))
    fireEvent.click(screen.getByTestId("mock-signature-confirm"))

    return waitFor(() =>
      expect(verifyMock).toHaveBeenCalledWith(
        expect.objectContaining({ expectedRevision: "revision-reactivated" }),
      ),
    )
  })
})

describe("ClearanceDetailView — open reviews are bound to their snapshot", () => {
  it("cannot verify replacement evidence through an old confirmation", async () => {
    renderDetail()
    emitReady()
    fireEvent.click(screen.getByTestId("clearance-verify-open"))
    expect(screen.getByTestId("mock-signature-confirm")).toBeInTheDocument()

    // Same status, new evidence → a different submission the reviewer never saw.
    fire(() =>
      ctrl.emit("clearance", {
        employee,
        clearance: record({
          revision: "revision-2",
          fileUrl: "https://example.test/replacement.pdf",
        }),
      }),
    )

    expect(screen.getByTestId("clearance-verify-stale")).toHaveTextContent(
      "Close it and reopen",
    )
    expect(screen.queryByTestId("mock-signature-confirm")).toBeNull()
    expect(verifyMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: /close review/i }))
    expect(screen.queryByTestId("clearance-verify-stale")).toBeNull()

    fireEvent.click(screen.getByTestId("clearance-verify-open"))
    fireEvent.click(screen.getByTestId("mock-signature-confirm"))

    await waitFor(() =>
      expect(verifyMock).toHaveBeenCalledWith({
        adminUid: "adm-1",
        employeeId: "emp-1",
        clearanceId: "clearance-1",
        expectedRevision: "revision-2",
        signatureData: "BASE64_SIGNATURE",
      }),
    )
  })

  it("cannot reject replacement evidence through an old confirmation", async () => {
    renderDetail()
    emitReady()
    fireEvent.click(screen.getByTestId("clearance-reject-open"))
    fireEvent.change(screen.getByTestId("clearance-reject-reason"), {
      target: { value: "The scan is unreadable." },
    })
    expect(screen.getByTestId("clearance-reject-submit")).not.toBeDisabled()

    fire(() =>
      ctrl.emit("clearance", {
        employee,
        clearance: record({
          revision: "revision-2",
          fileUrl: "https://example.test/replacement.pdf",
        }),
      }),
    )

    expect(screen.getByTestId("clearance-reject-stale")).toHaveTextContent(
      "Close it and reopen",
    )
    expect(screen.getByTestId("clearance-reject-reason")).toBeDisabled()
    expect(screen.getByTestId("clearance-reject-submit")).toBeDisabled()
    fireEvent.click(screen.getByTestId("clearance-reject-submit"))
    expect(rejectMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    fireEvent.click(screen.getByTestId("clearance-reject-open"))
    fireEvent.change(screen.getByTestId("clearance-reject-reason"), {
      target: { value: "The replacement is unreadable." },
    })
    fireEvent.click(screen.getByTestId("clearance-reject-submit"))

    await waitFor(() =>
      expect(rejectMock).toHaveBeenCalledWith({
        adminUid: "adm-1",
        employeeId: "emp-1",
        clearanceId: "clearance-1",
        expectedRevision: "revision-2",
        reason: "The replacement is unreadable.",
      }),
    )
  })

  it("invalidates an open verification when the reviewable status changes", () => {
    renderDetail()
    emitReady()
    fireEvent.click(screen.getByTestId("clearance-verify-open"))

    fire(() =>
      ctrl.emit("clearance", {
        employee,
        clearance: record({
          status: "verified",
          verifiedAt: new Date("2026-10-22T09:00:00.000Z"),
        }),
      }),
    )

    expect(screen.getByTestId("clearance-verify-stale")).toHaveTextContent(
      "Close it and reopen",
    )
    expect(screen.getByTestId("clearance-verified-note")).toHaveTextContent("Verified")
    expect(screen.queryByTestId("mock-signature-confirm")).toBeNull()
    expect(verifyMock).not.toHaveBeenCalled()
  })

  it("invalidates an open rejection when the reviewable status changes", () => {
    renderDetail()
    emitReady()
    fireEvent.click(screen.getByTestId("clearance-reject-open"))
    fireEvent.change(screen.getByTestId("clearance-reject-reason"), {
      target: { value: "Needs a clearer scan." },
    })

    fire(() =>
      ctrl.emit("clearance", {
        employee,
        clearance: record({ status: "actionRequired" }),
      }),
    )

    expect(screen.getByTestId("clearance-reject-stale")).toBeInTheDocument()
    expect(screen.getByTestId("clearance-reject-submit")).toBeDisabled()
    fireEvent.click(screen.getByTestId("clearance-reject-submit"))
    expect(rejectMock).not.toHaveBeenCalled()
  })

  it("invalidates an open verification when the stream becomes stale", () => {
    renderDetail()
    emitReady()
    fireEvent.click(screen.getByTestId("clearance-verify-open"))

    fire(() =>
      ctrl.fail("clearance", Object.assign(new Error("offline"), { code: "unavailable" })),
    )

    expect(screen.getByTestId("clearance-verify-stale")).toBeInTheDocument()
    expect(screen.queryByTestId("mock-signature-confirm")).toBeNull()
    expect(verifyMock).not.toHaveBeenCalled()
  })

  it("invalidates an open verification when the employee is deactivated", () => {
    renderDetail()
    emitReady()
    fireEvent.click(screen.getByTestId("clearance-verify-open"))

    fire(() =>
      ctrl.emit("employee", {
        employee: { ...employee, isActive: false },
        clearance: null,
      }),
    )

    expect(screen.getByTestId("clearance-employee-inactive")).toBeInTheDocument()
    expect(screen.queryByTestId("mock-signature-confirm")).toBeNull()
    expect(screen.queryByTestId("clearance-verify-open")).toBeNull()
    expect(verifyMock).not.toHaveBeenCalled()
  })

  it("ignores a second decision while the first action is still running", async () => {
    let release: (() => void) | undefined
    verifyMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        }),
    )
    renderDetail()
    emitReady()
    fireEvent.click(screen.getByTestId("clearance-verify-open"))
    const confirm = screen.getByTestId("mock-signature-confirm")

    fireEvent.click(confirm)
    fireEvent.click(confirm)

    expect(verifyMock).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId("clearance-action-error")).toHaveTextContent(
      /still running/i,
    )

    await act(async () => {
      release?.()
    })
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/dashboard/verify"))
  })
})
