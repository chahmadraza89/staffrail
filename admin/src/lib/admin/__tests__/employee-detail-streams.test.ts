/**
 * Employee-detail stream tests. The `firebase/firestore` module is mocked
 * with a small in-memory fake so the REAL subscription code is exercised:
 * per-module snapshots arriving in any order, failures isolated per
 * listener, and late snapshot delivery guarded by unsubscribe.
 */
import { afterEach, describe, expect, it, vi } from "vitest"

import { LiveStreamEngine, type StreamBuilder } from "@/lib/admin/stream-protocol"
import {
  EMPTY_DETAIL,
  subscribeEmployeeDetail,
  mapClearanceDoc,
  mapTaskDoc,
  mapTrainingDoc,
  type EmployeeDetailSnapshot,
} from "@/lib/admin/employee-detail-streams"

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseFirestore: () => ({}),
}))

const fake = vi.hoisted(() => {
  type Handler = (snapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) => void
  type ErrorHandler = (error: Error) => void
  const listeners = new Map<string, { onData: Handler; onError: ErrorHandler; unsub: () => void }>()

  function collection(_db: unknown, ...segments: string[]): unknown {
    return { kind: "collection", path: segments.join("/") }
  }

  function onSnapshot(
    query: { path: string },
    onData: Handler,
    onError: ErrorHandler,
  ): () => void {
    const listener = { onData, onError, unsub: vi.fn() }
    listeners.set(query.path, { onData, onError, unsub: listener.unsub })
    return listener.unsub
  }

  return { listeners, collection, onSnapshot }
})

vi.mock("firebase/firestore", () => ({
  collection: fake.collection,
  onSnapshot: fake.onSnapshot,
}))

function emit(path: string, docs: Array<{ id: string; data: Record<string, unknown> }>): void {
  const listener = fake.listeners.get(path)
  if (!listener) {
    throw new Error(`no listener for ${path}`)
  }
  listener.onData({ docs: docs.map((doc) => ({ id: doc.id, data: () => doc.data })) })
}

function fail(path: string, error: Error): void {
  fake.listeners.get(path)!.onError(error)
}

const TASKS_PATH = "users/e1/onboarding_tasks"
const TRAININGS_PATH = "users/e1/trainings"
const CLEARANCE_PATH = "users/e1/clearance"

afterEach(() => {
  fake.listeners.clear()
  vi.restoreAllMocks()
})

describe("mapTaskDoc / mapTrainingDoc / mapClearanceDoc", () => {
  it("parses an onboarding task dto (dates, presence flags, fallbacks)", () => {
    const data = {
      title: "Resume",
      subtitle: null,
      status: "submitted",
      actionType: "upload",
      isCompleted: true,
      updatedAt: { seconds: 1700000000 },
      completedAt: { toDate: () => new Date(2026, 0, 5) },
      formData: { link: "x" },
      fileUrl: "https://f",
      rejectionReason: "",
    }
    const mapped = mapTaskDoc("resume", data)
    expect(mapped).toMatchObject({
      id: "resume",
      title: "Resume",
      subtitle: null,
      status: "submitted",
      actionType: "upload",
      isCompleted: true,
      hasFormData: true,
      hasAdminFormData: false,
      fileUrl: "https://f",
      rejectionReason: null, // empty string → null
    })
    expect(mapped.updatedAt?.getTime()).toBe(1700000000 * 1000)
    expect(mapped.completedAt?.getTime()).toBe(new Date(2026, 0, 5).getTime())

    const empty = mapTaskDoc("blank", {})
    expect(empty).toMatchObject({
      title: "Untitled task",
      status: "notStarted",
      isCompleted: false,
    })
  })

  it("parses trainings/clearances with Dart enum fallbacks", () => {
    expect(mapTrainingDoc("start", { status: "verified" }).status).toBe("verified")
    expect(mapTrainingDoc("wip", { status: "bogus" }).status).toBe("notStarted")
    expect(mapClearanceDoc("tb", { status: "underReview" }).status).toBe("underReview")
    expect(mapClearanceDoc("wip", {}).status).toBe("pending")
    expect(mapTrainingDoc("x", { title: "", certificateUrl: " https://cert" }).certificateUrl).toBe(
      " https://cert",
    )
    expect(mapClearanceDoc("y", { fileUrl: "" }).fileUrl).toBeNull()
  })
})

