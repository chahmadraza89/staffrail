/**
 * Employee lifecycle action tests. `DataStore` and the staff-registration
 * server action are faked with RECORDING + STATEFUL doubles: batch set/delete
 * apply to an in-memory doc store (including merge semantics), and
 * `runTransaction` detects concurrent mutations before commit and re-runs the
 * transaction body — mirroring optimistic-concurrency semantics — so register /
 * setup-retry / edit races are exercised through the REAL code paths.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

import * as actions from "@/lib/admin/employee-actions"
import { EmployeeActionError, type RegisterStaffFn } from "@/lib/admin/employee-actions"
import {
  DEFAULT_CLEARANCES,
  DEFAULT_ONBOARDING_TASKS,
  DEFAULT_TRAININGS,
} from "@/lib/admin/seed-templates"
import { serverNow } from "@/lib/data/memory-store"
import type { DataDocument, DataStore, DataTransaction } from "@/lib/data/types"

type Stored = Record<string, unknown> | undefined

/** In-memory doc store backing every getDoc/transaction read/write. */
const mockDocStore = new Map<string, Record<string, unknown>>()

interface MockBatchOp {
  type: "set" | "delete"
  path: string
  data?: Record<string, unknown>
  merge: boolean
}
/** Log of every transaction write (set/delete), kept for assertions. */
const mockTxWrites: MockBatchOp[] = []

const mockUpdateDocCalls: Array<{ path: string; data: Record<string, unknown> }> = []

let mockRegisterImpl: RegisterStaffFn | null = null
let mockTxSetError: Error | null = null
/** Aborts ONE transaction before its body runs (commit-level failure),
 * then clears — so an action's follow-up transaction (e.g. the setup
 * fallback) runs against a recovered store. */
let mockTransactionError: Error | null = null
/** Simulates ANOTHER client writing between the first transaction read
 * pass and the commit — exactly once, on the first attempt. */
let mockTransactionContendHook: (() => void) | null = null
let mockUpdateDocImpl: (path: string, data: DataDocument) => Promise<void> = (path, data) => {
  mockUpdateDocCalls.push({ path, data })
  mockDocStore.set(path, { ...mockDocStore.get(path), ...data })
  return Promise.resolve()
}

const runRegisterFn: RegisterStaffFn = (payload) => {
  if (!mockRegisterImpl) {
    return Promise.reject(new Error("register action not configured"))
  }
  return mockRegisterImpl(payload)
}

function makeSnapshot(path: string, data: Stored) {
  const parts = path.split("/")
  const id = parts[parts.length - 1] ?? ""
  const parentDocId = parts.length >= 3 ? parts[parts.length - 3] ?? null : null
  return {
    id,
    path,
    ref: { id, path, parent: { parent: parentDocId ? { id: parentDocId } : null } },
    exists: () => data !== undefined,
    data: () => data,
  }
}

const mockStore = {
  getDoc: (path: string) => Promise.resolve(makeSnapshot(path, mockDocStore.get(path))),
  updateDoc: (path: string, data: DataDocument) => mockUpdateDocImpl(path, data),
  runTransaction: async <T>(transactionFn: (transaction: DataTransaction) => Promise<T>): Promise<T> => {
    if (mockTransactionError) {
      const abortError = mockTransactionError
      mockTransactionError = null
      return Promise.reject(abortError)
    }
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const reads = new Map<string, Stored>()
      const writes: MockBatchOp[] = []
      const transaction: DataTransaction = {
        get: async (path: string) => {
          const data = mockDocStore.get(path)
          reads.set(path, data)
          return makeSnapshot(path, data)
        },
        set: (path: string, data: DataDocument, options?: { merge?: boolean }) => {
          if (mockTxSetError) {
            throw mockTxSetError
          }
          const op: MockBatchOp = {
            type: "set",
            path,
            data,
            merge: options?.merge === true,
          }
          writes.push(op)
          mockTxWrites.push(op)
        },
        delete: (path: string) => {
          const op: MockBatchOp = { type: "delete", path, merge: false }
          writes.push(op)
          mockTxWrites.push(op)
        },
        update: (path: string, data: DataDocument) => {
          writes.push({
            type: "set",
            path,
            data,
            merge: true,
          })
        },
      }
      const outcome = await transactionFn(transaction)
      if (attempt === 0) {
        mockTransactionContendHook?.()
      }
      const conflict = [...reads.entries()].some(
        ([path, seen]) => mockDocStore.get(path) !== seen,
      )
      if (conflict) {
        continue
      }
      for (const write of writes) {
        if (write.type === "delete") {
          mockDocStore.delete(write.path)
        } else if (write.merge) {
          mockDocStore.set(write.path, { ...mockDocStore.get(write.path), ...write.data })
        } else {
          mockDocStore.set(write.path, { ...write.data })
        }
      }
      return outcome
    }
    throw new Error("transaction contention exhausted")
  },
} as unknown as DataStore

