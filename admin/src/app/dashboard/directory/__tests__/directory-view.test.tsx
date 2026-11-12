// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

import * as streams from "@/lib/admin/dashboard-streams"
import type { AdminEmployeeProgress } from "@/lib/admin/dashboard-models"
import * as actions from "@/lib/admin/employee-actions"
import { EmployeeActionError } from "@/lib/admin/employee-actions"

import { DirectoryView } from "@/app/dashboard/directory/directory-view"

vi.mock("@/lib/admin/dashboard-streams", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/dashboard-streams")>()
  return {
    ...actual,
    subscribeAdminEmployeesProgress: vi.fn(),
  }
})

vi.mock("@/lib/admin/employee-actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/employee-actions")>()
  void actual
  return {
    ...actual,
    registerStaff: vi.fn(),
    completeEmployeeSetup: vi.fn(),
    updateEmployee: vi.fn(),
    deactivateEmployee: vi.fn(),
  }
})

const progressSub = vi.mocked(streams.subscribeAdminEmployeesProgress)
const registerStaffMock = vi.mocked(actions.registerStaff)
const completeSetupMock = vi.mocked(actions.completeEmployeeSetup)
const updateEmployeeMock = vi.mocked(actions.updateEmployee)
const deactivateEmployeeMock = vi.mocked(actions.deactivateEmployee)

const HOUR = 60 * 60 * 1000

const employee = (overrides: Partial<AdminEmployeeProgress>): AdminEmployeeProgress => ({
  uid: "e1",
  name: "Alex Rivera",
  email: "alex@staffrail.test",
  overallProgress: 0.1,
  onboardingProgress: 0.1,
  trainingProgress: 0,
  clearanceProgress: 0,
  lastLogin: new Date(Date.now() - 2 * HOUR),
  isActive: true,
  setupStatus: "complete",
  ...overrides,
})

function fire(emit: () => void) {
  act(emit)
}

afterEach(() => {
  cleanup()
})

let employeesCtrl: Parameters<typeof streams.subscribeAdminEmployeesProgress>[1]

beforeEach(() => {
  vi.clearAllMocks()
  progressSub.mockImplementation((_adminId, ctrl) => {
    // Mirror the real builder: the users listener is the anchor.
    ctrl.listen("users")
    employeesCtrl = ctrl
    return vi.fn()
  })
  registerStaffMock.mockResolvedValue({
    uid: "e9",
    resetLink: "https://reset.example",
    setup: "complete",
  })
  completeSetupMock.mockResolvedValue({
    created: 69,
    overlaid: 0,
    removed: 3,
    retainedLegacy: [],
  })
  updateEmployeeMock.mockResolvedValue()
  deactivateEmployeeMock.mockResolvedValue()
})

function renderDirectory() {
  render(<DirectoryView adminUid="adm-1" adminEmail="admin@staffrail.test" />)
}

describe("DirectoryView — live list", () => {
  it("subscribes with the admin uid and shows skeletons while connecting", () => {
    renderDirectory()
    expect(progressSub).toHaveBeenCalledWith("adm-1", expect.anything())
    expect(screen.getAllByTestId("directory-skeleton")).toHaveLength(3)
  })

  it("an empty directory (empty employee list = ready) shows the onboarding empty text", () => {
    renderDirectory()
    fire(() => employeesCtrl.emit("users", []))
    expect(screen.getByText("No employees yet — add your first staff member.")).toBeInTheDocument()
  })

  it("renders live cards with phase, last activity, and progress", () => {
    renderDirectory()
    fire(() =>
      employeesCtrl.emit("users", [
        employee({}),
        employee({
          uid: "e2",
          name: "Sara Khan",
          email: "sara@staffrail.test",
          overallProgress: 1,
          onboardingProgress: 1,
          trainingProgress: 1,
          clearanceProgress: 1,
        }),
      ]),
    )

    expect(screen.getByText("Alex Rivera")).toBeInTheDocument()
    expect(screen.getByText("sara@staffrail.test")).toBeInTheDocument()
    // Initials
    expect(screen.getByText("AR")).toBeInTheDocument()
    expect(screen.getByText("SK")).toBeInTheDocument()
    // Phase texts from thresholds
    expect(screen.getAllByText("Onboarding Phase")).toHaveLength(1)
    expect(screen.getAllByText("Compliant")).toHaveLength(1)
    // Overall progress 10% / 100%
    expect(screen.getByText("10%")).toBeInTheDocument()
    expect(screen.getByText("100%")).toBeInTheDocument()
  })

  it("a stream failure shows the actionable error banner with Retry resubscribe", async () => {
    renderDirectory()
    fire(() => employeesCtrl.fail("users", Object.assign(new Error("boom"), { code: "unavailable" })))

    expect(screen.getByText(/Employee list could not be streamed/)).toBeInTheDocument()
    expect(screen.getByText(/\(boom\)/)).toBeInTheDocument()
    expect(screen.getByText(/\[unavailable\]/)).toBeInTheDocument()

    expect(progressSub).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole("button", { name: /retry/i }))
    expect(progressSub.mock.calls.length).toBe(2)
    await waitFor(() => {
      expect(screen.getAllByTestId("directory-skeleton")).toHaveLength(3)
    })
  })
})

