/**
 * Training template + assignment actions against an in-memory DataStore double.
 */
import { beforeEach, describe, expect, it } from "vitest"

import { MemoryDataStore } from "@/lib/data/memory-store"
import type { DataDocument, DataStore, DataTransaction } from "@/lib/data/types"
import {
  assignTraining,
  createTrainingTemplate,
  MAX_ASSIGNMENT_RECIPIENTS,
} from "@/lib/admin/training-actions"
import { EmployeeActionError } from "@/lib/admin/employee-actions"

class TestTrainingStore extends MemoryDataStore implements DataStore {
  attempts = 0
  beforeCommit: ((attempt: number) => void) | null = null
  readAfterWrite = false

  override async runTransaction<T>(fn: (tx: DataTransaction) => Promise<T>): Promise<T> {
    const MAX_ATTEMPTS = 5
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      this.attempts += 1
      let wrote = false
      const reads = new Map<string, string>()
      const ops: Array<() => void> = []

      const tx: DataTransaction = {
        get: async (path: string) => {
          if (wrote) {
            this.readAfterWrite = true
            throw new Error("Reads must precede writes")
          }
          const data = this.docs.get(path)
          reads.set(path, JSON.stringify(data ?? null))
          return super.getDoc(path)
        },
        set: (path: string, data: DataDocument, options?: { merge?: boolean }) => {
          wrote = true
          ops.push(() => {
            if (options?.merge) {
              this.docs.set(path, { ...(this.docs.get(path) ?? {}), ...data })
            } else {
              this.docs.set(path, { ...data })
            }
          })
        },
        update: (path: string, data: DataDocument) => {
          wrote = true
          ops.push(() => {
            const existing = this.docs.get(path)
            if (!existing) {
              throw Object.assign(new Error("No document to update"), { code: "not-found" })
            }
            this.docs.set(path, { ...existing, ...data })
          })
        },
        delete: (path: string) => {
          wrote = true
          ops.push(() => {
            this.docs.delete(path)
          })
        },
      }

      const result = await fn(tx)
      this.beforeCommit?.(attempt)

      let conflicted = false
      for (const [path, snap] of reads.entries()) {
        if (JSON.stringify(this.docs.get(path) ?? null) !== snap) {
          conflicted = true
          break
        }
      }
      if (conflicted) {
        continue
      }
      for (const op of ops) op()
      return result
    }
    throw Object.assign(new Error("Transaction contention exceeded retries"), { code: "aborted" })
  }
}

const store = new TestTrainingStore()
const ADMIN = "adm-1"
const TEMPLATE_ID = "cpr"
const TEMPLATE_PATH = `training_templates/${TEMPLATE_ID}`

function seedTemplate(overrides: Record<string, unknown> = {}): void {
  store.docs.set(TEMPLATE_PATH, {
    title: "CPR",
    description: "Cardiopulmonary resuscitation",
    durationText: "45 mins",
    requirementType: "certificate",
    isActive: true,
    ...overrides,
  })
}