beforeEach(() => {
  mockDocStore.clear()
  mockTxWrites.length = 0
  mockUpdateDocCalls.length = 0
  mockRegisterImpl = null
  mockTxSetError = null
  mockTransactionError = null
  mockTransactionContendHook = null
  mockUpdateDocImpl = (path, data) => {
    mockUpdateDocCalls.push({ path, data })
    mockDocStore.set(path, { ...mockDocStore.get(path), ...data })
    return Promise.resolve()
  }
  vi.spyOn(console, "warn").mockImplementation(() => {})
})

const SEED_INPUT = { name: "Alex Rivera", email: "alex@staffrail.test", adminUid: "adm-1" }

/** The signed-in admin's user doc — provisioning requires an active admin. */
function activateAdmin(): void {
  mockDocStore.set("users/adm-1", { name: "Admin", role: "admin", isActive: true })
}

/**
 * The employee's user doc created by `registerStaff` BEFORE the client
 * provisions documents.
 */
function seedUserDoc(uid: string): void {
  mockDocStore.set(`users/${uid}`, {
    name: "Alex Rivera",
    email: "alex@staffrail.test",
    role: "employee",
    adminId: "adm-1",
    isActive: true,
    setupStatus: "incomplete",
  })
}

function callableSuccess(uid = "e2", resetLink: string | null = "https://reset"): void {
  mockRegisterImpl = async (payload) => {
    expect(payload).toEqual({
      email: "alex@staffrail.test",
      name: "Alex Rivera",
      role: "employee",
      webProvisioning: true,
    })
    return Promise.resolve({ uid, resetLink })
  }
}

function storedDocsUnder(worker: string, subcollection: string): Map<string, Record<string, unknown>> {
  const prefix = `users/${worker}/${subcollection}/`
  const found = new Map<string, Record<string, unknown>>()
  for (const [path, data] of mockDocStore) {
    if (path.startsWith(prefix)) {
      found.set(path.slice(prefix.length), data)
    }
  }
  return found
}

function txSetOpsFor(worker: string, subcollection: string): MockBatchOp[] {
  return mockTxWrites.filter((op) => op.type === "set" && op.path.startsWith(`users/${worker}/${subcollection}/`))
}

function txDeleteOpsFor(worker: string, subcollection: string): MockBatchOp[] {
  return mockTxWrites.filter((op) => op.type === "delete" && op.path.startsWith(`users/${worker}/${subcollection}/`))
}

