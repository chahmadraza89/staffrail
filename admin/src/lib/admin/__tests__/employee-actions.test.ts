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

const mockUpdateDocCalls: Array<{ ref: { path: string }; data: Record<string, unknown> }> = []

const mockFirestore = { kind: "firestore" }
const mockFunctions = { kind: "functions" }

let mockCallableImpl: ((payload: unknown) => Promise<{ data: unknown }>) | null = null
let mockTxSetError: Error | null = null
/** Aborts the whole transaction before the body runs (commit-level failure). */
let mockTransactionError: Error | null = null
/** Simulates ANOTHER client writing between the first transaction read
 * pass and the commit — exactly once, on the first attempt. */
let mockTransactionContendHook: (() => void) | null = null
let mockUpdateDocImpl: (
  reference: { path: string },
  data: Record<string, unknown>,
) => Promise<void> = (reference, data) => {
  mockUpdateDocCalls.push({ ref: reference, data })
  // updateDoc = merge into the store (mirrors Firestore's field merge).
  mockDocStore.set(reference.path, { ...mockDocStore.get(reference.path), ...data })
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
    /** Optimistic concurrency: reads snapshot at get() time; a mutation to
     * any read doc before commit discards the writes and re-runs the body
     * (single simultaneous writer, on the first attempt, via the hook).
     * Transaction writes support set (merge or not) and delete. */
    runTransaction: async (
      _db: unknown,
      transactionFn: (transaction: unknown) => unknown,
    ): Promise<unknown> => {
      if (mockTransactionError) {
        return Promise.reject(mockTransactionError)
      }
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const reads = new Map<string, Stored>()
        const writes: MockBatchOp[] = []
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
          set: (
            reference: { path: string },
            data: Record<string, unknown>,
            options?: { merge?: boolean },
          ) => {
            if (mockTxSetError) {
              throw mockTxSetError
            }
            const op: MockBatchOp = {
              type: "set",
              path: reference.path,
              data,
              merge: options?.merge === true,
            }
            writes.push(op)
            mockTxWrites.push(op)
          },
          delete: (reference: { path: string }) => {
            const op: MockBatchOp = { type: "delete", path: reference.path, merge: false }
            writes.push(op)
            mockTxWrites.push(op)
          },
          update: (reference: { path: string }, data: Record<string, unknown>) => {
            writes.push({
              type: "set",
              path: reference.path,
              data,
              merge: true,
            })
          },
        }
        // App-thrown errors abort the transaction and propagate.
        const outcome = await transactionFn(transaction)
        // Single racing writer between the first read pass and the commit.
        if (attempt === 0) {
          mockTransactionContendHook?.()
        }
        const conflict = [...reads.entries()].some(
          ([path, seen]) => mockDocStore.get(path) !== seen,
        )
        if (conflict) {
          continue // writes discarded, transaction body re-runs
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
  mockTxWrites.length = 0
  mockUpdateDocCalls.length = 0
  mockCallableImpl = null
  mockTxSetError = null
  mockTransactionError = null
  mockTransactionContendHook = null
  mockUpdateDocImpl = (reference, data) => {
    mockUpdateDocCalls.push({ ref: reference, data })
    mockDocStore.set(reference.path, { ...mockDocStore.get(reference.path), ...data })
    return Promise.resolve()
  }
  vi.spyOn(console, "warn").mockImplementation(() => {})
})

const SEED_INPUT = { name: "Ahmad Raza", email: "ahmad@bhmh.dev", adminUid: "adm-1" }

/** The signed-in admin's user doc — provisioning requires an active admin. */
function activateAdmin(): void {
  mockDocStore.set("users/adm-1", { name: "Admin", role: "admin", isActive: true })
}

/**
 * The employee's user doc the `registerStaff` callable creates BEFORE the
 * client provisions documents (always exists at provisioning time).
 */
function seedUserDoc(uid: string): void {
  mockDocStore.set(`users/${uid}`, {
    name: "Ahmad Raza",
    email: "ahmad@bhmh.dev",
    role: "employee",
    adminId: "adm-1",
    isActive: true,
    // Written by the (deployed) callable before returning success.
    setupStatus: "incomplete",
  })
}

