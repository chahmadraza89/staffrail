/**
 * End-to-end (mocked Firestore) review → snapshot → progress test.
 *
 * The REAL acceptTask/rejectTask payloads are applied through a transactional
 * double, the resulting document is parsed by the REAL stream mapper, and the
 * shared progress + compliance calculations consume the result. This pins the
 * previously-broken training lifecycle: approval writes `"verified"`, which
 * must count as completed everywhere progress is reported.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  docs: new Map<string, Record<string, unknown>>(),
}))

vi.mock("firebase/firestore", () => {
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
      const writes: Array<() => void> = []
      const transaction = {
        get: async (ref: { path: string }) => snapshotFor(ref.path),
        update: (ref: { path: string }, data: Record<string, unknown>) => {
          writes.push(() => {
            state.docs.set(ref.path, { ...state.docs.get(ref.path)!, ...data })
          })
        },
        set: (ref: { path: string }, data: Record<string, unknown>) => {
          writes.push(() => state.docs.set(ref.path, data))
        },
      }
      const result = await updateFunction(transaction)
      for (const write of writes) write()
      return result
    },
  }
})

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseFirestore: () => ({}),
  getFirebaseFunctions: () => ({}),
}))

import { acceptTask, rejectTask } from "@/lib/admin/task-actions"
import { submissionRevision } from "@/lib/admin/task-revision"
import {
  mapClearanceDoc,
  mapTaskDoc,
  mapTrainingDoc,
} from "@/lib/admin/employee-detail-streams"
import { computeModuleProgress } from "@/lib/admin/progress-models"
import { buildComplianceModel } from "@/lib/admin/compliance-helpers"

const DB = {} as never
const ADMIN = "admin-1"
const EMPLOYEE = "users/emp-1"
const TRAINING = `${EMPLOYEE}/trainings/start`
const ONBOARDING = `${EMPLOYEE}/onboarding_tasks/signed_offer_letter`
const CLEARANCE = `${EMPLOYEE}/clearance/drug_screening_results`

function revisionOf(path: string): string {
  return submissionRevision(state.docs.get(path))
}

function snapshotState() {
  const tasks = [
    {
      ...mapTaskDoc("signed_offer_letter", state.docs.get(ONBOARDING)!),
      title: "Signed offer letter",
    },
  ]
  const trainings = [
    mapTrainingDoc("start", state.docs.get(TRAINING)!),
    mapTrainingDoc("paya", state.docs.get(`${EMPLOYEE}/trainings/paya`)!),
  ]
  const clearances = [
    mapClearanceDoc("drug_screening_results", state.docs.get(CLEARANCE)!),
  ]
  const progress = computeModuleProgress({ tasks, trainings, clearances })
  const model = buildComplianceModel({
    tasks: { kind: "ready", items: tasks },
    trainings: { kind: "ready", items: trainings },
    clearances: { kind: "ready", items: clearances },
  })
  const trainingRow = model.allTasks.find(
    (row) => row.taskSource === "training" && row.id === "start",
  )!
  return { progress, trainingRow }
}

beforeEach(() => {
  state.docs.clear()
  state.docs.set(EMPLOYEE, {
    name: "Jane Doe",
    role: "employee",
    adminId: ADMIN,
    isActive: true,
  })
  state.docs.set(ONBOARDING, {
    title: "Signed offer letter",
    status: "verified",
    isCompleted: true,
  })
  state.docs.set(TRAINING, {
    title: "START",
    status: "underReview",
    certificateUrls: ["https://x/cert.pdf"],
  })
  state.docs.set(`${EMPLOYEE}/trainings/paya`, {
    title: "PAYA",
    status: "completed",
  })
  state.docs.set(CLEARANCE, {
    title: "Drug Screening Results",
    status: "pending",
  })
})

describe("training approval → progress", () => {
  it("applies the real approval payload and advances training + overall progress", async () => {
    const before = snapshotState()
    expect(before.trainingRow.isCompleted).toBe(false)
    expect(before.progress.training).toBeCloseTo(0.5)
    expect(before.progress.overall).toBeCloseTo(0.5)

    await acceptTask(
      {
        employeeId: "emp-1",
        taskId: "start",
        taskSource: "training",
        adminUid: ADMIN,
        expectedRevision: revisionOf(TRAINING),
      },
      DB,
    )

    const stored = state.docs.get(TRAINING)!
    expect(stored).toMatchObject({ status: "verified", updatedAt: "SERVER_TS" })
    expect(mapTrainingDoc("start", stored).status).toBe("verified")

    const after = snapshotState()
    expect(after.trainingRow.isCompleted).toBe(true)
    expect(after.progress.training).toBeCloseTo(1)
    expect(after.progress.overall).toBeCloseTo((1 + 1 + 0) / 3)
    expect(after.progress.overall).toBeGreaterThan(before.progress.overall)
  })

  it("rejection removes the training from completed progress", async () => {
    await acceptTask(
      {
        employeeId: "emp-1",
        taskId: "start",
        taskSource: "training",
        adminUid: ADMIN,
        expectedRevision: revisionOf(TRAINING),
      },
      DB,
    )
    const approved = snapshotState()
    expect(approved.progress.training).toBeCloseTo(1)

    await rejectTask(
      {
        employeeId: "emp-1",
        taskId: "start",
        taskSource: "training",
        adminUid: ADMIN,
        expectedRevision: revisionOf(TRAINING),
        reason: "certificate expired",
      },
      DB,
    )

    const stored = state.docs.get(TRAINING)!
    expect(stored.status).toBe("actionRequired")
    const rejected = snapshotState()
    expect(rejected.trainingRow.isCompleted).toBe(false)
    expect(rejected.progress.training).toBeCloseTo(0.5)
    expect(rejected.progress.overall).toBeCloseTo(0.5)
  })
})
