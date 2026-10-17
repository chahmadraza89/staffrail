/**
 * Dashboard stream tests. The `firebase/firestore` module is mocked with a
 * small fake that records the queries built and hands back (onData/onError)
 * callbacks so tests drive REAL subscription behavior: snapshots arriving
 * in any order, failures, dynamic reconcile, and cleanup — comparing limit
 * constants alone would verify nothing.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

import * as firestore from "firebase/firestore"
import type { DocumentData } from "firebase/firestore"

import {
  DEFAULT_ACTION_TASK_PAGE_SIZE,
  deriveComplianceAlerts,
  mapActionTask,
  subscribeAdminActionRequiredTasks,
  subscribeAdminDashboardStats,
  subscribeAdminEmployeesProgress,
} from "@/lib/admin/dashboard-streams"
import { isIndexCompatibilityError } from "@/lib/admin/stream-protocol"
import { ACTION_REQUIRED_STATUSES } from "@/lib/admin/task-status"
import type {
  AdminDashboardStats,
  AdminEmployeeProgress,
  ActionRequiredTask,
} from "@/lib/admin/dashboard-models"
import type { LiveStreamController } from "@/lib/admin/stream-protocol"

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseFirestore: () => ({}),
}))

vi.mock("firebase/firestore", () => {
  /** Recorded onSnapshot attachments: query + callbacks + unsubscribe. */
  const calls: Array<{
    query: unknown
    onData: (snapshot: { docs: Array<{ id: string; data: () => DocumentData }> }) => void
    onError: (error: Error) => void
    unsub: ReturnType<typeof vi.fn>
  }> = []

  const where = (field: string, filter: string, value: unknown) => ({
    type: "where",
    field,
    filter,
    value,
  })
  const orderBy = (field: string, dir: string) => ({ type: "orderBy", field, dir })
  const limit = (n: number) => ({ type: "limit", n })

  return {
    collection: (_db: unknown, ...segments: unknown[]) => ({ kind: "collection", segments }),
    collectionGroup: (_db: unknown, id: string) => ({ kind: "collectionGroup", id }),
    query: (base: unknown, ...ops: unknown[]) => ({ kind: "query", base, ops }),
    where,
    orderBy,
    limit,
    onSnapshot: (query: unknown, onData: never, onError: never) => {
      const call = { query, onData, onError, unsub: vi.fn() }
      calls.push(call)
      return call.unsub
    },
    __calls: calls,
  }
})

const recordedCalls = (firestore as unknown as { __calls: SnapshotCall[] }).__calls

interface SnapshotCall {
  query: { kind: string; base?: unknown; ops?: Array<Record<string, unknown>>; segments?: unknown[] }
  onData: (snapshot: { docs: Array<{ id: string; data: () => DocumentData }> }) => void
  onError: (error: Error) => void
  unsub: ReturnType<typeof vi.fn>
}

const call = (index: number): SnapshotCall => {
  const c = recordedCalls[index]
  if (!c) throw new Error(`no onSnapshot call recorded at index ${index}`)
  return c
}

/** Recording controller (mirrors what the hook's engine does). */
interface RecordingCtrl<T> {
  registered: string[]
  emissions: Array<{ id: string; data: T }>
  failures: Array<{ id: string; error: Error }>
  forgotten: string[]
}

function recordingCtrl<T>(): LiveStreamController<T> & RecordingCtrl<T> {
  const ctrl: LiveStreamController<T> & RecordingCtrl<T> = {
    registered: [],
    emissions: [],
    failures: [],
    forgotten: [],
    listen(id: string) {
      ctrl.registered.push(id)
    },
    emit(id: string, data: T) {
      ctrl.emissions.push({ id, data })
    },
    fail(id: string, error: Error) {
      ctrl.failures.push({ id, error })
    },
    forget(id: string) {
      ctrl.forgotten.push(id)
    },
  }
  return ctrl
}

const doc = (id: string, data: DocumentData) => ({ id, data: () => data })
const seconds = (date: Date) => ({ seconds: Math.floor(date.getTime() / 1000) })

beforeEach(() => {
  recordedCalls.length = 0
})

/* ══ pure helpers (kept verbatim from the earlier rounds) ════════════════ */

