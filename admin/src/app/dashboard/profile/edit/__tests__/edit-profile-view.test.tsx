// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

import { EditProfileView } from "@/app/dashboard/profile/edit/edit-profile-view"
import * as actions from "@/lib/admin/profile-actions"
import type { AdminSelfProfile } from "@/lib/admin/profile-models"

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh, replace: vi.fn() }),
}))

vi.mock("@/lib/admin/profile-actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/profile-actions")>()
  return {
    ...actual,
    updateAdminProfile: vi.fn(),
  }
})

const updateProfileMock = vi.mocked(actions.updateAdminProfile)

const profile: AdminSelfProfile = {
  uid: "adm-1",
  email: "admin@staffrail.test",
  name: "Alex Rivera",
  photoUrl: null,
  role: "admin",
}

function renderEdit() {
  return render(<EditProfileView profile={profile} />)
}

beforeEach(() => {
  vi.clearAllMocks()
  updateProfileMock.mockResolvedValue({ name: "Alex Rivera" })
})

afterEach(() => {
  cleanup()
})

describe("EditProfileView", () => {
  it("shows the current name and a read-only email, then saves the edited name", async () => {
    renderEdit()

    expect(screen.getByLabelText("Name")).toHaveValue("Alex Rivera")
    expect(screen.getByLabelText("Email account")).toBeDisabled()
    expect(screen.getByLabelText("Email account")).toHaveAttribute("readonly")

    fireEvent.change(screen.getByTestId("profile-name"), {
      target: { value: "  Alex R. Rivera  " },
    })
    fireEvent.click(screen.getByTestId("profile-save"))

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledWith({
        uid: "adm-1",
        name: "  Alex R. Rivera  ",
        photoFile: null,
      })
      expect(mocks.push).toHaveBeenCalledWith("/dashboard/profile")
      expect(mocks.refresh).toHaveBeenCalled()
    })
  })

  it("blocks a blank name with a visible error and makes no write", async () => {
    renderEdit()

    fireEvent.change(screen.getByTestId("profile-name"), {
      target: { value: "   " },
    })
    fireEvent.click(screen.getByTestId("profile-save"))

    expect(screen.getByTestId("profile-edit-error")).toHaveTextContent("Name is required.")
    expect(updateProfileMock).not.toHaveBeenCalled()
  })

  it("rejects a non-image file before submission", () => {
    renderEdit()

    const pdf = new File(["not an image"], "resume.pdf", { type: "application/pdf" })
    fireEvent.change(screen.getByTestId("profile-photo-input"), {
      target: { files: [pdf] },
    })

    expect(screen.getByTestId("profile-edit-error")).toHaveTextContent("Choose an image file.")
    expect(updateProfileMock).not.toHaveBeenCalled()
  })

  it("passes the selected photo File to the upload action", async () => {
    renderEdit()

    const image = new File(["image"], "headshot.png", { type: "image/png" })
    fireEvent.change(screen.getByTestId("profile-photo-input"), {
      target: { files: [image] },
    })
    expect(screen.getByText(/headshot\.png/)).toBeInTheDocument()

    fireEvent.click(screen.getByTestId("profile-save"))

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledWith({
        uid: "adm-1",
        name: "Alex Rivera",
        photoFile: image,
      })
    })
  })

  it("surfaces action failures and re-enables the save button", async () => {
    updateProfileMock.mockRejectedValue(new actions.ProfileActionError("permission-denied"))
    renderEdit()

    fireEvent.click(screen.getByTestId("profile-save"))

    await waitFor(() => {
      expect(screen.getByTestId("profile-edit-error")).toHaveTextContent(
        "You do not have permission to perform this change.",
      )
    })
    expect(screen.getByTestId("profile-save")).not.toBeDisabled()
    expect(mocks.push).not.toHaveBeenCalled()
  })
})
