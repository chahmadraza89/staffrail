/**
 * Employee lifecycle action tests. Firestore and Cloud Functions are faked
 * with recording doubles so the tests drive the REAL code paths (batch
 * seeding contents, callable payloads, soft-delete fields).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

import * as actions from "@/lib/admin/employee-actions"
import { EmployeeActionError } from "@/lib/admin/employee-actions"
import {
  DEFAULT_CLEARANCES,
  DEFAULT_ONBOARDING_TASKS,
  DEFAULT_TRAININGS,
} from "@/lib/admin/seed-templates"

interface SetRecord {
  path: string
  data: Record<string, unknown>
}

const mockFirestore = { kind: "firestore" }
const mockFunctions = { kind: "functions" }
const batchSets: SetRecord[] = []
const updateDocCalls: Array<{ ref: { path: string }; data: Record<string, unknown> }> = []
const userDocs = new Map<string, { exists: boolean }>()

let callableImpl: ((payload: unknown) => Promise<{ data: unknown }>) | null = null
let batchImpl: {
  set: (ref: unknown, data: Record<string, unknown>) => void
} | null = null
let updateDocImpl: (
  reference: { path: string },
  data: Record<string, unknown>,
) => Promise<void> = (reference, data) => {
  updateDocCalls.push({ ref: reference, data })
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
      Promise.resolve({
        exists: () => userDocs.get(reference.path) !== undefined,
        ref: reference,
      }),
    updateDoc: (reference: { path: string }, data: Record<string, unknown>) =>
      updateDocImpl(reference, data),
    writeBatch: () => ({
      set: (reference: { path: string }, data: Record<string, unknown>) => {
        batchImpl?.set(reference, data)
        batchSets.push({ path: reference.path, data })
      },
      commit: () => {
        return Promise.resolve()
      },
    }),
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
      if (!callableImpl) {
        return Promise.reject(new Error("callable not configured"))
      }
      return callableImpl(payload)
    }
  },
}))

beforeEach(() => {
  batchSets.length = 0
  updateDocCalls.length = 0
  userDocs.clear()
  callableImpl = null
  updateDocImpl = (reference, data) => {
    updateDocCalls.push({ ref: reference, data })
    return Promise.resolve()
  }
  batchImpl = { set: () => {} }
  vi.spyOn(console, "warn").mockImplementation(() => {})
})

const SEED_INPUT = { name: "Ahmad Raza", email: "ahmad@bhmh.dev", adminUid: "adm-1" }

function expectSeeded(taskCount: number): void {
  const taskSets = batchSets.filter((entry) => entry.path.startsWith("users/e2/onboarding_tasks/"))
  const trainingSets = batchSets.filter((entry) => entry.path.startsWith("users/e2/trainings/"))
  const clearanceSets = batchSets.filter((entry) => entry.path.startsWith("users/e2/clearance/"))
  expect(batchSets.length).toBe(taskCount)
  expect(taskSets).toHaveLength(DEFAULT_ONBOARDING_TASKS.length)
  expect(trainingSets).toHaveLength(DEFAULT_TRAININGS.length)
  expect(clearanceSets).toHaveLength(DEFAULT_CLEARANCES.length)
}

describe("registerStaff", () => {
  it("calls the callable with the employee payload and seeds the full templates", async () => {
    callableImpl = async (payload) => {
      expect(payload).toEqual({ email: "ahmad@bhmh.dev", name: "Ahmad Raza", role: "employee" })
      return Promise.resolve({ data: { success: true, uid: "e2", resetLink: "https://reset" } })
    }

    const result = await actions.registerStaff(SEED_INPUT, mockFunctions as never, mockFirestore as never)

    expect(result).toEqual({ uid: "e2", resetLink: "https://reset" })
    // Every seeded doc is stamped with the signed-in admin's uid + server
    // timestamps (parity with the Flutter seeding).
    const taskFields = batchSets[0].data
    expect(batchSets).toHaveLength(
      DEFAULT_ONBOARDING_TASKS.length + DEFAULT_TRAININGS.length + DEFAULT_CLEARANCES.length,
    )
    expect(taskFields.adminId).toBe("adm-1")
    expect(taskFields.employeeId).toBe("e2")
    expect(taskFields.updatedAt).toBe("SERVER_TIMESTAMP")
    expectSeeded(batchSets.length)
  })

  it("uses the exact template doc IDs (parity with the employee app)", async () => {
    callableImpl = async () => Promise.resolve({ data: { uid: "e2" } })
    await actions.registerStaff(SEED_INPUT, mockFunctions as never, mockFirestore as never)

    const paths = batchSets.map((entry) => entry.path)
    // Driver's Verification is load-bearing in the Flutter migration path.
    expect(paths).toContain("users/e2/onboarding_tasks/driver's_verification")
    expect(paths).toContain("users/e2/onboarding_tasks/tax_documents_i_9")
    expect(paths).toContain("users/e2/trainings/start")
    expect(paths).toContain("users/e2/clearance/tb_status_report")
  })

  it("propagates callable failures as EmployeeActionError without seeding", async () => {
    callableImpl = async () =>
      Promise.reject(
        Object.assign(new Error("The email address is already in use by another account."), {
          code: "functions/already-exists",
        }),
      )

    await expect(
      actions.registerStaff(SEED_INPUT, mockFunctions as never, mockFirestore as never),
    ).rejects.toBeInstanceOf(EmployeeActionError)
    expect(batchSets).toHaveLength(0)
  })

  it("a missing/shapeless callable response fails loudly", async () => {
    callableImpl = async () => Promise.resolve({ data: {} })
    await expect(
      actions.registerStaff(SEED_INPUT, mockFunctions as never, mockFirestore as never),
    ).rejects.toMatchObject({ code: "internal" })
    expect(batchSets).toHaveLength(0)
  })

  it("a seeding failure stays a warning (registration already succeeded)", async () => {
    callableImpl = async () => Promise.resolve({ data: { uid: "e2", resetLink: "https://reset" } })
    batchImpl = {
      set: () => {
        throw new Error("disk full")
      },
    }

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const result = await actions.registerStaff(SEED_INPUT, mockFunctions as never, mockFirestore as never)
    expect(result.uid).toBe("e2")
    expect(result.resetLink).toBe("https://reset")
    expect(warn).toHaveBeenCalled()
  })
})

describe("updateEmployee", () => {
  it("updates only name/email on an existing employee", async () => {
    userDocs.set("users/e2", { exists: true })
    await actions.updateEmployee({ uid: "e2", name: "New Name", email: "new@x.dev" }, mockFirestore as never)
    expect(updateDocCalls).toHaveLength(1)
    expect(updateDocCalls[0].ref.path).toBe("users/e2")
    expect(updateDocCalls[0].data).toEqual({ name: "New Name", email: "new@x.dev" })
  })

  it("fails with not-found when the employee does not exist", async () => {
    await expect(
      actions.updateEmployee({ uid: "ghost", name: "N", email: "n@x.dev" }, mockFirestore as never),
    ).rejects.toMatchObject({ code: "not-found" })
    expect(updateDocCalls).toHaveLength(0)
  })
})

describe("deactivateEmployee", () => {
  it("soft-deletes: isActive false + deletedAt server timestamp", async () => {
    await actions.deactivateEmployee("e2", mockFirestore as never)
    expect(updateDocCalls).toHaveLength(1)
    expect(updateDocCalls[0].ref.path).toBe("users/e2")
    expect(updateDocCalls[0].data).toEqual({
      isActive: false,
      deletedAt: "SERVER_TIMESTAMP",
    })
  })

  it("surfaces permission-denied distinctly", async () => {
    updateDocImpl = () =>
      Promise.reject(Object.assign(new Error("denied"), { code: "permission-denied" }))
    await expect(actions.deactivateEmployee("e2", mockFirestore as never)).rejects.toMatchObject({
      code: "permission-denied",
    })
  })
})