describe("DirectoryView — filters and search", () => {
  it("search narrows by name or email (flutter parity: names first)", () => {
    renderDirectory()
    fire(() =>
      employeesCtrl.emit("users", [
        employee({}),
        employee({ uid: "e2", name: "Sara Khan", email: "sara@staffrail.test" }),
      ]),
    )

    fireEvent.change(screen.getByPlaceholderText("Search employees…"), {
      target: { value: "sara" },
    })
    expect(screen.queryByText("Alex Rivera")).not.toBeInTheDocument()
    expect(screen.getByText("Sara Khan")).toBeInTheDocument()
  })

  it("activated / deactivated / all chips filter the cards", () => {
    renderDirectory()
    fire(() =>
      employeesCtrl.emit("users", [
        employee({}),
        employee({ uid: "e2", name: "Old Staff", isActive: false, overallProgress: 0.5 }),
      ]),
    )

    // Default filter = active: Old Staff hidden.
    expect(screen.queryByText("Old Staff")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Deactivated" }))
    expect(screen.getByText("Old Staff")).toBeInTheDocument()
    expect(screen.queryByText("Alex Rivera")).not.toBeInTheDocument()
    expect(screen.getByText("Deactivated", { selector: "span" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "All" }))
    expect(screen.getByText("Old Staff")).toBeInTheDocument()
    expect(screen.getByText("Alex Rivera")).toBeInTheDocument()
  })

  it("the empty-filter state distinguishes a deactivated-empty directory", () => {
    renderDirectory()
    fire(() => employeesCtrl.emit("users", [employee({})]))
    fireEvent.click(screen.getByRole("button", { name: "Deactivated" }))
    expect(screen.getByText("No deactivated employees.")).toBeInTheDocument()
  })
})

describe("DirectoryView — lifecycle actions", () => {
  it("Add New Staff calls registerStaff with adminUid and shows the reset link once", async () => {
    renderDirectory()
    fire(() => employeesCtrl.emit("users", []))

    fireEvent.click(screen.getByRole("button", { name: /add new staff/i }))
    const dialog = screen.getByTestId("add-employee-dialog")

    fireEvent.change(screen.getByPlaceholderText("Full Name"), {
      target: { value: "New Person" },
    })
    fireEvent.change(screen.getByPlaceholderText("e.g. john@example.com"), {
      target: { value: "new@staffrail.test" },
    })
    fireEvent.submit(dialog.querySelector('form[data-testid="add-employee-form"]')!)

    expect(registerStaffMock).toHaveBeenCalledWith({
      name: "New Person",
      email: "new@staffrail.test",
      adminUid: "adm-1",
    })

    await screen.findByText("Staff Registered")
    expect(screen.getByText("https://reset.example")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument()
  })

  it("client-side validation blocks an invalid email and does not call the action", () => {
    renderDirectory()

    fireEvent.click(screen.getByRole("button", { name: /add new staff/i }))
    fireEvent.change(screen.getByPlaceholderText("Full Name"), {
      target: { value: "New Person" },
    })
    fireEvent.change(screen.getByPlaceholderText("e.g. john@example.com"), {
      target: { value: "not-an-email" },
    })
    const dialog = screen.getByTestId("add-employee-dialog")
    fireEvent.submit(dialog.querySelector('form[data-testid="add-employee-form"]')!)

    expect(screen.getByText("Invalid email format")).toBeInTheDocument()
    expect(registerStaffMock).not.toHaveBeenCalled()
  })

  it("callable failures surface inside the dialog (actionable error text)", async () => {
    registerStaffMock.mockRejectedValue(
      new EmployeeActionError("The email address is already in use by another account.", "already-exists"),
    )
    renderDirectory()

    fireEvent.click(screen.getByRole("button", { name: /add new staff/i }))
    fireEvent.change(screen.getByPlaceholderText("Full Name"), {
      target: { value: "Dup Person" },
    })
    fireEvent.change(screen.getByPlaceholderText("e.g. john@example.com"), {
      target: { value: "dup@staffrail.test" },
    })
    const dialog = screen.getByTestId("add-employee-dialog")
    fireEvent.submit(dialog.querySelector('form[data-testid="add-employee-form"]')!)

    await screen.findByText("The email address is already in use by another account.")
    expect(screen.queryByText("Staff Registered")).not.toBeInTheDocument()
  })

  it("Edit pre-fills fields and updates the employee", async () => {
    renderDirectory()
    fire(() => employeesCtrl.emit("users", [employee({ name: "Old Name", email: "old@staffrail.test" })]))

    fireEvent.click(screen.getAllByRole("button", { name: /edit/i })[0])
    const nameInput = screen.getByLabelText("Full Name") as HTMLInputElement
    expect(nameInput.value).toBe("Old Name")

    expect(screen.getByLabelText("Email Address")).toHaveValue("old@staffrail.test")
    fireEvent.change(nameInput, { target: { value: "Fresh Name" } })
    fireEvent.submit(screen.getByTestId("edit-employee-form"))

    await waitFor(() => {
      expect(updateEmployeeMock).toHaveBeenCalledWith({
        uid: "e1",
        name: "Fresh Name",
        email: "old@staffrail.test",
      })
    })
  })

  it("Deactivate confirms softly and the live stream reflects the result", async () => {
    renderDirectory()
    fire(() => employeesCtrl.emit("users", [employee({})]))

    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }))
    expect(
      await screen.findByText(/will be marked inactive/),
    ).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole("button", { name: /deactivate/i }).at(-1)!)
    await waitFor(() => {
      expect(deactivateEmployeeMock).toHaveBeenCalledWith("e1")
    })

    // The live stream now reports the employee as deactivated → with the
    // default (active) filter the card disappears, and under "Deactivated"
    // it shows the fixed badge instead of the last-activity text.
    fire(() => employeesCtrl.emit("users", [employee({ isActive: false })]))
    expect(screen.queryByText("Alex Rivera")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Deactivated" }))
    expect(screen.getByText("Alex Rivera")).toBeInTheDocument()
    expect(screen.getByText("Deactivated", { selector: "span" })).toBeInTheDocument()
  })
})

