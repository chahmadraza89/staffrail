/**
 * Task review action tests. Firestore is replaced with a recording double so
 * the EXACT write payloads are asserted (the Dart services' payloads are
 * load-bearing — the employee app reads these fields).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockSetDoc, mockUpdateDoc } = vi.hoisted(() => ({
  mockSetDoc: vi.fn(),
  mockUpdateDoc: vi.fn(),
}))

vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
  getDoc: vi.fn(),
  runTransaction: vi.fn(),
  setDoc: mockSetDoc,
  updateDoc: mockUpdateDoc,
  serverTimestamp: () => "SERVER_TS",
}))

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseFirestore: () => ({}),
}))

import {
  acceptTask,
  rejectTask,
  skipTask,
  updateBlankFormLink,
} from "@/lib/admin/task-actions"
import { EmployeeActionError } from "@/lib/admin/employee-actions"

const DB = {} as never

beforeEach(() => {
  mockSetDoc.mockReset()
  mockUpdateDoc.mockReset()
  mockSetDoc.mockResolvedValue(undefined)
  mockUpdateDoc.mockResolvedValue(undefined)
})

describe("acceptTask — Dart parity payloads", () => {
  it("onboarding: merged set with status/isCompleted/updatedAt/completedAt/employeeName", async () => {
    await acceptTask(
      {
        employeeId: "emp-1",
        taskId: "onboarding_acknowledgment_form",
        taskSource: "onboarding",
        employeeName: "Jane Doe",
        taskTitle: "ignored on accept (Dart passes no title)",
      },
      DB,
    )
    expect(mockSetDoc).toHaveBeenCalledTimes(1)
    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: "users/emp-1/onboarding_tasks/onboarding_acknowledgment_form" },
      {
        status: "verified",
        isCompleted: true,
        updatedAt: "SERVER_TS",
        completedAt: "SERVER_TS",
        employeeName: "Jane Doe",
      },
      { merge: true },
    )
    expect(mockUpdateDoc).not.toHaveBeenCalled()
  })

  it("training: update with status/updatedAt only (no completedAt — Dart quirk)", async () => {
    await acceptTask(
      { employeeId: "emp-1", taskId: "start", taskSource: "training" },
      DB,
    )
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: "users/emp-1/trainings/start" },
      { status: "verified", updatedAt: "SERVER_TS" },
    )
    expect(mockSetDoc).not.toHaveBeenCalled()
  })

  it("clearance: update with verifiedAt", async () => {
    await acceptTask(
      { employeeId: "emp-1", taskId: "tb_status_report", taskSource: "clearance" },
      DB,
    )
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: "users/emp-1/clearance/tb_status_report" },
      { status: "verified", verifiedAt: "SERVER_TS", updatedAt: "SERVER_TS" },
    )
  })
})

describe("rejectTask", () => {
  it("requires a non-empty reason without touching Firestore", async () => {
    await expect(
      rejectTask(
        {
          employeeId: "emp-1",
          taskId: "resume",
          taskSource: "onboarding",
          reason: "   ",
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "invalid-argument" })
    expect(mockSetDoc).not.toHaveBeenCalled()
    expect(mockUpdateDoc).not.toHaveBeenCalled()
  })

  it("onboarding: rejected + trimmed reason + owner, never completedAt", async () => {
    await rejectTask(
      {
        employeeId: "emp-1",
        taskId: "resume",
        taskSource: "onboarding",
        employeeName: "Jane Doe",
        reason: "  illegible scan  ",
      },
      DB,
    )
    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: "users/emp-1/onboarding_tasks/resume" },
      {
        status: "rejected",
        isCompleted: false,
        updatedAt: "SERVER_TS",
        rejectionReason: "illegible scan",
        employeeName: "Jane Doe",
      },
      { merge: true },
    )
  })

  it("training/clearance: status actionRequired + reason", async () => {
    await rejectTask(
      {
        employeeId: "emp-1",
        taskId: "cpr___first_aid",
        taskSource: "training",
        reason: "expired certificate",
      },
      DB,
    )
    expect(mockUpdateDoc).toHaveBeenLastCalledWith(
      { path: "users/emp-1/trainings/cpr___first_aid" },
      {
        status: "actionRequired",
        updatedAt: "SERVER_TS",
        rejectionReason: "expired certificate",
      },
    )

    await rejectTask(
      {
        employeeId: "emp-1",
        taskId: "drug_screening_results",
        taskSource: "clearance",
        reason: "missing page",
      },
      DB,
    )
    expect(mockUpdateDoc).toHaveBeenLastCalledWith(
      { path: "users/emp-1/clearance/drug_screening_results" },
      {
        status: "actionRequired",
        updatedAt: "SERVER_TS",
        rejectionReason: "missing page",
      },
    )
  })
})

describe("skipTask — onboarding only (correction)", () => {
  it("skip writes noActionRequired and title/owner", async () => {
    await skipTask(
      {
        employeeId: "emp-1",
        taskId: "resume",
        taskSource: "onboarding",
        employeeName: "Jane Doe",
        taskTitle: "Resume",
        skip: true,
      },
      DB,
    )
    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: "users/emp-1/onboarding_tasks/resume" },
      {
        status: "noActionRequired",
        isCompleted: false,
        updatedAt: "SERVER_TS",
        employeeName: "Jane Doe",
        title: "Resume",
      },
      { merge: true },
    )
  })

  it("unskip restores notStarted", async () => {
    await skipTask(
      { employeeId: "emp-1", taskId: "resume", taskSource: "onboarding", skip: false },
      DB,
    )
    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: "users/emp-1/onboarding_tasks/resume" },
      { status: "notStarted", isCompleted: false, updatedAt: "SERVER_TS" },
      { merge: true },
    )
  })

  it("refuses training/clearance rows instead of mutating the wrong collection", async () => {
    await expect(
      skipTask(
        { employeeId: "emp-1", taskId: "start", taskSource: "training", skip: true },
        DB,
      ),
    ).rejects.toMatchObject({ code: "invalid-argument" })
    expect(mockSetDoc).not.toHaveBeenCalled()
  })
})

describe("updateBlankFormLink — restricted + non-destructive (correction)", () => {
  it("writes ONLY blankFormLink and updatedAt for the I-9/W-9 tasks", async () => {
    await updateBlankFormLink(
      {
        employeeId: "emp-1",
        taskId: "tax_documents_i_9",
        taskSource: "onboarding",
        newLink: " https://www.uscis.gov/i-9 ",
      },
      DB,
    )
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: "users/emp-1/onboarding_tasks/tax_documents_i_9" },
      { blankFormLink: "https://www.uscis.gov/i-9", updatedAt: "SERVER_TS" },
    )
    // The destructive Dart status/isCompleted re-write must never appear.
    const payload = mockUpdateDoc.mock.calls[0][1] as Record<string, unknown>
    expect(payload).not.toHaveProperty("status")
    expect(payload).not.toHaveProperty("isCompleted")
  })

  it("rejects non-http(s) URLs", async () => {
    await expect(
      updateBlankFormLink(
        {
          employeeId: "emp-1",
          taskId: "tax_documents_w_9",
          taskSource: "onboarding",
          newLink: "javascript:alert(1)",
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "invalid-argument" })
    expect(mockUpdateDoc).not.toHaveBeenCalled()
  })

  it("rejects tasks other than I-9/W-9 and non-onboarding sources", async () => {
    await expect(
      updateBlankFormLink(
        {
          employeeId: "emp-1",
          taskId: "resume",
          taskSource: "onboarding",
          newLink: "https://x.test/form.pdf",
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "invalid-argument" })
    await expect(
      updateBlankFormLink(
        {
          employeeId: "emp-1",
          taskId: "tax_documents_i_9",
          taskSource: "training",
          newLink: "https://x.test/form.pdf",
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "invalid-argument" })
  })
})

describe("validation + error wrapping", () => {
  it("rejects missing ids", async () => {
    await expect(
      acceptTask({ employeeId: "", taskId: "x", taskSource: "onboarding" }, DB),
    ).rejects.toMatchObject({ code: "invalid-argument" })
    await expect(
      acceptTask({ employeeId: "e", taskId: "", taskSource: "onboarding" }, DB),
    ).rejects.toMatchObject({ code: "invalid-argument" })
    expect(mockSetDoc).not.toHaveBeenCalled()
  })

  it("wraps Firestore failures with an EmployeeActionError code", async () => {
    mockUpdateDoc.mockRejectedValueOnce({ code: "permission-denied" })
    const caught = await acceptTask(
      { employeeId: "emp-1", taskId: "start", taskSource: "training" },
      DB,
    ).catch((error: unknown) => error)
    expect(caught).toBeInstanceOf(EmployeeActionError)
    expect(caught).toMatchObject({ code: "permission-denied", message: "Failed to verify task." })
  })
})
