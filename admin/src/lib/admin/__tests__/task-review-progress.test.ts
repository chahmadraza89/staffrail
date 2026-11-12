/**
 * End-to-end (in-memory DataStore) review → snapshot → progress test.
 */
import { beforeEach, describe, expect, it } from "vitest"

import { MemoryDataStore } from "@/lib/data/memory-store"
import { acceptTask, rejectTask } from "@/lib/admin/task-actions"
import { submissionRevision } from "@/lib/admin/task-revision"
import {
  mapClearanceDoc,
  mapTaskDoc,
  mapTrainingDoc,
} from "@/lib/admin/employee-detail-streams"
import { computeModuleProgress } from "@/lib/admin/progress-models"
import { buildComplianceModel } from "@/lib/admin/compliance-helpers"

const store = new MemoryDataStore()
const ADMIN = "admin-1"
const EMPLOYEE = "users/emp-1"
const TRAINING = `${EMPLOYEE}/trainings/start`
const ONBOARDING = `${EMPLOYEE}/onboarding_tasks/signed_offer_letter`
const CLEARANCE = `${EMPLOYEE}/clearance/drug_screening_results`

function revisionOf(path: string): string {
  return submissionRevision(store.docs.get(path))
}

function snapshotState() {
  const tasks = [
    {
      ...mapTaskDoc("signed_offer_letter", store.docs.get(ONBOARDING)!),
      title: "Signed offer letter",
    },
  ]
  const trainings = [
    mapTrainingDoc("start", store.docs.get(TRAINING)!),
    mapTrainingDoc("paya", store.docs.get(`${EMPLOYEE}/trainings/paya`)!),
  ]
  const clearances = [
    mapClearanceDoc("drug_screening_results", store.docs.get(CLEARANCE)!),
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
  store.clear()
  store.docs.set(EMPLOYEE, {
    name: "Jane Doe",
    role: "employee",
    adminId: ADMIN,
    isActive: true,
  })
  store.docs.set(ONBOARDING, {
    title: "Signed offer letter",
    status: "verified",
    isCompleted: true,
  })
  store.docs.set(TRAINING, {
    title: "START",
    status: "underReview",
    certificateUrls: ["https://x/cert.pdf"],
  })
  store.docs.set(`${EMPLOYEE}/trainings/paya`, {
    title: "PAYA",
    status: "completed",
  })
  store.docs.set(CLEARANCE, {
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
      store,
    )

    const stored = store.docs.get(TRAINING)!
    expect(stored.status).toBe("verified")
    expect(stored.updatedAt).toBeInstanceOf(Date)
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
      store,
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
      store,
    )

    const stored = store.docs.get(TRAINING)!
    expect(stored.status).toBe("actionRequired")
    const rejected = snapshotState()
    expect(rejected.trainingRow.isCompleted).toBe(false)
    expect(rejected.progress.training).toBeCloseTo(0.5)
    expect(rejected.progress.overall).toBeCloseTo(0.5)
  })
})
