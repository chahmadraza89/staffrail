import { beforeEach, describe, expect, it, vi } from "vitest"

const mockState = vi.hoisted(() => ({
  updates: [] as Array<{ path: string; data: Record<string, unknown> }>,
  audits: [] as Array<Record<string, unknown>>,
  notifications: [] as Array<Record<string, unknown>>,
}))

vi.mock("@/lib/data/client-store", () => ({
  getClientDataStore: () => ({
    updateDoc: async (path: string, data: Record<string, unknown>) => {
      mockState.updates.push({ path, data })
    },
  }),
}))

vi.mock("@/lib/admin/audit-actions", () => ({
  logAuditAction: async (input: Record<string, unknown>) => {
    mockState.audits.push(input)
  },
}))

vi.mock("@/lib/admin/notification-actions", () => ({
  triggerNotification: async (input: Record<string, unknown>) => {
    mockState.notifications.push(input)
  },
}))

vi.mock("@/lib/admin/communication-actions", () => ({
  publishStaffMessage: vi.fn(),
}))

import { EmployeeActionError } from "@/lib/admin/employee-actions"
import { getLegalContent } from "@/lib/admin/legal-content"
import { submitEmployeeTraining } from "@/lib/employee/employee-actions"

beforeEach(() => {
  mockState.updates = []
  mockState.audits = []
  mockState.notifications = []
})

describe("employee-actions & legal content parity", () => {
  it("submits employee trainings using underReview + certificateUrl/certificateUrls + completionDate/completedAt", async () => {
    await expect(
      submitEmployeeTraining({
        employeeId: "emp-1",
        employeeName: "Jane Doe",
        adminId: "adm-1",
        trainingId: "hipaa_annual",
        trainingTitle: "HIPAA Annual Training",
        requirementType: "certificate",
        completedDate: "2026-11-10",
        expirationDate: "2027-11-10",
        noExpiration: false,
        fileUrl: null,
        fileUrls: [],
      }),
    ).rejects.toThrow(EmployeeActionError)

    await submitEmployeeTraining({
      employeeId: "emp-1",
      employeeName: "Jane Doe",
      adminId: "adm-1",
      trainingId: "hipaa_annual",
      trainingTitle: "HIPAA Annual Training",
      requirementType: "certificate",
      completedDate: "2026-11-10",
      expirationDate: "2027-11-10",
      noExpiration: false,
      fileUrl: "https://cdn.example.com/hipaa.pdf",
      fileUrls: ["https://cdn.example.com/hipaa.pdf"],
    })

    expect(mockState.updates).toHaveLength(1)
    expect(mockState.updates[0].path).toBe("users/emp-1/trainings/hipaa_annual")
    expect(mockState.updates[0].data).toMatchObject({
      status: "underReview",
      isCompleted: false,
      certificateUrl: "https://cdn.example.com/hipaa.pdf",
      certificateUrls: ["https://cdn.example.com/hipaa.pdf"],
      noExpiration: false,
      rejectionReason: null,
    })
    expect(mockState.updates[0].data.updatedAt).toBeTruthy()
    expect(mockState.updates[0].data.completionDate).toBeInstanceOf(Date)
    expect(mockState.updates[0].data.completedAt).toBeInstanceOf(Date)
    expect(mockState.audits).toHaveLength(1)
    expect(mockState.notifications).toHaveLength(1)
  })

  it("resolves legal content aliases for driver's_verification, client_rights_&_responsibilities, and initial_orientation", () => {
    expect(getLegalContent("driver's_verification")).toBeTruthy()
    expect(getLegalContent("client_rights_&_responsibilities")).toBeTruthy()
    expect(getLegalContent("initial_orientation")).toBeTruthy()
  })
})
