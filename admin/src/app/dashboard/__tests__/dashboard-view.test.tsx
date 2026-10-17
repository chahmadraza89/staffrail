// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"

import * as streams from "@/lib/admin/dashboard-streams"
import { DEFAULT_ACTION_TASK_PAGE_SIZE } from "@/lib/admin/dashboard-streams"
import type {
  AdminDashboardStats,
  AdminEmployeeProgress,
  ActionRequiredTask,
} from "@/lib/admin/dashboard-models"
import type { LiveStreamController } from "@/lib/admin/stream-protocol"

import { DashboardView } from "@/app/dashboard/dashboard-view"

vi.mock("@/lib/admin/dashboard-streams", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/dashboard-streams")>()
  return {
    ...actual,
    subscribeAdminDashboardStats: vi.fn(),
    subscribeAdminActionRequiredTasks: vi.fn(),
    subscribeAdminEmployeesProgress: vi.fn(),
  }
})

const statsSub = vi.mocked(streams.subscribeAdminDashboardStats)
const tasksSub = vi.mocked(streams.subscribeAdminActionRequiredTasks)
const progressSub = vi.mocked(streams.subscribeAdminEmployeesProgress)

const INDEX_ERROR = Object.assign(new Error("The query requires an index."), {
  code: "failed-precondition",
})

const overdueTask = (id: string, title = "W-9"): ActionRequiredTask => ({
  id,
  title,
  employeeId: "emp-1",
  employeeName: "Ahmad",
  status: "submitted",
  isCompleted: false,
  dueDate: new Date(Date.now() - 86_400_000),
  updatedAt: new Date(),
  taskSource: "onboarding",
})

/** Actionable (submitted) but due-date-less → never produces an alert. */
const alertlessApproval = (id: string): ActionRequiredTask => ({
  ...overdueTask(id, `Task ${id}`),
  dueDate: null,
})

/** Firing stream callbacks from test code requires act() bookkeeping. */
const fire = (emit: () => void) => {
  act(emit)
}

afterEach(() => {
  cleanup()
})

let statsCtrl: LiveStreamController<AdminDashboardStats>
let tasksCtrl: LiveStreamController<ActionRequiredTask[]>
let employeesCtrl: LiveStreamController<AdminEmployeeProgress[]>
let unsubs: ReturnType<typeof vi.fn>[]

beforeEach(() => {
  vi.clearAllMocks()
  unsubs = []
  const track = () => {
    const unsub = vi.fn()
    unsubs.push(unsub)
    return unsub
  }

  statsSub.mockImplementation((_adminId: string, ctrl: LiveStreamController<AdminDashboardStats>) => {
    statsCtrl = ctrl
    // The mock must mirror the real builder: announce listeners up front so
    // readiness semantics match production (stats needs BOTH listeners).
    ctrl.listen("users")
    ctrl.listen("tasks")
    return track()
  })
  tasksSub.mockImplementation(
    (_adminId: string, _pageSize: number, ctrl: LiveStreamController<ActionRequiredTask[]>) => {
      tasksCtrl = ctrl
      ctrl.listen("tasks")
      return track()
    },
  )
  progressSub.mockImplementation(
    (_adminId: string, ctrl: LiveStreamController<AdminEmployeeProgress[]>) => {
      employeesCtrl = ctrl
      ctrl.listen("users")
      return track()
    },
  )
})

describe("DashboardView — connecting states", () => {
  it("shows placeholders (never zeros that look healthy) before snapshots arrive", () => {
    render(<DashboardView adminUid="adm-1" adminEmail="admin@staffrail.dev" />)

    expect(screen.getAllByText("—")).toHaveLength(3) // three stat counters
    expect(screen.getAllByText("Loading tasks…")).toHaveLength(2) // tiles + alerts
    expect(screen.getByText("Loading employees…")).toBeInTheDocument()

    // Every stream got subscribed with the admin's uid.
    expect(statsSub).toHaveBeenCalledWith("adm-1", expect.anything())
    expect(tasksSub).toHaveBeenCalledWith(
      "adm-1",
      DEFAULT_ACTION_TASK_PAGE_SIZE,
      expect.anything(),
    )
    expect(progressSub).toHaveBeenCalledWith("adm-1", expect.anything())
  })
})

