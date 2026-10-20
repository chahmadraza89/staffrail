/**
 * Task review action tests.
 *
 * Firestore is replaced with a small in-memory transactional double so the
 * tests exercise the REAL transaction body: ownership/activation reads,
 * reviewed-revision comparison, permitted transitions, retry revalidation and
 * the exact write payloads the employee app reads.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

interface FakeState {
  docs: Map<string, Record<string, unknown>>
  version: number
  attempts: number
  /** Runs after the callback queues writes, before the commit check. */
  beforeCommit: ((attempt: number) => void) | null
}

const state = vi.hoisted<FakeState>(() => ({
  docs: new Map(),
  version: 0,
  attempts: 0,
  beforeCommit: null,
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

  return {
    doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    serverTimestamp: () => "SERVER_TS",
    runTransaction: async (
      _db: unknown,
      updateFunction: (transaction: unknown) => Promise<unknown>,
    ) => {
      const MAX_ATTEMPTS = 5
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        state.attempts += 1
        const reads: number[] = []
        const writes: Array<() => void> = []
        const transaction = {
          get: async (ref: { path: string }) => {
            reads.push(state.version)
            return snapshotFor(ref.path)
          },
          update: (ref: { path: string }, data: Record<string, unknown>) => {
            writes.push(() => {
              const current = state.docs.get(ref.path)
              if (!current) {
                throw firestoreError("not-found", "No document to update")
              }
              state.docs.set(ref.path, { ...current, ...data })
              state.version += 1
            })
          },
          set: (ref: { path: string }, data: Record<string, unknown>) => {
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
  acceptTask,
  rejectTask,
  skipTask,
  updateBlankFormLink,
  type ReviewTaskSource,
  type TaskActionTarget,
} from "@/lib/admin/task-actions"
import { EmployeeActionError } from "@/lib/admin/employee-actions"
import { submissionRevision } from "@/lib/admin/task-revision"

const DB = {} as never
const ADMIN = "admin-1"
const EMPLOYEE_PATH = "users/emp-1"

const COLLECTIONS: Record<ReviewTaskSource, string> = {
  onboarding: "onboarding_tasks",
  training: "trainings",
  clearance: "clearance",
}

function seedEmployee(overrides: Record<string, unknown> = {}): void {
  state.docs.set(EMPLOYEE_PATH, {
    name: "Jane Doe",
    role: "employee",
    adminId: ADMIN,
    isActive: true,
    ...overrides,
  })
}

function taskPath(source: ReviewTaskSource, taskId: string): string {
  return `${EMPLOYEE_PATH}/${COLLECTIONS[source]}/${taskId}`
}

function seedTask(
  source: ReviewTaskSource,
  taskId: string,
  data: Record<string, unknown>,
): string {
  const path = taskPath(source, taskId)
  state.docs.set(path, data)
  return path
}

function revisionOf(path: string): string {
  return submissionRevision(state.docs.get(path))
}

/** Target bound to the document's CURRENT revision (as a reviewer would see). */
function target(
  source: ReviewTaskSource,
  taskId: string,
  path: string,
  overrides: Partial<TaskActionTarget> = {},
): TaskActionTarget & { employeeName?: string } {
  return {
    employeeId: "emp-1",
    taskId,
    taskSource: source,
    adminUid: ADMIN,
    expectedRevision: state.docs.has(path) ? revisionOf(path) : null,
    employeeName: "Jane Doe",
    ...overrides,
  }
}

beforeEach(() => {
  state.docs.clear()
  state.version = 0
  state.attempts = 0
  state.beforeCommit = null
  seedEmployee()
})

describe("acceptTask — payload parity + field preservation", () => {
  it("onboarding: verifies, stamps employeeName from the profile and preserves the submission", async () => {
    const path = seedTask("onboarding", "onboarding_acknowledgment_form", {
      title: "Onboarding Acknowledgment form",
      status: "submitted",
      isCompleted: false,
      formData: { fullName: "Jane Doe" },
      signatureUrl: "typed:Jane Doe",
      employeeName: "Stale Name",
    })

    await acceptTask(target("onboarding", "onboarding_acknowledgment_form", path), DB)

    expect(state.docs.get(path)).toMatchObject({
      status: "verified",
      isCompleted: true,
      updatedAt: "SERVER_TS",
      completedAt: "SERVER_TS",
      employeeName: "Jane Doe",
      formData: { fullName: "Jane Doe" },
      signatureUrl: "typed:Jane Doe",
    })
  })

  it("training: status/updatedAt only (no completedAt — Dart quirk)", async () => {
    const path = seedTask("training", "start", {
      title: "START",
      status: "underReview",
      certificateUrls: ["https://x/cert.pdf"],
    })

    await acceptTask(target("training", "start", path), DB)

    const stored = state.docs.get(path)!
    expect(stored.status).toBe("verified")
    expect(stored.updatedAt).toBe("SERVER_TS")
    expect(stored).not.toHaveProperty("completedAt")
    expect(stored.certificateUrls).toEqual(["https://x/cert.pdf"])
  })

  it("clearance: adds verifiedAt and preserves the uploaded file", async () => {
    const path = seedTask("clearance", "tb_status_report", {
      title: "TB Status Report",
      status: "underReview",
      fileUrl: "https://x/tb.pdf",
    })

    await acceptTask(target("clearance", "tb_status_report", path), DB)

    expect(state.docs.get(path)).toMatchObject({
      status: "verified",
      verifiedAt: "SERVER_TS",
      updatedAt: "SERVER_TS",
      fileUrl: "https://x/tb.pdf",
    })
  })

  it("accepts a training in underReview (the panel's submitted state)", async () => {
    const path = seedTask("training", "start", {
      title: "START",
      status: "underReview",
    })
    await acceptTask(target("training", "start", path), DB)
    expect(state.docs.get(path)?.status).toBe("verified")
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
          adminUid: ADMIN,
          expectedRevision: null,
          reason: "   ",
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "invalid-argument" })
    expect(state.attempts).toBe(0)
  })

  it("onboarding: rejected + trimmed reason + profile owner, never completedAt", async () => {
    const path = seedTask("onboarding", "resume", {
      title: "Resume",
      status: "submitted",
      fileUrl: "https://x/resume.pdf",
      completedAt: "OLD_COMPLETION",
    })

    await rejectTask({ ...target("onboarding", "resume", path), reason: "  illegible scan  " }, DB)

    expect(state.docs.get(path)).toMatchObject({
      status: "rejected",
      isCompleted: false,
      updatedAt: "SERVER_TS",
      rejectionReason: "illegible scan",
      employeeName: "Jane Doe",
      completedAt: "OLD_COMPLETION",
      fileUrl: "https://x/resume.pdf",
    })
  })

  it("training/clearance: actionRequired + reason", async () => {
    const training = seedTask("training", "cpr___first_aid", {
      title: "CPR",
      status: "underReview",
    })
    await rejectTask(
      { ...target("training", "cpr___first_aid", training), reason: "expired certificate" },
      DB,
    )
    expect(state.docs.get(training)).toMatchObject({
      status: "actionRequired",
      updatedAt: "SERVER_TS",
      rejectionReason: "expired certificate",
    })

    const clearance = seedTask("clearance", "drug_screening_results", {
      title: "Drug Screening",
      status: "underReview",
    })
    await rejectTask(
      { ...target("clearance", "drug_screening_results", clearance), reason: "missing page" },
      DB,
    )
    expect(state.docs.get(clearance)).toMatchObject({
      status: "actionRequired",
      rejectionReason: "missing page",
    })
  })
})

describe("skipTask — onboarding only + intentional template creation", () => {
  it("skips an existing task without rewriting its title or submission", async () => {
    const path = seedTask("onboarding", "resume", {
      title: "Custom Resume Title",
      status: "submitted",
      isCompleted: false,
      fileUrl: "https://x/resume.pdf",
      formData: { note: "keep me" },
    })

    await skipTask({ ...target("onboarding", "resume", path), skip: true }, DB)

    expect(state.docs.get(path)).toMatchObject({
      status: "noActionRequired",
      isCompleted: false,
      updatedAt: "SERVER_TS",
      employeeName: "Jane Doe",
      title: "Custom Resume Title",
      fileUrl: "https://x/resume.pdf",
      formData: { note: "keep me" },
    })
  })

  it("un-skips an existing task back to notStarted", async () => {
    const path = seedTask("onboarding", "resume", {
      title: "Resume",
      status: "noActionRequired",
      isCompleted: false,
    })
    await skipTask({ ...target("onboarding", "resume", path), skip: false }, DB)
    expect(state.docs.get(path)?.status).toBe("notStarted")
  })

  it("creates a MISSING canonical template row with complete template + ownership metadata", async () => {
    const path = taskPath("onboarding", "resume")
    expect(state.docs.has(path)).toBe(false)

    await skipTask(
      {
        employeeId: "emp-1",
        taskId: "resume",
        taskSource: "onboarding",
        adminUid: ADMIN,
        expectedRevision: null,
        employeeName: "Client Supplied",
        skip: true,
      },
      DB,
    )

    expect(state.docs.get(path)).toMatchObject({
      title: "Resume",
      subtitle: "Upload Required",
      actionType: "upload",
      status: "noActionRequired",
      isCompleted: false,
      employeeName: "Jane Doe",
      employeeId: "emp-1",
      adminId: ADMIN,
      updatedAt: "SERVER_TS",
      blankFormLink: null,
      formData: null,
    })
  })

  it("never recreates a task deleted after the confirmation opened", async () => {
    const path = seedTask("onboarding", "resume", {
      title: "Resume",
      status: "submitted",
    })
    const reviewed = revisionOf(path)
    state.docs.delete(path)

    await expect(
      skipTask(
        {
          employeeId: "emp-1",
          taskId: "resume",
          taskSource: "onboarding",
          adminUid: ADMIN,
          expectedRevision: reviewed,
          skip: true,
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "not-found" })
    expect(state.docs.has(path)).toBe(false)
  })

  it("refuses to create non-canonical missing rows", async () => {
    await expect(
      skipTask(
        {
          employeeId: "emp-1",
          taskId: "made_up_task",
          taskSource: "onboarding",
          adminUid: ADMIN,
          expectedRevision: null,
          skip: true,
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "not-found" })
    expect(state.docs.has(taskPath("onboarding", "made_up_task"))).toBe(false)
  })

  it("cannot un-skip a missing document", async () => {
    await expect(
      skipTask(
        {
          employeeId: "emp-1",
          taskId: "resume",
          taskSource: "onboarding",
          adminUid: ADMIN,
          expectedRevision: null,
          skip: false,
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "not-found" })
    expect(state.docs.has(taskPath("onboarding", "resume"))).toBe(false)
  })

  it("rejects a stale toggle direction (already skipped)", async () => {
    const path = seedTask("onboarding", "resume", {
      title: "Resume",
      status: "noActionRequired",
    })
    await expect(
      skipTask({ ...target("onboarding", "resume", path), skip: true }, DB),
    ).rejects.toMatchObject({ code: "failed-precondition" })
    expect(state.docs.get(path)?.status).toBe("noActionRequired")
  })

  it("refuses training/clearance rows instead of mutating the wrong collection", async () => {
    await expect(
      skipTask(
        {
          employeeId: "emp-1",
          taskId: "start",
          taskSource: "training",
          adminUid: ADMIN,
          expectedRevision: null,
          skip: true,
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "invalid-argument" })
    expect(state.docs.has(taskPath("training", "start"))).toBe(false)
  })
})

describe("updateBlankFormLink — restricted + non-destructive", () => {
  it("writes ONLY blankFormLink + updatedAt and preserves everything else", async () => {
    const path = seedTask("onboarding", "tax_documents_i_9", {
      title: "Tax Documents (I-9)",
      status: "verified",
      isCompleted: true,
      fileUrl: "https://x/i9.pdf",
      blankFormLink: "https://old.test/i9.pdf",
    })
    const reviewed = revisionOf(path)

    await updateBlankFormLink(
      {
        employeeId: "emp-1",
        taskId: "tax_documents_i_9",
        taskSource: "onboarding",
        adminUid: ADMIN,
        expectedRevision: reviewed,
        newLink: " https://www.uscis.gov/i-9 ",
      },
      DB,
    )

    const stored = state.docs.get(path)!
    expect(stored).toMatchObject({
      blankFormLink: "https://www.uscis.gov/i-9",
      updatedAt: "SERVER_TS",
      status: "verified",
      isCompleted: true,
      fileUrl: "https://x/i9.pdf",
    })
  })

  it("rejects non-http(s) URLs", async () => {
    const path = seedTask("onboarding", "tax_documents_w_9", {
      title: "Tax Documents (W-9)",
      status: "notStarted",
    })
    await expect(
      updateBlankFormLink(
        {
          ...target("onboarding", "tax_documents_w_9", path),
          newLink: "javascript:alert(1)",
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "invalid-argument" })
  })

  it("rejects tasks other than I-9/W-9 and non-onboarding sources", async () => {
    const resume = seedTask("onboarding", "resume", { title: "Resume", status: "notStarted" })
    await expect(
      updateBlankFormLink(
        { ...target("onboarding", "resume", resume), newLink: "https://x.test/form.pdf" },
        DB,
      ),
    ).rejects.toMatchObject({ code: "invalid-argument" })

    const training = seedTask("training", "start", { title: "START", status: "submitted" })
    await expect(
      updateBlankFormLink(
        {
          ...target("training", "tax_documents_i_9", training),
          taskId: "tax_documents_i_9",
          newLink: "https://x.test/form.pdf",
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "invalid-argument" })
  })
})

describe("reviewed-revision protection", () => {
  it("refuses to approve a missing task even when the caller passes a null revision", async () => {
    const path = taskPath("onboarding", "resume")
    await expect(
      acceptTask(
        {
          employeeId: "emp-1",
          taskId: "resume",
          taskSource: "onboarding",
          adminUid: ADMIN,
          expectedRevision: null,
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "not-found" })
    expect(state.docs.has(path)).toBe(false)
  })

  it("never recreates a task deleted after review", async () => {
    const path = seedTask("onboarding", "resume", {
      title: "Resume",
      status: "submitted",
    })
    const reviewed = revisionOf(path)
    state.docs.delete(path)

    await expect(
      acceptTask(
        {
          employeeId: "emp-1",
          taskId: "resume",
          taskSource: "onboarding",
          adminUid: ADMIN,
          expectedRevision: reviewed,
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "not-found", message: expect.stringContaining("deleted") })
    expect(state.docs.has(path)).toBe(false)
  })

  it("rejects a replacement upload that leaves the status submitted", async () => {
    const path = seedTask("onboarding", "resume", {
      title: "Resume",
      status: "submitted",
      fileUrl: "https://x/old.pdf",
    })
    const reviewed = revisionOf(path)
    state.docs.set(path, {
      ...state.docs.get(path)!,
      fileUrl: "https://x/replacement.pdf",
      updatedAt: "NEWER",
    })

    await expect(
      acceptTask(
        {
          employeeId: "emp-1",
          taskId: "resume",
          taskSource: "onboarding",
          adminUid: ADMIN,
          expectedRevision: reviewed,
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "conflict" })
    expect(state.docs.get(path)).toMatchObject({
      status: "submitted",
      fileUrl: "https://x/replacement.pdf",
    })
  })

  it("rejects another admin's decision and does not overwrite it", async () => {
    const path = seedTask("clearance", "tb_status_report", {
      title: "TB",
      status: "underReview",
    })
    const reviewed = revisionOf(path)
    state.docs.set(path, {
      ...state.docs.get(path)!,
      status: "verified",
      verifiedAt: "OTHER_ADMIN",
    })

    await expect(
      acceptTask(
        {
          employeeId: "emp-1",
          taskId: "tb_status_report",
          taskSource: "clearance",
          adminUid: ADMIN,
          expectedRevision: reviewed,
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "conflict" })
    expect(state.docs.get(path)).toMatchObject({
      status: "verified",
      verifiedAt: "OTHER_ADMIN",
    })
  })

  it("revalidates the ORIGINAL revision when the transaction retries", async () => {
    const path = seedTask("onboarding", "resume", {
      title: "Resume",
      status: "submitted",
      fileUrl: "https://x/old.pdf",
    })
    const reviewed = revisionOf(path)

    // First attempt commits nothing; before the commit a different client
    // replaces the file. The retry must conflict, not approve the new upload.
    state.beforeCommit = (attempt) => {
      if (attempt === 0) {
        state.docs.set(path, {
          ...state.docs.get(path)!,
          fileUrl: "https://x/replacement.pdf",
        })
        state.version += 1
      }
    }

    await expect(
      acceptTask(
        {
          employeeId: "emp-1",
          taskId: "resume",
          taskSource: "onboarding",
          adminUid: ADMIN,
          expectedRevision: reviewed,
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "conflict" })

    expect(state.attempts).toBeGreaterThanOrEqual(2)
    expect(state.docs.get(path)).toMatchObject({
      status: "submitted",
      fileUrl: "https://x/replacement.pdf",
    })
  })

  it("rejects a blank-form save when the task changed while editing", async () => {
    const path = seedTask("onboarding", "tax_documents_i_9", {
      title: "Tax Documents (I-9)",
      status: "verified",
      isCompleted: true,
    })
    const reviewed = revisionOf(path)
    state.docs.set(path, {
      ...state.docs.get(path)!,
      formData: { replacement: true },
    })

    await expect(
      updateBlankFormLink(
        {
          employeeId: "emp-1",
          taskId: "tax_documents_i_9",
          taskSource: "onboarding",
          adminUid: ADMIN,
          expectedRevision: reviewed,
          newLink: "https://x.test/i9.pdf",
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "conflict" })
  })

  it("refuses a blank-form save on a deleted task", async () => {
    const path = seedTask("onboarding", "tax_documents_i_9", {
      title: "Tax Documents (I-9)",
      status: "verified",
    })
    const reviewed = revisionOf(path)
    state.docs.delete(path)

    await expect(
      updateBlankFormLink(
        {
          employeeId: "emp-1",
          taskId: "tax_documents_i_9",
          taskSource: "onboarding",
          adminUid: ADMIN,
          expectedRevision: reviewed,
          newLink: "https://x.test/i9.pdf",
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "not-found" })
    expect(state.docs.has(path)).toBe(false)
  })

  it("requires a revision argument (callers cannot skip the guard)", async () => {
    await expect(
      acceptTask(
        {
          employeeId: "emp-1",
          taskId: "resume",
          taskSource: "onboarding",
          adminUid: ADMIN,
        } as unknown as TaskActionTarget,
        DB,
      ),
    ).rejects.toMatchObject({ code: "invalid-argument" })
  })
})

describe("ownership / activation / transition guards", () => {
  it("rejects a review when the employee is no longer owned by this admin", async () => {
    const path = seedTask("onboarding", "resume", { title: "Resume", status: "submitted" })
    seedEmployee({ adminId: "other-admin" })

    await expect(
      acceptTask(
        {
          employeeId: "emp-1",
          taskId: "resume",
          taskSource: "onboarding",
          adminUid: ADMIN,
          expectedRevision: revisionOf(path),
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "permission-denied" })
    expect(state.docs.get(path)?.status).toBe("submitted")
  })

  it("rejects a review when the employee is inactive", async () => {
    const path = seedTask("training", "start", { title: "START", status: "underReview" })
    seedEmployee({ isActive: false })

    await expect(
      acceptTask(
        {
          employeeId: "emp-1",
          taskId: "start",
          taskSource: "training",
          adminUid: ADMIN,
          expectedRevision: revisionOf(path),
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "failed-precondition" })
    expect(state.docs.get(path)?.status).toBe("underReview")
  })

  it("rejects a non-employee account", async () => {
    const path = seedTask("onboarding", "resume", { title: "Resume", status: "submitted" })
    seedEmployee({ role: "admin" })

    await expect(
      acceptTask(
        {
          employeeId: "emp-1",
          taskId: "resume",
          taskSource: "onboarding",
          adminUid: ADMIN,
          expectedRevision: revisionOf(path),
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "permission-denied" })
  })

  it("rejects approvals for non-reviewable statuses", async () => {
    const path = seedTask("onboarding", "resume", {
      title: "Resume",
      status: "notStarted",
    })
    await expect(
      acceptTask(
        {
          employeeId: "emp-1",
          taskId: "resume",
          taskSource: "onboarding",
          adminUid: ADMIN,
          expectedRevision: revisionOf(path),
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "failed-precondition" })
    expect(state.docs.get(path)?.status).toBe("notStarted")
  })

  it("rejects a training inProgress approval but allows rejection of completed", async () => {
    const inProgress = seedTask("training", "start", {
      title: "START",
      status: "inProgress",
    })
    await expect(
      acceptTask(
        {
          employeeId: "emp-1",
          taskId: "start",
          taskSource: "training",
          adminUid: ADMIN,
          expectedRevision: revisionOf(inProgress),
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "failed-precondition" })

    const completed = seedTask("training", "paya", {
      title: "PAYA",
      status: "completed",
    })
    await rejectTask(
      {
        employeeId: "emp-1",
        taskId: "paya",
        taskSource: "training",
        adminUid: ADMIN,
        expectedRevision: revisionOf(completed),
        reason: "wrong certificate",
      },
      DB,
    )
    expect(state.docs.get(completed)?.status).toBe("actionRequired")
  })

  it("rejects reviews without an admin uid", async () => {
    const path = seedTask("onboarding", "resume", { title: "Resume", status: "submitted" })
    await expect(
      acceptTask(
        {
          employeeId: "emp-1",
          taskId: "resume",
          taskSource: "onboarding",
          adminUid: "",
          expectedRevision: revisionOf(path),
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "unauthenticated" })
  })
})

describe("validation + error wrapping", () => {
  it("rejects missing ids", async () => {
    await expect(
      acceptTask(
        {
          employeeId: "",
          taskId: "x",
          taskSource: "onboarding",
          adminUid: ADMIN,
          expectedRevision: null,
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "invalid-argument" })
    await expect(
      acceptTask(
        {
          employeeId: "e",
          taskId: "",
          taskSource: "onboarding",
          adminUid: ADMIN,
          expectedRevision: null,
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "invalid-argument" })
  })

  it("returns an actionable not-found error when the employee profile disappeared", async () => {
    seedEmployee()
    state.docs.delete(EMPLOYEE_PATH)
    const caught = await acceptTask(
      {
        employeeId: "emp-1",
        taskId: "resume",
        taskSource: "onboarding",
        adminUid: ADMIN,
        expectedRevision: null,
      },
      DB,
    ).catch((error: unknown) => error)
    expect(caught).toBeInstanceOf(EmployeeActionError)
    expect(caught).toMatchObject({
      code: "not-found",
      message: expect.stringContaining("Employee profile not found"),
    })
  })

  it("maps exhausted transaction contention to a review conflict", async () => {
    const path = seedTask("onboarding", "resume", {
      title: "Resume",
      status: "submitted",
    })
    state.beforeCommit = () => {
      state.version += 1
    }
    await expect(
      acceptTask(
        {
          employeeId: "emp-1",
          taskId: "resume",
          taskSource: "onboarding",
          adminUid: ADMIN,
          expectedRevision: revisionOf(path),
        },
        DB,
      ),
    ).rejects.toMatchObject({ code: "conflict" })
    expect(state.docs.get(path)?.status).toBe("submitted")
  })
})