describe("registerStaff — templates and legacy resolution", () => {
  it("calls the register action with the employee payload and provisions the full templates in one transaction", async () => {
    activateAdmin()
    seedUserDoc("e2")
    callableSuccess()

    const result = await actions.registerStaff(SEED_INPUT, runRegisterFn, mockStore)

    expect(result.setup).toBe("complete")
    expect(result.uid).toBe("e2")
    expect(result.resetLink).toBe("https://reset")
    const firstTaskSet = txSetOpsFor("e2", "onboarding_tasks")[0]
    expect(firstTaskSet.data?.adminId).toBe("adm-1")
    expect(firstTaskSet.data?.employeeId).toBe("e2")
    expect(firstTaskSet.data?.updatedAt).toBe(serverNow())
    expect(firstTaskSet.data?.subtitle).toBe("Signature Required")
    expect(txSetOpsFor("e2", "onboarding_tasks")).toHaveLength(DEFAULT_ONBOARDING_TASKS.length)
    expect(txSetOpsFor("e2", "trainings")).toHaveLength(DEFAULT_TRAININGS.length)
    expect(txSetOpsFor("e2", "clearance")).toHaveLength(DEFAULT_CLEARANCES.length)
    expect(mockDocStore.get("users/e2")?.setupStatus).toBe("complete")
  })

  it("uses the exact template doc IDs (parity with the employee app)", async () => {
    activateAdmin()
    seedUserDoc("e2")
    callableSuccess()
    await actions.registerStaff(SEED_INPUT, runRegisterFn, mockStore)

    const taskIds = [...storedDocsUnder("e2", "onboarding_tasks").keys()]
    expect(taskIds).toContain("driver's_verification")
    expect(taskIds).toContain("tax_documents_i_9")
    const trainingIds = [...storedDocsUnder("e2", "trainings").keys()]
    expect(trainingIds).toContain("start")
    expect(storedDocsUnder("e2", "clearance").keys()).toContain("tb_status_report")
  })

  it("propagates action failures as EmployeeActionError without provisioning", async () => {
    mockRegisterImpl = async () =>
      Promise.reject(
        Object.assign(new Error("The email address is already in use by another account."), {
          code: "functions/already-exists",
        }),
      )

    await expect(
      actions.registerStaff(SEED_INPUT, runRegisterFn, mockStore),
    ).rejects.toBeInstanceOf(EmployeeActionError)
    expect(mockTxWrites).toHaveLength(0)
  })

  it("a missing/shapeless action response fails loudly", async () => {
    mockRegisterImpl = async () => Promise.resolve({} as never)
    await expect(
      actions.registerStaff(SEED_INPUT, runRegisterFn, mockStore),
    ).rejects.toMatchObject({ code: "internal" })
    expect(mockTxWrites).toHaveLength(0)
  })
})

