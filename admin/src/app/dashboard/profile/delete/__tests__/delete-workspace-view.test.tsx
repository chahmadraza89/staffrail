// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

import { DeleteWorkspaceView } from "@/app/dashboard/profile/delete/delete-workspace-view"
import * as actions from "@/lib/admin/profile-actions"

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  endAdminSession: vi.fn(async () => undefined),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh, push: vi.fn() }),
}))

vi.mock("@/lib/auth/client-auth", () => ({
  endAdminSession: mocks.endAdminSession,
}))

vi.mock("@/lib/admin/profile-actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/profile-actions")>()
  return {
    ...actual,
    deleteAdminWorkspace: vi.fn(),
  }
})

const deleteWorkspaceMock = vi.mocked(actions.deleteAdminWorkspace)

function renderDelete() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <DeleteWorkspaceView uid="adm-1" email="admin@staffrail.test" />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  deleteWorkspaceMock.mockResolvedValue({ cascaded: 4 })
})

afterEach(() => {
  cleanup()
})

describe("DeleteWorkspaceView", () => {
  it("keeps the dangerous action disabled until DELETE and a password are entered", () => {
    renderDelete()
    expect(screen.getByTestId("delete-submit")).toBeDisabled()

    fireEvent.change(screen.getByTestId("delete-confirmation"), {
      target: { value: "DELETE" },
    })
    expect(screen.getByTestId("delete-submit")).toBeDisabled()

    fireEvent.change(screen.getByTestId("delete-password"), {
      target: { value: "secret" },
    })
    expect(screen.getByTestId("delete-submit")).not.toBeDisabled()
  })

  it("does not accept a lowercase confirmation word", () => {
    renderDelete()
    fireEvent.change(screen.getByTestId("delete-confirmation"), {
      target: { value: "delete" },
    })
    fireEvent.change(screen.getByTestId("delete-password"), {
      target: { value: "secret" },
    })

    expect(screen.getByTestId("delete-submit")).toBeDisabled()
  })

  it("explains the real recoverable soft-delete rather than claiming permanent erasure", () => {
    renderDelete()

    expect(
      screen.getByText(/records are preserved — nothing is permanently erased/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Login accounts are preserved for a 30-day recovery window/i),
    ).toBeInTheDocument()
  })

  it("sends the reauthenticated cascade, clears the session and returns to login", async () => {
    renderDelete()
    fireEvent.change(screen.getByTestId("delete-confirmation"), {
      target: { value: " DELETE " },
    })
    fireEvent.change(screen.getByTestId("delete-password"), {
      target: { value: "correct-password" },
    })
    fireEvent.click(screen.getByTestId("delete-submit"))

    await waitFor(() => {
      expect(deleteWorkspaceMock).toHaveBeenCalledWith({
        uid: "adm-1",
        email: "admin@staffrail.test",
        password: "correct-password",
      })
      expect(mocks.endAdminSession).toHaveBeenCalledTimes(1)
      expect(mocks.replace).toHaveBeenCalledWith("/login")
      expect(mocks.refresh).toHaveBeenCalled()
    })
  })

  it("surfaces a wrong-password failure and lets the admin retry", async () => {
    deleteWorkspaceMock.mockRejectedValue(new actions.ProfileActionError("wrong-password"))
    renderDelete()
    fireEvent.change(screen.getByTestId("delete-confirmation"), {
      target: { value: "DELETE" },
    })
    fireEvent.change(screen.getByTestId("delete-password"), {
      target: { value: "wrong" },
    })
    fireEvent.click(screen.getByTestId("delete-submit"))

    await waitFor(() => {
      expect(screen.getByTestId("delete-error")).toHaveTextContent(
        "Incorrect password. Please try again.",
      )
    })
    expect(mocks.endAdminSession).not.toHaveBeenCalled()
    expect(screen.getByTestId("delete-submit")).not.toBeDisabled()
  })
})
