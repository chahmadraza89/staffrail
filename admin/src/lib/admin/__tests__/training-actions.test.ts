/**
 * Training template + assignment actions.
 *
 * Firestore is replaced with an in-memory transactional double, so the tests
 * exercise the REAL transaction body: template existence, employee
 * ownership/role/activation, read-before-write ordering, existing-assignment
 * preservation, retries and the exact payload the Flutter employee app reads.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

interface FakeState {
  docs: Map<string, Record<string, unknown>>
  version: number
  attempts: number
  beforeCommit: ((attempt: number) => void) | null
  readAfterWrite: boolean
}

const state = vi.hoisted<FakeState>(() => ({
  docs: new Map(),
  version: 0,
  attempts: 0,
  beforeCommit: null,
  readAfterWrite: false,
}))

vi.mock("firebase/firestore", () => {
  function firestoreError(code: string, message: string): Error {
    return Object.assign(new Error(message), { code })
  }

  function snapshotFor(path: string) {
    const data = state.docs.get(path)
    const exists = data !== undefined
    return {
      id: path.split("/").pop(),
      ref: { path },
      exists: () => exists,
      data: () => (exists ? { ...data } : undefined),
    }
  }

  function makeDoc(first: unknown, ...segments: string[]) {
    if (
      first !== null &&
      typeof first === "object" &&
      typeof (first as { path?: unknown }).path === "string" &&
      segments.length === 0
    ) {
      const id = "generated-template"
      return { id, path: `${(first as { path: string }).path}/${id}` }
    }
    const path = segments.join("/")
    return { id: path.split("/").pop(), path }
  }

  return {
    collection: (_db: unknown, name: string) => ({ path: name }),
    doc: makeDoc,
    getDoc: vi.fn(),
    setDoc: async (ref: { path: string }, data: Record<string, unknown>) => {
      state.docs.set(ref.path, { ...data })
      state.version += 1
    },
    serverTimestamp: () => "SERVER_TS",
    Timestamp: {
      fromDate: (date: Date) => ({ __timestamp: date.toISOString() }),
    },
    runTransaction: async (
      _db: unknown,
      updateFunction: (transaction: unknown) => Promise<unknown>,
    ) => {
      const MAX_ATTEMPTS = 5
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        state.attempts += 1
        const reads: number[] = []
        const writes: Array<() => void> = []
        let wrote = false

        const transaction = {
          get: async (ref: { path: string }) => {
            if (wrote) {
              state.readAfterWrite = true
              throw new Error("Firestore requires all reads before the first write")
            }
            reads.push(state.version)
            return snapshotFor(ref.path)
          },
          set: (ref: { path: string }, data: Record<string, unknown>) => {
            wrote = true
            writes.push(() => {
              state.docs.set(ref.path, { ...data })
              state.version += 1
            })
          },
        }

        const result = await updateFunction(transaction)
        state.beforeCommit?.(attempt)
        const conflicted = reads.some((version) => version !== state.version)
        if (conflicted) {
          continue
        }
        for (const write of writes) {
          write()
        }
        return result
      }
      throw firestoreError("aborted", "Transaction contention exceeded retries")
    },
  }
})

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseFirestore: () => ({}),
  getFirebaseFunctions: () => ({}),
}))

import {
  assignTraining,
  createTrainingTemplate,
  MAX_ASSIGNMENT_RECIPIENTS,
} from "@/lib/admin/training-actions"
import { EmployeeActionError } from "@/lib/admin/employee-actions"

const ADMIN = "adm-1"
const TEMPLATE_ID = "cpr"
const TEMPLATE_PATH = `training_templates/${TEMPLATE_ID}`

function seedTemplate(overrides: Record<string, unknown> = {}): void {
  state.docs.set(TEMPLATE_PATH, {
    title: "CPR",
    description: "Cardiopulmonary resuscitation",
    durationText: "45 mins",
    requirementType: "certificate",
    isActive: true,
    ...overrides,
  })
}

function seedEmployee(uid: string, overrides: Record<string, unknown> = {}): void {
  state.docs.set(`users/${uid}`, {
    name: `Employee ${uid}`,
    role: "employee",
    adminId: ADMIN,
    isActive: true,
    ...overrides,
  })
}

function trainingPath(uid: string): string {
  return `users/${uid}/trainings/${TEMPLATE_ID}`
}

/** Minimal valid input; individual tests override what they exercise. */
function assignInput(overrides: Record<string, unknown> = {}) {
  return {
    adminUid: ADMIN,
    templateId: TEMPLATE_ID,
    employeeIds: ["emp-1"],
    deadline: null,
    instructions: "",
    ...overrides,
  }
}

