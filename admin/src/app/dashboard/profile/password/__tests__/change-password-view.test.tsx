// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

import { ChangePasswordView } from "@/app/dashboard/profile/password/change-password-view"
import * as actions from "@/lib/admin/profile-actions"

vi.mock("@/lib/admin/profile-actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/profile-actions")>()
  return {
    ...actual,
    changeAdminPassword: vi.fn(),
  }
})

const changePasswordMock = vi.mocked(actions.changeAdminPassword)

const VALID = "LongEnough1!"

function renderPassword() {
  return render(<ChangePasswordView uid="adm-1" email="admin@staffrail.test" />)
}

function fill(current: string, next: string, confirm: string) {
  fireEvent.change(screen.getByLabelText("Old Password"), { target: { value: current } })
  fireEvent.change(screen.getByLabelText("New Password"), { target: { value: next } })
  fireEvent.change(screen.getByLabelText("Confirm New Password"), {
    target: { value: confirm },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  changePasswordMock.mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
})

describe("ChangePasswordView", () => {
  it("shows the live admin password checklist while typing", () => {
    renderPassword()

    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "short" },
    })

    expect(screen.getByTestId("password-rules")).toHaveTextContent(
      "At least 12 characters",
    )
    expect(screen.getByTestId("password-rules")).toHaveTextContent("One uppercase character")
    expect(screen.getByTestId("password-rules")).toHaveTextContent("One special character")
  })

  it("rejects a weak password before calling action", () => {
    renderPassword()
    fill("old-password", "short", "short")
    fireEvent.click(screen.getByTestId("password-submit"))

    expect(screen.getByTestId("password-error")).toHaveTextContent(
      "Password must be at least 12 characters.",
    )
    expect(changePasswordMock).not.toHaveBeenCalled()
  })

  it("requires the confirmation to match", () => {
    renderPassword()
    fill("old-password", VALID, "Different1!")
    fireEvent.click(screen.getByTestId("password-submit"))

    expect(screen.getByTestId("password-error")).toHaveTextContent(
      "The confirmation does not match the new password.",
    )
    expect(changePasswordMock).not.toHaveBeenCalled()
  })

  it("reauthenticates and updates the password, then shows success", async () => {
    renderPassword()
    fill("old-password", VALID, VALID)
    fireEvent.click(screen.getByTestId("password-submit"))

    await waitFor(() => {
      expect(changePasswordMock).toHaveBeenCalledWith({
        uid: "adm-1",
        email: "admin@staffrail.test",
        currentPassword: "old-password",
        newPassword: VALID,
      })
      expect(screen.getByText("Password updated successfully.")).toBeInTheDocument()
    })
    expect(screen.getByRole("link", { name: "Back to profile" })).toHaveAttribute(
      "href",
      "/dashboard/profile",
    )
  })

  it("surfaces wrong-password failures without clearing the form", async () => {
    changePasswordMock.mockRejectedValue(new actions.ProfileActionError("wrong-password"))
    renderPassword()
    fill("nope", VALID, VALID)
    fireEvent.click(screen.getByTestId("password-submit"))

    await waitFor(() => {
      expect(screen.getByTestId("password-error")).toHaveTextContent(
        "Incorrect password. Please try again.",
      )
    })
    expect(screen.getByLabelText("Old Password")).toHaveValue("nope")
  })
})
