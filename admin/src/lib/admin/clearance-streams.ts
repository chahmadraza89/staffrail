"use client"

import { getClientDataStore } from "@/lib/data/client-store"
import { DATA_COLLECTIONS } from "@/lib/data/collections"
import { toDateOrNull } from "@/lib/data/dates"
import type { DataDocument, DataStore, Unsubscribe } from "@/lib/data/types"
import { parseClearanceStatus } from "@/lib/admin/employee-detail-streams"
import { submissionRevision } from "@/lib/admin/task-revision"
import {
  sortClearances,
  type ClearanceRecord,
} from "@/lib/admin/clearance-models"
import type { LiveStreamController } from "@/lib/admin/stream-protocol"

export type { Unsubscribe }

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

export function mapClearanceRecord(
  id: string,
  data: DataDocument,
  parentEmployeeId: string | null = null,
): ClearanceRecord {
  return {
    id,
    employeeId: optionalText(data.employeeId) ?? parentEmployeeId,
    employeeName: optionalText(data.employeeName),
    adminId: optionalText(data.adminId),
    title: text(data.title) || "Untitled Clearance",
    description: text(data.description),
    status: parseClearanceStatus(data.status),
    fileUrl: optionalText(data.fileUrl),
    rejectionReason: optionalText(data.rejectionReason),
    dueDate: toDateOrNull(data.dueDate),
    submittedAt: toDateOrNull(data.submittedAt),
    verifiedAt: toDateOrNull(data.verifiedAt),
    updatedAt: toDateOrNull(data.updatedAt),
    revision: submissionRevision(data),
  }
}

export interface ClearanceEmployee {
  uid: string
  name: string
  department: string | null
  role: string | null
  adminId: string | null
  isActive: boolean
}

export function mapClearanceEmployee(
  uid: string,
  data: DataDocument,
): ClearanceEmployee {
  return {
    uid,
    name: text(data.name) || "Unknown Employee",
    department: optionalText(data.department),
    role: optionalText(data.role),
    adminId: optionalText(data.adminId),
    isActive: data.isActive !== false,
  }
}

export function subscribeAdminClearances(
  adminUid: string,
  ctrl: LiveStreamController<ClearanceRecord[]>,
  store: DataStore = getClientDataStore(),
): Unsubscribe {
  ctrl.listen("clearances")

  return store.subscribeCollectionGroup(
    DATA_COLLECTIONS.clearanceItems,
    (snapshot) => {
      const records = snapshot.docs.map((entry) =>
        mapClearanceRecord(
          entry.id,
          entry.data() ?? {},
          entry.ref.parent.parent?.id ?? null,
        ),
      )
      ctrl.emit("clearances", sortClearances(records))
    },
    (error) => ctrl.fail("clearances", error),
    { filters: [{ field: "adminId", op: "==", value: adminUid }] },
  )
}

export interface ClearanceDetailSnapshot {
  employee: ClearanceEmployee | null
  clearance: ClearanceRecord | null
}

export const EMPTY_CLEARANCE_DETAIL: ClearanceDetailSnapshot = {
  employee: null,
  clearance: null,
}

export function subscribeClearanceDetail(
  employeeId: string,
  clearanceId: string,
  adminUid: string,
  ctrl: LiveStreamController<ClearanceDetailSnapshot>,
  store: DataStore = getClientDataStore(),
): Unsubscribe {
  let current: ClearanceDetailSnapshot = EMPTY_CLEARANCE_DETAIL
  let clearanceUnsubscribe: Unsubscribe | null = null
  let clearanceAttached = false
  let generation = 0

  const publish = (
    listener: "employee" | "clearance",
    patch: Partial<ClearanceDetailSnapshot>,
  ) => {
    current = { ...current, ...patch }
    ctrl.emit(listener, current)
  }

  const detachClearance = () => {
    generation += 1
    clearanceUnsubscribe?.()
    clearanceUnsubscribe = null
    current = { ...current, clearance: null }
    if (clearanceAttached) {
      ctrl.forget("clearance")
      clearanceAttached = false
    }
  }

  const attachClearance = () => {
    if (clearanceAttached) {
      return
    }
    clearanceAttached = true
    const attachGeneration = generation

    ctrl.listen("clearance")

    clearanceUnsubscribe = store.subscribeDoc(
      `${DATA_COLLECTIONS.users}/${employeeId}/${DATA_COLLECTIONS.clearanceItems}/${clearanceId}`,
      (snapshot) => {
        if (attachGeneration !== generation) {
          return
        }
        publish("clearance", {
          clearance: snapshot.exists()
            ? mapClearanceRecord(snapshot.id, snapshot.data() ?? {}, employeeId)
            : null,
        })
      },
      (error) => {
        if (attachGeneration === generation) {
          ctrl.fail("clearance", error)
        }
      },
    )
  }

  ctrl.listen("employee")

  const employeeUnsubscribe = store.subscribeDoc(
    `${DATA_COLLECTIONS.users}/${employeeId}`,
    (snapshot) => {
      if (!snapshot.exists()) {
        detachClearance()
        publish("employee", { employee: null, clearance: null })
        return
      }

      const data = snapshot.data() ?? {}
      if (data.role !== "employee" || data.adminId !== adminUid) {
        detachClearance()
        publish("employee", { employee: null, clearance: null })
        return
      }

      const employee = mapClearanceEmployee(employeeId, data)
      if (!employee.isActive) {
        detachClearance()
        publish("employee", { employee, clearance: null })
        return
      }

      publish("employee", { employee })
      attachClearance()
    },
    (error) => ctrl.fail("employee", error),
  )

  return () => {
    generation += 1
    employeeUnsubscribe()
    clearanceUnsubscribe?.()
    clearanceUnsubscribe = null
    clearanceAttached = false
  }
}