beforeEach(() => {
  state.docs.clear()
  state.version = 0
  state.attempts = 0
  state.beforeCommit = null
  state.readAfterWrite = false
  seedTemplate()
  seedEmployee("emp-1")
  seedEmployee("emp-2")
})

describe("createTrainingTemplate", () => {
  it("publishes the Dart payload with trimmed fields and server timestamps", async () => {
    const result = await createTrainingTemplate({
      adminUid: ADMIN,
      title: "  HIPAA  ",
      description: " Annual privacy training ",
      durationText: " 30 mins ",
      requirementType: "acknowledgement",
    })

    expect(result.id).toBe("generated-template")
    expect(state.docs.get(`training_templates/${result.id}`)).toEqual({
      title: "HIPAA",
      description: "Annual privacy training",
      durationText: "30 mins",
      requirementType: "acknowledgement",
      isActive: true,
      adminId: ADMIN,
      createdAt: "SERVER_TS",
      updatedAt: "SERVER_TS",
    })
  })

  it("requires a title, description, duration and a known requirement type", async () => {
    const base = {
      adminUid: ADMIN,
      title: "Title",
      description: "Description",
      durationText: "10 mins",
      requirementType: "certificate",
    }

    await expect(createTrainingTemplate({ ...base, title: "  " })).rejects.toThrow(
      "Title is required.",
    )
    await expect(
      createTrainingTemplate({ ...base, description: "" }),
    ).rejects.toThrow("Description is required.")
    await expect(
      createTrainingTemplate({ ...base, durationText: "  " }),
    ).rejects.toThrow("Duration is required.")
    await expect(
      createTrainingTemplate({ ...base, requirementType: "video" }),
    ).rejects.toThrow("Choose a valid requirement type.")
    await expect(
      createTrainingTemplate({ ...base, adminUid: "" }),
    ).rejects.toMatchObject({ code: "unauthenticated" })

    expect(state.docs.size).toBe(3) // template + two employees, no new template
  })
})

describe("assignTraining — payload parity", () => {
  it("writes the full TrainingDTO map plus adminId to each employee", async () => {
    const deadline = new Date("2026-12-01T00:00:00.000Z")

    const result = await assignTraining(
      assignInput({
        employeeIds: ["emp-1", "emp-2"],
        deadline,
        instructions: "  Read the policy first. ",
      }),
    )

    expect(result).toEqual({ assigned: 2, skippedExisting: 0, skippedInactive: 0 })
    expect(state.readAfterWrite).toBe(false)

    for (const uid of ["emp-1", "emp-2"]) {
      expect(state.docs.get(trainingPath(uid))).toEqual({
        title: "CPR",
        description: "Read the policy first.\n\nCardiopulmonary resuscitation",
        durationText: "45 mins",
        status: "notStarted",
        certificateUrl: null,
        certificateUrls: [],
        dueDate: { __timestamp: deadline.toISOString() },
        completedAt: null,
        updatedAt: "SERVER_TS",
        expirationDate: null,
        completionDate: null,
        noExpiration: false,
        rejectionReason: null,
        employeeId: null,
        adminId: ADMIN,
        assignedAt: null,
      })
    }
  })

  it("uses only the template description when instructions are blank, and nulls the deadline", async () => {
    await assignTraining(assignInput({ instructions: "   ", deadline: null }))

    const payload = state.docs.get(trainingPath("emp-1"))!
    expect(payload.description).toBe("Cardiopulmonary resuscitation")
    expect(payload.dueDate).toBeNull()
  })

  it("de-duplicates employee ids", async () => {
    const result = await assignTraining(
      assignInput({ employeeIds: ["emp-1", "emp-1", "emp-2"] }),
    )
    expect(result.assigned).toBe(2)
  })
})

