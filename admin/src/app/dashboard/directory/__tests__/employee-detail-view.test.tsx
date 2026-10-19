// @vitest-environment jsdom
/**
 * EmployeeDetail view tests. Streams are mocked at module level (keeping a
 * REAL LiveStreamEngine controller per stream) and the employee actions are
 * mocked — state transitions (connecting → ready/error, retained stale
 * content, dialog staleness) must come from actual render cycles.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"

import * as streams from "@/lib/admin/dashboard-streams"
import * as detailStreams from "@/lib/admin/employee-detail-streams"
import type { AdminEmployeeProgress } from "@/lib/admin/dashboard-models"
import * as actions from "@/lib/admin/employee-actions"

import { EmployeeDetailView } from "@/app/dashboard/directory/[employeeId]/employee-detail-view"

vi.mock("@/lib/admin/dashboard-streams", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/dashboard-streams")>()
  return {
    ...actual,
    subscribeAdminEmployeesProgress: vi.fn(),
  }
})

vi.mock("@/lib/admin/employee-detail-streams", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/employee-detail-streams")>()
  return {
    ...actual,
    subscribeEmployeeDetail: vi.fn(),
    EMPTY_DETAIL: actual.EMPTY_DETAIL,
  }
})

vi.mock("@/lib/admin/employee-actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/employee-actions")>()
  void actual
  return {
    ...actual,
    completeEmployeeSetup: vi.fn(),
    updateEmployee: vi.fn(),
    deactivateEmployee: vi.fn(),
  }
})

const progressSub = vi.mocked(streams.subscribeAdminEmployeesProgress)
const detailSub = vi.mocked(detailStreams.subscribeEmployeeDetail)
const updateEmployeeMock = vi.mocked(actions.updateEmployee)
const deactivateEmployeeMock = vi.mocked(actions.deactivateEmployee)
const completeSetupMock = vi.mocked(actions.completeEmployeeSetup)

const HOUR = 60 * 60 * 1000

const employee = (overrides: Partial<AdminEmployeeProgress>): AdminEmployeeProgress => ({
  uid: "e1",
  name: "Ahmad Raza",
  email: "ahmad@bhmh.dev",
  overallProgress: 0.5,
  onboardingProgress: 0.4,
  trainingProgress: 0.6,
  clearanceProgress: 0.25,
  lastLogin: new Date(Date.now() - 2 * HOUR),
  isActive: true,
  setupStatus: "complete",
  ...overrides,
})

type DetailCtrl = Parameters<typeof detailStreams.subscribeEmployeeDetail>[1]

let employeesCtrl: Parameters<typeof streams.subscribeAdminEmployeesProgress>[1]
let detailCtrl: DetailCtrl

beforeEach(() => {
  vi.clearAllMocks()
  progressSub.mockImplementation((_adminId, ctrl) => {
    ctrl.listen("users")
    employeesCtrl = ctrl
    return vi.fn()
  })
  detailSub.mockImplementation((_employeeId, ctrl: DetailCtrl) => {
    ctrl.listen("onboardingTasks")
    ctrl.listen("trainings")
    ctrl.listen("clearance")
    detailCtrl = ctrl
    return vi.fn()
  })
  updateEmployeeMock.mockResolvedValue()
  deactivateEmployeeMock.mockResolvedValue()
  completeSetupMock.mockResolvedValue({
    created: 61,
    overlaid: 0,
    removed: 0,
    retainedLegacy: [],
  })
})

afterEach(() => {
  cleanup()
})

function fire(emit: () => void): void {
  act(emit)
}

function renderDetail() {
  render(<EmployeeDetailView employeeId="e1" adminUid="adm-1" adminEmail="admin@bhmh.dev" />)
}

/** The real builder emits the FULL merged snapshot per listener id; the
 * fake mirrors that contract from the test side. */
const latestDetail: detailStreams.EmployeeDetailSnapshot = { tasks: [], trainings: [], clearances: [] }