describe("mapActionTask", () => {
  it("maps a submitted task including epoch-seconds timestamps", () => {
    const task = mapActionTask("task-1", {
      title: "I-9 Form",
      status: "submitted",
      isCompleted: false,
      employeeId: "emp-1",
      employeeName: "Ahmad",
      dueDate: seconds(new Date(1760000000 * 1000)),
      taskSource: "clearance",
    })
    expect(task).toMatchObject({
      id: "task-1",
      title: "I-9 Form",
      status: "submitted",
      isCompleted: false,
      employeeId: "emp-1",
      employeeName: "Ahmad",
      taskSource: "clearance",
    })
  })

  it("falls back to safe defaults for malformed documents instead of throwing", () => {
    const task = mapActionTask("task-bad", { status: "not-a-real-status" })
    expect(task.title).toBe("Untitled task")
    expect(task.status).toBe("notStarted")
    expect(task.employeeName).toBe("Unknown")
    expect(task.taskSource).toBe("onboarding")
    expect(ACTION_REQUIRED_STATUSES.includes(task.status)).toBe(false)
  })
})

describe("deriveComplianceAlerts", () => {
  const now = new Date("2026-10-18T12:00:00Z")

  it("returns no alerts for an empty task list", () => {
    expect(deriveComplianceAlerts([], now)).toEqual([])
  })

  it("flags an overdue actionable task as Overdue", () => {
    const alerts = deriveComplianceAlerts(
      [
        mapActionTask("t1", {
          title: "W-9",
          status: "submitted",
          isCompleted: false,
          employeeId: "e1",
          employeeName: "Ahmad",
          dueDate: seconds(new Date(now.getTime() - 86_400_000)),
        }),
      ],
      now,
    )
    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toMatchObject({ id: "t1", category: "Overdue" })
  })

  it("flags waitingForApprover as Signature Needed (faithful to Flutter semantics)", () => {
    const alerts = deriveComplianceAlerts(
      [
        mapActionTask("t2", {
          title: "Dual-signature orientation",
          status: "waitingForApprover",
          isCompleted: true,
          employeeId: "e2",
          employeeName: "Sara",
        }),
      ],
      now,
    )
    expect(alerts).toHaveLength(1)
    expect(alerts[0].category).toBe("Signature Needed")
  })

  it("never flags completed tasks as overdue", () => {
    const alerts = deriveComplianceAlerts(
      [
        mapActionTask("t3", {
          title: "Direct deposit",
          status: "completed",
          isCompleted: true,
          employeeId: "e1",
          employeeName: "Ahmad",
          dueDate: seconds(new Date(now.getTime() - 48 * 3_600_000)),
        }),
      ],
      now,
    )
    expect(alerts).toHaveLength(0)
  })

  it("sorts oldest-due-first", () => {
    const alerts = deriveComplianceAlerts(
      [
        mapActionTask("newest", {
          title: "B", status: "submitted", isCompleted: false,
          employeeId: "n", employeeName: "N",
          dueDate: seconds(new Date(now.getTime() - 24 * 3_600_000)),
        }),
        mapActionTask("oldest", {
          title: "A", status: "submitted", isCompleted: false,
          employeeId: "p", employeeName: "P",
          dueDate: seconds(new Date(now.getTime() - 96 * 3_600_000)),
        }),
      ],
      now,
    )
    expect(alerts.map((alert) => alert.id)).toEqual(["oldest", "newest"])
  })
})

describe("isIndexCompatibilityError", () => {
  it("recognizes failed-precondition codes and index wording", () => {
    const error = Object.assign(new Error("The query requires an index."), {
      code: "failed-precondition",
    })
    expect(isIndexCompatibilityError(error)).toBe(true)
    expect(isIndexCompatibilityError(new Error("index is not created yet"))).toBe(true)
  })

  it("does not misclassify unrelated failures", () => {
    const permission = Object.assign(new Error("nope"), { code: "permission-denied" })
    expect(isIndexCompatibilityError(permission)).toBe(false)
    expect(isIndexCompatibilityError(new Error("network timeout"))).toBe(false)
  })
})

/* ══ statistics ══════════════════════════════════════════════════════════ */

