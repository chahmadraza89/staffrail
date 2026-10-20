// @vitest-environment jsdom
/**
 * EmployeeDetailView tests. The subscription builders are mocked at module
 * level while the REAL LiveStreamEngine drives state transitions, so
 * connecting → ready/error behavior, pending/failed/stale module states,
 * retained data and reactive dialogs all come from actual render cycles.
 *
 * The fake `subscribeEmployeeDetail` mirrors the REAL builder contract:
 * it listens "profile" synchronously, attaches the three document modules
 * only when the profile gate reports an active owned employee, and every
 * emit publishes the FULL merged snapshot.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"

import * as streams from "@/lib/admin/dashboard-streams"
import * as detailStreams from "@/lib/admin/employee-detail-streams"
import type { EmployeeProfileDetail } from "@/lib/admin/employee-detail-streams"
import * as actions from "@/lib/admin/employee-actions"

import { EmployeeDetailView } from "@/app/dashboard/directory/[employeeId]/employee-detail-view"

// The workspace-wide progress stream must NEVER be subscribed by the detail
// page (single-employee isolation) — kept as a spy to assert that.
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

const employee = (overrides: Partial<EmployeeProfileDetail> = {}): EmployeeProfileDetail => ({
  uid: "e1",
  name: "Ahmad Raza",
  email: "ahmad@bhmh.dev",
  lastLogin: new Date(2026, 0, 1, 12, 0, 0),
  isActive: true,
  setupStatus: "complete",
  adminId: "adm-1",
  ...overrides,
})

type DetailCtrl = Parameters<typeof detailStreams.subscribeEmployeeDetail>[2]
type ProfileStage = detailStreams.EmployeeDetailStage

let detailCtrl: DetailCtrl | undefined

/** The real builder emits the FULL merged snapshot per listener id; the
 * fake mirrors that contract, including the gate-attach choreography. */
const latestDetail: detailStreams.EmployeeDetailSnapshot = {
  profile: null,
  tasks: [],
  trainings: [],
  clearances: [],
}
let modulesAttached = false