function emitModule(
  id: "onboardingTasks" | "trainings" | "clearance",
  docs: Array<{ id: string; data: Record<string, unknown> }>,
): void {
  if (id === "onboardingTasks") {
    latestDetail.tasks = docs.map((doc) => detailStreams.mapTaskDoc(doc.id, doc.data))
  } else if (id === "trainings") {
    latestDetail.trainings = docs.map((doc) => detailStreams.mapTrainingDoc(doc.id, doc.data))
  } else {
    latestDetail.clearances = docs.map((doc) => detailStreams.mapClearanceDoc(doc.id, doc.data))
  }
  fire(() => detailCtrl.emit(id, { ...latestDetail }))
}

function emitReadyDetail(
  tasks: Array<{ id: string; data: Record<string, unknown> }> = [],
  trainings: Array<{ id: string; data: Record<string, unknown> }> = [],
  clearances: Array<{ id: string; data: Record<string, unknown> }> = [],
): void {
  latestDetail.tasks = []
  latestDetail.trainings = []
  latestDetail.clearances = []
  emitModule("onboardingTasks", tasks)
  emitModule("trainings", trainings)
  emitModule("clearance", clearances)
}

describe("EmployeeDetailView — anatomy", () => {
  it("subscribes to the admin progress stream AND the employee detail modules", () => {
    renderDetail()
    expect(progressSub).toHaveBeenCalledWith("adm-1", expect.anything())
    expect(detailSub).toHaveBeenCalledWith("e1", expect.anything())
    // Connecting: profile skeleton + compliance skeleton visible.
    expect(screen.getAllByTestId("detail-skeleton").length).toBeGreaterThan(0)
  })

  it("renders the Dart 7 categories as section blocks once ready", () => {
    renderDetail()
    fire(() => employeesCtrl.emit("users", [employee({})]))
    emitReadyDetail([
      { id: "signed_offer_letter", data: { title: "X", status: "verified" } },
      { id: "resume", data: { title: "Resume", status: "inProgress" } },
    ])

    expect(screen.getByTestId("profile-header")).toBeInTheDocument()
    expect(screen.getByText("Employee Profile Detail")).toBeInTheDocument()
    expect(screen.getByText("Compliance Categories")).toBeInTheDocument()
    for (const catId of [
      "employment_acceptance",
      "hr_documentation",
      "professional_documentation",
      "orientation",
      "competency_forms",
      "training_compliance",
      "clearance",
    ]) {
      expect(screen.getByTestId(`category-${catId}`)).toBeInTheDocument()
    }
    // Dart quirk visible: per-category "x of y completed" subtitles.
    expect(screen.getByText("1 of 3 completed")).toBeInTheDocument()
    const banner = screen.getByTestId("task-progress-banner")
    expect(banner).toHaveTextContent("Completed")
    expect(banner).toHaveTextContent("Remaining")
    // 59 rendered tasks, 1 verified → 58 remaining (Dart formula).
    expect(banner).toHaveTextContent("58")
  })

  it("a buggy doc title is guarded by the template merge", () => {
    renderDetail()
    fire(() => employeesCtrl.emit("users", [employee({})]))
    emitReadyDetail([
      { id: "drive_r_s_verification", data: {} },
    ])

    const firstTile = screen.getAllByTestId("task-tile")[0]
    expect(firstTile).toHaveTextContent("Onboarding Acknowledgment form")
    expect(firstTile).toHaveTextContent("Awaiting Submission")
  })

  it("task tiles show Dart status text and done checks", () => {
    renderDetail()
    fire(() => employeesCtrl.emit("users", [employee({})]))
    emitReadyDetail([
      { id: "signed_offer_letter", data: { title: "Signed offer letter", status: "verified" } },
      { id: "resume", data: { title: "Resume", status: "submitted" } },
    ])

    const tiles = screen.getAllByTestId("task-tile")
    const offerTile = tiles.find((tile) => tile.textContent?.includes("Signed offer letter"))!
    const resumeTile = tiles.find((tile) => tile.textContent?.includes("Resume"))!
    expect(offerTile).toHaveTextContent("Verified")
    expect(resumeTile).toHaveTextContent("Pending Review")
  })
})

