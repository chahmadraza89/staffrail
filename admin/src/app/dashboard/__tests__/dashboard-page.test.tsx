// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"

const mockState = vi.hoisted(() => ({
  authContext: {
    uid: "adm-1",
    email: "admin@staffrail.test",
    emailVerified: true,
    profile: {
      role: "admin",
      isActive: true,
      name: "Dana Admin" as string | null,
    },
  },
}))

vi.mock("@/lib/auth/guard", () => ({
  requireAdmin: async () => mockState.authContext,
}))

vi.mock("@/app/dashboard/dashboard-view", () => ({
  DashboardView: (props: { adminUid: string; adminEmail: string; adminName?: string | null }) => (
    <div
      data-testid="mock-dashboard-view"
      data-uid={props.adminUid}
      data-email={props.adminEmail}
      data-name={props.adminName ?? ""}
    />
  ),
}))

import DashboardPage from "@/app/dashboard/page"

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  mockState.authContext = {
    uid: "adm-1",
    email: "admin@staffrail.test",
    emailVerified: true,
    profile: {
      role: "admin",
      isActive: true,
      name: "Dana Admin",
    },
  }
})

describe("DashboardPage", () => {
  it("passes the admin profile display name to DashboardView", async () => {
    const pageEl = await DashboardPage()
    render(pageEl)
    const view = screen.getByTestId("mock-dashboard-view")
    expect(view.getAttribute("data-uid")).toBe("adm-1")
    expect(view.getAttribute("data-email")).toBe("admin@staffrail.test")
    expect(view.getAttribute("data-name")).toBe("Dana Admin")
  })

  it("falls back to email when profile display name is null or blank, and Administrator when email is null", async () => {
    mockState.authContext.profile.name = "   "
    const blankNameEl = await DashboardPage()
    const first = render(blankNameEl)
    expect(screen.getByTestId("mock-dashboard-view").getAttribute("data-name")).toBe(
      "admin@staffrail.test",
    )
    first.unmount()

    mockState.authContext.profile.name = null
    mockState.authContext = {
      ...mockState.authContext,
      email: null as unknown as string,
    }
    const noEmailEl = await DashboardPage()
    render(noEmailEl)
    expect(screen.getByTestId("mock-dashboard-view").getAttribute("data-name")).toBe(
      "Administrator",
    )
  })
})