function callableSuccess(uid = "e2", resetLink: string | null = "https://reset"): void {
  mockCallableImpl = async (payload) => {
    // Explicit web-flow option; the callable then writes the server marker.
    expect(payload).toEqual({
      email: "ahmad@bhmh.dev",
      name: "Ahmad Raza",
      role: "employee",
      webProvisioning: true,
    })
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

function txSetOpsFor(worker: string, subcollection: string): MockBatchOp[] {
  return mockTxWrites.filter((op) => op.type === "set" && op.path.startsWith(`users/${worker}/${subcollection}/`))
}

function txDeleteOpsFor(worker: string, subcollection: string): MockBatchOp[] {
  return mockTxWrites.filter((op) => op.type === "delete" && op.path.startsWith(`users/${worker}/${subcollection}/`))
}

describe("registerStaff — templates and legacy resolution", () => {
  it("calls the callable with the employee payload and provisions the full templates in one transaction", async () => {
    activateAdmin()
    seedUserDoc("e2")
    callableSuccess()

    const result = await actions.registerStaff(SEED_INPUT, mockFunctions as never, mockFirestore as never)

    expect(result.setup).toBe("complete")
    expect(result.uid).toBe("e2")
    expect(result.resetLink).toBe("https://reset")
    // Every provisioned doc stamped with the signed-in admin's uid + server
    // timestamps (parity with the Flutter seeding).
    const firstTaskSet = txSetOpsFor("e2", "onboarding_tasks")[0]
    expect(firstTaskSet.data?.adminId).toBe("adm-1")
    expect(firstTaskSet.data?.employeeId).toBe("e2")
    expect(firstTaskSet.data?.updatedAt).toBe("SERVER_TIMESTAMP")
    expect(firstTaskSet.data?.subtitle).toBe("Signature Required")
    expect(txSetOpsFor("e2", "onboarding_tasks")).toHaveLength(DEFAULT_ONBOARDING_TASKS.length)
    expect(txSetOpsFor("e2", "trainings")).toHaveLength(DEFAULT_TRAININGS.length)
    expect(txSetOpsFor("e2", "clearance")).toHaveLength(DEFAULT_CLEARANCES.length)
    // Setup status flips to complete in the SAME transaction, on success only.
    expect(mockDocStore.get("users/e2")?.setupStatus).toBe("complete")
  })

  it("uses the exact template doc IDs (parity with the employee app)", async () => {
    activateAdmin()
    seedUserDoc("e2")
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
    expect(mockTxWrites).toHaveLength(0)
  })

  it("a missing/shapeless callable response fails loudly", async () => {
    mockCallableImpl = async () => Promise.resolve({ data: {} })
    await expect(
      actions.registerStaff(SEED_INPUT, mockFunctions as never, mockFirestore as never),
    ).rejects.toMatchObject({ code: "internal" })
    expect(mockTxWrites).toHaveLength(0)
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
    seedUserDoc("e2")
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
    expect(txDeleteOpsFor("e2", "onboarding_tasks")).toHaveLength(2)
    expect(txDeleteOpsFor("e2", "trainings")).toHaveLength(1)
  })

  it("overlapping callable docs are upgraded in place: fields added, status/timestamps preserved", async () => {
    activateAdmin()
    seedUserDoc("e2")
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

  it("REGRESSION: a transaction abort keeps the server-written incomplete status intact", async () => {
    activateAdmin()
    seedUserDoc("e2")
    callableSuccess()
    // Commit-level failure: the transaction cannot run at all.
    mockTransactionError = Object.assign(new Error("permission-denied at users/e2"), {
      code: "permission-denied",
    })

    const result = await actions.registerStaff(SEED_INPUT, mockFunctions as never, mockFirestore as never)

    expect(result).toMatchObject({
      uid: "e2",
      resetLink: "https://reset",
      setup: "incomplete",
    })
    expect(result.setupError).toContain("permission-denied")
    // The marker was written by the deployed callable BEFORE returning —
    // the failed client provisioning leaves it UNTOUCHED (no
    // post-failure marker write ran, and the reset link is not stored).
    expect(mockDocStore.get("users/e2")).toMatchObject({ setupStatus: "incomplete" })
    expect(mockUpdateDocCalls).toHaveLength(0)
    expect(mockDocStore.get("users/e2")).not.toHaveProperty("resetLink")
  })

  it("a write construction failure keeps the server-written status intact too", async () => {
    activateAdmin()
    seedUserDoc("e2")
    callableSuccess()
    mockTxSetError = new Error("unsupported nested array")

    const result = await actions.registerStaff(SEED_INPUT, mockFunctions as never, mockFirestore as never)

    expect(result).toMatchObject({ uid: "e2", setup: "incomplete", resetLink: "https://reset" })
    expect(result.setupError).toContain("unsupported nested array")
    expect(mockDocStore.get("users/e2")?.setupStatus).toBe("incomplete")
    expect(mockUpdateDocCalls).toHaveLength(0)
  })

  it("REGRESSION: the gap-fallback fills ONLY a MISSING marker, never overwrites", async () => {
    activateAdmin()
    callableSuccess() // pre-deploy backend: no server-side marker was written
    mockDocStore.set("users/e2", {
      name: "Ahmad Raza",
      email: "ahmad@bhmh.dev",
      role: "employee",
      adminId: "adm-1",
      isActive: true,
    })
    mockTransactionError = new Error("abort")

    let result = await actions.registerStaff(SEED_INPUT, mockFunctions as never, mockFirestore as never)
    expect(result.setup).toBe("incomplete")
    // Missing field → filled best-effort so recovery is reachable.
    expect(mockUpdateDocCalls[0]?.data).toEqual({ setupStatus: "incomplete" })
    expect(mockDocStore.get("users/e2")?.setupStatus).toBe("incomplete")

    // …but a marker from ANOTHER attempt's successful completion is never
    // overwritten by this attempt's failure handler.
    mockUpdateDocCalls.length = 0
    mockDocStore.set("users/e2", {
      name: "Ahmad Raza",
      role: "employee",
      adminId: "adm-1",
      isActive: true,
      setupStatus: "complete",
    })
    result = await actions.registerStaff(SEED_INPUT, mockFunctions as never, mockFirestore as never)
    expect(result.setup).toBe("incomplete")
    expect(mockUpdateDocCalls).toHaveLength(0) // field present → no write
    expect(mockDocStore.get("users/e2")?.setupStatus).toBe("complete")
  })

  it("REGRESSION: provisioning AND the fallback client write both fail — status left intact", async () => {
    activateAdmin()
    callableSuccess() // pre-deploy backend: no server-side marker exists yet
    mockDocStore.set("users/e2", {
      name: "Ahmad Raza",
      email: "ahmad@bhmh.dev",
      role: "employee",
      adminId: "adm-1",
      isActive: true,
      // A previous interrupted attempt's best-effort marker: still incomplete
      setupStatus: "incomplete",
    })
    mockTransactionError = new Error("abort")
    // Any follow-up client write attempt is ALSO rejected by the network —
    // but no failure handler may overwrite or repair the status wrongly.
    mockUpdateDocImpl = (reference, data) => {
      mockUpdateDocCalls.push({ ref: reference, data })
      return Promise.reject(Object.assign(new Error("offline"), { code: "unavailable" }))
    }

    const result = await actions.registerStaff(SEED_INPUT, mockFunctions as never, mockFirestore as never)
    expect(result.setup).toBe("incomplete")
    // The server-written (here: pre-deploy fallback) "incomplete" survives
    // untouched — recovery stays reachable once connectivity returns.
    expect(mockDocStore.get("users/e2")?.setupStatus).toBe("incomplete")
    expect(mockDocStore.get("users/e2")).not.toHaveProperty("resetLink")
  })

  it("REGRESSION: a legacy default signed after the initial read is retained, not erased", async () => {
    activateAdmin()
    seedUserDoc("e2")
    callableSuccess()
    seededCallableDefaults("e2")
    // A pristine legacy doc becomes SIGNED by another client between the
    // transaction's read pass and its commit.
    mockTransactionContendHook = () => {
      mockDocStore.set("users/e2/onboarding_tasks/employee_handbook", {
        title: "Employee Handbook",
        status: "acknowledged",
        isCompleted: true,
        signedAt: "just-now",
        signatureUrl: "https://signed",
      })
    }

    const result = await actions.registerStaff(SEED_INPUT, mockFunctions as never, mockFirestore as never)

    expect(result.setup).toBe("complete")
    expect(result.retainedLegacy).toEqual(["onboarding_tasks/employee_handbook"])
    // The signature survived — the delete was discarded on contention and
    // the re-validated plan kept the doc.
    const handbook = mockDocStore.get("users/e2/onboarding_tasks/employee_handbook")!
    expect(handbook.isCompleted).toBe(true)
    expect(handbook.signatureUrl).toBe("https://signed")
    expect(handbook.signedAt).toBe("just-now")
    // Only the still-pristine `personal_details` got deleted: 4 seeded
    // legacy docs + 44 created templates − 1 delete = 47.
    expect(storedDocsUnder("e2", "onboarding_tasks").size).toBe(47)
    expect(mockDocStore.get("users/e2")?.setupStatus).toBe("complete")
  })

  it("REGRESSION: a missing template completed by another client before commit keeps that work", async () => {
    activateAdmin()
    seedUserDoc("e2")
    callableSuccess()
    // Fresh employee: every template is missing. Another client completes
    // the Resume task between the read pass and the commit.
    mockTransactionContendHook = () => {
      mockDocStore.set("users/e2/onboarding_tasks/resume", {
        title: "Resume",
        status: "acknowledged",
        isCompleted: true,
        fileUrl: "https://resume.pdf",
        completedAt: "just-now",
      })
    }

    const result = await actions.registerStaff(SEED_INPUT, mockFunctions as never, mockFirestore as never)

    expect(result.setup).toBe("complete")
    // The create was re-planned as an overlay after revalidation: employee
    // work intact, descriptive/ownership fields still filled in.
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
      // Written by the deployed callable at registration; the successful
      // retry below must flip it ATOMICALLY, only after provisioning works.
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
    // Recovery marked complete INSIDE the successful provisioning
    // transaction — atomically with the documents it created.
    expect(mockDocStore.get("users/e2")?.setupStatus).toBe("complete")
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
    expect(mockTxWrites).toHaveLength(0)
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
