/**
 * Clearance verify/reject transactions against an in-memory DataStore double.
 */
import { beforeEach, describe, expect, it } from "vitest"

import { MemoryDataStore } from "@/lib/data/memory-store"
import type { DataDocument, DataStore, DataTransaction } from "@/lib/data/types"
import {
  MAX_CLEARANCE_SIGNATURE_LENGTH,
  rejectClearance,
  verifyClearance,
} from "@/lib/admin/clearance-actions"
import { submissionRevision } from "@/lib/admin/task-revision"

class TestClearanceStore extends MemoryDataStore implements DataStore {
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
            void super.setDoc(path, data, options)
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

const store = new TestClearanceStore()
const ADMIN = "adm-1"
const EMPLOYEE = "emp-1"
const CLEARANCE = "clearance-1"
const DOC_PATH = `users/${EMPLOYEE}/clearance/${CLEARANCE}`
const EMPLOYEE_PATH = `users/${EMPLOYEE}`

function seedEmployee(overrides: Record<string, unknown> = {}): void {
  store.docs.set(EMPLOYEE_PATH, {
    name: "Sara Khan",
    role: "employee",
    adminId: ADMIN,
    isActive: true,
    ...overrides,
  })
}

function seedClearance(overrides: Record<string, unknown> = {}): void {
  store.docs.set(DOC_PATH, {
    title: "Background Check",
    description: "Criminal background verification",
    status: "underReview",
    employeeId: EMPLOYEE,
    employeeName: "Sara Khan",
    adminId: ADMIN,
    fileUrl: "https://example.test/check.pdf",
    submittedAt: null,
    verifiedAt: null,
    updatedAt: null,
    ...overrides,
  })
}

function revision(): string {
  return submissionRevision(store.docs.get(DOC_PATH) ?? {})
}

function baseInput() {
  return {
    adminUid: ADMIN,
    employeeId: EMPLOYEE,
    clearanceId: CLEARANCE,
    expectedRevision: revision(),
  }
}

beforeEach(() => {
  store.clear()
  store.attempts = 0
  store.beforeCommit = null
  store.readAfterWrite = false
  seedEmployee()
  seedClearance()
})

describe("verifyClearance — payload parity", () => {
  it("writes the verified decision plus the reviewer signature", async () => {
    await verifyClearance(
      {
        ...baseInput(),
        signatureData: "  BASE64_PNG  ",
      },
      store,
    )

    expect(store.docs.get(DOC_PATH)).toMatchObject({
      status: "verified",
      verifiedBy: ADMIN,
      adminSignature: "BASE64_PNG",
      title: "Background Check",
      employeeId: EMPLOYEE,
    })
    expect(store.docs.get(DOC_PATH)?.verifiedAt).toBeTruthy()
    expect(store.docs.get(DOC_PATH)?.updatedAt).toBeTruthy()
    expect(store.readAfterWrite).toBe(false)
  })

  it("omits adminSignature when the reviewer did not sign", async () => {
    await verifyClearance({ ...baseInput(), signatureData: "   " }, store)

    const payload = store.docs.get(DOC_PATH)!
    expect(payload.status).toBe("verified")
    expect("adminSignature" in payload).toBe(false)
  })
})

describe("rejectClearance — payload parity", () => {
  it("writes actionRequired with a trimmed reason and no verification fields", async () => {
    await rejectClearance(
      {
        ...baseInput(),
        reason: "  The scan is unreadable.  ",
      },
      store,
    )

    const payload = store.docs.get(DOC_PATH)!
    expect(payload).toMatchObject({
      status: "actionRequired",
      rejectionReason: "The scan is unreadable.",
    })
    expect(payload.updatedAt).toBeTruthy()
    expect(payload.verifiedAt).toBeNull()
    expect("adminSignature" in payload).toBe(false)
    expect(store.readAfterWrite).toBe(false)
  })
})

describe("clearance actions — input validation", () => {
  it("requires ids, a reviewed revision and a non-empty rejection reason", async () => {
    await expect(
      verifyClearance({ ...baseInput(), expectedRevision: "" }, store),
    ).rejects.toMatchObject({ code: "invalid-argument" })
    await expect(
      verifyClearance({ ...baseInput(), clearanceId: "" }, store),
    ).rejects.toMatchObject({ code: "invalid-argument" })
    await expect(
      rejectClearance({ ...baseInput(), reason: "   " }, store),
    ).rejects.toMatchObject({ code: "invalid-argument" })
    await expect(
      verifyClearance({ ...baseInput(), adminUid: "" }, store),
    ).rejects.toMatchObject({ code: "unauthenticated" })

    expect(store.docs.get(DOC_PATH)?.status).toBe("underReview")
  })

  it("rejects an oversized signature instead of risking the document limit", async () => {
    await expect(
      verifyClearance(
        {
          ...baseInput(),
          signatureData: "x".repeat(MAX_CLEARANCE_SIGNATURE_LENGTH + 1),
        },
        store,
      ),
    ).rejects.toMatchObject({ code: "invalid-argument" })

    expect(store.docs.get(DOC_PATH)?.status).toBe("underReview")
  })
})

describe("clearance actions — authorization and existence", () => {
  it("rejects missing employees and missing clearance documents", async () => {
    store.docs.delete(EMPLOYEE_PATH)
    await expect(verifyClearance(baseInput(), store)).rejects.toMatchObject({
      code: "not-found",
    })

    seedEmployee()
    store.docs.delete(DOC_PATH)
    await expect(verifyClearance(baseInput(), store)).rejects.toMatchObject({
      code: "not-found",
    })
  })

  it("rejects staff owned by another admin or non-employee accounts", async () => {
    seedEmployee({ adminId: "adm-other" })
    await expect(verifyClearance(baseInput(), store)).rejects.toMatchObject({
      code: "permission-denied",
    })

    seedEmployee({ role: "admin" })
    await expect(rejectClearance({ ...baseInput(), reason: "No" }, store)).rejects.toMatchObject({
      code: "permission-denied",
    })
  })

  it("blocks inactive employees", async () => {
    seedEmployee({ isActive: false })
    await expect(verifyClearance(baseInput(), store)).rejects.toMatchObject({
      code: "failed-precondition",
    })
    expect(store.docs.get(DOC_PATH)?.status).toBe("underReview")
  })
})

describe("clearance actions — concurrency and status guards", () => {
  it("aborts when the document changed after it was reviewed", async () => {
    const reviewed = revision()
    seedClearance({ fileUrl: "https://example.test/replacement.pdf" })

    await expect(
      verifyClearance({ ...baseInput(), expectedRevision: reviewed }, store),
    ).rejects.toMatchObject({ code: "conflict" })

    expect(store.docs.get(DOC_PATH)).toMatchObject({
      status: "underReview",
      fileUrl: "https://example.test/replacement.pdf",
    })
  })

  it("only acts on underReview records", async () => {
    for (const status of ["pending", "verified", "actionRequired", "expired"]) {
      seedClearance({ status })
      await expect(verifyClearance(baseInput(), store)).rejects.toMatchObject({
        code: "failed-precondition",
      })
      await expect(
        rejectClearance({ ...baseInput(), reason: "No" }, store),
      ).rejects.toMatchObject({ code: "failed-precondition" })
      expect(store.docs.get(DOC_PATH)?.status).toBe(status)
    }
  })

  it("revalidates ownership on a transaction retry", async () => {
    store.beforeCommit = (attempt) => {
      if (attempt === 0) {
        seedEmployee({ adminId: "adm-other" })
      }
    }

    await expect(verifyClearance(baseInput(), store)).rejects.toMatchObject({
      code: "permission-denied",
    })
    expect(store.docs.get(DOC_PATH)?.status).toBe("underReview")
  })
})