beforeEach(() => {
  vi.clearAllMocks()
  modulesAttached = false
  detailCtrl = undefined
  latestDetail.profile = null
  latestDetail.tasks = []
  latestDetail.trainings = []
  latestDetail.clearances = []

  progressSub.mockImplementation((() => {
    throw new Error("detail page must not subscribe the workspace-wide employees stream")
  }) as unknown as typeof streams.subscribeAdminEmployeesProgress)

  detailSub.mockImplementation((_employeeId, _adminUid, ctrl: DetailCtrl) => {
    ctrl.listen("profile") // the anchor listener attaches synchronously
    detailCtrl = ctrl
    return vi.fn()
  })

  updateEmployeeMock.mockResolvedValue()
  deactivateEmployeeMock.mockResolvedValue()
  completeSetupMock.mockResolvedValue({
    created: 69,
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

function renderDetail(props: { employeeId?: string; adminUid?: string } = {}) {
  render(
    <EmployeeDetailView
      employeeId={props.employeeId ?? "e1"}
      adminUid={props.adminUid ?? "adm-1"}
      adminEmail="admin@bhmh.dev"
    />,
  )
}

/** Emits a profile stage through the gate: modules attach in the SAME
 * synchronous block when (and only when) the gate passes. */
function emitProfileStage(stage: ProfileStage): void {
  latestDetail.profile = stage
  if (stage.state === "active" && !modulesAttached) {
    modulesAttached = true
    detailCtrl!.listen("onboardingTasks")
    detailCtrl!.listen("trainings")
    detailCtrl!.listen("clearance")
  }
  fire(() => detailCtrl!.emit("profile", { ...latestDetail }))
}

function emitModule(
  id: "onboardingTasks" | "trainings" | "clearance",
  docs: Array<{ id: string; data: Record<string, unknown> }>,
): void {
  if (!modulesAttached) {
    throw new Error(`module ${id} emitted while the gate was closed`)
  }
  if (id === "onboardingTasks") {
    latestDetail.tasks = docs.map((doc) => detailStreams.mapTaskDoc(doc.id, doc.data))
  } else if (id === "trainings") {
    latestDetail.trainings = docs.map((doc) => detailStreams.mapTrainingDoc(doc.id, doc.data))
  } else {
    latestDetail.clearances = docs.map((doc) => detailStreams.mapClearanceDoc(doc.id, doc.data))
  }
  fire(() => detailCtrl!.emit(id, { ...latestDetail }))
}

function emitReadyDetail(
  tasks: Array<{ id: string; data: Record<string, unknown> }> = [],
  trainings: Array<{ id: string; data: Record<string, unknown> }> = [],
  clearances: Array<{ id: string; data: Record<string, unknown> }> = [],
): void {
  emitModule("onboardingTasks", tasks)
  emitModule("trainings", trainings)
  emitModule("clearance", clearances)
}

function activeStage(overrides: Partial<EmployeeProfileDetail> = {}): ProfileStage {
  return { state: "active", employee: employee(overrides) }
}

/* ── anatomy / isolation ─────────────────────────────────────────────────── */

describe("EmployeeDetailView — single-employee subscription", () => {
  it("subscribes ONLY to the selected employee (+ admin uid) and never to the workspace", () => {
    renderDetail()

    expect(detailSub).toHaveBeenCalledTimes(1)
    expect(detailSub).toHaveBeenCalledWith("e1", "adm-1", expect.anything())
    expect(progressSub).not.toHaveBeenCalled()

    // Connecting: page skeleton visible, no error, no data claims.
    expect(screen.getAllByTestId("detail-skeleton").length).toBeGreaterThan(0)
    expect(screen.queryByTestId("no-requirements")).not.toBeInTheDocument()
  })

  it("changing employee re-subscribes to the new employee only", () => {
    const { unmount } = render(<EmployeeDetailView employeeId="e5" adminUid="adm-1" adminEmail="a@bhmh.dev" />)
    expect(detailSub).toHaveBeenCalledWith("e5", "adm-1", expect.anything())
    unmount()
    renderDetail()
    expect(detailSub).toHaveBeenCalledWith("e1", "adm-1", expect.anything())
    // Each engine start listens exactly its own profile — no shared state.
    expect(detailSub).toHaveBeenCalledTimes(2)
  })
})

/* ── checklist / progress from shared formulas ───────────────────────────── */

describe("EmployeeDetailView — full 69-requirement compliance view", () => {
  it("renders all 8 sections and the 69 Dart requirements once everything is ready", () => {
    renderDetail()
    emitProfileStage(activeStage())
    emitReadyDetail()

    expect(screen.getByTestId("profile-header")).toBeInTheDocument()
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
    // The fallback group is empty for a fresh employee → not rendered.
    expect(screen.queryByTestId("category-additional_requirements")).not.toBeInTheDocument()
    // No partial/stale labels when everything is ready.
    expect(screen.queryByTestId("progress-partial-note")).not.toBeInTheDocument()
    expect(screen.queryByTestId("progress-overview-partial")).not.toBeInTheDocument()

    // 46 onboarding + 19 training + 4 clearance = 69 visible requirement rows.
    expect(screen.getAllByTestId("task-tile")).toHaveLength(69)
    const banner = screen.getByTestId("task-progress-banner")
    expect(banner).toHaveTextContent("Completed")
    expect(banner).toHaveTextContent("Remaining")
    expect(banner).toHaveTextContent("69")
    expect(screen.queryByTestId("no-requirements")).not.toBeInTheDocument()
  })

  it("custom and retained-legacy records are visible alongside the templates", () => {
    renderDetail()
    emitProfileStage(activeStage())
    emitReadyDetail(
      [{ id: "custom_extra_form", data: { title: "Extra Form", status: "acknowledged" } }],
      [trainingDocRow("start", "completed"), trainingDocRow("custom_module", "pending")],
      [clearanceDocRow("custom_check", "verified")],
    )

    const fallback = screen.getByTestId("category-additional_requirements")
    expect(fallback).toHaveTextContent("Extra Form")
    const trainingRows = screen
      .getByTestId("category-training_compliance")
      .querySelectorAll("[data-testid=task-tile]")
    expect(trainingRows.length).toBe(DEFAULT_TRAININGS_COUNT + 1)
    const clearanceRows = screen.getByTestId("category-clearance").querySelectorAll("[data-testid=task-tile]")
    expect(clearanceRows.length).toBe(4 + 1)
  })

  it("a buggy doc title is guarded by the template merge; tiles show Dart status text", () => {
    renderDetail()
    emitProfileStage(activeStage())
    emitReadyDetail([
      { id: "signed_offer_letter", data: { title: "Signed offer letter", status: "verified" } },
      { id: "resume", data: { title: "Resume", status: "submitted" } },
    ])

    const firstTile = screen.getAllByTestId("task-tile")[0]
    expect(firstTile).toHaveTextContent("Onboarding Acknowledgment form")
    expect(firstTile).toHaveTextContent("Awaiting Submission")

    const tiles = screen.getAllByTestId("task-tile")
    const offerTile = tiles.find((tile) => tile.textContent?.includes("Signed offer letter"))!
    const resumeTile = tiles.find((tile) => tile.textContent?.includes("Resume"))!
    expect(offerTile).toHaveTextContent("Verified")
    expect(resumeTile).toHaveTextContent("Pending Review")
    // Per-category "x of y completed" (Dart quirk visible).
    expect(screen.getByText("1 of 3 completed")).toBeInTheDocument()
  })

  it("progress bars reuse the module snapshots through the shared formulas", () => {
    renderDetail()
    emitProfileStage(activeStage())
    // Dashboard formula: completed isCompleted-flag over tasks whose status
    // is not noActionRequired → 1 of 2 counted onboarding tasks.
    emitReadyDetail(
      [
        { id: "signed_offer_letter", data: { title: "x", status: "verified", isCompleted: true } },
        { id: "resume", data: { title: "y", status: "submitted", isCompleted: false } },
        { id: "attestation_form", data: { title: "z", status: "noActionRequired", isCompleted: true } },
      ],
      [
        trainingDocRow("start", "completed"),
        trainingDocRow("m_e_t", "underReview"),
      ],
      [],
    )
    expect(screen.getByTestId("detail-progress-onboarding")).toHaveTextContent("50%")
    expect(screen.getByTestId("detail-progress-training")).toHaveTextContent("50%")
    // clearance empty → excluded from the overall average: (0.5 + 0.5) / 2
    expect(screen.getByTestId("detail-progress-overall-progress")).toHaveTextContent("50%")
  })
})

const DEFAULT_TRAININGS_COUNT = 19

function trainingDocRow(id: string, status: string): { id: string; data: Record<string, unknown> } {
  return { id, data: { title: id, status } }
}
function clearanceDocRow(id: string, status: string): { id: string; data: Record<string, unknown> } {
  return { id, data: { title: id, status } }
}

/* ── module read states: pending / failed-unavailable / failed-stale ─────── */

describe("EmployeeDetailView — pending vs failed vs stale module states", () => {
  it("pending modules visibly load and never fabricate default rows or counts", () => {
    renderDetail()
    emitProfileStage(activeStage())

    // All three modules pending: loading skeleton, no rows, no banner yet.
    expect(screen.getAllByTestId("compliance-skeleton").length).toBeGreaterThan(0)
    expect(screen.queryByTestId("task-progress-banner")).not.toBeInTheDocument()
    expect(screen.getByTestId("progress-overview-partial")).toBeInTheDocument()

    // One module delivers while the others are still connecting.
    emitModule("onboardingTasks", [
      { id: "signed_offer_letter", data: { title: "x", status: "verified" } },
    ])

    expect(screen.getByTestId("module-pending-note")).toHaveTextContent(
      "Still loading: training records, clearance records",
    )
    expect(screen.getByTestId("progress-partial-note")).toBeInTheDocument()
    // The delivered module's template rows render; pending modules fabricate none.
    expect(screen.getByTestId("category-employment_acceptance")).toBeInTheDocument()
    expect(screen.queryByTestId("category-training_compliance")).not.toBeInTheDocument()
    // Banner counts are partial (only onboarding requirements available).
    const banner = screen.getByTestId("task-progress-banner")
    expect(banner).toHaveTextContent("45") // 46 onboarding rows, 1 done
  })

  it("a failed module that never delivered: actionable error + Retry, no fabricated rows, no false empty", async () => {
    renderDetail()
    emitProfileStage(activeStage())
    emitModule("onboardingTasks", [])
    fire(() =>
      detailCtrl!.fail("trainings", Object.assign(new Error("transport broken"), { code: "unavailable" })),
    )
    emitModule("clearance", [])

    // Error with retry is surfaced for the failed module.
    const errorCard = await screen.findByTestId("live-error-card")
    expect(errorCard).toHaveTextContent(/Failed to stream some compliance requirements/)
    expect(errorCard).toHaveTextContent("training records")
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument()

    // The never-loaded training module fabricates NO 19 defaults…
    expect(screen.queryByTestId("category-training_compliance")).not.toBeInTheDocument()
    // …and the page never claims a genuinely-empty read.
    expect(screen.queryByTestId("no-requirements")).not.toBeInTheDocument()

    // Only ready modules render; counts must be labelled partial.
    expect(screen.getByTestId("progress-partial-note")).toBeInTheDocument()
    expect(screen.queryByTestId("compliance-stale-note")).not.toBeInTheDocument()
    // Retry restarts the subscriptions with fresh state.
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    await vi.waitFor(() => {
      expect(detailSub).toHaveBeenCalledTimes(2)
    })
  })

  it("a failed module with EMPTY retained data has nothing to retain — partial, not stale", () => {
    renderDetail()
    emitProfileStage(activeStage())
    emitReadyDetail() // all modules delivered EMPTY snapshots (19 defaults shown)

    // The trainings listener goes down after its (empty) delivery.
    fire(() => detailCtrl!.fail("trainings", Object.assign(new Error("down"), { code: "unavailable" })))

    // Nothing was retained, so nothing is labelled stale — the module is
    // simply unavailable and counts are partial.
    expect(screen.queryByTestId("compliance-stale-note")).not.toBeInTheDocument()
    expect(screen.queryByTestId("category-training_compliance")).not.toBeInTheDocument()
    // 46 onboarding + 4 clearance template rows remain.
    expect(screen.getAllByTestId("task-tile")).toHaveLength(50)
    expect(screen.getByTestId("live-error-card")).toBeInTheDocument()
    expect(screen.getByTestId("progress-partial-note")).toBeInTheDocument()
  })

  it("a failed module WITH retained rows keeps exactly those rows labelled stale", () => {
    renderDetail()
    emitProfileStage(activeStage())
    emitReadyDetail(
      [],
      [trainingDocRow("start", "completed")],
      [],
    )
    // All 69 were visible from the ready reads (46 + 19 + 4 templates).
    expect(screen.getAllByTestId("task-tile")).toHaveLength(69)

    // Only the trainings listener goes down after delivering its snapshot.
    fire(() => detailCtrl!.fail("trainings", Object.assign(new Error("down"), { code: "unavailable" })))

    // Retained data is shown and labelled — the stale note appears.
    expect(screen.getByTestId("compliance-stale-note")).toBeInTheDocument()
    const trainingCategory = screen.getByTestId("category-training_compliance")
    expect(trainingCategory).toHaveTextContent("Stale")
    const staleChip = screen.getByTestId("category-training_compliance-stale")
    expect(staleChip).toBeInTheDocument()
    // The retained REAL row stays; the other 18 defaults are not refabricated.
    const trainingTiles = screen
      .getByTestId("category-training_compliance")
      .querySelectorAll("[data-testid=task-tile]")
    expect(trainingTiles).toHaveLength(1)
    // 46 onboarding + 1 retained training + 4 clearance.
    expect(screen.getAllByTestId("task-tile")).toHaveLength(51)
    expect(screen.getByTestId("live-error-card")).toBeInTheDocument()
    expect(screen.getByTestId("progress-partial-note")).toBeInTheDocument()
  })

  it("profile failure before its first snapshot shows only the actionable error", () => {
    renderDetail()
    fire(() =>
      detailCtrl!.fail("profile", Object.assign(new Error("auth down"), { code: "unavailable" })),
    )

    const errorCard = screen.getByTestId("live-error-card")
    expect(errorCard).toHaveTextContent("Employee profile could not be streamed.")
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument()
    expect(screen.queryByTestId("profile-header")).not.toBeInTheDocument()
  })

  it("profile failure after loading retains the header flagged stale", () => {
    renderDetail()
    emitProfileStage(activeStage())
    fire(() => detailCtrl!.fail("profile", Object.assign(new Error("offline"), { code: "unavailable" })))

    expect(screen.getByTestId("profile-header-stale")).toBeInTheDocument()
    expect(screen.getByTestId("profile-header-stale")).toHaveTextContent("Ahmad Raza")
    expect(screen.getByTestId("progress-overview")).toBeInTheDocument() // last retained modules remain
  })

  it("profile failure detaches the document modules — a violating employee's data is reset", () => {
    renderDetail()
    emitProfileStage(activeStage())
    emitReadyDetail([{ id: "resume", data: { title: "Resume", status: "verified" } }])

    fire(() => detailCtrl!.fail("profile", new Error("offline")))

    // The engine forgets the module listeners; no retained module data is
    // rendered alongside the error (the header itself stays retained+stale).
    expect(screen.queryByText("1 of 3 completed")).not.toBeInTheDocument()
  })
})

/* ── gate stages ─────────────────────────────────────────────────────────── */

describe("EmployeeDetailView — ownership and existence gates", () => {
  it("a missing employee shows the not-found panel", () => {
    renderDetail()
    emitProfileStage({ state: "not-found" })

    expect(screen.getByTestId("employee-not-found")).toBeInTheDocument()
    expect(screen.getByText("Employee not found")).toBeInTheDocument()
    expect(screen.queryByTestId("profile-header")).not.toBeInTheDocument()
    throwIfModulesAttached()
  })

  it("a foreign or non-employee account shows the not-owned panel", () => {
    renderDetail()
    emitProfileStage({ state: "not-owned" })

    expect(screen.getByTestId("employee-not-owned")).toBeInTheDocument()
    expect(screen.getByText("You do not have access to this employee record.")).toBeInTheDocument()
    expect(screen.queryByTestId("profile-header")).not.toBeInTheDocument()
    throwIfModulesAttached()
  })

  it("an unrelated employee's slow or failed listener cannot affect this page", () => {
    renderDetail()
    emitProfileStage(activeStage())
    emitReadyDetail()

    // Only ONE employee stream exists; the unrelated-employee listeners the
    // old workspace-wide stream created (one per staff member) are gone.
    expect(detailSub).toHaveBeenCalledTimes(1)
    expect(screen.getAllByTestId("task-tile")).toHaveLength(69)
  })
})

/* ── startup failure (synchronous subscription-builder throw) ────────────── */

describe("EmployeeDetailView — synchronous startup failure", () => {
  it("surfaces the *init* error with a working Retry, then recovers on the next attempt", async () => {
    // First subscription attempt throws SYNCHRONOUSLY. The real hook/engine
    // records it under the `*init*` listener — never under "profile".
    detailSub.mockImplementationOnce(() => {
      throw new Error("builder exploded")
    })

    renderDetail()

    // The actionable error + Retry appear; the page does not strand itself
    // on the loading skeleton and never claims an empty compliance state.
    const errorCard = await screen.findByTestId("live-error-card")
    expect(errorCard).toHaveTextContent("Employee profile could not be streamed.")
    expect(errorCard).toHaveTextContent("builder exploded")
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument()
    expect(screen.queryByTestId("detail-skeleton")).not.toBeInTheDocument()
    expect(screen.queryByTestId("compliance-skeleton")).not.toBeInTheDocument()
    expect(screen.queryByTestId("no-requirements")).not.toBeInTheDocument()

    // The NEXT attempt (after Retry) initializes successfully.
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    await vi.waitFor(() => {
      expect(detailSub).toHaveBeenCalledTimes(2)
      expect(detailCtrl).toBeDefined()
    })

    // Deliver the owned profile + all three module snapshots through the
    // real engine; the retained gate/attach choreography stays intact.
    emitProfileStage(activeStage())
    emitReadyDetail()

    // The error clears and the normal detail page renders in full.
    expect(screen.queryByTestId("live-error-card")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument()
    expect(screen.getByTestId("profile-header")).toHaveTextContent("Ahmad Raza")
    expect(screen.getByText("Compliance Categories")).toBeInTheDocument()
    expect(screen.getAllByTestId("task-tile")).toHaveLength(69)
    expect(screen.getByTestId("task-progress-banner")).toHaveTextContent("69")
    expect(screen.queryByTestId("progress-partial-note")).not.toBeInTheDocument()
  })
})

function throwIfModulesAttached(): void {
  if (modulesAttached) {
    throw new Error("document modules attached although the gate never passed")
  }
}

/* ── header actions (unchanged semantics) ────────────────────────────────── */

describe("EmployeeDetailView — header actions", () => {
  async function open_edit() {
    renderDetail()
    emitProfileStage(activeStage())
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

    // The live profile stream reports the employee deactivated.
    emitProfileStage(activeStage({ isActive: false }))

    await vi.waitFor(() => {
      expect(screen.queryByTestId("edit-employee-dialog")).not.toBeInTheDocument()
      expect(screen.getByTestId("stale-edit-notice")).toBeInTheDocument()
    })
    expect(updateEmployeeMock).not.toHaveBeenCalled()
  })

  it("a deletion mid-edit closes the form and reports the employee gone", async () => {
    await open_edit()

    emitProfileStage({ state: "not-found" })

    await vi.waitFor(() => {
      expect(screen.queryByTestId("edit-employee-dialog")).not.toBeInTheDocument()
      expect(screen.getByTestId("employee-not-found")).toBeInTheDocument()
    })
    expect(updateEmployeeMock).not.toHaveBeenCalled()
  })

  it("deactivate confirm soft-deletes through the action", async () => {
    renderDetail()
    emitProfileStage(activeStage())
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
    emitProfileStage(activeStage({ isActive: false }))
    emitReadyDetail([])

    expect(screen.getByTestId("profile-header")).toHaveTextContent("Inactive")
    expect(screen.queryByRole("button", { name: "Edit Profile" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Deactivate" })).not.toBeInTheDocument()
  })
})

/* ── durable setup recovery (unchanged semantics) ────────────────────────── */

describe("EmployeeDetailView — durable setup recovery", () => {
  it("an incomplete setup shows the recovery banner and completes setup for the SAME uid", async () => {
    renderDetail()
    emitProfileStage(activeStage({ setupStatus: "incomplete" }))
    emitReadyDetail()

    const banner = screen.getByTestId("detail-setup-incomplete")
    expect(banner).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Complete setup" }))

    await vi.waitFor(() => {
      expect(completeSetupMock).toHaveBeenCalledWith({ uid: "e1", adminUid: "adm-1" })
      // The badge lives on the stream — once provisioning flips setupStatus,
      // a fresh snapshot clears the banner (no client-side hiding).
      emitProfileStage(activeStage({ setupStatus: "complete" }))
      expect(screen.queryByTestId("detail-setup-incomplete")).not.toBeInTheDocument()
    })
  })

  it("a failed recovery surfaces an actionable retry banner without hiding anything", async () => {
    completeSetupMock.mockRejectedValue(
      new actions.EmployeeActionError("permission-denied", "permission-denied"),
    )
    renderDetail()
    emitProfileStage(activeStage({ setupStatus: "incomplete" }))
    emitReadyDetail()

    fireEvent.click(screen.getByRole("button", { name: "Complete setup" }))

    const retryError = await screen.findByTestId("detail-setup-retry-error")
    expect(retryError).toHaveTextContent("Completing setup failed: permission-denied")
    expect(screen.getByTestId("detail-setup-incomplete")).toBeInTheDocument()
  })
})
