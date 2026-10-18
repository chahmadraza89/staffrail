/**
 * Employee lifecycle action tests. Firestore and Cloud Functions are faked
 * with RECORDING + STATEFUL doubles: batch set/delete apply to an in-memory
 * doc store (including merge semantics), and runTransaction detects
 * concurrent mutations before commit and re-runs the transaction body —
 * mirroring real Firestore optimistic-concurrency semantics — so register /
 * setup-retry / edit races are exercised through the REAL code paths.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

import * as actions from "@/lib/admin/employee-actions"
import { EmployeeActionError } from "@/lib/admin/employee-actions"
import {
  DEFAULT_CLEARANCES,
  DEFAULT_ONBOARDING_TASKS,
  DEFAULT_TRAININGS,
} from "@/lib/admin/seed-templates"

type Stored = Record<string, unknown> | undefined

const mockDocStore = new Map<string, Record<string, unknown>>()

interface MockBatchOp {
  type: "set" | "delete"
  path: string
  data?: Record<string, unknown>
  merge: boolean
}
const mockBatchOps: MockBatchOp[] = []

const mockUpdateDocCalls: Array<{ ref: { path: string }; data: Record<string, unknown> }> = []

const mockFirestore = { kind: "firestore" }
const mockFunctions = { kind: "functions" }

let mockCallableImpl: ((payload: unknown) => Promise<{ data: unknown }>) | null = null
let mockBatchSetError: Error | null = null
let mockCommitError: Error | null = null
/** Simulates ANOTHER client writing between the transaction read and commit. */
let mockTransactionContendHook: (() => void) | null = null
let mockUpdateDocImpl: (
  reference: { path: string },
  data: Record<string, unknown>,
) => Promise<void> = (reference, data) => {
  mockUpdateDocCalls.push({ ref: reference, data })
  return Promise.resolve()
}

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseFirestore: () => mockFirestore,
  getFirebaseFunctions: () => mockFunctions,
  getFirebaseAuth: () => ({ currentUser: null }),
}))

vi.mock("firebase/firestore", () => {
  return {
    collection: () => ({ kind: "collection" }),
    doc: (_db: unknown, ...segments: unknown[]) => ({ kind: "doc", path: segments.join("/") }),
    serverTimestamp: () => "SERVER_TIMESTAMP",
    getDoc: (reference: { path: string }) =>
      Promise.resolve(
        mockDocStore.has(reference.path)
          ? {
              exists: () => true,
              data: () => mockDocStore.get(reference.path)!,
              ref: reference,
            }
          : {
              exists: () => false,
              data: () => undefined,
              ref: reference,
            },
      ),
    updateDoc: (reference: { path: string }, data: Record<string, unknown>) =>
      mockUpdateDocImpl(reference, data),
    writeBatch: () => ({
      set: (
        reference: { path: string },
        data: Record<string, unknown>,
        options?: { merge?: boolean },
      ) => {
        if (mockBatchSetError) {
          throw mockBatchSetError
        }
        mockBatchOps.push({
          type: "set",
          path: reference.path,
          data,
          merge: options?.merge === true,
        })
      },
      delete: (reference: { path: string }) => {
        mockBatchOps.push({ type: "delete", path: reference.path, merge: false })
      },
      commit: () => {
        if (mockCommitError) {
          return Promise.reject(mockCommitError)
        }
        for (const op of mockBatchOps) {
          if (op.type === "delete") {
            mockDocStore.delete(op.path)
          } else if (op.merge) {
            mockDocStore.set(op.path, { ...mockDocStore.get(op.path), ...op.data })
          } else {
            mockDocStore.set(op.path, { ...op.data })
          }
        }
        // Ops stay recorded (reset in beforeEach) so tests can assert the
        // planned writes after a successful commit.
        return Promise.resolve()
      },
    }),
    /** Optimistic concurrency: reads snapshot at get() time; a mutation to
     * any read doc before commit discards the writes and re-runs the body. */
    runTransaction: async (
      _db: unknown,
      transactionFn: (transaction: unknown) => unknown,
    ): Promise<unknown> => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const reads = new Map<string, Stored>()
        const writes: Array<{ ref: { path: string }; data: Record<string, unknown> }> = []
        const transaction = {
          get: async (reference: { path: string }) => {
            const data = mockDocStore.get(reference.path)
            reads.set(reference.path, data)
            return {
              exists: () => data !== undefined,
              data: () => data,
              ref: reference,
            }
          },
          update: (reference: { path: string }, data: Record<string, unknown>) => {
            writes.push({ ref: reference, data })
          },
        }
        // App-thrown errors abort the transaction and propagate.
        const outcome = await transactionFn(transaction)
        mockTransactionContendHook?.()
        const conflict = [...reads.entries()].some(
          ([path, seen]) => mockDocStore.get(path) !== seen,
        )
        if (conflict) {
          continue // writes discarded, transaction body re-runs
        }
        for (const write of writes) {
          mockDocStore.set(write.ref.path, { ...mockDocStore.get(write.ref.path), ...write.data })
        }
        return outcome
      }
      throw new Error("transaction contention exhausted")
    },
  }
})

