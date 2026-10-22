// @vitest-environment jsdom
/**
 * Training screen — live-state behavior and the create/assign/report flows.
 *
 * The stream builders are mocked so each test controls readiness, failure and
 * retained data exactly. The pure mappers/derivations are NOT mocked; the
 * component receives real models and computes the same counters as
 * production.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"

import * as streams from "@/lib/admin/training-streams"
import * as actions from "@/lib/admin/training-actions"
import type {
  AdminTrainingTemplate,
  TrainingAssignment,
  TrainingStaffMember,
} from "@/lib/admin/training-models"
import { EmployeeActionError } from "@/lib/admin/employee-actions"

import { TrainingView } from "@/app/dashboard/training/training-view"

vi.mock("@/lib/admin/training-streams", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/training-streams")>()
  return {
    ...actual,
    subscribeTrainingTemplates: vi.fn(),
    subscribeTrainingAssignments: vi.fn(),
    subscribeTrainingStaff: vi.fn(),
  }
})

vi.mock("@/lib/admin/training-actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/training-actions")>()
  return {
    ...actual,
    createTrainingTemplate: vi.fn(),
    assignTraining: vi.fn(),
  }
})

const templatesSub = vi.mocked(streams.subscribeTrainingTemplates)
const assignmentsSub = vi.mocked(streams.subscribeTrainingAssignments)
const staffSub = vi.mocked(streams.subscribeTrainingStaff)
const createMock = vi.mocked(actions.createTrainingTemplate)
const assignMock = vi.mocked(actions.assignTraining)

type TemplateCtrl = Parameters<typeof streams.subscribeTrainingTemplates>[1]
type AssignmentsCtrl = Parameters<typeof streams.subscribeTrainingAssignments>[1]
type StaffCtrl = Parameters<typeof streams.subscribeTrainingStaff>[1]

let templatesCtrl: TemplateCtrl
let assignmentsCtrl: AssignmentsCtrl
let staffCtrl: StaffCtrl

const template = (overrides: Partial<AdminTrainingTemplate> = {}): AdminTrainingTemplate => ({
  id: "cpr",
  title: "CPR",
  description: "Cardiopulmonary resuscitation",
  durationText: "45 mins",
  requirementType: "certificate",
  isActive: true,
  createdAt: new Date("2026-06-01T00:00:00.000Z"),
  updatedAt: null,
  ...overrides,
})

const assignment = (overrides: Partial<TrainingAssignment> = {}): TrainingAssignment => ({
  id: "cpr",
  employeeId: null,
  adminId: "adm-1",
  title: "CPR",
  description: "",
  durationText: "",
  status: "notStarted",
  dueDate: null,
  updatedAt: null,
  assignedAt: null,
  ...overrides,
})

const staff = (overrides: Partial<TrainingStaffMember> = {}): TrainingStaffMember => ({
  uid: "emp-1",
  name: "Sara Khan",
  email: "sara@bhmh.dev",
  isActive: true,
  ...overrides,
})

/** Firing stream callbacks from test code requires act() bookkeeping. */
const fire = (emit: () => void) => act(emit)

function renderTraining() {
  return render(<TrainingView adminUid="adm-1" adminEmail="admin@bhmh.dev" />)
}

/** Ready state for all three sources, with sane defaults. */
function emitReady({
  templates = [template()],
  assignments = [assignment({ status: "completed" })],
  staffMembers = [staff()],
}: {
  templates?: AdminTrainingTemplate[]
  assignments?: TrainingAssignment[]
  staffMembers?: TrainingStaffMember[]
} = {}) {
  fire(() => templatesCtrl.emit("templates", templates))
  fire(() => assignmentsCtrl.emit("assignments", assignments))
  fire(() => staffCtrl.emit("staff", staffMembers))
}

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()

  templatesSub.mockImplementation((_adminUid, ctrl) => {
    templatesCtrl = ctrl
    ctrl.listen("templates")
    return vi.fn()
  })
  assignmentsSub.mockImplementation((_adminUid, ctrl) => {
    assignmentsCtrl = ctrl
    ctrl.listen("assignments")
    return vi.fn()
  })
  staffSub.mockImplementation((_adminUid, ctrl) => {
    staffCtrl = ctrl
    ctrl.listen("staff")
    return vi.fn()
  })

  createMock.mockResolvedValue({ id: "new-template" })
  assignMock.mockResolvedValue({ assigned: 1, skippedExisting: 0, skippedInactive: 0 })
})

