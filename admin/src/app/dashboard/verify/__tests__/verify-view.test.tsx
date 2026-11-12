// @vitest-environment jsdom
/**
 * Verify list — explicit live-state behavior.
 *
 * The stream builder is mocked so each test can control readiness, failure
 * and retained data. The real clearance models are used, so counters, links
 * and recent approvals are computed exactly as in production.
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

import * as streams from "@/lib/admin/clearance-streams"
import type { ClearanceRecord } from "@/lib/admin/clearance-models"

import { VerifyView } from "@/app/dashboard/verify/verify-view"

vi.mock("@/lib/admin/clearance-streams", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/clearance-streams")>()
  return {
    ...actual,
    subscribeAdminClearances: vi.fn(),
  }
})

const subscribe = vi.mocked(streams.subscribeAdminClearances)
type ClearanceCtrl = Parameters<typeof streams.subscribeAdminClearances>[1]

let ctrl: ClearanceCtrl
const HOUR = 60 * 60 * 1000
const NOW = Date.now()

const fire = (callback: () => void) => act(callback)

function record(overrides: Partial<ClearanceRecord> = {}): ClearanceRecord {
  return {
    id: "clearance-1",
    employeeId: "emp-1",
    employeeName: "Sara Khan",
    adminId: "adm-1",
    title: "Background Check",
    description: "",
    status: "underReview",
    fileUrl: null,
    rejectionReason: null,
    dueDate: null,
    submittedAt: new Date(NOW - 3 * 24 * HOUR),
    verifiedAt: null,
    updatedAt: new Date(NOW - 2 * HOUR),
    revision: "rev-1",
    ...overrides,
  }
}

function storeError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code })
}

function renderVerify() {
  return render(<VerifyView adminUid="adm-1" adminEmail="admin@staffrail.test" />)
}

beforeEach(() => {
  vi.clearAllMocks()
  subscribe.mockImplementation((_adminUid, controller) => {
    ctrl = controller
    ctrl.listen("clearances")
    return vi.fn()
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("VerifyView — connecting", () => {
  it("subscribes for the signed-in admin and never fabricates zeros", () => {
    renderVerify()

    expect(subscribe).toHaveBeenCalledWith("adm-1", expect.anything())
    expect(screen.getByTestId("verify-stat-pending-value").textContent).toBe("—")
    expect(screen.getByTestId("verify-stat-verified-value").textContent).toBe("—")
    expect(screen.getByTestId("verify-stat-action-value").textContent).toBe("—")
    expect(screen.getByText("Loading clearances…")).toBeInTheDocument()
    expect(screen.queryByTestId("verify-actions-empty")).toBeNull()
    expect(screen.queryByTestId("verify-recent-empty")).toBeNull()
  })
})

describe("VerifyView — ready data", () => {
  it("shows counters, the pending-review queue, overview and recent approvals", () => {
    renderVerify()

    fire(() =>
      ctrl.emit("clearances", [
        record({
          id: "newer",
          employeeId: "emp-2",
          employeeName: "Omar Ali",
          title: "Drug Screen",
          updatedAt: new Date(NOW - 30 * 60 * 1000),
        }),
        record({ id: "older", employeeId: "emp-1", title: "Background Check" }),
        record({
          id: "verified-1",
          employeeId: "emp-3",
          employeeName: "Lina Noor",
          status: "verified",
          verifiedAt: new Date(NOW - HOUR),
        }),
        record({
          id: "verified-2",
          employeeId: "emp-3",
          employeeName: "Lina Noor",
          status: "verified",
          verifiedAt: new Date(NOW - 2 * HOUR),
        }),
        record({ id: "rejected", employeeId: "emp-4", status: "actionRequired" }),
        record({ id: "expired", employeeId: "emp-5", status: "expired" }),
      ]),
    )

    expect(screen.getByTestId("verify-stat-pending-value").textContent).toBe("2")
    expect(screen.getByTestId("verify-stat-verified-value").textContent).toBe("2")
    expect(screen.getByTestId("verify-stat-action-value").textContent).toBe("2")
    expect(screen.getByText("6 clearance records across your staff.")).toBeInTheDocument()

    const links = screen.getAllByTestId("verify-action-link")
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute("href", "/dashboard/verify/emp-2/newer")
    expect(links[1]).toHaveAttribute("href", "/dashboard/verify/emp-1/older")
    expect(screen.queryByTestId("verify-actions-empty")).toBeNull()

    expect(screen.getByTestId("verify-recent-avatars")).toHaveTextContent("LN")
    expect(screen.queryByTestId("verify-recent-empty")).toBeNull()
  })

  it("shows genuine empty states only after a successful read", () => {
    renderVerify()
    fire(() => ctrl.emit("clearances", []))

    expect(screen.getByTestId("verify-stat-pending-value").textContent).toBe("0")
    expect(screen.getByTestId("verify-actions-empty")).toHaveTextContent(
      "No clearances pending review.",
    )
    expect(screen.getByTestId("verify-recent-empty")).toHaveTextContent(
      "No recent approvals to show.",
    )
    expect(screen.getByText("0 clearance records across your staff.")).toBeInTheDocument()
  })
})

describe("VerifyView — error and retained states", () => {
  it("shows the error banner, keeps values unloaded and retries", async () => {
    renderVerify()
    fire(() =>
      ctrl.fail("clearances", storeError("listener failed", "unavailable")),
    )

    expect(screen.getByTestId("verify-clearances-error")).toHaveTextContent(
      "Clearance records could not be streamed.",
    )
    expect(screen.getByTestId("verify-stat-pending-value").textContent).toBe("—")
    expect(screen.queryByTestId("verify-actions-empty")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: /retry/i }))
    await waitFor(() => expect(subscribe).toHaveBeenCalledTimes(2))
  })

  it("labels retained rows stale and keeps them visible", () => {
    renderVerify()
    fire(() => ctrl.emit("clearances", [record()]))
    fire(() => ctrl.fail("clearances", storeError("connection lost", "unavailable")))

    expect(screen.getByTestId("verify-stale-note")).toHaveTextContent("Stale")
    expect(screen.getByTestId("verify-clearances-error")).toHaveTextContent("stale")
    expect(screen.getByTestId("verify-stat-pending-value").textContent).toBe("1")
    expect(screen.getAllByTestId("verify-action-link")).toHaveLength(1)
    expect(screen.queryByTestId("verify-actions-empty")).toBeNull()
  })

  it("keeps a retained empty list empty and explicitly stale", () => {
    renderVerify()
    fire(() => ctrl.emit("clearances", []))
    fire(() => ctrl.fail("clearances", storeError("connection lost", "unavailable")))

    expect(screen.getByTestId("verify-actions-empty")).toHaveTextContent(
      "No clearances pending review.",
    )
    expect(screen.getByTestId("verify-actions-empty")).toHaveTextContent(
      "Stale — retained from the last successful read.",
    )
  })

  it("explains a missing collection-group index instead of showing zeros", () => {
    renderVerify()
    fire(() =>
      ctrl.fail(
        "clearances",
        storeError("The query requires an index.", "failed-precondition"),
      ),
    )

    expect(screen.getByTestId("verify-clearances-error")).toHaveTextContent(
      "Missing query index.",
    )
    expect(screen.getByTestId("verify-clearances-error")).toHaveTextContent(
      "clearance.adminId",
    )
    expect(screen.queryByTestId("verify-actions-empty")).toBeNull()
  })
})

describe("VerifyView — malformed records", () => {
  it("keeps an unlinked pending record visible but blocks review", () => {
    renderVerify()
    fire(() =>
      ctrl.emit("clearances", [
        record({ employeeId: null, title: "Orphaned Clearance" }),
      ]),
    )

    expect(screen.getByTestId("verify-action-blocked")).toHaveTextContent(
      "Orphaned Clearance",
    )
    expect(screen.queryByTestId("verify-action-link")).toBeNull()
  })
})