describe("DirectoryView — errors are never mislabeled as empty results", () => {
  it("a failed initial read shows an error + Retry and NO empty-state message", () => {
    renderDirectory()
    fire(() =>
      employeesCtrl.fail("users", Object.assign(new Error("offline"), { code: "unavailable" })),
    )

    expect(screen.getByText(/Employee list could not be streamed/)).toBeInTheDocument()
    // "No employees yet…" is reserved for a successful, ready result.
    expect(
      screen.queryByText("No employees yet — add your first staff member."),
    ).not.toBeInTheDocument()
    expect(screen.queryByTestId("directory-stale-note")).not.toBeInTheDocument()
  })

  it("a failed update retains the cards labeled stale — still no empty-state text", () => {
    renderDirectory()
    fire(() => employeesCtrl.emit("users", [employee({})]))
    fire(() =>
      employeesCtrl.fail("users", Object.assign(new Error("offline"), { code: "unavailable" })),
    )

    expect(screen.getByText(/Employee list could not be streamed/)).toBeInTheDocument()
    expect(screen.getByTestId("directory-stale-note")).toBeInTheDocument()
    expect(screen.getByText("Alex Rivera")).toBeInTheDocument()
    expect(
      screen.queryByText("No employees yet — add your first staff member."),
    ).not.toBeInTheDocument()
  })

  it("empty states still render normally after a ready read", () => {
    renderDirectory()
    fire(() => employeesCtrl.emit("users", []))
    expect(
      screen.getByText("No employees yet — add your first staff member."),
    ).toBeInTheDocument()
    expect(screen.queryByTestId("directory-stale-note")).not.toBeInTheDocument ()
  })
})