describe("TrainingView — connecting states", () => {
  it("subscribes with the admin uid and never fabricates zeros while connecting", () => {
    renderTraining()

    expect(templatesSub).toHaveBeenCalledWith("adm-1", expect.anything())
    expect(assignmentsSub).toHaveBeenCalledWith("adm-1", expect.anything())
    expect(staffSub).toHaveBeenCalledWith("adm-1", expect.anything())

    expect(screen.getByTestId("training-stat-total-value").textContent).toBe("—")
    expect(screen.getByTestId("training-stat-compliance-value").textContent).toBe("—")
    expect(screen.getByTestId("training-stat-overdue-value").textContent).toBe("—")
    expect(screen.getByTestId("training-loading").textContent).toContain(
      "Loading training modules",
    )
    // No "empty" claim before the listener delivered.
    expect(screen.queryByTestId("training-empty")).toBeNull()
  })

  it("keeps statistics unloaded when only the template stream delivered", () => {
    renderTraining()
    fire(() => templatesCtrl.emit("templates", [template()]))

    expect(screen.getByTestId("training-stat-total-value").textContent).toBe("—")
    expect(screen.getByTestId("training-template-card")).toBeInTheDocument()
  })
})

describe("TrainingView — ready data", () => {
  it("shows the counters, template completion and both terminal statuses", () => {
    renderTraining()

    emitReady({
      templates: [
        template(),
        template({ id: "hipaa", title: "HIPAA", durationText: "30 mins" }),
      ],
      assignments: [
        assignment({ status: "completed" }),
        assignment({ status: "verified" }),
        assignment({
          id: "hipaa",
          status: "notStarted",
          dueDate: new Date(Date.now() - 86_400_000),
        }),
      ],
    })

    expect(screen.getByTestId("training-stat-total-value").textContent).toBe("2")
    expect(screen.getByTestId("training-stat-compliance-value").textContent).toBe("66.7%")
    expect(screen.getByTestId("training-stat-overdue-value").textContent).toBe("1")

    expect(screen.getByText("2 of 2 staff members completed.")).toBeInTheDocument()
    expect(screen.getAllByTestId("training-template-card")).toHaveLength(2)
    expect(screen.getByTestId("training-quick-info").textContent).toContain("66.7%")
  })

  it("shows a genuine empty state only after the template stream is ready", () => {
    renderTraining()
    emitReady({ templates: [], assignments: [] })

    expect(screen.getByTestId("training-empty").textContent).toContain(
      "No trainings have been created yet.",
    )
    expect(screen.getByTestId("training-stat-total-value").textContent).toBe("0")
  })

  it("surfaces a template stream failure, retains loaded cards and retries", () => {
    renderTraining()
    fire(() => templatesCtrl.emit("templates", [template()]))
    const error = Object.assign(new Error("boom"), { code: "unavailable" })
    fire(() => templatesCtrl.fail("templates", error))

    const banner = screen.getByTestId("training-templates-error")
    expect(banner.textContent).toContain("Training templates could not be streamed.")
    expect(banner.textContent).toContain("unavailable")
    expect(screen.getByText(/Template list is stale/)).toBeInTheDocument()
    expect(screen.getByTestId("training-template-card")).toBeInTheDocument()

    fireEvent.click(within(banner).getByRole("button", { name: /retry/i }))
    expect(templatesSub).toHaveBeenCalledTimes(2)
  })

  it("does not show assignment numbers when only the template source loaded", () => {
    renderTraining()
    fire(() => templatesCtrl.emit("templates", [template()]))

    expect(screen.getByTestId("training-stat-compliance-value").textContent).toBe("—")
    expect(screen.getByText("Waiting for assignment data…")).toBeInTheDocument()
  })
})