vi.mock("firebase/functions", () => ({
  httpsCallable: (
    _functions: unknown,
    name: string,
  ) => {
    if (name !== "registerStaff") {
      throw new Error(`unexpected callable: ${name}`)
    }
    return (payload: unknown) => {
      if (!mockCallableImpl) {
        return Promise.reject(new Error("callable not configured"))
      }
      return mockCallableImpl(payload)
    }
  },
}))

beforeEach(() => {
  mockDocStore.clear()
  mockBatchOps.length = 0
  mockUpdateDocCalls.length = 0
  mockCallableImpl = null
  mockBatchSetError = null
  mockCommitError = null
  mockTransactionContendHook = null
  mockUpdateDocImpl = (reference, data) => {
    mockUpdateDocCalls.push({ ref: reference, data })
    return Promise.resolve()
  }
  vi.spyOn(console, "warn").mockImplementation(() => {})
})

const SEED_INPUT = { name: "Ahmad Raza", email: "ahmad@bhmh.dev", adminUid: "adm-1" }

/** The signed-in admin's user doc — provisioning requires an active admin. */
function activateAdmin(): void {
  mockDocStore.set("users/adm-1", { name: "Admin", role: "admin", isActive: true })
}

function callableSuccess(uid = "e2", resetLink: string | null = "https://reset"): void {
  mockCallableImpl = async (payload) => {
    expect(payload).toEqual({ email: "ahmad@bhmh.dev", name: "Ahmad Raza", role: "employee" })
    return Promise.resolve({ data: { success: true, uid, resetLink } })
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

function batchSetOpsFor(worker: string, subcollection: string): MockBatchOp[] {
  return mockBatchOps.filter((op) => op.type === "set" && op.path.startsWith(`users/${worker}/${subcollection}/`))
}

describe("registerStaff — templates and legacy resolution", () => {
  it("calls the callable with the employee payload and provisions the full templates", async () => {
    activateAdmin()
    callableSuccess()

    const result = await actions.registerStaff(SEED_INPUT, mockFunctions as never, mockFirestore as never)

    expect(result.setup).toBe("complete")
    expect(result.uid).toBe("e2")
    expect(result.resetLink).toBe("https://reset")
    // Every provisioned doc stamped with the signed-in admin's uid + server
    // timestamps (parity with the Flutter seeding).
    const firstTaskSet = batchSetOpsFor("e2", "onboarding_tasks")[0]
    expect(firstTaskSet.data?.adminId).toBe("adm-1")
    expect(firstTaskSet.data?.employeeId).toBe("e2")
    expect(firstTaskSet.data?.updatedAt).toBe("SERVER_TIMESTAMP")
    expect(firstTaskSet.data?.subtitle).toBe("Signature Required")
    expect(batchSetOpsFor("e2", "onboarding_tasks")).toHaveLength(DEFAULT_ONBOARDING_TASKS.length)
    expect(batchSetOpsFor("e2", "trainings")).toHaveLength(DEFAULT_TRAININGS.length)
    expect(batchSetOpsFor("e2", "clearance")).toHaveLength(DEFAULT_CLEARANCES.length)
    expect(mockBatchOps).toHaveLength(69)
  })

  it("uses the exact template doc IDs (parity with the employee app)", async () => {
    activateAdmin()
    callableSuccess()
    await actions.registerStaff(SEED_INPUT, mockFunctions as never, mockFirestore as never)

    const taskIds = [...storedDocsUnder("e2", "onboarding_tasks").keys()]
    // Driver's Verification is load-bearing in the Flutter migration path.
    expect(taskIds).toContain("driver's_verification")
    expect(taskIds).toContain("tax_documents_i_9")
    const trainingIds = [...storedDocsUnder("e2", "trainings").keys()]
    expect(trainingIds).toContain("start")
    expect(storedDocsUnder("e2", "clearance").keys()).toContain("tb_status_report")
  })

  it("propagates callable failures as EmployeeActionError without provisioning", async () => {
    mockCallableImpl = async () =>
      Promise.reject(
        Object.assign(new Error("The email address is already in use by another account."), {
          code: "functions/already-exists",
        }),
      )

    await expect(
      actions.registerStaff(SEED_INPUT, mockFunctions as never, mockFirestore as never),
    ).rejects.toBeInstanceOf(EmployeeActionError)
    expect(mockBatchOps).toHaveLength(0)
  })

  it("a missing/shapeless callable response fails loudly", async () => {
    mockCallableImpl = async () => Promise.resolve({ data: {} })
    await expect(
      actions.registerStaff(SEED_INPUT, mockFunctions as never, mockFirestore as never),
    ).rejects.toMatchObject({ code: "internal" })
    expect(mockBatchOps).toHaveLength(0)
  })
})

describe("registerStaff — provisioning never breaks a created account", () => {
  /**
   * The `registerStaff` callable's legacy initial batch, exactly as
   * functions/src/index.ts writes it for a fresh uid.
   */
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
        updatedAt: "CF_SERVER_TIMESTAMP",
      })
    }
    mockDocStore.set(`users/${uid}/trainings/hipaa_compliance`, {
      id: "hipaa_compliance",
      title: "HIPAA Compliance 2026",
      status: "notStarted",
      dueDate: "CF_DUE_DATE",
    })
  }

  it("the combined callable+client flow settles at exactly 46/19/4 documents", async () => {
    activateAdmin()
    callableSuccess()
    seededCallableDefaults("e2") // callable adds 4 tasks + 1 training first

    const result = await actions.registerStaff(SEED_INPUT, mockFunctions as never, mockFirestore as never)

    expect(result.setup).toBe("complete")
    expect(result.retainedLegacy).toBeUndefined()

    const onboarding = storedDocsUnder("e2", "onboarding_tasks")
    expect(onboarding.size).toBe(46)
    // The three callable-only extras are resolved by provisioning.
    expect(onboarding.has("personal_details")).toBe(false)
    expect(onboarding.has("employee_handbook")).toBe(false)
    const trainings = storedDocsUnder("e2", "trainings")
    expect(trainings.size).toBe(19)
    expect(trainings.has("hipaa")).toBe(true)
    expect(trainings.has("hipaa_compliance")).toBe(false)
    expect(storedDocsUnder("e2", "clearance").size).toBe(4)
  })

  it("overlapping callable docs are upgraded in place: fields added, status/timestamps preserved", async () => {
    activateAdmin()
    callableSuccess()
    seededCallableDefaults("e2")
    await actions.registerStaff(SEED_INPUT, mockFunctions as never, mockFirestore as never)

    const ack = mockDocStore.get("users/e2/onboarding_tasks/onboarding_acknowledgment_form")!
    // The callable's minimal doc now carries the full template metadata.
    expect(ack.adminId).toBe("adm-1")
    expect(ack.employeeId).toBe("e2")
    expect(ack.employeeName).toBe("Ahmad Raza")
    expect(ack.subtitle).toBe("Signature Required")
    expect(ack.actionType).toBe("acknowledgeSign")
    // Progress-bearing fields are untouched by the overlay.
    expect(ack.status).toBe("notStarted")
    expect(ack.updatedAt).toBe("CF_SERVER_TIMESTAMP")
  })

  it("a batch commit failure reports setup:'incomplete' but preserves uid + reset link", async () => {
    activateAdmin()
    callableSuccess()
    mockCommitError = Object.assign(new Error("permission-denied at users/e2"), { code: "permission-denied" })

    const result = await actions.registerStaff(SEED_INPUT, mockFunctions as never, mockFirestore as never)

    expect(result).toMatchObject({
      uid: "e2",
      resetLink: "https://reset",
      setup: "incomplete",
    })
    expect(result.setupError).toContain("permission-denied")
  })

  it("a batch construction failure is treated the same as a commit failure", async () => {
    activateAdmin()
    callableSuccess()
    mockBatchSetError = new Error("unsupported nested array")

    const result = await actions.registerStaff(SEED_INPUT, mockFunctions as never, mockFirestore as never)

    expect(result).toMatchObject({ uid: "e2", setup: "incomplete", resetLink: "https://reset" })
    expect(result.setupError).toContain("unsupported nested array")
  })

  it("legacy docs holding real progress are retained, not destroyed", async () => {
    activateAdmin()
    callableSuccess()
    seededCallableDefaults("e2")
    // An admin already recorded work inside a legacy doc (Flutter flow).
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

    const result = await actions.registerStaff(SEED_INPUT, mockFunctions as never, mockFirestore as never)

    expect(result.setup).toBe("complete")
    expect(result.retainedLegacy).toEqual([
      "onboarding_tasks/employee_handbook",
      "trainings/hipaa_compliance",
    ])
    expect(mockDocStore.get("users/e2/onboarding_tasks/employee_handbook")?.signatureUrl).toBe(
      "https://signed",
    )
    expect(mockDocStore.get("users/e2/trainings/hipaa_compliance")?.completedAt).toBe("yesterday")
    // The untouched legacy default (personal_details) is still resolved away.
    expect(storedDocsUnder("e2", "onboarding_tasks").has("personal_details")).toBe(false)
  })
})