describe("subscribeAdminDashboardStats", () => {
  it("announces both listeners, emits snapshots in ANY order, and wires cleanup", () => {
    const ctrl = recordingCtrl<AdminDashboardStats>()
    const unsubscribe = subscribeAdminDashboardStats("adm-1", ctrl)

    expect(ctrl.registered).toEqual(["users", "tasks"])
    expect(recordedCalls).toHaveLength(2)

    const yesterday = seconds(new Date(Date.now() - 86_400_000))
    const yearsAgo = seconds(new Date(Date.now() - 5 * 365 * 86_400_000))

    // Task listener fires FIRST (snapshot order must not matter: users
    // attaches first in code, but events can arrive in any order).
    call(1).onData({
      docs: [doc("t1", { isCompleted: true, completedAt: seconds(new Date()) })],
    })
    expect(ctrl.emissions[0]).toMatchObject({
      id: "tasks",
      data: { onboarding: 0, active: 0, completedToday: 1 },
    })

    // Users listener fires second.
    call(0).onData({
      docs: [
        doc("e1", {
          role: "employee",
          isActive: true,
          createdAt: yesterday,
        }),
        doc("e2", { role: "employee", isActive: true, createdAt: yearsAgo }),
        doc("e3", { role: "employee", isActive: false, createdAt: yesterday }),
        doc("m1", { role: "admin", isActive: true }),
      ],
    })
    const usersEmit = ctrl.emissions.find((emission) => emission.id === "users")
    expect(usersEmit?.data).toMatchObject({ onboarding: 1, active: 2, completedToday: 1 })

    // A task-stream failure must surface as a listener failure.
    const boom = new Error("kaboom")
    call(1).onError(boom)
    expect(ctrl.failures).toContainEqual({ id: "tasks", error: boom })

    // Cleanup disposes BOTH raw listeners.
    unsubscribe()
    for (const snapshotCall of recordedCalls) {
      expect(snapshotCall.unsub).toHaveBeenCalledTimes(1)
    }
  })
})

/* ══ action-required tasks ═══════════════════════════════════════════════ */