describe("assignTraining — destructive-write protection", () => {
  it("never overwrites an existing training document", async () => {
    const existing = {
      status: "verified",
      certificateUrls: ["https://x/cert.pdf"],
      completedAt: "ORIGINAL_COMPLETION",
    }
    state.docs.set(trainingPath("emp-1"), existing)

    const result = await assignTraining(assignInput())

    expect(result).toEqual({ assigned: 0, skippedExisting: 1, skippedInactive: 0 })
    expect(state.docs.get(trainingPath("emp-1"))).toEqual(existing)
  })

  it("excludes inactive employees instead of assigning new work", async () => {
    seedEmployee("emp-2", { isActive: false })

    const result = await assignTraining(assignInput({ employeeIds: ["emp-1", "emp-2"] }))

    expect(result).toEqual({ assigned: 1, skippedExisting: 0, skippedInactive: 1 })
    expect(state.docs.has(trainingPath("emp-1"))).toBe(true)
    expect(state.docs.has(trainingPath("emp-2"))).toBe(false)
  })

  it("returns assigned: 0 without writing when every recipient is inactive", async () => {
    seedEmployee("emp-1", { isActive: false })
    const result = await assignTraining(assignInput())
    expect(result).toEqual({ assigned: 0, skippedExisting: 0, skippedInactive: 1 })
    expect(state.docs.has(trainingPath("emp-1"))).toBe(false)
  })
})

describe("assignTraining — authorization and existence", () => {
  it("rejects a missing template", async () => {
    state.docs.delete(TEMPLATE_PATH)
    await expect(assignTraining(assignInput())).rejects.toMatchObject({
      code: "not-found",
    })
    expect(state.docs.has(trainingPath("emp-1"))).toBe(false)
  })

  it("rejects employees owned by another admin and writes nothing", async () => {
    seedEmployee("emp-2", { adminId: "adm-other" })

    await expect(
      assignTraining(assignInput({ employeeIds: ["emp-1", "emp-2"] })),
    ).rejects.toMatchObject({ code: "permission-denied" })

    expect(state.docs.has(trainingPath("emp-1"))).toBe(false)
    expect(state.docs.has(trainingPath("emp-2"))).toBe(false)
  })

  it("rejects non-employee accounts and missing profiles", async () => {
    seedEmployee("emp-2", { role: "admin" })
    await expect(
      assignTraining(assignInput({ employeeIds: ["emp-1", "emp-2"] })),
    ).rejects.toMatchObject({ code: "permission-denied" })

    state.docs.delete("users/emp-2")
    await expect(
      assignTraining(assignInput({ employeeIds: ["emp-2"] })),
    ).rejects.toMatchObject({ code: "not-found" })
  })

  it("revalidates on a transaction retry and aborts if ownership changed", async () => {
    state.beforeCommit = (attempt) => {
      if (attempt === 0) {
        seedEmployee("emp-1", { adminId: "adm-other" })
        state.version += 1
      }
    }

    await expect(assignTraining(assignInput())).rejects.toMatchObject({
      code: "permission-denied",
    })

    expect(state.attempts).toBeGreaterThan(1)
    expect(state.docs.has(trainingPath("emp-1"))).toBe(false)
  })

  it("validates the recipient list, deadline and admin session", async () => {
    await expect(assignTraining(assignInput({ employeeIds: [] }))).rejects.toThrow(
      "Choose at least one employee.",
    )
    await expect(
      assignTraining(assignInput({ employeeIds: ["emp-1", ""] })),
    ).rejects.toThrow("Choose at least one employee.")
    await expect(
      assignTraining(assignInput({ deadline: new Date("invalid") })),
    ).rejects.toThrow("Choose a valid deadline.")
    await expect(
      assignTraining(assignInput({ adminUid: " " })),
    ).rejects.toBeInstanceOf(EmployeeActionError)

    const tooMany = Array.from(
      { length: MAX_ASSIGNMENT_RECIPIENTS + 1 },
      (_, index) => `emp-${index}`,
    )
    await expect(
      assignTraining(assignInput({ employeeIds: tooMany })),
    ).rejects.toThrow(`Select ${MAX_ASSIGNMENT_RECIPIENTS} employees or fewer`)
  })
})