describe("DirectoryView — durable setup recovery (persisted status)", () => {
  it("shows the card indicator + Complete setup for persisted incomplete status and recovers", async () => {
    renderDirectory()
    // Remount with the DURABLE status (e.g. fresh page load / re-sign-in):
    // recovery must NOT depend on in-memory dialog state.
    fire(() => employeesCtrl.emit("users", [employee({ setupStatus: "incomplete" })]))

    expect(screen.getByTestId("setup-incomplete-e1")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /complete setup/i }))

    await waitFor(() => {
      // Same-uid retry — never a second registration/account.
      expect(completeSetupMock).toHaveBeenCalledWith({ uid: "e1", adminUid: "adm-1" })
    })
    expect(registerStaffMock).not.toHaveBeenCalled()

    // The provisioning transaction flips setupStatus → the live stream
    // re-renders the card without the indicator.
    fire(() => employeesCtrl.emit("users", [employee({})]))
    expect(screen.queryByTestId("setup-incomplete-e1")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /complete setup/i })).not.toBeInTheDocument()
  })

  it("a failed card retry shows the reason clearly and stays recoverable", async () => {
    completeSetupMock.mockRejectedValue(
      new EmployeeActionError("permission-denied on users/e1", "permission-denied"),
    )
    renderDirectory()
    fire(() => employeesCtrl.emit("users", [employee({ setupStatus: "incomplete" })]))

    fireEvent.click(screen.getByRole("button", { name: /complete setup/i }))

    const banner = await screen.findByTestId("setup-retry-error")
    expect(banner).toHaveTextContent(/Completing setup for Alex Rivera failed/)
    expect(banner).toHaveTextContent(/permission-denied on users\/e1/)
    // The indicator remains (not fake-complete) and retry stays available.
    expect(screen.getByTestId("setup-incomplete-e1")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument()
    expect(registerStaffMock).not.toHaveBeenCalled()
  })

  it("closing the registration dialog keeps recovery available via the card", async () => {
    registerStaffMock.mockResolvedValue({
      uid: "e9",
      resetLink: "https://reset.example",
      setup: "incomplete",
      setupError: "quota exceeded",
    })
    renderDirectory()
    fire(() => employeesCtrl.emit("users", []))

    fireEvent.click(screen.getByRole("button", { name: /add new staff/i }))
    fireEvent.change(screen.getByPlaceholderText("Full Name"), {
      target: { value: "Recoverable Person" },
    })
    fireEvent.change(screen.getByPlaceholderText("e.g. john@example.com"), {
      target: { value: "recover@staffrail.test" },
    })
    fireEvent.submit(screen.getByTestId("add-employee-dialog").querySelector('form[data-testid="add-employee-form"]')!)
    await screen.findByTestId("setup-incomplete-warning")

    // Close the dialog — in-memory incomplete state is discarded…
    const dialog = screen.getByTestId("add-employee-dialog")
    fireEvent.click(screen.getAllByRole("button", { name: /^close$/i }).at(-1)!)
    await waitFor(() => {
      expect(dialog).not.toBeInTheDocument()
    })

    // …but the persisted status surfaces on the card (via the live stream).
    fire(() =>
      employeesCtrl.emit("users", [
        employee({ uid: "e9", name: "Recoverable Person", setupStatus: "incomplete" }),
      ]),
    )
    expect(screen.getByTestId("setup-incomplete-e9")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /complete setup/i }))
    completeSetupMock.mockResolvedValue({ created: 65, overlaid: 4, removed: 2, retainedLegacy: [] })
    fireEvent.click(screen.getAllByRole("button", { name: /complete setup/i })[0])
    await waitFor(() => {
      expect(completeSetupMock).toHaveBeenCalledWith({ uid: "e9", adminUid: "adm-1" })
    })
  })
})

