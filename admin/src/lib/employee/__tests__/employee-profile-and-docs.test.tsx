// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

const mocks = vi.hoisted(() => ({
  updateEmployeeNotificationPreferences: vi.fn().mockResolvedValue(undefined),
  endAdminSession: vi.fn().mockResolvedValue(undefined),
  callLocalServerAction: vi.fn(),
  routerReplace: vi.fn(),
  routerRefresh: vi.fn(),
  routerPush: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mocks.routerReplace,
    refresh: mocks.routerRefresh,
    push: mocks.routerPush,
  }),
}))

vi.mock("@/lib/data/client-store", () => ({
  callLocalServerAction: mocks.callLocalServerAction,
}))

vi.mock("@/lib/auth/client-auth", () => ({
  endAdminSession: mocks.endAdminSession,
}))

vi.mock("@/lib/employee/employee-actions", () => ({
  updateEmployeeNotificationPreferences: mocks.updateEmployeeNotificationPreferences,
}))

vi.mock("@/lib/employee/employee-streams", () => ({
  EMPTY_EMPLOYEE_WORKSPACE: {
    profile: null,
    tasks: [],
    trainings: [],
    clearances: [],
    progress: { overall: 0, onboarding: 0, training: 0, clearance: 0 },
    compliance: { categories: [] },
    ready: { profile: true, tasks: true, trainings: true, clearances: true },
  },
  formatPortalStatus: (s: string) => s,
  mapClearanceStatus: (s: string) => s,
  mapTrainingStatus: (s: string) => s,
  subscribeEmployeeWorkspace: vi.fn((_uid, onData) => {
    onData({
      profile: null,
      tasks: [
        {
          id: "w4",
          title: "Tax Documents (W-4)",
          subtitle: null,
          status: "submitted",
          actionType: "splitField",
          isCompleted: false,
          updatedAt: new Date("2026-10-12T00:00:00Z"),
          completedAt: null,
          dueDate: null,
          fileUrl: "https://storage.test/users/emp-1/1770000_w4-signed.pdf",
          signatureUrl: null,
          adminSignatureUrl: null,
          rejectionReason: null,
          formData: null,
          adminFormData: null,
          blankFormLink: null,
          signedAt: null,
          hasFormData: false,
          hasAdminFormData: false,
          revision: "r1",
        },
      ],
      trainings: [
        {
          id: "cpr",
          title: "CPR Certificate",
          description: null,
          durationText: "2 hrs",
          status: "verified",
          certificateUrl: "https://storage.test/users/emp-1/1770001_cpr-cert.pdf",
          certificateUrls: [],
          completedAt: new Date("2026-10-10T00:00:00Z"),
          dueDate: null,
          assignedAt: null,
          rejectionReason: null,
          revision: "r2",
        },
      ],
      clearances: [
        {
          id: "bg",
          title: "Background Check",
          description: null,
          status: "underReview",
          fileUrl: "https://storage.test/users/emp-1/1770002_bg-report.pdf",
          rejectionReason: null,
          dueDate: null,
          submittedAt: new Date("2026-10-14T00:00:00Z"),
          verifiedAt: null,
          revision: "r3",
        },
      ],
      progress: { overall: 0.7, onboarding: 0.5, training: 1, clearance: 0.5 },
      compliance: { categories: [] },
      ready: { profile: true, tasks: true, trainings: true, clearances: true },
    })
    return () => {}
  }),
}))

import { EmployeeProfileView } from "@/app/employee/profile/employee-profile-view"
import { EmployeeDocumentCenterView } from "@/app/employee/profile/documents/employee-document-center-view"
import { VerifyEmailView } from "@/app/verify-email/verify-email-view"

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe("EmployeeProfileView", () => {
  it("renders employee details and persists notification preference switches", async () => {
    render(
      <EmployeeProfileView
        initialProfile={{
          uid: "emp-1",
          name: "Jane Doe",
          email: "jane@staffrail.test",
          role: "employee",
          isActive: true,
          adminId: "adm-1",
          photoUrl: null,
          department: "Clinical",
          phoneNumber: "555-0100",
          notificationPreferences: {
            pushEnabled: true,
            emailEnabled: true,
            taskReminders: true,
            adminAlerts: true,
          },
        }}
      />,
    )

    expect(screen.getByText("Jane Doe")).toBeInTheDocument()
    const pushSwitch = screen.getByRole("switch", { name: "Push Notifications" })
    fireEvent.click(pushSwitch)

    await waitFor(() =>
      expect(mocks.updateEmployeeNotificationPreferences).toHaveBeenCalledWith({
        employeeId: "emp-1",
        preferences: {
          pushEnabled: false,
          emailEnabled: true,
          taskReminders: true,
          adminAlerts: true,
        },
      }),
    )
  })
})

describe("EmployeeDocumentCenterView", () => {
  it("aggregates files from onboarding, training, and clearance and supports filtering", () => {
    render(<EmployeeDocumentCenterView employeeUid="emp-1" />)

    expect(screen.getByText("Tax Documents (W-4)")).toBeInTheDocument()
    expect(screen.getByText("CPR Certificate")).toBeInTheDocument()
    expect(screen.getByText("Background Check")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Filter by module"), {
      target: { value: "training" },
    })
    expect(screen.getByText("CPR Certificate")).toBeInTheDocument()
    expect(screen.queryByText("Tax Documents (W-4)")).toBeNull()
  })
})

describe("VerifyEmailView", () => {
  it("supports confirming email verification via local server action", async () => {
    mocks.callLocalServerAction
      .mockResolvedValueOnce({
        ok: true,
        emailVerified: false,
        email: "jane@staffrail.test",
      })
      .mockResolvedValueOnce({
        ok: true,
        emailVerified: true,
        email: "jane@staffrail.test",
      })

    render(<VerifyEmailView />)

    fireEvent.change(screen.getByTestId("verify-email-input"), {
      target: { value: "jane@staffrail.test" },
    })
    fireEvent.change(screen.getByTestId("verify-password-input"), {
      target: { value: "Secret123!" },
    })

    fireEvent.click(screen.getByTestId("verify-check-button"))
    await waitFor(() =>
      expect(mocks.callLocalServerAction).toHaveBeenCalledWith("verifyEmail", {
        email: "jane@staffrail.test",
        password: "Secret123!",
        markVerified: false,
      }),
    )

    fireEvent.click(screen.getByTestId("verify-resend-button"))
    await waitFor(() =>
      expect(mocks.callLocalServerAction).toHaveBeenCalledWith("verifyEmail", {
        email: "jane@staffrail.test",
        password: "Secret123!",
        markVerified: true,
      }),
    )
    await waitFor(() => expect(screen.getByText("Email Verified")).toBeInTheDocument())
  })
})