describe("registerStaff — provisioning never breaks a created account", () => {
  function seededCallableDefaults(uid: string): void {
    for (const [id, title] of [
      ["onboarding_acknowledgment_form", "Onboarding Acknowledgment form"],
      ["signed_offer_letter", "Signed offer letter"],
      ["personal_details", "Personal Details"],
      ["employee_handbook", "Employee Handbook"],
    ]) {
      mockDocStore.set(`users/${uid}/onboarding_tasks/${id}`, {
        id,
        title,
        status: "notStarted",
        updatedAt: "SERVER_TIMESTAMP_MARKER",
      })
    }
    mockDocStore.set(`users/${uid}/trainings/hipaa_compliance`, {
      id: "hipaa_compliance",
      title: "HIPAA Compliance 2026",
      status: "notStarted",
      dueDate: "SERVER_DUE_DATE",
    })
  }

  it("the combined action+client flow settles at exactly 46/19/4 documents", async () => {
    activateAdmin()
    seedUserDoc("e2")
    callableSuccess()
    seededCallableDefaults("e2")

    const result = await actions.registerStaff(SEED_INPUT, runRegisterFn, mockStore)

    expect(result.setup).toBe("complete")
    expect(result.retainedLegacy).toBeUndefined()

    const onboarding = storedDocsUnder("e2", "onboarding_tasks")
    expect(onboarding.size).toBe(46)
    expect(onboarding.has("personal_details")).toBe(false)
    expect(onboarding.has("employee_handbook")).toBe(false)
    const trainings = storedDocsUnder("e2", "trainings")
    expect(trainings.size).toBe(19)
    expect(trainings.has("hipaa")).toBe(true)
    expect(trainings.has("hipaa_compliance")).toBe(false)
    expect(storedDocsUnder("e2", "clearance").size).toBe(4)
    expect(txDeleteOpsFor("e2", "onboarding_tasks")).toHaveLength(2)
    expect(txDeleteOpsFor("e2", "trainings")).toHaveLength(1)
  })

  it("overlapping stub docs are upgraded in place: fields added, status/timestamps preserved", async () => {
    activateAdmin()
    seedUserDoc("e2")
    callableSuccess()
    seededCallableDefaults("e2")
    await actions.registerStaff(SEED_INPUT, runRegisterFn, mockStore)

    const ack = mockDocStore.get("users/e2/onboarding_tasks/onboarding_acknowledgment_form")!
    expect(ack.adminId).toBe("adm-1")
    expect(ack.employeeId).toBe("e2")
    expect(ack.employeeName).toBe("Alex Rivera")
    expect(ack.subtitle).toBe("Signature Required")
    expect(ack.actionType).toBe("acknowledgeSign")
    expect(ack.status).toBe("notStarted")
    expect(ack.updatedAt).toBe("SERVER_TIMESTAMP_MARKER")
  })

  it("REGRESSION: a transaction abort keeps the server-written incomplete status intact", async () => {
    activateAdmin()
    seedUserDoc("e2")
    callableSuccess()
    mockTransactionError = Object.assign(new Error("permission-denied at users/e2"), {
      code: "permission-denied",
    })

    const result = await actions.registerStaff(SEED_INPUT, runRegisterFn, mockStore)

    expect(result).toMatchObject({
      uid: "e2",
      resetLink: "https://reset",
      setup: "incomplete",
    })
    expect(result.setupError).toContain("permission-denied")
    expect(mockDocStore.get("users/e2")).toMatchObject({ setupStatus: "incomplete" })
    expect(mockUpdateDocCalls).toHaveLength(0)
    expect(mockDocStore.get("users/e2")).not.toHaveProperty("resetLink")
  })

  it("a write construction failure keeps the server-written status intact too", async () => {
    activateAdmin()
    seedUserDoc("e2")
    callableSuccess()
    mockTxSetError = new Error("unsupported nested array")

    const result = await actions.registerStaff(SEED_INPUT, runRegisterFn, mockStore)

    expect(result).toMatchObject({ uid: "e2", setup: "incomplete", resetLink: "https://reset" })
    expect(result.setupError).toContain("unsupported nested array")
    expect(mockDocStore.get("users/e2")?.setupStatus).toBe("incomplete")
    expect(mockUpdateDocCalls).toHaveLength(0)
  })

  it("REGRESSION: the gap-fallback fills a MISSING marker in one transaction", async () => {
    activateAdmin()
    callableSuccess()
    mockDocStore.set("users/e2", {
      name: "Alex Rivera",
      email: "alex@staffrail.test",
      role: "employee",
      adminId: "adm-1",
      isActive: true,
    })
    mockTransactionError = new Error("abort")

    const result = await actions.registerStaff(SEED_INPUT, runRegisterFn, mockStore)

    expect(result.setup).toBe("incomplete")
    expect(mockTxWrites.filter((op) => op.path === "users/e2")).toEqual([
      { type: "set", path: "users/e2", data: { setupStatus: "incomplete" }, merge: true },
    ])
    expect(mockDocStore.get("users/e2")?.setupStatus).toBe("incomplete")
    expect(mockDocStore.get("users/e2")).not.toHaveProperty("resetLink")
  })

  it("REGRESSION: an existing complete/incomplete status is never touched", async () => {
    activateAdmin()
    callableSuccess()

    mockDocStore.set("users/e2", {
      name: "Alex Rivera",
      email: "alex@staffrail.test",
      role: "employee",
      adminId: "adm-1",
      isActive: true,
      setupStatus: "complete",
    })
    mockTransactionError = new Error("abort")
    let result = await actions.registerStaff(SEED_INPUT, runRegisterFn, mockStore)

    expect(result.setup).toBe("incomplete")
    expect(mockTxWrites.filter((op) => op.path === "users/e2")).toHaveLength(0)
    expect(mockDocStore.get("users/e2")?.setupStatus).toBe("complete")

    mockTxWrites.length = 0
    mockDocStore.set("users/e2", {
      name: "Alex Rivera",
      email: "alex@staffrail.test",
      role: "employee",
      adminId: "adm-1",
      isActive: true,
      setupStatus: "incomplete",
    })
    mockTransactionError = new Error("abort 2")
    result = await actions.registerStaff(SEED_INPUT, runRegisterFn, mockStore)

    expect(result.setup).toBe("incomplete")
    expect(mockTxWrites.filter((op) => op.path === "users/e2")).toHaveLength(0)
    expect(mockDocStore.get("users/e2")?.setupStatus).toBe("incomplete")
  })

  it("REGRESSION: a complete landing mid-flight wins the revalidation race", async () => {
    activateAdmin()
    callableSuccess()
    mockDocStore.set("users/e2", {
      name: "Alex Rivera",
      email: "alex@staffrail.test",
      role: "employee",
      adminId: "adm-1",
      isActive: true,
    })
    mockTransactionError = new Error("abort")
    mockTransactionContendHook = () => {
      mockDocStore.set("users/e2", { ...mockDocStore.get("users/e2")!, setupStatus: "complete" })
    }

    const result = await actions.registerStaff(SEED_INPUT, runRegisterFn, mockStore)

    expect(result.setup).toBe("incomplete")
    expect(mockDocStore.get("users/e2")?.setupStatus).toBe("complete")
  })

  it("REGRESSION: a deleted employee stays deleted — the fallback never recreates", async () => {
    activateAdmin()
    callableSuccess()
    mockDocStore.set("users/e2", {
      name: "Alex Rivera",
      email: "alex@staffrail.test",
      role: "employee",
      adminId: "adm-1",
      isActive: true,
    })
    mockTransactionError = new Error("abort")
    mockTransactionContendHook = () => {
      mockDocStore.delete("users/e2")
    }

    const result = await actions.registerStaff(SEED_INPUT, runRegisterFn, mockStore)

    expect(result.setup).toBe("incomplete")
    expect(mockDocStore.has("users/e2")).toBe(false)
  })

  it("REGRESSION: a failed fallback does not mask the original setup error", async () => {
    activateAdmin()
    callableSuccess()
    mockDocStore.set("users/e2", {
      name: "Alex Rivera",
      email: "alex@staffrail.test",
      role: "employee",
      adminId: "adm-1",
      isActive: true,
    })
    mockTransactionError = new Error("offline during provisioning")
    mockTransactionContendHook = () => {
      throw Object.assign(new Error("fallback tx aborted"), { code: "unavailable" })
    }

    const result = await actions.registerStaff(SEED_INPUT, runRegisterFn, mockStore)

    expect(result.setup).toBe("incomplete")
    expect(result.setupError).toBe("offline during provisioning")
    expect(mockDocStore.get("users/e2")).not.toHaveProperty("setupStatus")
    expect(mockDocStore.get("users/e2")).not.toHaveProperty("resetLink")
  })

  it("REGRESSION: a legacy default signed after the initial read is retained, not erased", async () => {
    activateAdmin()
    seedUserDoc("e2")
    callableSuccess()
    seededCallableDefaults("e2")
    mockTransactionContendHook = () => {
      mockDocStore.set("users/e2/onboarding_tasks/employee_handbook", {
        title: "Employee Handbook",
        status: "acknowledged",
        isCompleted: true,
        signedAt: "just-now",
        signatureUrl: "https://signed",
      })
    }

    const result = await actions.registerStaff(SEED_INPUT, runRegisterFn, mockStore)

    expect(result.setup).toBe("complete")
    expect(result.retainedLegacy).toEqual(["onboarding_tasks/employee_handbook"])
    const handbook = mockDocStore.get("users/e2/onboarding_tasks/employee_handbook")!
    expect(handbook.isCompleted).toBe(true)
    expect(handbook.signatureUrl).toBe("https://signed")
    expect(handbook.signedAt).toBe("just-now")
    expect(storedDocsUnder("e2", "onboarding_tasks").size).toBe(47)
    expect(mockDocStore.get("users/e2")?.setupStatus).toBe("complete")
  })

  it("REGRESSION: a missing template completed by another client before commit keeps that work", async () => {
    activateAdmin()
    seedUserDoc("e2")
    callableSuccess()
    mockTransactionContendHook = () => {
      mockDocStore.set("users/e2/onboarding_tasks/resume", {
        title: "Resume",
        status: "acknowledged",
        isCompleted: true,
        fileUrl: "https://resume.pdf",
        completedAt: "just-now",
      })
    }

    const result = await actions.registerStaff(SEED_INPUT, runRegisterFn, mockStore)

    expect(result.setup).toBe("complete")
    const resume = mockDocStore.get("users/e2/onboarding_tasks/resume")!
    expect(resume.isCompleted).toBe(true)
    expect(resume.fileUrl).toBe("https://resume.pdf")
    expect(resume.status).toBe("acknowledged")
    expect(resume.adminId).toBe("adm-1")
    expect(resume.subtitle).toBe("Upload Required")
    expect(resume.actionType).toBe("upload")
    expect(mockDocStore.get("users/e2")?.setupStatus).toBe("complete")
  })

  it("legacy docs holding real progress are retained, not destroyed", async () => {
    activateAdmin()
    seedUserDoc("e2")
    callableSuccess()
    seededCallableDefaults("e2")
    mockDocStore.set("users/e2/onboarding_tasks/employee_handbook", {
      title: "Employee Handbook",
      status: "acknowledged",
      isCompleted: true,
      signatureUrl: "https://signed",
    })
    mockDocStore.set("users/e2/trainings/hipaa_compliance", {
      title: "HIPAA Compliance 2026",
      status: "completed",
      completedAt: "yesterday",
    })

    const result = await actions.registerStaff(SEED_INPUT, runRegisterFn, mockStore)

    expect(result.setup).toBe("complete")
    expect(result.retainedLegacy).toEqual([
      "onboarding_tasks/employee_handbook",
      "trainings/hipaa_compliance",
    ])
    expect(mockDocStore.get("users/e2/onboarding_tasks/employee_handbook")?.signatureUrl).toBe(
      "https://signed",
    )
    expect(mockDocStore.get("users/e2/trainings/hipaa_compliance")?.completedAt).toBe("yesterday")
    expect(storedDocsUnder("e2", "onboarding_tasks").has("personal_details")).toBe(false)
  })
})