describe("TrainingView — create template", () => {
  it("validates required fields before writing", () => {
    renderTraining()
    fireEvent.click(screen.getByTestId("create-template-open"))

    const form = screen.getByTestId("create-template-dialog").querySelector("form")!
    fireEvent.submit(form)

    expect(screen.getByTestId("create-template-error").textContent).toContain(
      "Title is required.",
    )
    expect(createMock).not.toHaveBeenCalled()
  })

  it("publishes the trimmed payload and reports the new template", async () => {
    renderTraining()
    fireEvent.click(screen.getByTestId("create-template-open"))

    fireEvent.change(screen.getByTestId("create-template-title"), {
      target: { value: "  HIPAA 2026 " },
    })
    fireEvent.change(screen.getByTestId("create-template-description"), {
      target: { value: "Annual privacy training" },
    })
    fireEvent.change(screen.getByTestId("create-template-duration"), {
      target: { value: "30 mins" },
    })
    fireEvent.change(screen.getByTestId("create-template-requirement"), {
      target: { value: "acknowledgement" },
    })

    await act(async () => {
      fireEvent.submit(
        screen.getByTestId("create-template-dialog").querySelector("form")!,
      )
    })

    expect(createMock).toHaveBeenCalledWith({
      adminUid: "adm-1",
      title: "  HIPAA 2026 ",
      description: "Annual privacy training",
      durationText: "30 mins",
      requirementType: "acknowledgement",
    })
    expect(screen.getByTestId("training-flash").textContent).toContain(
      "“HIPAA 2026” was published.",
    )
  })

  it("keeps the dialog open and shows actionable write errors", async () => {
    createMock.mockRejectedValue(new EmployeeActionError("Rules rejected the write.", "permission-denied"))
    renderTraining()
    fireEvent.click(screen.getByTestId("create-template-open"))

    fireEvent.change(screen.getByTestId("create-template-title"), {
      target: { value: "HIPAA" },
    })
    fireEvent.change(screen.getByTestId("create-template-description"), {
      target: { value: "Desc" },
    })
    fireEvent.change(screen.getByTestId("create-template-duration"), {
      target: { value: "10 mins" },
    })

    await act(async () => {
      fireEvent.submit(
        screen.getByTestId("create-template-dialog").querySelector("form")!,
      )
    })

    expect(screen.getByTestId("create-template-error").textContent).toContain(
      "Rules rejected the write.",
    )
    expect(screen.getByTestId("create-template-dialog")).toBeInTheDocument()
  })
})

describe("TrainingView — assign training", () => {
  it("disables the action until templates and staff are ready", () => {
    renderTraining()
    fireEvent.click(screen.getByTestId("assign-training-open"))

    const submit = screen.getByTestId("assign-submit")
    expect(submit).toBeDisabled()
    expect(screen.getByTestId("assign-not-ready")).toBeInTheDocument()

    fire(() => templatesCtrl.emit("templates", [template()]))
    expect(submit).toBeDisabled()

    fire(() => staffCtrl.emit("staff", [staff()]))
    expect(submit).toBeDisabled() // template still not selected
  })

  it("assigns to all active staff, excludes inactive staff and reports the result", async () => {
    renderTraining()
    emitReady({
      staffMembers: [staff(), staff({ uid: "emp-2", name: "Old Staff", isActive: false })],
    })

    fireEvent.click(screen.getByTestId("assign-training-open"))
    fireEvent.change(screen.getByTestId("assign-template-select"), {
      target: { value: "cpr" },
    })
    fireEvent.change(screen.getByTestId("assign-deadline"), {
      target: { value: "2026-12-01" },
    })
    fireEvent.change(screen.getByTestId("assign-instructions"), {
      target: { value: "Read first" },
    })

    assignMock.mockResolvedValue({ assigned: 1, skippedExisting: 0, skippedInactive: 1 })

    await act(async () => {
      fireEvent.submit(screen.getByTestId("assign-training-form"))
    })

    const input = assignMock.mock.calls[0][0]
    expect(input).toMatchObject({
      adminUid: "adm-1",
      templateId: "cpr",
      employeeIds: ["emp-1"],
      instructions: "Read first",
    })
    expect(input.deadline?.getFullYear()).toBe(2026)
    expect(input.deadline?.getMonth()).toBe(11)
    expect(input.deadline?.getDate()).toBe(1)

    const flash = screen.getByTestId("training-flash")
    expect(flash.textContent).toContain("Assigned “CPR” to 1 of 1 selected staff.")
    expect(flash.textContent).toContain("1 inactive employee(s) were excluded.")
  })

  it("supports individual selection, search and disabled inactive rows", async () => {
    renderTraining()
    emitReady({
      staffMembers: [
        staff(),
        staff({ uid: "emp-2", name: "Ahmad Raza", email: "ahmad@bhmh.dev" }),
        staff({ uid: "emp-3", name: "Old Staff", isActive: false }),
      ],
    })

    fireEvent.click(screen.getByTestId("assign-training-open"))
    fireEvent.change(screen.getByTestId("assign-template-select"), {
      target: { value: "cpr" },
    })
    fireEvent.click(screen.getByTestId("assign-individual"))

    expect(screen.getByTestId("assign-employee-emp-3")).toBeDisabled()

    fireEvent.change(screen.getByTestId("assign-search"), {
      target: { value: "ahmad" },
    })
    expect(screen.queryByText("Sara Khan")).toBeNull()
    expect(screen.getByText("Ahmad Raza")).toBeInTheDocument()

    fireEvent.click(screen.getByTestId("assign-employee-emp-2"))
    await act(async () => {
      fireEvent.submit(screen.getByTestId("assign-training-form"))
    })

    expect(assignMock.mock.calls[0][0].employeeIds).toEqual(["emp-2"])
  })

  it("blocks submission when no active employees exist", () => {
    renderTraining()
    emitReady({ staffMembers: [staff({ isActive: false })] })

    fireEvent.click(screen.getByTestId("assign-training-open"))
    fireEvent.change(screen.getByTestId("assign-template-select"), {
      target: { value: "cpr" },
    })

    expect(screen.getByTestId("assign-submit")).toBeDisabled()
    expect(screen.getByText(/0 active/)).toBeInTheDocument()
  })

  it("surfaces a staff stream failure and keeps the action disabled", () => {
    renderTraining()
    fire(() => templatesCtrl.emit("templates", [template()]))
    fire(() => staffCtrl.fail("staff", new Error("staff boom")))

    fireEvent.click(screen.getByTestId("assign-training-open"))
    fireEvent.change(screen.getByTestId("assign-template-select"), {
      target: { value: "cpr" },
    })

    expect(screen.getByTestId("assign-submit")).toBeDisabled()
    expect(screen.getByTestId("assign-staff-error").textContent).toContain(
      "The employee list could not be streamed.",
    )
  })

  it("reports already-assigned employees without claiming a new assignment", async () => {
    renderTraining()
    emitReady()
    assignMock.mockResolvedValue({ assigned: 0, skippedExisting: 1, skippedInactive: 0 })

    fireEvent.click(screen.getByTestId("assign-training-open"))
    fireEvent.change(screen.getByTestId("assign-template-select"), {
      target: { value: "cpr" },
    })

    await act(async () => {
      fireEvent.submit(screen.getByTestId("assign-training-form"))
    })

    const flash = screen.getByTestId("training-flash")
    expect(flash.getAttribute("data-tone")).toBe("warning")
    expect(flash.textContent).toContain("No new assignments were created.")
    expect(flash.textContent).toContain("1 already had this training")
  })
})