function seedEmployee(uid: string, overrides: Record<string, unknown> = {}): void {
  store.docs.set(`users/${uid}`, {
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
  store.clear()
  store.attempts = 0
  store.beforeCommit = null
  store.readAfterWrite = false
  seedTemplate()
  seedEmployee("emp-1")
  seedEmployee("emp-2")
})

describe("createTrainingTemplate", () => {
  it("publishes the template payload with trimmed fields and timestamps", async () => {
    const result = await createTrainingTemplate(
      {
        adminUid: ADMIN,
        title: "  HIPAA  ",
        description: " Annual privacy training ",
        durationText: " 30 mins ",
        requirementType: "acknowledgement",
      },
      store,
    )

    expect(result.id.length).toBeGreaterThan(0)
    const saved = store.docs.get(`training_templates/${result.id}`)!
    expect(saved).toMatchObject({
      title: "HIPAA",
      description: "Annual privacy training",
      durationText: "30 mins",
      requirementType: "acknowledgement",
      isActive: true,
      adminId: ADMIN,
    })
    expect(saved.createdAt).toBeInstanceOf(Date)
    expect(saved.updatedAt).toBeInstanceOf(Date)
  })

  it("requires a title, description, duration and a known requirement type", async () => {
    const base = {
      adminUid: ADMIN,
      title: "Title",
      description: "Description",
      durationText: "10 mins",
      requirementType: "certificate",
    }

    await expect(createTrainingTemplate({ ...base, title: "  " }, store)).rejects.toThrow(
      "Title is required.",
    )
    await expect(
      createTrainingTemplate({ ...base, description: "" }, store),
    ).rejects.toThrow("Description is required.")
    await expect(
      createTrainingTemplate({ ...base, durationText: "  " }, store),
    ).rejects.toThrow("Duration is required.")
    await expect(
      createTrainingTemplate({ ...base, requirementType: "video" }, store),
    ).rejects.toThrow("Choose a valid requirement type.")
    await expect(
      createTrainingTemplate({ ...base, adminUid: "" }, store),
    ).rejects.toMatchObject({ code: "unauthenticated" })

    expect(store.docs.size).toBe(3)
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
      store,
    )

    expect(result).toEqual({ assigned: 2, skippedExisting: 0, skippedInactive: 0 })
    expect(store.readAfterWrite).toBe(false)

    for (const uid of ["emp-1", "emp-2"]) {
      const doc = store.docs.get(trainingPath(uid))!
      expect(doc).toMatchObject({
        title: "CPR",
        description: "Read the policy first.\n\nCardiopulmonary resuscitation",
        durationText: "45 mins",
        status: "notStarted",
        certificateUrl: null,
        dueDate: deadline,
        completedAt: null,
        expirationDate: null,
        completionDate: null,
        noExpiration: false,
        rejectionReason: null,
        employeeId: null,
        adminId: ADMIN,
        assignedAt: null,
      })
      expect(doc.updatedAt).toBeTruthy()
      expect("certificateUrls" in doc).toBe(false)
    }
  })

  it("uses only the template description when instructions are blank, and nulls the deadline", async () => {
    await assignTraining(assignInput({ instructions: "   ", deadline: null }), store)

    const payload = store.docs.get(trainingPath("emp-1"))!
    expect(payload.description).toBe("Cardiopulmonary resuscitation")
    expect(payload.dueDate).toBeNull()
  })

  it("de-duplicates employee ids", async () => {
    const result = await assignTraining(
      assignInput({ employeeIds: ["emp-1", "emp-1", "emp-2"] }),
      store,
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
    store.docs.set(trainingPath("emp-1"), existing)

    const result = await assignTraining(assignInput(), store)

    expect(result).toEqual({ assigned: 0, skippedExisting: 1, skippedInactive: 0 })
    expect(store.docs.get(trainingPath("emp-1"))).toEqual(existing)
  })

  it("excludes inactive employees instead of assigning new work", async () => {
    seedEmployee("emp-2", { isActive: false })

    const result = await assignTraining(assignInput({ employeeIds: ["emp-1", "emp-2"] }), store)

    expect(result).toEqual({ assigned: 1, skippedExisting: 0, skippedInactive: 1 })
    expect(store.docs.has(trainingPath("emp-1"))).toBe(true)
    expect(store.docs.has(trainingPath("emp-2"))).toBe(false)
  })

  it("returns assigned: 0 without writing when every recipient is inactive", async () => {
    seedEmployee("emp-1", { isActive: false })
    const result = await assignTraining(assignInput(), store)
    expect(result).toEqual({ assigned: 0, skippedExisting: 0, skippedInactive: 1 })
    expect(store.docs.has(trainingPath("emp-1"))).toBe(false)
  })
})

describe("assignTraining — authorization and existence", () => {
  it("rejects a missing template", async () => {
    store.docs.delete(TEMPLATE_PATH)
    await expect(assignTraining(assignInput(), store)).rejects.toMatchObject({
      code: "not-found",
    })
    expect(store.docs.has(trainingPath("emp-1"))).toBe(false)
  })

  it("rejects employees owned by another admin and writes nothing", async () => {
    seedEmployee("emp-2", { adminId: "adm-other" })

    await expect(
      assignTraining(assignInput({ employeeIds: ["emp-1", "emp-2"] }), store),
    ).rejects.toMatchObject({ code: "permission-denied" })

    expect(store.docs.has(trainingPath("emp-1"))).toBe(false)
    expect(store.docs.has(trainingPath("emp-2"))).toBe(false)
  })

  it("rejects non-employee accounts and missing profiles", async () => {
    seedEmployee("emp-2", { role: "admin" })
    await expect(
      assignTraining(assignInput({ employeeIds: ["emp-1", "emp-2"] }), store),
    ).rejects.toMatchObject({ code: "permission-denied" })

    store.docs.delete("users/emp-2")
    await expect(
      assignTraining(assignInput({ employeeIds: ["emp-2"] }), store),
    ).rejects.toMatchObject({ code: "not-found" })
  })

  it("revalidates on a transaction retry and aborts if ownership changed", async () => {
    store.beforeCommit = (attempt) => {
      if (attempt === 0) {
        seedEmployee("emp-1", { adminId: "adm-other" })
      }
    }

    await expect(assignTraining(assignInput(), store)).rejects.toMatchObject({
      code: "permission-denied",
    })

    expect(store.attempts).toBeGreaterThan(1)
    expect(store.docs.has(trainingPath("emp-1"))).toBe(false)
  })

  it("validates the recipient list, deadline and admin session", async () => {
    await expect(assignTraining(assignInput({ employeeIds: [] }), store)).rejects.toThrow(
      "Choose at least one employee.",
    )
    await expect(
      assignTraining(assignInput({ employeeIds: ["emp-1", ""] }), store),
    ).rejects.toThrow("Choose at least one employee.")
    await expect(
      assignTraining(assignInput({ deadline: new Date("invalid") }), store),
    ).rejects.toThrow("Choose a valid deadline.")
    await expect(
      assignTraining(assignInput({ adminUid: " " }), store),
    ).rejects.toBeInstanceOf(EmployeeActionError)

    const tooMany = Array.from(
      { length: MAX_ASSIGNMENT_RECIPIENTS + 1 },
      (_, index) => `emp-${index}`,
    )
    await expect(
      assignTraining(assignInput({ employeeIds: tooMany }), store),
    ).rejects.toThrow(`Select ${MAX_ASSIGNMENT_RECIPIENTS} employees or fewer`)
  })
})