describe("subscribeAdminActionRequiredTasks", () => {
  it("builds a server-side actionable filter and a page-size limit (no isCompleted filter)", () => {
    const ctrl = recordingCtrl<ActionRequiredTask[]>()
    const unsubscribe = subscribeAdminActionRequiredTasks("adm-1", 25, ctrl)

    expect(ctrl.registered).toEqual(["tasks"])
    expect(recordedCalls).toHaveLength(1)

    const attached = call(0).query as {
      kind: string
      base: { kind: string; id: string }
      ops: Array<Record<string, unknown>>
    }
    expect(attached.kind).toBe("query")
    expect(attached.base).toEqual({ kind: "collectionGroup", id: "onboarding_tasks" })

    expect(attached.ops).toContainEqual({
      type: "where",
      field: "adminId",
      filter: "==",
      value: "adm-1",
    })
    // The whole point: actionable statuses are filtered SERVER-SIDE...
    expect(attached.ops).toContainEqual({
      type: "where",
      field: "status",
      filter: "in",
      value: [...ACTION_REQUIRED_STATUSES],
    })
    expect(attached.ops).toContainEqual({ type: "orderBy", field: "updatedAt", dir: "desc" })
    expect(attached.ops).toContainEqual({ type: "limit", n: 25 })

    // ...and there is genuinely NO isCompleted filter — approvals are valid
    // even when isCompleted is true.
    expect(
      attached.ops.some((op) => op.type === "where" && op.field === "isCompleted"),
    ).toBe(false)

    unsubscribe()
    expect(call(0).unsub).toHaveBeenCalledTimes(1)
  })

  it("a page contains only actionable tasks; newer non-actionable completions can never hide an older approval", () => {
    const ctrl = recordingCtrl<ActionRequiredTask[]>()
    subscribeAdminActionRequiredTasks("adm-1", DEFAULT_ACTION_TASK_PAGE_SIZE, ctrl)

    // Simulate the first snapshot: the SERVER already excluded the 50 newer
    // notStarted/completed tasks — the listener receives only the older
    // submitted approval. (The old in-memory newest-25 design would have
    // hidden it; this query shape cannot.)
    const olderSubmitted = doc("old-approval", {
      title: "I-9 Form",
      status: "submitted",
      isCompleted: false,
      employeeId: "e1",
      employeeName: "Ahmad",
      updatedAt: seconds(new Date(Date.now() - 10 * 86_400_000)),
    })
    call(0).onData({ docs: [olderSubmitted] })

    expect(ctrl.emissions).toHaveLength(1)
    const [emission] = ctrl.emissions
    expect(emission.id).toBe("tasks")
    expect(emission.data).toHaveLength(1)
    expect(emission.data[0]).toMatchObject({ id: "old-approval", status: "submitted" })
    // Defensive check: nothing mapped the excluded statuses in.
    expect(emission.data.every((task) => ACTION_REQUIRED_STATUSES.includes(task.status))).toBe(true)
  })

  it("growing the page re-subscribes and makes the older approval accessible", () => {
    const ctrlPage1 = recordingCtrl<ActionRequiredTask[]>()
    const unsubscribePage1 = subscribeAdminActionRequiredTasks("adm-1", 25, ctrlPage1)
    expect(call(0).query).toMatchObject({ ops: expect.arrayContaining([{ type: "limit", n: 25 }]) })

    // The view grows the page → engine tears down page 1 ...
    unsubscribePage1()
    expect(call(0).unsub).toHaveBeenCalledTimes(1)

    // ... and subscribes page 2 with the doubled limit.
    const ctrlPage2 = recordingCtrl<ActionRequiredTask[]>()
    subscribeAdminActionRequiredTasks("adm-1", 50, ctrlPage2)
    const page2 = call(1).query as { ops: Array<Record<string, unknown>> }
    expect(page2.ops).toContainEqual({ type: "limit", n: 50 })

    // Server returns both the newest actionable task AND the older approval.
    call(1).onData({
      docs: [
        doc("rc-1", { title: "T", status: "waitingForApprover", isCompleted: false, employeeName: "N", updatedAt: seconds(new Date()) }),
        doc("old-approval", { title: "I-9", status: "submitted", isCompleted: false, employeeId: "e1", employeeName: "A", updatedAt: seconds(new Date(Date.now() - 10 * 86_400_000)) }),
      ],
    })
    expect(ctrlPage2.emissions[0].data.map((task) => task.id)).toEqual([
      "rc-1",
      "old-approval",
    ])
  })

  it("missing index FAILS LOUDLY — no silent fallback listener, actionable error", () => {
    const ctrl = recordingCtrl<ActionRequiredTask[]>()
    subscribeAdminActionRequiredTasks("adm-1", 25, ctrl)

    // Exactly ONE live listener existed; the index error must reach the
    // controller. No hidden newest-25 fallback subscription may appear.
    call(0).onError(Object.assign(new Error("The query requires an index."), {
      code: "failed-precondition",
      message: "The query requires an index.",
    }))

    expect(ctrl.failures).toHaveLength(1)
    expect(isIndexCompatibilityError(ctrl.failures[0].error)).toBe(true)
    expect(recordedCalls).toHaveLength(1) // ← no fallback ever attached
    expect(isIndexCompatibilityError(new Error("The query requires an index."))).toBe(true)
  })

  it("snapshots map through mapActionTask with composite-safe data", () => {
    const ctrl = recordingCtrl<ActionRequiredTask[]>()
    subscribeAdminActionRequiredTasks("adm-1", 10, ctrl)

    call(0).onData({
      docs: [
        doc("wfa", { title: "Dual-signature", status: "waitingForApprover", isCompleted: false, employeeId: "e9", employeeName: "Z" }),
      ],
    })
    expect(ctrl.emissions[0].data[0]).toMatchObject({ status: "waitingForApprover", employeeId: "e9" })
  })
})

/* ══ employee progress ═══════════════════════════════════════════════════ */