describe("TrainingView — compliance report", () => {
  it("shows real completion once assignments are ready", () => {
    renderTraining()
    emitReady({
      templates: [template(), template({ id: "hipaa", title: "HIPAA" })],
      assignments: [
        assignment({ status: "completed" }),
        assignment({ status: "verified" }),
      ],
    })

    fireEvent.click(screen.getByTestId("training-stat-compliance"))

    const dialog = screen.getByTestId("compliance-report-dialog")
    expect(
      within(dialog).getByTestId("compliance-percent-cpr").textContent,
    ).toBe("100.0%")
    expect(
      within(dialog).getByTestId("compliance-percent-hipaa").textContent,
    ).toBe("0.0%")
    expect(within(dialog).getByText("2 of 2 staff members completed.")).toBeInTheDocument()
  })

  it("never prints 0.0% before the assignment stream delivered", () => {
    renderTraining()
    fire(() => templatesCtrl.emit("templates", [template()]))

    fireEvent.click(screen.getByTestId("training-stat-compliance"))

    const dialog = screen.getByTestId("compliance-report-dialog")
    expect(within(dialog).queryByTestId("compliance-percent-cpr")).toBeNull()
    expect(within(dialog).getAllByText("Loading…").length).toBeGreaterThan(0)
    expect(within(dialog).getByText(/Waiting for assignment data/)).toBeInTheDocument()
  })

  it("marks retained progress as stale after an assignment failure", () => {
    renderTraining()
    emitReady()
    fire(() => assignmentsCtrl.fail("assignments", new Error("assignments boom")))

    fireEvent.click(screen.getByTestId("training-stat-overdue"))

    const dialog = screen.getByTestId("compliance-report-dialog")
    expect(within(dialog).getByTestId("compliance-assignments-error").textContent).toContain(
      "stale",
    )
    expect(within(dialog).getByTestId("compliance-percent-cpr").textContent).toBe("100.0%")
  })
})
