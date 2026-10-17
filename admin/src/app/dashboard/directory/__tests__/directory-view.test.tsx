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
    updateEmployee: vi.fn(),
    deactivateEmployee: vi.fn(),
  }
})

const progressSub = vi.mocked(streams.subscribeAdminEmployeesProgress)
const registerStaffMock = vi.mocked(actions.registerStaff)
const updateEmployeeMock = vi.mocked(actions.updateEmployee)
const deactivateEmployeeMock = vi.mocked(actions.deactivateEmployee)

const HOUR = 60 * 60 * 1000

const employee = (overrides: Partial<AdminEmployeeProgress>): AdminEmployeeProgress => ({
  uid: "e1",
  name: "Ahmad Raza",
  email: "ahmad@bhmh.dev",
  overallProgress: 0.1,
  onboardingProgress: 0.1,
  trainingProgress: 0,
  clearanceProgress: 0,
  lastLogin: new Date(Date.now() - 2 * HOUR),
  isActive: true,
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
  registerStaffMock.mockResolvedValue({ uid: "e9", resetLink: "https://reset.example" })
  updateEmployeeMock.mockResolvedValue()
  deactivateEmployeeMock.mockResolvedValue()
})

function renderDirectory() {
  render(<DirectoryView adminUid="adm-1" adminEmail="admin@bhmh.dev" />)
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
          email: "sara@bhmh.dev",
          overallProgress: 1,
          onboardingProgress: 1,
          trainingProgress: 1,
          clearanceProgress: 1,
        }),
      ]),
    )

    expect(screen.getByText("Ahmad Raza")).toBeInTheDocument()
    expect(screen.getByText("sara@bhmh.dev")).toBeInTheDocument()
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
        employee({ uid: "e2", name: "Sara Khan", email: "sara@bhmh.dev" }),
      ]),
    )

    fireEvent.change(screen.getByPlaceholderText("Search employees…"), {
      target: { value: "sara" },
    })
    expect(screen.queryByText("Ahmad Raza")).not.toBeInTheDocument()
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
    expect(screen.queryByText("Ahmad Raza")).not.toBeInTheDocument()
    expect(screen.getByText("Deactivated", { selector: "span" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "All" }))
    expect(screen.getByText("Old Staff")).toBeInTheDocument()
    expect(screen.getByText("Ahmad Raza")).toBeInTheDocument()
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
      target: { value: "new@bhmh.dev" },
    })
    fireEvent.submit(dialog.querySelector('form[data-testid="add-employee-form"]')!)

    expect(registerStaffMock).toHaveBeenCalledWith({
      name: "New Person",
      email: "new@bhmh.dev",
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
      target: { value: "dup@bhmh.dev" },
    })
    const dialog = screen.getByTestId("add-employee-dialog")
    fireEvent.submit(dialog.querySelector('form[data-testid="add-employee-form"]')!)

    await screen.findByText("The email address is already in use by another account.")
    expect(screen.queryByText("Staff Registered")).not.toBeInTheDocument()
  })

  it("Edit pre-fills fields and updates the employee", async () => {
    renderDirectory()
    fire(() => employeesCtrl.emit("users", [employee({ name: "Old Name", email: "old@bhmh.dev" })]))

    fireEvent.click(screen.getAllByRole("button", { name: /edit/i })[0])
    const nameInput = screen.getByLabelText("Full Name") as HTMLInputElement
    expect(nameInput.value).toBe("Old Name")

    expect(screen.getByLabelText("Email Address")).toHaveValue("old@bhmh.dev")
    fireEvent.change(nameInput, { target: { value: "Fresh Name" } })
    fireEvent.submit(screen.getByTestId("edit-employee-form"))

    await waitFor(() => {
      expect(updateEmployeeMock).toHaveBeenCalledWith({
        uid: "e1",
        name: "Fresh Name",
        email: "old@bhmh.dev",
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
    expect(screen.queryByText("Ahmad Raza")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Deactivated" }))
    expect(screen.getByText("Ahmad Raza")).toBeInTheDocument()
    expect(screen.getByText("Deactivated", { selector: "span" })).toBeInTheDocument()
  })
})
