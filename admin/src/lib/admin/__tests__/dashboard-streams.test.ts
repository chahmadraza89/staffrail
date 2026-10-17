import { describe, expect, it } from "vitest"

import {
  ACTION_REQUIRED_FALLBACK_LIMIT,
  ACTION_REQUIRED_PRIMARY_LIMIT,
  deriveComplianceAlerts,
  isIndexCompatibilityError,
  mapActionTask,
} from "@/lib/admin/dashboard-streams"
import { ACTION_REQUIRED_STATUSES } from "@/lib/admin/task-status"

describe("mapActionTask", () => {
  it("maps a submitted task including epoch-seconds timestamps", () => {
    const task = mapActionTask("task-1", {
      title: "I-9 Form",
      status: "submitted",
      isCompleted: false,
      employeeId: "emp-1",
      employeeName: "Ahmad",
      dueDate: { seconds: 1760000000 },
      updatedAt: { seconds: 1760010000 },
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
    expect(task.dueDate?.getTime()).toBe(1760000000 * 1000)
    expect(task.updatedAt?.getTime()).toBe(1760010000 * 1000)
  })

  it("accepts Firestore Timestamps with toDate()", () => {
    const task = mapActionTask("task-ts", {
      title: "W-4",
      status: "signed",
      dueDate: { toDate: () => new Date("2026-10-01T00:00:00Z") },
    })

    expect(task.dueDate?.toISOString()).toBe("2026-10-01T00:00:00.000Z")
  })

  it("falls back to safe defaults for malformed documents instead of throwing", () => {
    const task = mapActionTask("task-bad", { status: "not-a-real-status" })

    expect(task.title).toBe("Untitled task")
    expect(task.status).toBe("notStarted")
    expect(task.employeeName).toBe("Unknown")
    expect(task.taskSource).toBe("onboarding")
    // Unknown statuses are never treated as actionable.
    expect(ACTION_REQUIRED_STATUSES.includes(task.status)).toBe(false)
  })
})

describe("action-required selection", () => {
  it("keeps only the statuses pending admin intervention", () => {
    const tasks = [
      mapActionTask("a", { status: "submitted", isCompleted: false }),
      mapActionTask("b", { status: "completed", isCompleted: true }),
      mapActionTask("c", { status: "waitingForApprover", isCompleted: false }),
      mapActionTask("d", { status: "noActionRequired", isCompleted: true }),
      mapActionTask("e", { status: "pendingEmployerSignature", isCompleted: false }),
      mapActionTask("f", { status: "expired", isCompleted: false }),
      mapActionTask("g", { status: "signed", isCompleted: false }),
      mapActionTask("h", { status: "rejected", isCompleted: false }),
      mapActionTask("i", { status: "notStarted", isCompleted: false }),
    ]

    const selected = tasks
      .filter((task) => ACTION_REQUIRED_STATUSES.includes(task.status))
      .map((task) => task.id)

    // rejected/expired/notStarted are informative but not actionable here,
    // matching dashboard_provider.dart.
    expect(selected).toEqual(["a", "c", "e", "g"])
  })

  it("fetches more tasks than the legacy newest-25 fallback so older pending tasks survive", () => {
    // The whole point of the primary query: a burst of recently-completed
    // tasks must not push older pending approvals out of the window.
    expect(ACTION_REQUIRED_PRIMARY_LIMIT).toBeGreaterThan(ACTION_REQUIRED_FALLBACK_LIMIT)
    expect(ACTION_REQUIRED_FALLBACK_LIMIT).toBe(25)
  })
})

describe("deriveComplianceAlerts", () => {
  const now = new Date("2026-10-17T12:00:00Z")
  const iso = (date: Date) => ({ seconds: Math.floor(date.getTime() / 1000) })

  it("returns no alerts for an empty task list", () => {
    expect(deriveComplianceAlerts([], now)).toEqual([])
  })

  it("flags an overdue actionable task as Overdue", () => {
    const late = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const alerts = deriveComplianceAlerts(
      [
        mapActionTask("t1", {
          title: "W-9",
          status: "submitted",
          isCompleted: false,
          employeeId: "e1",
          employeeName: "Ahmad",
          dueDate: iso(late),
        }),
      ],
      now,
    )

    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toMatchObject({
      id: "t1",
      category: "Overdue",
      employeeId: "e1",
      employeeName: "Ahmad",
      taskTitle: "W-9",
    })
    expect(alerts[0].dueDate?.toISOString()).toBe(late.toISOString())
  })

  it("flags waitingForApprover as Signature Needed even when not due yet", () => {
    const future = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const alerts = deriveComplianceAlerts(
      [
        mapActionTask("t2", {
          title: "Dual-signature orientation",
          status: "waitingForApprover",
          isCompleted: false,
          employeeId: "e2",
          employeeName: "Sara",
          dueDate: iso(future),
        }),
      ],
      now,
    )

    expect(alerts).toHaveLength(1)
    expect(alerts[0].category).toBe("Signature Needed")
  })

  it("never flags completed tasks as overdue (waitingForApprover stays as-is, faithful to Flutter)", () => {
    const late = new Date(now.getTime() - 48 * 60 * 60 * 1000)
    const alerts = deriveComplianceAlerts(
      [
        mapActionTask("t3", {
          title: "Direct deposit",
          status: "completed",
          isCompleted: true,
          employeeId: "e1",
          employeeName: "Ahmad",
          dueDate: iso(late),
        }),
      ],
      now,
    )

    expect(alerts).toHaveLength(0)
  })

  it("alerts waitingForApprover even when isCompleted is true (mirrors Flutter complianceAlertsProvider)", () => {
    // Faithful port: the Flutter source checks only `task.status ==
    // waitingForApprover` for Signature Needed — it does not consult
    // isCompleted. Data is normally consistent; this documents the rule.
    const alerts = deriveComplianceAlerts(
      [
        mapActionTask("t4", {
          title: "Done waiting",
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

  it("sorts oldest-due-first", () => {
    const oldest = new Date(now.getTime() - 96 * 60 * 60 * 1000)
    const middle = new Date(now.getTime() - 48 * 60 * 60 * 1000)
    const newest = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const alerts = deriveComplianceAlerts(
      [
        mapActionTask("newest", {
          title: "B", status: "submitted", isCompleted: false,
          employeeId: "n", employeeName: "N", dueDate: iso(newest),
        }),
        mapActionTask("middle", {
          title: "C", status: "waitingForApprover", isCompleted: false,
          employeeId: "o", employeeName: "O", dueDate: iso(middle),
        }),
        mapActionTask("oldest", {
          title: "A", status: "submitted", isCompleted: false,
          employeeId: "p", employeeName: "P", dueDate: iso(oldest),
        }),
      ],
      now,
    )

    expect(alerts.map((alert) => alert.id)).toEqual(["oldest", "middle", "newest"])
  })
})

describe("isIndexCompatibilityError", () => {
  it("recognizes failed-precondition codes (Firestore missing-index errors)", () => {
    const error = Object.assign(new Error("The query requires an index."), {
      code: "failed-precondition",
    })
    expect(isIndexCompatibilityError(error)).toBe(true)
  })

  it("recognizes index wording in plain error messages", () => {
    expect(isIndexCompatibilityError(new Error("The query requires a composite INDEX"))).toBe(true)
    expect(isIndexCompatibilityError(new Error("index is not created yet"))).toBe(true)
  })

  it("does not misclassify unrelated failures as index problems", () => {
    const permission = Object.assign(new Error("Missing permissions"), {
      code: "permission-denied",
    })
    expect(isIndexCompatibilityError(permission)).toBe(false)
    expect(isIndexCompatibilityError(new Error("network timeout"))).toBe(false)
  })
})