describe("completeEmployeeSetup (setup retry)", () => {
  function partialEmployee(uid: string): void {
    mockDocStore.set(`users/${uid}`, {
      name: "Alex Rivera",
      email: "alex@staffrail.test",
      role: "employee",
      adminId: "adm-1",
      isActive: true,
      setupStatus: "incomplete",
    })
    activateAdmin()
    for (const [id, title] of [
      ["onboarding_acknowledgment_form", "Onboarding Acknowledgment form"],
      ["signed_offer_letter", "Signed offer letter"],
      ["personal_details", "Personal Details"],
      ["employee_handbook", "Employee Handbook"],
    ]) {
      mockDocStore.set(`users/${uid}/onboarding_tasks/${id}`, {
        id,
        title,
        status: "notStarted",
        updatedAt: "SERVER_TIMESTAMP_MARKER",
      })
    }
    mockDocStore.set(`users/${uid}/onboarding_tasks/acknowledgement_of_transporting_clients`, {
      title: "Acknowledgement of Transporting Clients",
      status: "acknowledged",
      isCompleted: true,
      signatureUrl: "https://signature",
      completedAt: "last-week",
    })
    mockDocStore.set(`users/${uid}/clearance/tb_status_report`, {
      title: "TB Status Report",
      status: "pending",
      fileUrl: "https://upload.pdf",
    })
  }

  it("retry completes setup for the SAME uid — no second Auth account, no duplicates", async () => {
    partialEmployee("e2")

    const outcome = await actions.completeEmployeeSetup({ uid: "e2", adminUid: "adm-1" }, mockStore)

    expect(mockRegisterImpl).toBeNull()
    expect(outcome.created).toBe(65)
    expect(outcome.created + outcome.overlaid).toBe(
      DEFAULT_ONBOARDING_TASKS.length + DEFAULT_TRAININGS.length + DEFAULT_CLEARANCES.length,
    )
    expect(storedDocsUnder("e2", "onboarding_tasks").size).toBe(46)
    expect(storedDocsUnder("e2", "onboarding_tasks").has("driver's_verification")).toBe(true)
    expect(storedDocsUnder("e2", "trainings").size).toBe(19)
    expect(storedDocsUnder("e2", "clearance").size).toBe(4)
    expect(outcome.removed).toBe(2)
    expect(mockDocStore.get("users/e2")?.setupStatus).toBe("complete")
  })

  it("retry is idempotent: completed tasks, signatures, uploads survive untouched", async () => {
    partialEmployee("e2")

    await actions.completeEmployeeSetup({ uid: "e2", adminUid: "adm-1" }, mockStore)

    const progressed = mockDocStore.get("users/e2/onboarding_tasks/acknowledgement_of_transporting_clients")!
    expect(progressed.status).toBe("acknowledged")
    expect(progressed.isCompleted).toBe(true)
    expect(progressed.signatureUrl).toBe("https://signature")
    expect(progressed.completedAt).toBe("last-week")

    const upload = mockDocStore.get("users/e2/clearance/tb_status_report")!
    expect(upload.fileUrl).toBe("https://upload.pdf")
    expect(upload.status).toBe("pending")

    const legacy = mockDocStore.get("users/e2/onboarding_tasks/onboarding_acknowledgment_form")!
    expect(legacy.status).toBe("notStarted")
    expect(legacy.updatedAt).toBe("SERVER_TIMESTAMP_MARKER")
    expect(legacy.adminId).toBe("adm-1")
    expect(legacy.subtitle).toBe("Signature Required")
  })

  it("rejects when the requester's admin profile is missing, inactive, or not an admin", async () => {
    partialEmployee("e2")
    mockDocStore.delete("users/adm-1")
    await expect(
      actions.completeEmployeeSetup({ uid: "e2", adminUid: "adm-1" }, mockStore),
    ).rejects.toMatchObject({ code: "permission-denied" })

    mockDocStore.set("users/adm-1", { role: "admin", isActive: false })
    await expect(
      actions.completeEmployeeSetup({ uid: "e2", adminUid: "adm-1" }, mockStore),
    ).rejects.toMatchObject({ code: "permission-denied" })

    mockDocStore.set("users/adm-1", { role: "employee", isActive: true })
    await expect(
      actions.completeEmployeeSetup({ uid: "e2", adminUid: "adm-1" }, mockStore),
    ).rejects.toMatchObject({ code: "permission-denied" })
    expect(mockTxWrites).toHaveLength(0)
  })

  it("rejects when the employee is missing or owned by another admin", async () => {
    activateAdmin()
    await expect(
      actions.completeEmployeeSetup({ uid: "ghost", adminUid: "adm-1" }, mockStore),
    ).rejects.toMatchObject({ code: "not-found" })

    mockDocStore.set("users/e9", { name: "Other Admin's Person", adminId: "adm-99", isActive: true })
    await expect(
      actions.completeEmployeeSetup({ uid: "e9", adminUid: "adm-1" }, mockStore),
    ).rejects.toMatchObject({ code: "permission-denied" })
    expect(mockTxWrites).toHaveLength(0)
  })
})

