"use client"

import { getClientDataStore } from "@/lib/data/client-store"
import { DATA_COLLECTIONS } from "@/lib/data/collections"
import { toDateOrNull } from "@/lib/data/dates"
import type { DataDocSnapshot, DataDocument, DataStore, Unsubscribe } from "@/lib/data/types"
import {
  ACTION_REQUIRED_STATUSES,
  parseTaskStatus,
} from "@/lib/admin/task-status"
import type {
  AdminDashboardStats,
  AdminEmployeeProgress,
  ActionRequiredTask,
  ComplianceAlert,
} from "@/lib/admin/dashboard-models"
import type { LiveStreamController } from "@/lib/admin/stream-protocol"
import { computeModuleProgress } from "@/lib/admin/progress-models"

export type { Unsubscribe }

export function str(value: unknown, fallback: string | null = null): string | null {
  return typeof value === "string" && value.length > 0 ? value : fallback
}

function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function startOfDayMinus(days: number): Date {
  const startDate = startOfToday()
  startDate.setDate(startDate.getDate() - days)
  return startDate
}

export function subscribeAdminDashboardStats(
  adminId: string,
  ctrl: LiveStreamController<AdminDashboardStats>,
  store: DataStore = getClientDataStore(),
): Unsubscribe {
  ctrl.listen("users")
  ctrl.listen("tasks")

  type PartialStats = { onboarding?: number; active?: number; completedToday?: number }
  const latest: PartialStats = {}

  const merged = (): AdminDashboardStats => ({
    onboarding: latest.onboarding ?? 0,
    active: latest.active ?? 0,
    completedToday: latest.completedToday ?? 0,
  })

  const usersUnsub = store.subscribeCollection(
    DATA_COLLECTIONS.users,
    (snapshot) => {
      const employeeDocs = snapshot.docs.filter((doc) => {
        const data = doc.data() ?? {}
        return data.role === "employee" && data.isActive === true
      })

      latest.active = employeeDocs.length

      const cutoff = startOfDayMinus(30)
      latest.onboarding = employeeDocs.filter((doc) => {
        const data = doc.data() ?? {}
        const created = toDateOrNull(data.createdAt) ?? toDateOrNull(data.updatedAt)
        return created !== null && created.getTime() > cutoff.getTime()
      }).length

      ctrl.emit("users", merged())
    },
    (error) => ctrl.fail("users", error),
    { filters: [{ field: "adminId", op: "==", value: adminId }] },
  )

  const tasksUnsub = store.subscribeCollectionGroup(
    DATA_COLLECTIONS.onboardingTasks,
    (snapshot) => {
      const today = startOfToday().getTime()
      latest.completedToday = snapshot.docs.filter((doc) => {
        const data = doc.data() ?? {}
        const completedAt = toDateOrNull(data.completedAt)
        return data.isCompleted === true && completedAt !== null && completedAt.getTime() > today
      }).length

      ctrl.emit("tasks", merged())
    },
    (error) => ctrl.fail("tasks", error),
    { filters: [{ field: "adminId", op: "==", value: adminId }] },
  )

  return () => {
    usersUnsub()
    tasksUnsub()
  }
}

export const DEFAULT_ACTION_TASK_PAGE_SIZE = 25

export function mapActionTask(
  id: string,
  data: DataDocument,
): ActionRequiredTask {
  const status = parseTaskStatus(data.status)
  const rawSource = typeof data.taskSource === "string" ? data.taskSource : "onboarding"

  return {
    id,
    title: typeof data.title === "string" && data.title.length > 0 ? data.title : "Untitled task",
    employeeId: str(data.employeeId),
    employeeName: str(data.employeeName, "Unknown"),
    status,
    isCompleted: data.isCompleted === true,
    dueDate: toDateOrNull(data.dueDate),
    updatedAt: toDateOrNull(data.updatedAt),
    taskSource:
      rawSource === "training" ? "training" : rawSource === "clearance" ? "clearance" : "onboarding",
  }
}

export function subscribeAdminActionRequiredTasks(
  adminId: string,
  pageSize: number,
  ctrl: LiveStreamController<ActionRequiredTask[]>,
  store: DataStore = getClientDataStore(),
): Unsubscribe {
  ctrl.listen("tasks")

  return store.subscribeCollectionGroup(
    DATA_COLLECTIONS.onboardingTasks,
    (snapshot) => {
      ctrl.emit(
        "tasks",
        snapshot.docs.map((doc) => mapActionTask(doc.id, doc.data() ?? {})),
      )
    },
    (error) => ctrl.fail("tasks", error),
    {
      filters: [
        { field: "adminId", op: "==", value: adminId },
        { field: "status", op: "in", value: ACTION_REQUIRED_STATUSES as readonly string[] },
      ],
      orderBy: { field: "updatedAt", direction: "desc" },
      limit: pageSize,
    },
  )
}