describe("DashboardView — empty vs ready", () => {
  it("shows genuine empty states ONLY after all required listeners delivered", () => {
    render(<DashboardView adminUid="adm-1" adminEmail="admin@staffrail.dev" />)

    // Counters stay dash-formatted while only one of two stream listeners fired.
    fire(() => statsCtrl.emit("users", { onboarding: 0, active: 1, completedToday: 0 }))
    expect(screen.getAllByText("—")).toHaveLength(3)

    fire(() => statsCtrl.emit("tasks", { onboarding: 0, active: 1, completedToday: 0 }))
    expect(screen.getByText("1")).toBeInTheDocument() // active employees

    fire(() => tasksCtrl.emit("tasks", []))
    expect(screen.getByText("All caught up! No actions required.")).toBeInTheDocument()
    expect(
      screen.getByText("No overdue tasks and no signatures waiting for approval."),
    ).toBeInTheDocument()

    fire(() => employeesCtrl.emit("users", []))
    expect(
      screen.getByText("No active employees yet — add them from the Directory."),
    ).toBeInTheDocument()
  })
})

describe("DashboardView — failure surfaces", () => {
  it("a stats listener failure renders a banner with Retry and retained data", () => {
    render(<DashboardView adminUid="adm-1" adminEmail="admin@staffrail.dev" />)

    fire(() => statsCtrl.emit("users", { onboarding: 0, active: 3, completedToday: 0 }))
    fire(() => statsCtrl.fail("tasks", Object.assign(new Error("permission-denied"), { code: "permission-denied" })))

    expect(screen.getByText(/Live dashboard statistics could not be streamed/)).toBeInTheDocument()
    expect(screen.getByText(/\(permission-denied\)/)).toBeInTheDocument()
    // Retained data stays visible (not reset to zeros) while errored.
    expect(screen.getByText("3")).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole("button", { name: /retry/i })[0])
    // After retry the panel goes back to connecting placeholders.
    expect(screen.getAllByText("—")).toHaveLength(3)
    // Previous subscription disposed, a fresh one attached.
    expect(unsubs[0]).toHaveBeenCalledTimes(1)
    expect(statsSub.mock.calls.length).toBe(2)
  })

  it("a missing-index failure on tasks shows an actionable message (not 'all caught up')", () => {
    render(<DashboardView adminUid="adm-1" adminEmail="admin@staffrail.dev" />)

    fire(() => tasksCtrl.emit("tasks", [overdueTask("t1")]))
    fire(() => tasksCtrl.fail("tasks", INDEX_ERROR))

    // Index-aware guidance appears in BOTH task-derived panels.
    expect(screen.getAllByText(/Missing Firestore composite index/)).toHaveLength(2)
    expect(screen.getAllByRole("button", { name: /retry/i }).length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText(/All caught up/i)).not.toBeInTheDocument()
  })

  it("keeps retained employee rows inside a complete table when progress fails", () => {
    render(<DashboardView adminUid="adm-1" adminEmail="admin@staffrail.dev" />)

    const employee: AdminEmployeeProgress = {
      uid: "emp-1",
      name: "Ahmad",
      email: "ahmad@example.com",
      overallProgress: 0.5,
      onboardingProgress: 0.5,
      trainingProgress: 0.5,
      clearanceProgress: 0.5,
      lastLogin: new Date("2026-10-17T12:00:00Z"),
      isActive: true,
    }

    fire(() => employeesCtrl.emit("users", [employee]))
    expect(within(screen.getByRole("table")).getByRole("link", { name: "Ahmad" }))
      .toBeInTheDocument()

    fire(() => employeesCtrl.fail("users", new Error("permission-denied")))

    expect(screen.getByText(/Employee progress could not be streamed/)).toBeInTheDocument()
    expect(screen.getByText(/stale — retained from the last successful update/)).toBeInTheDocument()

    const table = screen.getByRole("table")
    expect(within(table).getByRole("columnheader", { name: "Employee" })).toBeInTheDocument()
    const row = within(table).getByRole("link", { name: "Ahmad" }).closest("tr")
    expect(row?.parentElement?.tagName).toBe("TBODY")
    expect(row?.parentElement?.parentElement).toBe(table)
  })

  it("retained alerts are labeled stale when the task stream fails", () => {
    render(<DashboardView adminUid="adm-1" adminEmail="admin@staffrail.dev" />)

    fire(() => tasksCtrl.emit("tasks", [overdueTask("t1")]))
    expect(screen.getAllByText("W-9")).toHaveLength(2) // tiles + alerts panel
    expect(screen.getByText("Overdue")).toBeInTheDocument()

    fire(() => tasksCtrl.fail("tasks", INDEX_ERROR))
    expect(screen.getAllByText(/stale/i).length).toBeGreaterThanOrEqual(2) // tiles + alerts
    // The alert row itself is retained for context.
    expect(screen.getAllByText("W-9")).toHaveLength(2)
  })
})

