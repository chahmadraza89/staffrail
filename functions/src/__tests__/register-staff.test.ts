/**
 * registerStaff callable tests — the firebase-admin module is faked with an
 * in-memory store so the REAL implementation runs offline: Auth creation,
 * the user document (incl. the web-provisioning setupStatus marker), the
 * legacy initial-document batch, and the unchanged response contract.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const fake = vi.hoisted(() => {
  type Doc = Record<string, unknown>
  interface FakeDocRef {
    __path: string
    get: () => Promise<{ exists: boolean; data: () => Doc | undefined }>
    set: (data: Doc) => Promise<void>
    collection: (sub: string) => {
      doc: (id: string) => FakeDocRef
      add: (data: Doc) => Promise<void>
    }
  }
  const docs = new Map<string, Doc>()
  const createdAuthUsers: string[] = []

  const docRef = (path: string): FakeDocRef => ({
    __path: path,
    get: async () => ({ exists: docs.has(path), data: () => docs.get(path) }),
    set: async (data: Doc) => {
      docs.set(path, { ...data })
    },
    collection: (sub: string) => ({
      doc: (id: string) => docRef(`${path}/${sub}/${id}`),
      add: async (data: Doc) => {
        docs.set(`${path}/${sub}/auto-${docs.size}`, { ...data })
      },
    }),
  })

  const firestore = Object.assign(
    () => ({
      collection: (c: string) => ({
        doc: (id?: string) => docRef(`${c}/${id ?? "auto-top"}`),
      }),
      batch: () => ({
        set: (ref: { __path: string }, data: Doc) => {
          docs.set(ref.__path, { ...data })
        },
        commit: async () => undefined,
      }),
    }),
    {
      FieldValue: { serverTimestamp: () => "SERVER_TIMESTAMP" },
      Timestamp: { fromDate: (date: Date) => `TS:${date.toISOString()}` },
    },
  )

  const auth = () => ({
    createUser: async (data: { displayName: string }) => {
      createdAuthUsers.push(data.displayName)
      return { uid: "new-employee-uid" }
    },
    generatePasswordResetLink: async () => "https://reset.example",
  })

  const admin = {
    initializeApp: () => ({}),
    firestore,
    auth,
  }

  return { docs, createdAuthUsers, admin }
})

vi.mock("firebase-admin", () => ({
  default: fake.admin,
  ...fake.admin,
}))

import { registerStaffImplementation } from "../index"

const WEB_PAYLOAD = { email: "ahmad@bhmh.dev", name: "Ahmad Raza", role: "employee", webProvisioning: true }

function primeCaller(): void {
  fake.docs.set("users/admin-1", { role: "admin", isActive: true })
}

beforeEach(() => {
  fake.docs.clear()
  fake.createdAuthUsers.length = 0
  primeCaller()
})

describe("registerStaff — server-side setup marker", () => {
  it("creates the web account with setupStatus incomplete BEFORE returning", async () => {
    const result = await registerStaffImplementation({
      auth: { uid: "admin-1" },
      data: WEB_PAYLOAD,
    })

    // Unchanged response contract.
    expect(result).toEqual({ success: true, uid: "new-employee-uid", resetLink: "https://reset.example" })

    const userDoc = fake.docs.get("users/new-employee-uid")!
    expect(userDoc).toMatchObject({
      uid: "new-employee-uid",
      email: "ahmad@bhmh.dev",
      name: "Ahmad Raza",
      role: "employee",
      adminId: "admin-1",
      isActive: true,
      // The marker lands in the SAME trusted creation flow.
      setupStatus: "incomplete",
    })
    expect(userDoc.createdAt).toBe("SERVER_TIMESTAMP")

    // The callable's legacy initial batch still runs.
    expect(fake.docs.has("users/new-employee-uid/onboarding_tasks/personal_details")).toBe(true)
    expect(fake.docs.has("users/new-employee-uid/trainings/hipaa_compliance")).toBe(true)
  })

  it("never stores the reset link in the document", async () => {
    await registerStaffImplementation({ auth: { uid: "admin-1" }, data: WEB_PAYLOAD })
    for (const data of fake.docs.values()) {
      expect(Object.keys(data)).not.toContain("resetLink")
    }
    // Exactly one Auth account was created for one call (no duplicates).
    expect(fake.createdAuthUsers).toHaveLength(1)
  })

  it("Flutter callers (no webProvisioning option) keep the previous doc shape", async () => {
    const result = await registerStaffImplementation({
      auth: { uid: "admin-1" },
      data: { email: "ahmad@bhmh.dev", name: "Ahmad Raza", role: "employee" },
    })

    expect(result).toEqual({ success: true, uid: "new-employee-uid", resetLink: "https://reset.example" })
    const userDoc = fake.docs.get("users/new-employee-uid")!
    expect(Object.keys(userDoc)).not.toContain("setupStatus")
    expect(userDoc).toMatchObject({
      uid: "new-employee-uid",
      email: "ahmad@bhmh.dev",
      role: "employee",
      adminId: "admin-1",
      isActive: true,
    })
    expect(fake.docs.has("users/new-employee-uid/onboarding_tasks/personal_details")).toBe(true)
  })

  it("rejects unauthenticated and non-admin callers", async () => {
    await expect(
      registerStaffImplementation({ auth: null, data: WEB_PAYLOAD }),
    ).rejects.toMatchObject({ code: "unauthenticated" })

    fake.docs.set("users/admin-1", { role: "employee" })
    await expect(
      registerStaffImplementation({ auth: { uid: "admin-1" }, data: WEB_PAYLOAD }),
    ).rejects.toMatchObject({ code: "permission-denied" })
  })
})
