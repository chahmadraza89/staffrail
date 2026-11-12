// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

import { AdminProfileView } from "@/app/dashboard/profile/profile-view"
import type { AdminSelfProfile } from "@/lib/admin/profile-models"

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  endAdminSession: vi.fn(async () => undefined),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mocks.replace,
    refresh: mocks.refresh,
    push: vi.fn(),
  }),
}))

vi.mock("@/lib/auth/client-auth", () => ({
  endAdminSession: mocks.endAdminSession,
}))

const profile: AdminSelfProfile = {
  uid: "adm-1",
  email: "admin@staffrail.test",
  name: "Alex Rivera",
  photoUrl: null,
  role: "admin",
}

function renderProfile() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <AdminProfileView profile={profile} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

describe("AdminProfileView", () => {
  it("renders the ported header, personal information and settings links", () => {
    renderProfile()

    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument()
    expect(screen.getByText("Alex Rivera")).toBeInTheDocument()
    expect(screen.getAllByText("admin@staffrail.test")).toHaveLength(2)
    expect(screen.getByText("Administrator")).toBeInTheDocument()
    expect(screen.getByText("Alex")).toBeInTheDocument()
    expect(screen.getByText("Rivera")).toBeInTheDocument()

    expect(screen.getByText("Change Password").closest("a")).toHaveAttribute(
      "href",
      "/dashboard/profile/password",
    )
    expect(screen.getByText("Privacy & Security").closest("a")).toHaveAttribute(
      "href",
      "/dashboard/profile/privacy",
    )
    expect(screen.getByText("Dissolve Workspace").closest("a")).toHaveAttribute(
      "href",
      "/dashboard/profile/delete",
    )
    expect(screen.getByText("Edit Profile").closest("a")).toHaveAttribute(
      "href",
      "/dashboard/profile/edit",
    )
  })

  it("does not present the Flutter local-only notification switch as a saved setting", () => {
    renderProfile()

    expect(screen.getByText("Push Notifications")).toBeInTheDocument()
    expect(screen.getByText(/This console does not store a notification preference/)).toBeInTheDocument()
    expect(screen.getByText("Mobile app")).toBeInTheDocument()
    expect(screen.queryByRole("switch")).not.toBeInTheDocument()
  })

  it("describes workspace dissolution as a recoverable soft-delete", () => {
    renderProfile()
    expect(
      screen.getByText(/Deactivate this admin and every linked employee account/),
    ).toBeInTheDocument()
  })

  it("confirms logout before clearing the session and navigating to login", async () => {
    renderProfile()

    fireEvent.click(screen.getByRole("button", { name: /Log out/i }))
    expect(screen.getByText("Leaving so soon?")).toBeInTheDocument()

    fireEvent.click(screen.getByTestId("confirm-logout"))

    await waitFor(() => {
      expect(mocks.endAdminSession).toHaveBeenCalledTimes(1)
      expect(mocks.replace).toHaveBeenCalledWith("/login")
      expect(mocks.refresh).toHaveBeenCalled()
    })
  })
})