export function subscribeAdminEmployeesProgress(
  adminId: string,
  ctrl: LiveStreamController<AdminEmployeeProgress[]>,
  store: DataStore = getClientDataStore(),
): Unsubscribe {
  const MODULES = [
    DATA_COLLECTIONS.onboardingTasks,
    DATA_COLLECTIONS.trainings,
    DATA_COLLECTIONS.clearanceItems,
  ] as const

  ctrl.listen("users")

  interface EmployeeData {
    uid: string
    name: string
    email: string | null
    lastLogin: Date
    isActive: boolean
    setupStatus: "complete" | "incomplete"
  }

  interface EmployeeWatchers {
    uid: string
    removed: boolean
    unsubs: Unsubscribe[]
    taskDocs: DataDocSnapshot[] | null
    trainingDocs: DataDocSnapshot[] | null
    clearanceDocs: DataDocSnapshot[] | null
  }

  const employeeWatchers = new Map<string, EmployeeWatchers>()
  let employees: EmployeeData[] = []

  const computeProgress = (): AdminEmployeeProgress[] =>
    employees.map((employee) => {
      const watchers = employeeWatchers.get(employee.uid)
      const taskDocs = watchers?.taskDocs ?? []
      const trainingDocs = watchers?.trainingDocs ?? []
      const clearanceDocs = watchers?.clearanceDocs ?? []

      const progress = computeModuleProgress({
        tasks: taskDocs.map((t) => ({
          status: parseTaskStatus(t.data()?.status),
          isCompleted: t.data()?.isCompleted === true,
        })),
        trainings: trainingDocs.map((t) => ({ status: t.data()?.status })),
        clearances: clearanceDocs.map((t) => ({ status: t.data()?.status })),
      })

      return {
        uid: employee.uid,
        name: employee.name,
        email: employee.email,
        overallProgress: progress.overall,
        onboardingProgress: progress.onboarding,
        trainingProgress: progress.training,
        clearanceProgress: progress.clearance,
        lastLogin: employee.lastLogin,
        isActive: employee.isActive,
        setupStatus: employee.setupStatus,
      }
    })

  const moduleIds = (uid: string): string[] =>
    MODULES.map((module) => `emp:${uid}:${module}`)

  const attachEmployeeStreams = (uid: string): void => {
    const ids = moduleIds(uid)
    for (const id of ids) {
      ctrl.listen(id)
    }

    const entry: EmployeeWatchers = {
      uid,
      removed: false,
      unsubs: [],
      taskDocs: null,
      trainingDocs: null,
      clearanceDocs: null,
    }

    ids.forEach((id, moduleIndex) => {
      entry.unsubs.push(
        store.subscribeCollection(
          `${DATA_COLLECTIONS.users}/${uid}/${MODULES[moduleIndex]}`,
          (snapshot) => {
            if (entry.removed) {
              return
            }
            if (moduleIndex === 0) {
              entry.taskDocs = snapshot.docs
            } else if (moduleIndex === 1) {
              entry.trainingDocs = snapshot.docs
            } else {
              entry.clearanceDocs = snapshot.docs
            }
            ctrl.emit(id, computeProgress())
          },
          (error) => {
            if (entry.removed) {
              return
            }
            ctrl.fail(id, error)
          },
        ),
      )
    })

    employeeWatchers.set(uid, entry)
  }

  const detachEmployeeStreams = (uid: string): void => {
    const entry = employeeWatchers.get(uid)
    if (!entry) {
      return
    }
    entry.removed = true
    for (const unsub of entry.unsubs) {
      unsub()
    }
    employeeWatchers.delete(uid)
    for (const id of moduleIds(uid)) {
      ctrl.forget(id)
    }
  }

  const usersUnsub = store.subscribeCollection(
    DATA_COLLECTIONS.users,
    (snapshot) => {
      const nextEmployees: EmployeeData[] = []
      const nextIds = new Set<string>()

      for (const doc of snapshot.docs) {
        const data = doc.data() ?? {}
        nextIds.add(doc.id)
        nextEmployees.push({
          uid: doc.id,
          name: typeof data.name === "string" && data.name.length > 0 ? data.name : "Employee",
          email: str(data.email),
          lastLogin: toDateOrNull(data.lastLogin) ?? toDateOrNull(data.createdAt) ?? new Date(),
          isActive: data.isActive !== false,
          setupStatus: data.setupStatus === "incomplete" ? "incomplete" : "complete",
        })
      }

      for (const uid of employeeWatchers.keys()) {
        if (!nextIds.has(uid)) {
          detachEmployeeStreams(uid)
        }
      }
      for (const uid of nextEmployees.map((employee) => employee.uid)) {
        if (!employeeWatchers.has(uid)) {
          attachEmployeeStreams(uid)
        }
      }

      employees = nextEmployees
      ctrl.emit("users", computeProgress())
    },
    (error) => ctrl.fail("users", error),
    {
      filters: [
        { field: "adminId", op: "==", value: adminId },
        { field: "role", op: "==", value: "employee" },
      ],
    },
  )

  return () => {
    usersUnsub()
    for (const uid of Array.from(employeeWatchers.keys())) {
      detachEmployeeStreams(uid)
    }
  }
}

export function deriveComplianceAlerts(tasks: ActionRequiredTask[], now: Date = new Date()): ComplianceAlert[] {
  const alerts: ComplianceAlert[] = []

  for (const task of tasks) {
    if (task.dueDate && task.dueDate.getTime() < now.getTime() && !task.isCompleted) {
      alerts.push({
        id: task.id,
        employeeId: task.employeeId ?? "",
        employeeName: task.employeeName ?? "Unknown",
        taskTitle: task.title,
        category: "Overdue",
        dueDate: task.dueDate,
      })
    } else if (task.status === "waitingForApprover") {
      alerts.push({
        id: task.id,
        employeeId: task.employeeId ?? "",
        employeeName: task.employeeName ?? "Unknown",
        taskTitle: task.title,
        category: "Signature Needed",
        dueDate: task.dueDate ?? null,
      })
    }
  }

  alerts.sort((a, b) => {
    if (a.dueDate && b.dueDate) {
      return a.dueDate.getTime() - b.dueDate.getTime()
    }
    return a.taskTitle.localeCompare(b.taskTitle)
  })

  return alerts
}
