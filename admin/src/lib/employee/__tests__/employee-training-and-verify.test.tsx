// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

const mockState = vi.hoisted(() => ({
  trainingStatus: "notStarted",
  certificateUrl: null as string | null,
  emailVerified: false,
}))

const mocks = vi.hoisted(() => ({
  submitEmployeeTraining: vi.fn().mockResolvedValue(undefined),
  uploadEmployeeFile: vi.fn(),
  callLocalServerAction: vi.fn(),
  routerPush: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.routerPush, replace: mocks.routerPush }),
}))

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock("@/lib/data/client-store", () => ({
  callLocalServerAction: mocks.callLocalServerAction,
}))

vi.mock("@/lib/employee/employee-actions", async () => {
  const { EmployeeActionError } = await import("@/lib/admin/employee-actions")
  return {
    EMPLOYEE_UPLOAD_ACCEPT: ".pdf,.png,.jpg",
    submitEmployeeTraining: async (args: Record<string, unknown>) => {
      if (args.requirementType === "certificate" && !args.fileUrl) {
        throw new EmployeeActionError(
          "Please upload a training certificate file before submitting.",
          "invalid-argument",
        )
      }
      return mocks.submitEmployeeTraining(args)
    },
    uploadEmployeeFile: mocks.uploadEmployeeFile,
  }
})

vi.mock("@/lib/employee/employee-streams", () => ({
  EMPTY_EMPLOYEE_WORKSPACE: {
    profile: null,
    tasks: [],
    trainings: [],
    clearances: [],
    progress: { overall: 0, onboarding: 0, training: 0, clearance: 0 },
    compliance: { categories: [], summary: { completed: 0, total: 0 } },
    ready: { profile: true, tasks: true, trainings: true, clearances: true },
  },
  mapTrainingStatus: (raw: string) => raw,
  formatPortalStatus: (raw: string) => raw,
  subscribeEmployeeWorkspace: vi.fn((_uid, onData) => {
    onData({
      profile: {
        uid: "emp-1",
        name: "Jane Doe",
        email: "jane@staffrail.test",
        role: "employee",
        isActive: true,
        adminId: "adm-1",
        photoUrl: null,
        department: "Clinical",
        phoneNumber: null,
        notificationPreferences: {
          pushEnabled: true,
          emailEnabled: true,
          taskReminders: true,
          adminAlerts: true,
        },
      },
      tasks: [],
      trainings: [
        {
          id: "hipaa_annual",
          title: "HIPAA Annual Training",
          status: mockState.trainingStatus,
          isCompleted: false,
          completedAt: null,
          expirationDate: null,
          certificateUrl: mockState.certificateUrl,
          certificateUrls: mockState.certificateUrl ? [mockState.certificateUrl] : [],
          rejectionReason: null,
        },
      ],
      clearances: [],
      progress: { overall: 0, onboarding: 0, training: 0, clearance: 0 },
      compliance: { categories: [], summary: { completed: 0, total: 0 } },
      ready: { profile: true, tasks: true, trainings: true, clearances: true },
    })
    return () => {}
  }),
}))

import { EmployeeTrainingDetailView } from "@/app/employee/training/[trainingId]/employee-training-detail-view"
import { VerifyEmailView } from "@/app/verify-email/verify-email-view"

beforeEach(() => {
  vi.clearAllMocks()
  mockState.trainingStatus = "notStarted"
  mockState.certificateUrl = null
  mockState.emailVerified = false
})

afterEach(() => {
  cleanup()
})

describe("EmployeeTrainingDetailView", () => {
  it("requires certificate upload on submission and locks underReview trainings", async () => {
    render(
      <EmployeeTrainingDetailView
        employeeUid="emp-1"
        employeeName="Jane Doe"
        adminId="adm-1"
        trainingId="hipaa_annual"
      />,
    )

    fireEvent.submit(screen.getByTestId("training-completed-date").closest("form")!)
    await waitFor(() =>
      expect(screen.getByText(/upload a training certificate/i)).toBeInTheDocument(),
    )
    expect(mocks.submitEmployeeTraining).not.toHaveBeenCalled()

    mockState.certificateUrl = "https://cdn.example.com/cert.pdf"
    mockState.trainingStatus = "underReview"
    cleanup()
    render(
      <EmployeeTrainingDetailView
        employeeUid="emp-1"
        employeeName="Jane Doe"
        adminId="adm-1"
        trainingId="hipaa_annual"
      />,
    )

    expect(screen.getByText(/locked pending administrator review/i)).toBeInTheDocument()
    expect(screen.getByTestId("training-completed-date")).toBeDisabled()
  })
})

describe("VerifyEmailView", () => {
  it("checks verification status and marks local demo email verified", async () => {
    mocks.callLocalServerAction.mockImplementation(
      async (_action: string, payload: { markVerified?: boolean; email: string }) => {
        if (payload.markVerified) {
          mockState.emailVerified = true
        }
        return {
          ok: true,
          email: payload.email,
          emailVerified: mockState.emailVerified,
        }
      },
    )

    render(<VerifyEmailView />)

    expect(screen.getByTestId("verify-email-input")).toBeInTheDocument()
    fireEvent.change(screen.getByTestId("verify-email-input"), {
      target: { value: "jane@staffrail.test" },
    })
    fireEvent.change(screen.getByTestId("verify-password-input"), {
      target: { value: "Secret123!" },
    })

    fireEvent.click(screen.getByTestId("verify-check-button"))
    await waitFor(() =>
      expect(screen.getByText(/Email is not verified yet/i)).toBeInTheDocument(),
    )

    fireEvent.click(screen.getByTestId("verify-resend-button"))
    await waitFor(() => expect(screen.getByText(/Email Verified/i)).toBeInTheDocument())
  })
})