describe("EmployeeDetailView — header actions", () => {
  async function open_edit() {
    renderDetail()
    fire(() => employeesCtrl.emit("users", [employee({})]))
    emitReadyDetail([])
    fireEvent.click(screen.getByRole("button", { name: "Edit Profile" }))
    await screen.findByTestId("edit-employee-dialog")
  }

  it("edit dialog updates name/email through the transactional action", async () => {
    await open_edit()
    fireEvent.input(screen.getByLabelText("Full Name"), { target: { value: "Ahmad Updated" } })
    fireEvent.input(screen.getByLabelText("Email Address"), { target: { value: "new@bhmh.dev" } })
    fireEvent.submit(screen.getByTestId("edit-employee-form"))

    await vi.waitFor(() => {
      expect(updateEmployeeMock).toHaveBeenCalledWith({
        uid: "e1",
        name: "Ahmad Updated",
        email: "new@bhmh.dev",
      })
      expect(screen.queryByTestId("edit-employee-dialog")).not.toBeInTheDocument()
    })
  })

  it("edit validation errors stay inside the dialog", async () => {
    await open_edit()
    // Dart order: name first.
    fireEvent.input(screen.getByLabelText("Full Name"), { target: { value: "Ahmad Updated" } })
    fireEvent.input(screen.getByLabelText("Email Address"), { target: { value: "nope" } })
    fireEvent.submit(screen.getByTestId("edit-employee-form"))

    await vi.waitFor(() => {
      expect(screen.getByText("Invalid email format")).toBeInTheDocument()
    })
    expect(updateEmployeeMock).not.toHaveBeenCalled()
  })

  it("a mid-edit deactivation closes the form REACTIVELY with a dismissible notice", async () => {
    await open_edit()

    // The live stream reports the employee deactivated.
    fire(() =>
      employeesCtrl.emit("users", [employee({ isActive: false })]),
    )

    await vi.waitFor(() => {
      expect(screen.queryByTestId("edit-employee-dialog")).not.toBeInTheDocument()
      expect(screen.getByTestId("stale-edit-notice")).toBeInTheDocument()
    })
    expect(updateEmployeeMock).not.toHaveBeenCalled()
  })

  it("deactivate confirm soft-deletes through the action", async () => {
    renderDetail()
    fire(() => employeesCtrl.emit("users", [employee({})]))
    emitReadyDetail([])
    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }))
    fireEvent.click(await screen.findByRole("button", { name: "Deactivate" }))

    await vi.waitFor(() => {
      expect(deactivateEmployeeMock).toHaveBeenCalledWith("e1")
      expect(screen.queryByTestId("deactivate-dialog")).not.toBeInTheDocument()
    })
  })

  it("deactivated employees show the Inactive badge and no edit/deactivate actions", () => {
    renderDetail()
    fire(() => employeesCtrl.emit("users", [employee({ isActive: false })]))
    emitReadyDetail([])

    expect(screen.getByTestId("profile-header")).toHaveTextContent("Inactive")
    expect(screen.queryByRole("button", { name: "Edit Profile" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Deactivate" })).not.toBeInTheDocument()
  })
})

describe("EmployeeDetailView — durable setup recovery", () => {
  it("an incomplete setup shows the recovery banner and completes setup for the SAME uid", async () => {
    renderDetail()
    fire(() => employeesCtrl.emit("users", [employee({ setupStatus: "incomplete" })]))
    emitReadyDetail()

    const banner = screen.getByTestId("detail-setup-incomplete")
    expect(banner).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Complete setup" }))

    await vi.waitFor(() => {
      expect(completeSetupMock).toHaveBeenCalledWith({ uid: "e1", adminUid: "adm-1" })
      // The badge lives on the stream — once provisioning flips setupStatus,
      // a fresh snapshot clears the banner (no client-side hiding).
      fire(() => employeesCtrl.emit("users", [employee({ setupStatus: "complete" })]))
      expect(screen.queryByTestId("detail-setup-incomplete")).not.toBeInTheDocument()
    })
  })

  it("a failed recovery surfaces an actionable retry banner without hiding anything", async () => {
    completeSetupMock.mockRejectedValue(
      new actions.EmployeeActionError("permission-denied", "permission-denied"),
    )
    renderDetail()
    fire(() => employeesCtrl.emit("users", [employee({ setupStatus: "incomplete" })]))
    emitReadyDetail()

    fireEvent.click(screen.getByRole("button", { name: "Complete setup" }))

    const retryError = await screen.findByTestId("detail-setup-retry-error")
    expect(retryError).toHaveTextContent("Completing setup failed: permission-denied")
    expect(screen.getByTestId("detail-setup-incomplete")).toBeInTheDocument()
  })
})

describe("EmployeeDetailView — error/empty semantics", () => {
  it("profile ready but the compliance modules failed: banner + retry, no false empty", async () => {
    renderDetail()
    fire(() => employeesCtrl.emit("users", [employee({})]))
    fire(() => detailCtrl.fail("onboardingTasks", Object.assign(new Error("transport broken"), { code: "unavailable" })))
    fire(() => detailCtrl.emit("trainings", detailStreams.EMPTY_DETAIL))
    fire(() => detailCtrl.emit("clearance", detailStreams.EMPTY_DETAIL))

    // Since one stream errored, the page never claims "No compliance requirements found."
    expect(screen.queryByTestId("no-requirements")).not.toBeInTheDocument()
    await screen.findByText(/could not be streamed/)
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument()
    // The FAILED module's template rows are never fabricated as progress:
    // its categories vanish, while successfully loaded modules still show
    // their (empty) template rows — labelled stale.
    expect(screen.queryByTestId("category-competency_forms")).not.toBeInTheDocument()
    expect(screen.getByTestId("category-training_compliance")).toBeInTheDocument()
    expect(await screen.findByTestId("compliance-stale-note")).toBeInTheDocument()
  })

  it("ready + a fresh employee (zero document modules) renders the full Dart default checklist", () => {
    renderDetail()
    fire(() => employeesCtrl.emit("users", [employee({})]))
    emitReadyDetail([])

    // Dart parity: the 46/19/4 templates render as notStarted defaults even
    // though no docs exist in Firestore — a merged empty read is NOT an
    // empty compliance state.
    expect(screen.getAllByTestId("task-tile")).toHaveLength(59)
    const banner = screen.getByTestId("task-progress-banner")
    expect(banner).toHaveTextContent("Completed")
    expect(banner).toHaveTextContent("0")
    expect(banner).toHaveTextContent("59")
    expect(screen.queryByTestId("no-requirements")).not.toBeInTheDocument()
  })

  it("compliance failure with retained data keeps the stale list labelled stale", async () => {
    renderDetail()
    fire(() => employeesCtrl.emit("users", [employee({})]))
    emitReadyDetail([{ id: "resume", data: { title: "Resume", status: "submitted" } }])

    fire(() =>
      detailCtrl.fail("onboardingTasks", Object.assign(new Error("down"), { code: "unavailable" })),
    )
    fire(() => detailCtrl.emit("trainings", detailStreams.EMPTY_DETAIL))
    fire(() => detailCtrl.emit("clearance", detailStreams.EMPTY_DETAIL))

    expect(await screen.findByTestId("compliance-stale-note")).toBeInTheDocument()
    expect(screen.getAllByTestId("task-tile").length).toBeGreaterThan(0)
    expect(screen.getByTestId("task-progress-banner")).toBeInTheDocument()
  })

  it("an unknown uid (ready read, employee absent) shows the not-found panel", () => {
    renderDetail()
    fire(() => employeesCtrl.emit("users", []))
    emitReadyDetail([])

    expect(screen.getByTestId("employee-not-found")).toBeInTheDocument()
    expect(screen.getByText("Employee not found")).toBeInTheDocument()
  })
})