describe("DashboardView — compliance stream state", () => {
  it("shows 'Loading tasks…' then the empty text only once complete", () => {
    render(<DashboardView adminUid="adm-1" adminEmail="admin@staffrail.dev" />)

    expect(screen.getAllByText("Loading tasks…").length).toBe(2)
    fire(() => tasksCtrl.emit("tasks", []))
    fire(() => statsCtrl.emit("users", { onboarding: 0, active: 0, completedToday: 0 }))
    fire(() => statsCtrl.emit("tasks", { onboarding: 0, active: 0, completedToday: 0 }))

    expect(screen.queryByText("Loading tasks…")).not.toBeInTheDocument()
    expect(
      screen.getByText("No overdue tasks and no signatures waiting for approval."),
    ).toBeInTheDocument()
  })
})

describe("DashboardView — pagination", () => {
  it("a full page shows a partial count, note, and a working 'Load older approvals' button", () => {
    render(<DashboardView adminUid="adm-1" adminEmail="admin@staffrail.dev" />)

    const fullPage = Array.from({ length: DEFAULT_ACTION_TASK_PAGE_SIZE }, (_, index) =>
      overdueTask(`t-${index}`, `Task ${index}`),
    )
    fire(() => tasksCtrl.emit("tasks", fullPage))
    fire(() => statsCtrl.emit("users", { onboarding: 0, active: 0, completedToday: 0 }))
    fire(() => statsCtrl.emit("tasks", { onboarding: 0, active: 0, completedToday: 0 }))
    fire(() => employeesCtrl.emit("users", []))

    expect(screen.getAllByText(`${DEFAULT_ACTION_TASK_PAGE_SIZE}+`)).toHaveLength(2) // tiles + alerts count
    expect(screen.getByText(/partial — older approvals may exist/i)).toBeInTheDocument()
    // Alerts derived from a full page are labelled as partial too.
    expect(screen.getByText(/not a complete compliance assessment/i)).toBeInTheDocument()

    const oldTasksUnsub = unsubs[1]
    const callsBefore = tasksSub.mock.calls.length

    fireEvent.click(screen.getByRole("button", { name: /load older approvals/i }))

    // Fresh subscription with the grown page size; the old one disposed.
    expect(tasksSub.mock.calls.length).toBe(callsBefore + 1)
    expect(tasksSub.mock.calls.at(-1)?.[1]).toBe(DEFAULT_ACTION_TASK_PAGE_SIZE * 2)
    expect(oldTasksUnsub).toHaveBeenCalledTimes(1)
  })

  it("an empty-but-partial page does NOT claim a complete assessment", () => {
    render(<DashboardView adminUid="adm-1" adminEmail="admin@staffrail.dev" />)

    // Full page of actionable tasks that produce zero alerts.
    const fullPage = Array.from({ length: DEFAULT_ACTION_TASK_PAGE_SIZE }, (_, index) =>
      alertlessApproval(`t-${index}`),
    )
    fire(() => tasksCtrl.emit("tasks", fullPage))

    expect(
      screen.getByText(/No alerts among the loaded actionable tasks/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByText("No overdue tasks and no signatures waiting for approval."),
    ).not.toBeInTheDocument()
  })

  it("a non-full page shows exact counts with no partial labeling", () => {
    render(<DashboardView adminUid="adm-1" adminEmail="admin@staffrail.dev" />)

    fire(() => tasksCtrl.emit("tasks", [overdueTask("t1")]))
    expect(screen.getAllByText("1")).toHaveLength(2) // tiles + alerts counts
    expect(screen.queryByText(`${DEFAULT_ACTION_TASK_PAGE_SIZE}+`)).not.toBeInTheDocument()
    expect(
      screen.queryByText(/not a complete compliance assessment/i),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /load older approvals/i })).not.toBeInTheDocument()
  })
})