describe("updateEmployee (transactional, write-boundary active check)", () => {
  function activeEmployee(uid: string): void {
    mockDocStore.set(`users/${uid}`, {
      name: "Old Name",
      email: "old@x.dev",
      role: "employee",
      adminId: "adm-1",
      isActive: true,
    })
  }

  it("updates only name/email on an active employee", async () => {
    activeEmployee("e2")
    await actions.updateEmployee({ uid: "e2", name: "New Name", email: "new@x.dev" }, mockStore)

    const updated = mockDocStore.get("users/e2")!
    expect(updated.name).toBe("New Name")
    expect(updated.email).toBe("new@x.dev")
    expect(updated.role).toBe("employee")
    expect(updated.adminId).toBe("adm-1")
    expect(updated.isActive).toBe(true)
    expect(mockUpdateDocCalls).toHaveLength(0)
  })

  it("fails with not-found when the employee does not exist", async () => {
    await expect(
      actions.updateEmployee({ uid: "ghost", name: "N", email: "n@x.dev" }, mockStore),
    ).rejects.toMatchObject({ code: "not-found" })
  })

  it("rejects edits to a deactivated profile and writes nothing", async () => {
    activeEmployee("e2")
    mockDocStore.set("users/e2", { ...mockDocStore.get("users/e2")!, isActive: false })

    await expect(
      actions.updateEmployee({ uid: "e2", name: "Should Not Apply", email: "no@x.dev" }, mockStore),
    ).rejects.toMatchObject({
      code: "employee-inactive",
      message: "This employee is deactivated and can no longer be edited.",
    })
    expect(mockDocStore.get("users/e2")?.name).toBe("Old Name")
  })

  it("a deactivation racing the transaction re-validates: the edit cannot bypass it", async () => {
    activeEmployee("e2")
    mockTransactionContendHook = () => {
      mockDocStore.set("users/e2", { ...mockDocStore.get("users/e2")!, isActive: false })
    }

    await expect(
      actions.updateEmployee({ uid: "e2", name: "Raced Name", email: "race@x.dev" }, mockStore),
    ).rejects.toMatchObject({ code: "employee-inactive" })
    expect(mockDocStore.get("users/e2")?.name).toBe("Old Name")
  })

  it("wraps unexpected transaction failures as EmployeeActionError", async () => {
    mockTransactionContendHook = () => {
      throw Object.assign(new Error("inside store"), { code: "unavailable" })
    }
    activeEmployee("e2")
    await expect(
      actions.updateEmployee({ uid: "e2", name: "X", email: "x@x.dev" }, mockStore),
    ).rejects.toMatchObject({ code: "unavailable" })
    expect(mockDocStore.get("users/e2")?.name).toBe("Old Name")
  })
})

describe("deactivateEmployee", () => {
  it("soft-deletes: isActive false + deletedAt server timestamp", async () => {
    await actions.deactivateEmployee("e2", mockStore)
    expect(mockUpdateDocCalls).toHaveLength(1)
    expect(mockUpdateDocCalls[0].path).toBe("users/e2")
    expect(mockUpdateDocCalls[0].data.isActive).toBe(false)
    expect(mockUpdateDocCalls[0].data.deletedAt).toBe(serverNow())
  })

  it("surfaces permission-denied distinctly", async () => {
    mockUpdateDocImpl = () =>
      Promise.reject(Object.assign(new Error("denied"), { code: "permission-denied" }))
    await expect(actions.deactivateEmployee("e2", mockStore)).rejects.toMatchObject({
      code: "permission-denied",
    })
  })
})