describe("subscribeAdminEmployeesProgress", () => {
  it("an empty employee list is complete on its own (users only, no watchers)", () => {
    const ctrl = recordingCtrl<AdminEmployeeProgress[]>()
    const unsubscribe = subscribeAdminEmployeesProgress("adm-1", ctrl)

    expect(ctrl.registered).toEqual(["users"])
    expect(recordedCalls).toHaveLength(1)

    call(0).onData({ docs: [] })
    expect(ctrl.emissions).toEqual([{ id: "users", data: [] }])

    unsubscribe()
    expect(call(0).unsub).toHaveBeenCalledTimes(1)
  })

  it("attaches three watchers per employee; live progress recomputed per snapshot", () => {
    const ctrl = recordingCtrl<AdminEmployeeProgress[]>()
    const unsubscribe = subscribeAdminEmployeesProgress("adm-1", ctrl)

    call(0).onData({
      docs: [doc("e1", { name: "Ahmad", email: "a@x.dev", isActive: true, lastLogin: seconds(new Date()) })],
    })

    // users + 3 module watchers
    expect(recordedCalls).toHaveLength(4)
    expect(ctrl.registered).toEqual([
      "users",
      "emp:e1:onboarding_tasks",
      "emp:e1:trainings",
      "emp:e1:clearance",
    ])

    // Watcher paths target the right sub-collections. The raw module
    // attaches `collection(db, "users", uid, module)` directly (no query
    // wrapper), so the query IS the collection descriptor.
    const watcherPaths = [1, 2, 3].map((index) => call(index).query as { segments: unknown[] })
    expect(watcherPaths[0].segments).toEqual(["users", "e1", "onboarding_tasks"])
    expect(watcherPaths[1].segments).toEqual(["users", "e1", "trainings"])
    expect(watcherPaths[2].segments).toEqual(["users", "e1", "clearance"])

    // One completed + one not-started task → 50%; empty trainings → 0%;
    // 1/1 verified clearances → 100%. Overall averages the non-empty ones.
    call(1).onData({
      docs: [
        doc("t1", { status: "completed", isCompleted: true }),
        doc("t2", { status: "notStarted", isCompleted: false }),
      ],
    })
    call(2).onData({
      docs: [doc("tr1", { status: "completed" }), doc("tr2", { status: "pending" })],
    })
    call(3).onData({
      docs: [doc("c1", { status: "verified" })],
    })

    const last = ctrl.emissions[ctrl.emissions.length - 1]
    expect(last.id).toBe("emp:e1:clearance")
    expect(last.data).toHaveLength(1)
    expect(last.data[0]).toMatchObject({
      uid: "e1",
      onboardingProgress: 0.5,
      trainingProgress: 0.5,
      clearanceProgress: 1,
      overallProgress: (0.5 + 0.5 + 1) / 3,
    })

    unsubscribe()
    for (const snapshotCall of recordedCalls) {
      expect(snapshotCall.unsub).toHaveBeenCalledTimes(1)
    }
  })

  it("a subcollection failure is reported and marked failed on its own listener", () => {
    const ctrl = recordingCtrl<AdminEmployeeProgress[]>()
    subscribeAdminEmployeesProgress("adm-1", ctrl)

    call(0).onData({
      docs: [doc("e1", { name: "Ahmad", isActive: true })],
    })

    const boom = new Error("permission-denied")
    call(3).onError(boom) // emp:e1:clearance
    expect(ctrl.failures).toContainEqual({
      id: "emp:e1:clearance",
      error: boom,
    })

    // Other listeners keep emitting; the failed listener's own id keeps its
    // error (assert on hook layer in use-live-query tests).
    call(1).onData({ docs: [] })
    expect(ctrl.emissions[ctrl.emissions.length - 1].id).toBe("emp:e1:onboarding_tasks")
  })

  it("employees removed mid-session are unsubscribed + forgotten; late callbacks ignored", () => {
    const ctrl = recordingCtrl<AdminEmployeeProgress[]>()
    subscribeAdminEmployeesProgress("adm-1", ctrl)

    call(0).onData({
      docs: [
        doc("e1", { name: "A", isActive: true }),
        doc("e2", { name: "B", isActive: true }),
      ],
    })
    expect(recordedCalls).toHaveLength(7) // users + 2 × 3 watchers

    // Employees snapshot without e1 → reconcile.
    call(0).onData({ docs: [doc("e2", { name: "B", isActive: true })] })

    expect(ctrl.forgotten).toEqual([
      "emp:e1:onboarding_tasks",
      "emp:e1:trainings",
      "emp:e1:clearance",
    ])
    // The 3 e1 watcher listeners were unsubscribed.
    expect(call(1).unsub).toHaveBeenCalledTimes(1)
    expect(call(2).unsub).toHaveBeenCalledTimes(1)
    expect(call(3).unsub).toHaveBeenCalledTimes(1)
    // e2's watchers stay live.
    expect(call(4).unsub).not.toHaveBeenCalled()

    // A late snapshot from the DETACHED e1 watcher must not crash or emit.
    const before = ctrl.emissions.length
    call(1).onData({ docs: [doc("tLate", { status: "completed", isCompleted: true })] })
    expect(ctrl.emissions.length).toBe(before)
  })
})