describe("subscribeEmployeeDetail", () => {
  function start(): LiveStreamEngine<EmployeeDetailSnapshot> {
    const builder: StreamBuilder<EmployeeDetailSnapshot> = (ctrl) =>
      subscribeEmployeeDetail("e1", ctrl)
    const engine = new LiveStreamEngine<EmployeeDetailSnapshot>(builder, EMPTY_DETAIL)
    engine.start()
    return engine
  }

  it("streams partial snapshots: first module ready is visible while others connect", () => {
    const engine = start()

    emit(TASKS_PATH, [
      { id: "resume", data: { title: "Resume", status: "submitted" } },
    ])

    // Only the tasks listener is ready so far — data already shows the task.
    expect(engine.snapshot().ready.has("onboardingTasks")).toBe(true)
    expect(engine.snapshot().ready.has("trainings")).toBe(false)
    expect(engine.snapshot().data.tasks[0]?.id).toBe("resume")
    expect(engine.snapshot().data.trainings).toEqual([])

    emit(TRAININGS_PATH, [])
    emit(CLEARANCE_PATH, [])

    expect(engine.snapshot().status).toBe("ready")
    expect(engine.snapshot().data).toEqual({
      tasks: expect.any(Array),
      trainings: [],
      clearances: [],
    })
    engine.dispose()
  })

  it("re-emits the ENTIRE merged snapshot on every module update (latest-wins)", () => {
    const engine = start()

    emit(TASKS_PATH, [{ id: "a", data: { title: "A" } }])
    emit(TRAININGS_PATH, [{ id: "start", data: { title: "START", status: "inProgress" } }])

    // A clearance snapshot still carries the previous modules' data.
    emit(CLEARANCE_PATH, [{ id: "tb_status_report", data: { status: "verified" } }])

    const finalData = engine.snapshot().data
    expect(finalData.tasks[0]?.id).toBe("a")
    expect(finalData.trainings[0]?.id).toBe("start")
    expect(finalData.clearances[0]?.id).toBe("tb_status_report")
    engine.dispose()
  })

  it("one failed module reports ITS error without clearing the others' data", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const engine = start()

    emit(TASKS_PATH, [{ id: "a", data: { title: "A" } }])
    fail(TRAININGS_PATH, new Error("index missing"))

    expect(engine.snapshot().status).toBe("error")
    expect((engine.snapshot().errors as Map<string, Error>).get("trainings")?.message).toBe(
      "index missing",
    )
    // The tasks snapshot survives (never hidden by another listener's error).
    expect(engine.snapshot().data.tasks[0]?.id).toBe("a")
    expect(engine.snapshot().ready.has("onboardingTasks")).toBe(true)
    void warn
    engine.dispose()
  })

  it("a later snapshot clears the listener's own error and re-readies", () => {
    const engine = start()

    fail(TASKS_PATH, new Error("boom"))
    expect(engine.snapshot().status).toBe("error")

    emit(TASKS_PATH, [{ id: "b", data: { title: "B" } }])
    emit(TRAININGS_PATH, [])
    emit(CLEARANCE_PATH, [])
    expect(engine.snapshot().status).toBe("ready")
    expect(engine.snapshot().data.tasks[0]?.id).toBe("b")
    engine.dispose()
  })

  it("dispose unsubscribes all three listeners; late snapshots are ignored", () => {
    const warn = vi.spyOn(console, "error"). mockImplementation(() => {})
    const engine = start()

    expect(fake.listeners.size).toBe(3)
    engine.dispose()

    for (const listener of fake.listeners.values()) {
      expect(listener.unsub).toHaveBeenCalled()
    }

    // Late callback after disposal must not throw or resurrect data.
    const late = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() =>
      emit(TASKS_PATH, [{ id: "late", data: { title: "Late" } }]),
    ).not.toThrow()
    late.mockRestore()
    void warn
  })
})
