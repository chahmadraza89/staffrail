/**
 * Clearance stream mappers and the ownership-gated detail subscription.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { DataDocSnapshot, DataQueryOptions, DataQuerySnapshot, DataStore } from "@/lib/data/types"
import {
  mapClearanceRecord,
  subscribeAdminClearances,
  subscribeClearanceDetail,
  type ClearanceDetailSnapshot,
} from "@/lib/admin/clearance-streams"
import type { ClearanceRecord } from "@/lib/admin/clearance-models"

interface Observer {
  kind: "group" | "doc"
  target: string
  options?: DataQueryOptions
  next: (snapshot: unknown) => void
  error: (error: Error) => void
  unsubscribe: ReturnType<typeof vi.fn>
}

const observers: Observer[] = []

const fakeStore = {
  subscribeCollectionGroup: (
    collectionId: string,
    onData: (snap: DataQuerySnapshot) => void,
    onError?: (err: Error) => void,
    options?: DataQueryOptions,
  ) => {
    const unsubscribe = vi.fn()
    observers.push({
      kind: "group",
      target: collectionId,
      options,
      next: onData as (s: unknown) => void,
      error: onError ?? (() => {}),
      unsubscribe,
    })
    return unsubscribe
  },
  subscribeDoc: (
    path: string,
    onData: (snap: DataDocSnapshot) => void,
    onError?: (err: Error) => void,
  ) => {
    const unsubscribe = vi.fn()
    observers.push({
      kind: "doc",
      target: path,
      next: onData as (s: unknown) => void,
      error: onError ?? (() => {}),
      unsubscribe,
    })
    return unsubscribe
  },
} as unknown as DataStore

function controller<T>() {
  return {
    listen: vi.fn<(id: string) => void>(),
    emit: vi.fn<(id: string, data: T) => void>(),
    fail: vi.fn<(id: string, error: Error) => void>(),
    forget: vi.fn<(id: string) => void>(),
  }
}

function timestamp(date: Date) {
  return { toDate: () => date }
}

function clearanceSnapshot(
  id: string,
  data: Record<string, unknown> | null,
  parentEmployeeId = "emp-1",
): DataDocSnapshot {
  return {
    id,
    path: `users/${parentEmployeeId}/clearance/${id}`,
    exists: () => data !== null,
    data: () => (data === null ? undefined : data),
    ref: {
      id,
      path: `users/${parentEmployeeId}/clearance/${id}`,
      parent: {
        parent: { id: parentEmployeeId },
      },
    },
  }
}

function employeeSnapshot(data: Record<string, unknown> | null): DataDocSnapshot {
  return {
    id: "emp-1",
    path: "users/emp-1",
    exists: () => data !== null,
    data: () => (data === null ? undefined : data),
    ref: {
      id: "emp-1",
      path: "users/emp-1",
      parent: { parent: null },
    },
  }
}

beforeEach(() => {
  observers.length = 0
})

describe("mapClearanceRecord", () => {
  it("maps the clearance DTO with fallbacks and a full-document revision", () => {
    const mapped = mapClearanceRecord(
      "clearance-1",
      {
        title: "Background Check",
        description: "Check",
        status: "underReview",
        employeeId: "emp-9",
        employeeName: "Sara Khan",
        adminId: "adm-1",
        fileUrl: "https://example.test/check.pdf",
        rejectionReason: null,
        submittedAt: timestamp(new Date("2026-10-20T09:00:00.000Z")),
        verifiedAt: null,
        updatedAt: timestamp(new Date("2026-10-21T09:00:00.000Z")),
      },
      "parent-employee",
    )

    expect(mapped).toMatchObject({
      id: "clearance-1",
      employeeId: "emp-9",
      employeeName: "Sara Khan",
      adminId: "adm-1",
      title: "Background Check",
      status: "underReview",
      fileUrl: "https://example.test/check.pdf",
      rejectionReason: null,
      verifiedAt: null,
    })
    expect(mapped.submittedAt?.toISOString()).toBe("2026-10-20T09:00:00.000Z")
    expect(mapped.revision.length).toBeGreaterThan(0)
  })

  it("falls back to the parent employee id, unknown titles and safe statuses", () => {
    const mapped = mapClearanceRecord("clearance-2", { status: "not-a-status" }, "emp-7")

    expect(mapped.employeeId).toBe("emp-7")
    expect(mapped.title).toBe("Untitled Clearance")
    expect(mapped.status).toBe("pending")
    expect(mapped.fileUrl).toBeNull()
    expect(mapped.description).toBe("")
  })
})

describe("subscribeAdminClearances", () => {
  it("queries the admin's collection group and sorts emitted records", () => {
    const ctrl = controller<ClearanceRecord[]>()
    const unsubscribe = subscribeAdminClearances("adm-1", ctrl, fakeStore)

    expect(ctrl.listen).toHaveBeenCalledWith("clearances")
    const observer = observers[0]
    expect(observer.kind).toBe("group")
    expect(observer.target).toBe("clearance")
    expect(observer.options?.filters).toEqual([{ field: "adminId", op: "==", value: "adm-1" }])

    observer.next({
      docs: [
        clearanceSnapshot("older", {
          title: "Older",
          status: "underReview",
          updatedAt: timestamp(new Date("2026-10-20T09:00:00.000Z")),
        }),
        clearanceSnapshot("newer", {
          title: "Newer",
          status: "verified",
          updatedAt: timestamp(new Date("2026-10-22T09:00:00.000Z")),
        }),
      ],
    })

    const emitted = ctrl.emit.mock.calls[0][1] as ClearanceRecord[]
    expect(emitted.map((record) => record.id)).toEqual(["newer", "older"])
    expect(emitted[0].employeeId).toBe("emp-1")

    unsubscribe()
    expect(observer.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it("forwards listener failures", () => {
    const ctrl = controller<ClearanceRecord[]>()
    subscribeAdminClearances("adm-1", ctrl, fakeStore)

    const error = new Error("offline")
    observers[0].error(error)

    expect(ctrl.fail).toHaveBeenCalledWith("clearances", error)
  })
})

describe("subscribeClearanceDetail", () => {
  it("reads the employee profile first and attaches the clearance only when owned", () => {
    const ctrl = controller<ClearanceDetailSnapshot>()
    subscribeClearanceDetail("emp-1", "clearance-1", "adm-1", ctrl, fakeStore)

    expect(ctrl.listen).toHaveBeenCalledWith("employee")
    expect(observers).toHaveLength(1)
    expect(observers[0]).toMatchObject({ kind: "doc", target: "users/emp-1" })

    observers[0].next(
      employeeSnapshot({
        name: "Sara Khan",
        role: "employee",
        adminId: "adm-1",
        department: "Nursing",
        isActive: true,
      }),
    )

    expect(ctrl.emit).toHaveBeenCalledWith("employee", {
      employee: {
        uid: "emp-1",
        name: "Sara Khan",
        department: "Nursing",
        role: "employee",
        adminId: "adm-1",
        isActive: true,
      },
      clearance: null,
    })
    expect(ctrl.listen).toHaveBeenCalledWith("clearance")
    expect(observers).toHaveLength(2)
    expect(observers[1]).toMatchObject({
      kind: "doc",
      target: "users/emp-1/clearance/clearance-1",
    })

    observers[1].next(
      clearanceSnapshot("clearance-1", {
        title: "Background Check",
        status: "underReview",
        updatedAt: timestamp(new Date("2026-10-21T09:00:00.000Z")),
      }),
    )

    const snapshot = ctrl.emit.mock.calls[ctrl.emit.mock.calls.length - 1]?.[1] as ClearanceDetailSnapshot
    expect(snapshot.employee?.name).toBe("Sara Khan")
    expect(snapshot.clearance).toMatchObject({
      id: "clearance-1",
      title: "Background Check",
      employeeId: "emp-1",
      status: "underReview",
    })
  })

  it("never attaches the clearance for a missing, non-employee or other-admin profile", () => {
    for (const profile of [
      null,
      { name: "Admin", role: "admin", adminId: "adm-1", isActive: true },
      { name: "Other", role: "employee", adminId: "adm-other", isActive: true },
    ]) {
      observers.length = 0
      const ctrl = controller<ClearanceDetailSnapshot>()
      subscribeClearanceDetail("emp-1", "clearance-1", "adm-1", ctrl, fakeStore)

      observers[0].next(employeeSnapshot(profile))

      expect(ctrl.emit).toHaveBeenCalledWith("employee", {
        employee: null,
        clearance: null,
      })
      expect(observers).toHaveLength(1)
      expect(ctrl.listen).not.toHaveBeenCalledWith("clearance")
    }
  })

  it("emits a null clearance when the document no longer exists", () => {
    const ctrl = controller<ClearanceDetailSnapshot>()
    subscribeClearanceDetail("emp-1", "clearance-1", "adm-1", ctrl, fakeStore)
    observers[0].next(
      employeeSnapshot({
        name: "Sara Khan",
        role: "employee",
        adminId: "adm-1",
        isActive: true,
      }),
    )
    observers[1].next(clearanceSnapshot("clearance-1", null))

    expect(ctrl.emit).toHaveBeenLastCalledWith("clearance", {
      employee: expect.objectContaining({ uid: "emp-1" }),
      clearance: null,
    })
  })

  it("detaches the clearance and ignores late callbacks when ownership changes", () => {
    const ctrl = controller<ClearanceDetailSnapshot>()
    subscribeClearanceDetail("emp-1", "clearance-1", "adm-1", ctrl, fakeStore)
    observers[0].next(
      employeeSnapshot({
        name: "Sara Khan",
        role: "employee",
        adminId: "adm-1",
        isActive: true,
      }),
    )
    const clearanceObserver = observers[1]
    clearanceObserver.next(
      clearanceSnapshot("clearance-1", { title: "Check", status: "underReview" }),
    )

    observers[0].next(
      employeeSnapshot({
        name: "Sara Khan",
        role: "employee",
        adminId: "adm-other",
        isActive: true,
      }),
    )

    expect(ctrl.forget).toHaveBeenCalledWith("clearance")
    expect(clearanceObserver.unsubscribe).toHaveBeenCalledTimes(1)

    const callsBeforeLateCallback = ctrl.emit.mock.calls.length
    clearanceObserver.next(
      clearanceSnapshot("clearance-1", { title: "Changed late", status: "verified" }),
    )
    expect(ctrl.emit).toHaveBeenCalledTimes(callsBeforeLateCallback)
  })

  it("does not attach the clearance listener for an inactive employee", () => {
    const ctrl = controller<ClearanceDetailSnapshot>()
    subscribeClearanceDetail("emp-1", "clearance-1", "adm-1", ctrl, fakeStore)

    observers[0].next(
      employeeSnapshot({
        name: "Sara Khan",
        role: "employee",
        adminId: "adm-1",
        isActive: false,
      }),
    )

    expect(ctrl.emit).toHaveBeenLastCalledWith("employee", {
      employee: expect.objectContaining({ uid: "emp-1", isActive: false }),
      clearance: null,
    })
    expect(observers).toHaveLength(1)
    expect(ctrl.listen).not.toHaveBeenCalledWith("clearance")
    expect(ctrl.forget).not.toHaveBeenCalled()
  })

  it("detaches, clears evidence and ignores late callbacks after deactivation", () => {
    const ctrl = controller<ClearanceDetailSnapshot>()
    subscribeClearanceDetail("emp-1", "clearance-1", "adm-1", ctrl, fakeStore)
    observers[0].next(
      employeeSnapshot({
        name: "Sara Khan",
        role: "employee",
        adminId: "adm-1",
        isActive: true,
      }),
    )
    const clearanceObserver = observers[1]
    clearanceObserver.next(
      clearanceSnapshot("clearance-1", { title: "Check", status: "underReview" }),
    )

    observers[0].next(
      employeeSnapshot({
        name: "Sara Khan",
        role: "employee",
        adminId: "adm-1",
        isActive: false,
      }),
    )

    expect(ctrl.forget).toHaveBeenCalledWith("clearance")
    expect(clearanceObserver.unsubscribe).toHaveBeenCalledTimes(1)
    expect(ctrl.emit).toHaveBeenLastCalledWith("employee", {
      employee: expect.objectContaining({ uid: "emp-1", isActive: false }),
      clearance: null,
    })

    const callsAfterDeactivation = ctrl.emit.mock.calls.length
    clearanceObserver.next(
      clearanceSnapshot("clearance-1", {
        title: "Replacement",
        status: "underReview",
      }),
    )
    clearanceObserver.error(new Error("late detached error"))

    expect(ctrl.emit).toHaveBeenCalledTimes(callsAfterDeactivation)
    expect(ctrl.fail).not.toHaveBeenCalled()
  })

  it("attaches a fresh clearance listener after reactivation and waits for its snapshot", () => {
    const ctrl = controller<ClearanceDetailSnapshot>()
    subscribeClearanceDetail("emp-1", "clearance-1", "adm-1", ctrl, fakeStore)
    observers[0].next(
      employeeSnapshot({
        name: "Sara Khan",
        role: "employee",
        adminId: "adm-1",
        isActive: true,
      }),
    )
    const firstClearanceObserver = observers[1]
    firstClearanceObserver.next(
      clearanceSnapshot("clearance-1", { title: "Old", status: "underReview" }),
    )
    observers[0].next(
      employeeSnapshot({
        name: "Sara Khan",
        role: "employee",
        adminId: "adm-1",
        isActive: false,
      }),
    )

    observers[0].next(
      employeeSnapshot({
        name: "Sara Khan",
        role: "employee",
        adminId: "adm-1",
        isActive: true,
      }),
    )

    expect(ctrl.listen.mock.calls.filter(([id]) => id === "clearance")).toHaveLength(2)
    expect(observers).toHaveLength(3)
    expect(ctrl.emit).toHaveBeenLastCalledWith("employee", {
      employee: expect.objectContaining({ uid: "emp-1", isActive: true }),
      clearance: null,
    })

    const freshClearanceObserver = observers[2]
    freshClearanceObserver.next(
      clearanceSnapshot("clearance-1", {
        title: "Fresh",
        status: "underReview",
      }),
    )

    expect(ctrl.emit).toHaveBeenLastCalledWith("clearance", {
      employee: expect.objectContaining({ uid: "emp-1", isActive: true }),
      clearance: expect.objectContaining({ title: "Fresh" }),
    })

    const callsBeforeLateSnapshot = ctrl.emit.mock.calls.length
    firstClearanceObserver.next(
      clearanceSnapshot("clearance-1", {
        title: "Late old",
        status: "verified",
      }),
    )
    expect(ctrl.emit).toHaveBeenCalledTimes(callsBeforeLateSnapshot)
  })

  it("unsubscribes both listeners on cleanup", () => {
    const ctrl = controller<ClearanceDetailSnapshot>()
    const unsubscribe = subscribeClearanceDetail("emp-1", "clearance-1", "adm-1", ctrl, fakeStore)
    observers[0].next(
      employeeSnapshot({
        name: "Sara Khan",
        role: "employee",
        adminId: "adm-1",
        isActive: true,
      }),
    )
    const [employeeObserver, clearanceObserver] = observers

    unsubscribe()

    expect(employeeObserver.unsubscribe).toHaveBeenCalledTimes(1)
    expect(clearanceObserver.unsubscribe).toHaveBeenCalledTimes(1)
  })
})