describe("DirectoryView — in-dialog setup recovery (incomplete provisioning)", () => {
  function fillAddForm() {
    fireEvent.click(screen.getByRole("button", { name: /add new staff/i }))
    fireEvent.change(screen.getByPlaceholderText("Full Name"), {
      target: { value: "New Person" },
    })
    fireEvent.change(screen.getByPlaceholderText("e.g. john@example.com"), {
      target: { value: "new@staffrail.test" },
    })
    fireEvent.submit(screen.getByTestId("add-employee-dialog").querySelector('form[data-testid="add-employee-form"]')!)
  }

  it("a created account with failed setup shows a warning and retries with the SAME uid", async () => {
    registerStaffMock.mockResolvedValue({
      uid: "e9",
      resetLink: "https://reset.example",
      setup: "incomplete",
      setupError: "permission-denied at users/e9",
    })

    renderDirectory()
    fire(() => employeesCtrl.emit("users", []))
    fillAddForm()

    // Visible, actionable warning — NOT an error-style registration failure.
    expect(await screen.findByTestId("setup-incomplete-warning")).toBeInTheDocument()
    expect(screen.getByText(/permission-denied at users\/e9/)).toBeInTheDocument()
    expect(screen.getAllByText("e9").length).toBeGreaterThan(0)
    // The password-setup link is preserved.
    expect(screen.getByText("https://reset.example")).toBeInTheDocument()
    expect(screen.queryByText("Staff Registered")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /complete setup/i }))

    await screen.findByText("Staff Registered")
    expect(completeSetupMock).toHaveBeenCalledWith({ uid: "e9", adminUid: "adm-1" })
    // Link still shown after recovery.
    expect(screen.getByText("https://reset.example")).toBeInTheDocument()
  })

  it("a failed retry keeps the warning and the link visible for another attempt", async () => {
    registerStaffMock.mockResolvedValue({
      uid: "e9",
      resetLink: "https://reset.example",
      setup: "incomplete",
      setupError: "quota exceeded",
    })
    completeSetupMock.mockRejectedValue(
      new EmployeeActionError("Network request failed", "unavailable"),
    )

    renderDirectory()
    fillAddForm()

    fireEvent.click(await screen.findByRole("button", { name: /complete setup/i }))

    expect(await screen.findByText("Network request failed")).toBeInTheDocument()
    expect(screen.getByTestId("setup-incomplete-warning")).toBeInTheDocument()
    expect(screen.getByText("https://reset.example")).toBeInTheDocument()
  })

  it("retained legacy docs surface as a completion note, not an error", async () => {
    registerStaffMock.mockResolvedValue({
      uid: "e9",
      resetLink: "https://reset.example",
      setup: "complete",
      retainedLegacy: ["onboarding_tasks/employee_handbook"],
    })

    renderDirectory()
    fillAddForm()

    await screen.findByText("Staff Registered")
    expect(
      screen.getByText(
        /pre-registration document kept because they already contain employee progress/,
      ),
    ).toBeInTheDocument()
  })
})

describe("DirectoryView — stale edit forms (races with deactivation)", () => {
  it("deactivation while the dialog is open refreshes: form closes with a visible notice", () => {
    renderDirectory()
    fire(() => employeesCtrl.emit("users", [employee({})]))

    fireEvent.click(screen.getAllByRole("button", { name: /edit/i })[0])
    expect(screen.getByTestId("edit-employee-dialog")).toBeInTheDocument()

    // The live stream reports the deactivation mid-edit.
    fire(() => employeesCtrl.emit("users", [employee({ isActive: false })]))

    expect(screen.queryByTestId("edit-employee-dialog")).not.toBeInTheDocument()
    const notice = screen.getByTestId("stale-edit-notice")
    expect(notice).toHaveTextContent(/Alex Rivera was deactivated/)
    // Dismissable.
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }))
    expect(screen.queryByTestId("stale-edit-notice")).not.toBeInTheDocument()
  })

  it("an edit rejected at the write boundary shows the server message in the dialog", async () => {
    updateEmployeeMock.mockRejectedValue(
      new EmployeeActionError(
        "This employee is deactivated and can no longer be edited.",
        "employee-inactive",
      ),
    )
    renderDirectory()
    fire(() => employeesCtrl.emit("users", [employee({})]))

    fireEvent.click(screen.getAllByRole("button", { name: /edit/i })[0])
    fireEvent.submit(screen.getByTestId("edit-employee-form"))

    await screen.findByText("This employee is deactivated and can no longer be edited.")
    expect(updateEmployeeMock).toHaveBeenCalledWith({
      uid: "e1",
      name: "Alex Rivera",
      email: "alex@staffrail.test",
    })
  })

  it("a vanished employee closes the edit form with a removal notice", () => {
    renderDirectory()
    fire(() => employeesCtrl.emit("users", [employee({})]))
    fireEvent.click(screen.getAllByRole("button", { name: /edit/i })[0])

    fire(() => employeesCtrl.emit("users", []))

    expect(screen.queryByTestId("edit-employee-dialog")).not.toBeInTheDocument()
    expect(screen.getByTestId("stale-edit-notice")).toHaveTextContent(
      /no longer exists — the edit form was closed/,
    )
  })
})