describe("completeEmployeeSetup (setup retry)", () => {
  /**
   * A partially provisioned employee: some templates created, progress made
   * on one, two templates missing — the state after an interrupted seeding.
   */
  function partialEmployee(uid: string): void {
    mockDocStore.set(`users/${uid}`, {
      name: "Ahmad Raza",
      email: "ahmad@bhmh.dev",
      role: "employee",
      adminId: "adm-1",
      isActive: true,
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
        updatedAt: "CF_SERVER_TIMESTAMP",
      })
    }
    // Progressed template doc that retry MUST NOT touch.
    mockDocStore.set(`users/${uid}/onboarding_tasks/acknowledgement_of_transporting_clients`, {
      title: "Acknowledgement of Transporting Clients",
      status: "acknowledged",
      isCompleted: true,
      signatureUrl: "https://signature",
      completedAt: "last-week",
    })
    // One clearance doc provisioned before the partial failure.
    mockDocStore.set(`users/${uid}/clearance/tb_status_report`, {
      title: "TB Status Report",
      status: "pending",
      fileUrl: "https://upload.pdf",
    })
  }

  it("retry completes setup for the SAME uid — no second Auth account, no duplicates", async () => {
    partialEmployee("e2")

    const outcome = await actions.completeEmployeeSetup({ uid: "e2", adminUid: "adm-1" }, mockFirestore as never)

    // Only the missing docs were (re)written — create-missing/overlay-only
    // semantics. Existing: 3 task templates (2 legacy + 1 progressed) and
    // 1 clearance → created = 43 tasks + 19 trainings + 3 clearances.
    expect(mockCallableImpl).toBeNull() // registerStaff callable not invoked
    expect(outcome.created).toBe(65)
    expect(outcome.created + outcome.overlaid).toBe(
      DEFAULT_ONBOARDING_TASKS.length + DEFAULT_TRAININGS.length + DEFAULT_CLEARANCES.length,
    )
    // Legacy defaults resolved; none retained (all pristine).
    expect(storedDocsUnder("e2", "onboarding_tasks").size).toBe(46)
    expect(storedDocsUnder("e2", "onboarding_tasks").has("driver's_verification")).toBe(true)
    expect(storedDocsUnder("e2", "trainings").size).toBe(19)
    expect(storedDocsUnder("e2", "clearance").size).toBe(4)
    expect(outcome.removed).toBe(2) // the callable's legacy onboarding stubs
  })

  it("retry is idempotent: completed tasks, signatures, uploads survive untouched", async () => {
    partialEmployee("e2")

    await actions.completeEmployeeSetup({ uid: "e2", adminUid: "adm-1" }, mockFirestore as never)

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
    expect(legacy.updatedAt).toBe("CF_SERVER_TIMESTAMP")
    expect(legacy.adminId).toBe("adm-1")
    expect(legacy.subtitle).toBe("Signature Required")
  })

  it("rejects when the requester's admin profile is missing, inactive, or not an admin", async () => {
    partialEmployee("e2")
    mockDocStore.delete("users/adm-1")
    await expect(
      actions.completeEmployeeSetup({ uid: "e2", adminUid: "adm-1" }, mockFirestore as never),
    ).rejects.toMatchObject({ code: "permission-denied" })

    mockDocStore.set("users/adm-1", { role: "admin", isActive: false })
    await expect(
      actions.completeEmployeeSetup({ uid: "e2", adminUid: "adm-1" }, mockFirestore as never),
    ).rejects.toMatchObject({ code: "permission-denied" })

    mockDocStore.set("users/adm-1", { role: "employee", isActive: true })
    await expect(
      actions.completeEmployeeSetup({ uid: "e2", adminUid: "adm-1" }, mockFirestore as never),
    ).rejects.toMatchObject({ code: "permission-denied" })
    expect(mockBatchOps).toHaveLength(0)
  })

  it("rejects when the employee is missing or owned by another admin", async () => {
    activateAdmin()
    await expect(
      actions.completeEmployeeSetup({ uid: "ghost", adminUid: "adm-1" }, mockFirestore as never),
    ).rejects.toMatchObject({ code: "not-found" })

    mockDocStore.set("users/e9", { name: "Other Admin's Person", adminId: "adm-99", isActive: true })
    await expect(
      actions.completeEmployeeSetup({ uid: "e9", adminUid: "adm-1" }, mockFirestore as never),
    ).rejects.toMatchObject({ code: "permission-denied" })
    expect(mockBatchOps).toHaveLength(0)
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
    await actions.updateEmployee({ uid: "e2", name: "New Name", email: "new@x.dev" }, mockFirestore as never)

    const updated = mockDocStore.get("users/e2")!
    expect(updated.name).toBe("New Name")
    expect(updated.email).toBe("new@x.dev")
    // Role, ownership, activation, everything else preserved.
    expect(updated.role).toBe("employee")
    expect(updated.adminId).toBe("adm-1")
    expect(updated.isActive).toBe(true)
    expect(mockUpdateDocCalls).toHaveLength(0)
  })

  it("fails with not-found when the employee does not exist", async () => {
    await expect(
      actions.updateEmployee({ uid: "ghost", name: "N", email: "n@x.dev" }, mockFirestore as never),
    ).rejects.toMatchObject({ code: "not-found" })
  })

  it("rejects edits to a deactivated profile and writes nothing", async () => {
    activeEmployee("e2")
    mockDocStore.set("users/e2", { ...mockDocStore.get("users/e2")!, isActive: false })

    await expect(
      actions.updateEmployee({ uid: "e2", name: "Should Not Apply", email: "no@x.dev" }, mockFirestore as never),
    ).rejects.toMatchObject({
      code: "employee-inactive",
      message: "This employee is deactivated and can no longer be edited.",
    })
    expect(mockDocStore.get("users/e2")?.name).toBe("Old Name")
  })

  it("a deactivation racing the transaction re-validates: the edit cannot bypass it", async () => {
    activeEmployee("e2")
    // Another client deactivates the profile after our read, before commit.
    mockTransactionContendHook = () => {
      mockDocStore.set("users/e2", { ...mockDocStore.get("users/e2")!, isActive: false })
    }

    await expect(
      actions.updateEmployee({ uid: "e2", name: "Raced Name", email: "race@x.dev" }, mockFirestore as never),
    ).rejects.toMatchObject({ code: "employee-inactive" })
    // The first attempt's write was discarded — never applied.
    expect(mockDocStore.get("users/e2")?.name).toBe("Old Name")
  })

  it("wraps unexpected transaction failures as EmployeeActionError", async () => {
    // A hook error mid-transaction aborts and surfaces the SDK code.
    mockTransactionContendHook = () => {
      throw Object.assign(new Error("inside sdk"), { code: "unavailable" })
    }
    activeEmployee("e2")
    await expect(
      actions.updateEmployee({ uid: "e2", name: "X", email: "x@x.dev" }, mockFirestore as never),
    ).rejects.toMatchObject({ code: "unavailable" })
    expect(mockDocStore.get("users/e2")?.name).toBe("Old Name")
  })
})

describe("deactivateEmployee", () => {
  it("soft-deletes: isActive false + deletedAt server timestamp", async () => {
    await actions.deactivateEmployee("e2", mockFirestore as never)
    expect(mockUpdateDocCalls).toHaveLength(1)
    expect(mockUpdateDocCalls[0].ref.path).toBe("users/e2")
    expect(mockUpdateDocCalls[0].data).toEqual({
      isActive: false,
      deletedAt: "SERVER_TIMESTAMP",
    })
  })

  it("surfaces permission-denied distinctly", async () => {
    mockUpdateDocImpl = () =>
      Promise.reject(Object.assign(new Error("denied"), { code: "permission-denied" }))
    await expect(actions.deactivateEmployee("e2", mockFirestore as never)).rejects.toMatchObject({
      code: "permission-denied",
    })
  })
})
