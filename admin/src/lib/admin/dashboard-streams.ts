"use client"

import {
  collection,
  collectionGroup,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type DocumentSnapshot,
  type QuerySnapshot,
} from "firebase/firestore"

import { getFirebaseFirestore } from "@/lib/firebase/client"
import { FIREBASE_COLLECTIONS } from "@/lib/firebase/collections"
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

/**
 * Real-time Firestore subscriptions for the admin dashboard — a faithful
 * port of the Flutter stream implementations in
 * lib/features/employee/on_boarding/data/data_source/onboarding_service.dart:
 *
 *  - streamAdminDashboardStats       → subscribeAdminDashboardStats
 *  - streamAdminActionRequiredTasks  → subscribeAdminActionRequiredTasks
 *  - streamAdminEmployeesProgress    → subscribeAdminEmployeesProgress
 *  - complianceAlertsProvider logic  → deriveComplianceAlerts
 */

export type Unsubscribe = () => void

/* ── raw-data helpers ──────────────────────────────────────────────────── */

function toDate(value: unknown): Date | null {
  if (!value || typeof value !== "object") {
    return null
  }
  const candidate = value as { toDate?: unknown; seconds?: unknown }
  if (typeof candidate.toDate === "function") {
    return (candidate as { toDate: () => Date }).toDate()
  }
  if (typeof candidate.seconds === "number") {
    return new Date(candidate.seconds * 1000)
  }
  return null
}

function str(value: unknown, fallback: string | null = null): string | null {
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

/* ══ 1. Dashboard statistics ════════════════════════════════════════════ */

/**
 * Streams the (onboarding 30d, completed-today, active-employees) tuple.
 * Two watchers (users where adminId == me, collectionGroup onboarding_tasks
 * where adminId == me) combined latest-wins, exactly like the Flutter
 * switchMap implementation.
 */
export function subscribeAdminDashboardStats(
  adminId: string,
  onData: (stats: AdminDashboardStats) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseFirestore()

  type Partial = { onboarding?: number; active?: number; completedToday?: number }
  const latest: Partial = {}

  const emit = () => {
    onData({
      onboarding: latest.onboarding ?? 0,
      active: latest.active ?? 0,
      completedToday: latest.completedToday ?? 0,
    })
  }

  const usersStream = onSnapshot(
    query(
      collection(db, FIREBASE_COLLECTIONS.users),
      where("adminId", "==", adminId),
    ),
    (snapshot: QuerySnapshot<DocumentData>) => {
      const employeeDocs = snapshot.docs.filter((doc) => {
        const data = doc.data()
        return data.role === "employee" && data.isActive === true
      })

      latest.active = employeeDocs.length

      const cutoff = startOfDayMinus(30)
      latest.onboarding = employeeDocs.filter((doc) => {
        const data = doc.data()
        const created = toDate(data.createdAt) ?? toDate(data.updatedAt)
        return created !== null && created.getTime() > cutoff.getTime()
      }).length

      emit()
    },
    onError,
  )

  const tasksStream = onSnapshot(
    query(
      collectionGroup(db, FIREBASE_COLLECTIONS.onboardingTasks),
      where("adminId", "==", adminId),
    ),
    (snapshot) => {
      const today = startOfToday().getTime()
      latest.completedToday = snapshot.docs.filter((doc) => {
        const data = doc.data()
        const completedAt = toDate(data.completedAt)
        return data.isCompleted === true && completedAt !== null && completedAt.getTime() > today
      }).length

      emit()
    },
    onError,
  )

  return () => {
    usersStream()
    tasksStream()
  }
}

/* ══ 2. Action-required tasks ═══════════════════════════════════════════ */

/**
 * Stream limits for the action-required task query.
 * Primary: pending (isCompleted==false) tasks, server-ordered by recency,
 *   limit 50 — enough headroom that older pending tasks are kept even when
 *   many tasks were completed recently (the correctness fix vs Flutter).
 * Fallback: legacy newest-25 while the composite index is not available.
 */
export const ACTION_REQUIRED_PRIMARY_LIMIT = 50
export const ACTION_REQUIRED_FALLBACK_LIMIT = 25

/**
 * Parses/sub-categorizes a task document — the subset of
 * OnboardingTaskDTO.fromFirestore the dashboard consumes. Exported pure so
 * mapping can be unit-tested.
 */
export function mapActionTask(
  id: string,
  data: DocumentData,
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
    dueDate: toDate(data.dueDate),
    updatedAt: toDate(data.updatedAt),
    taskSource:
      rawSource === "training" ? "training" : rawSource === "clearance" ? "clearance" : "onboarding",
  }
}

/**
 * Streams onboarding tasks that need admin action.
 *
 * Correctness fix vs the Flutter app: the old query fetched the 25 NEWEST
 * tasks regardless of completion and filtered statuses in memory — so a
 * burst of recently-completed tasks could hide OLDER pending approvals.
 * Now:
 *
 *  primary  → `adminId == me` + `isCompleted == false`, ordered
 *             `updatedAt desc` (server-side), limit 50.
 *             Requires the composite index:
 *             adminId ASC, isCompleted ASC, updatedAt DESC — add it
 *             once (Firebase console / firebase CLI) for full correctness.
 *  fallback → legacy newest-25 + in-memory status filter, used ONLY when
 *             the composite index is missing (soft-degrade with a warning
 *             so behavior matches the Flutter app until the index exists).
 */
export function subscribeAdminActionRequiredTasks(
  adminId: string,
  onData: (tasks: ActionRequiredTask[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseFirestore()
  const group = collectionGroup(db, FIREBASE_COLLECTIONS.onboardingTasks)

  const primaryQuery = query(
    group,
    where("adminId", "==", adminId),
    where("isCompleted", "==", false),
    orderBy("updatedAt", "desc"),
    limit(ACTION_REQUIRED_PRIMARY_LIMIT),
  )
  const fallbackQuery = query(
    group,
    where("adminId", "==", adminId),
    orderBy("updatedAt", "desc"),
    limit(ACTION_REQUIRED_FALLBACK_LIMIT),
  )

  let stopped = false
  let fallbackUnsub: Unsubscribe | null = null

  // Status filtering remains in memory both paths (Firestore cannot combine
  // a status `in` list with `orderBy updatedAt` without a second composite
  // index — same reason the Flutter app filtered client-side).
  const actionFilter = (task: ActionRequiredTask) =>
    ACTION_REQUIRED_STATUSES.includes(task.status)

  const primaryUnsub = onSnapshot(
    primaryQuery,
    (snapshot) => {
      emit(
        snapshot.docs
          .map((doc) => mapActionTask(doc.id, doc.data()))
          .filter(actionFilter),
      )
    },
    (error) => {
      if (stopped) {
        return
      }
      // Composite index not created yet → soft-degrade to the legacy
      // behavior instead of failing the whole dashboard.
      if (isIndexCompatibilityError(error) && !fallbackUnsub) {
        console.warn(
          "[dashboard-stream] action-required query needs composite index " +
            "(adminId ASC, isCompleted ASC, updatedAt DESC). " +
            "Falling back to newest-25 + in-memory filter until then.",
        )
        fallbackUnsub = onSnapshot(
          fallbackQuery,
          (snapshot) => emit(snapshot.docs.map((doc) => mapActionTask(doc.id, doc.data())).filter(actionFilter)),
          onError,
        )
        return
      }
      onError(error)
    },
  )

  // Local pass-through for readability below.
  function emit(tasks: ActionRequiredTask[]): void {
    onData(tasks)
  }

  return () => {
    stopped = true
    primaryUnsub()
    fallbackUnsub?.()
  }
}

/** Detects "requires composite index" style Firestore errors. */
export function isIndexCompatibilityError(error: unknown): boolean {
  const code = (error as { code?: string })?.code ?? ""
  const message = String((error as Error)?.message ?? "")
  return (
    code === "failed-precondition" ||
    /requires.*(composite )?index|index.*(not|is not).{0,20}(found|available|created)|failed.?precondition/i.test(message)
  )
}

/* ══ 3. Employee progress ═══════════════════════════════════════════════ */

/**
 * Real-time per-employee progress aggregation — port of
 * streamAdminEmployeesProgress: users where adminId+role==employee, each
 * employee gets three sub-collection watchers (onboarding_tasks, trainings,
 * clearance); progress is recalculated whenever any of them change.
 */
export function subscribeAdminEmployeesProgress(
  adminId: string,
  onData: (progress: AdminEmployeeProgress[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseFirestore()

  const usersQuery = query(
    collection(db, FIREBASE_COLLECTIONS.users),
    where("adminId", "==", adminId),
    where("role", "==", "employee"),
  )

  interface EmployeeData {
    uid: string
    name: string
    email: string | null
    lastLogin: Date
    isActive: boolean
    doc: DocumentSnapshot<DocumentData>
  }

  interface EmployeeWatchers {
    unsubTasks?: Unsubscribe
    unsubTrainings?: Unsubscribe
    unsubClearance?: Unsubscribe
    taskDocs: QuerySnapshot<DocumentData> | null
    trainingDocs: QuerySnapshot<DocumentData> | null
    clearanceDocs: QuerySnapshot<DocumentData> | null
  }

  const employeeWatchers = new Map<string, EmployeeWatchers>()
  let employees: EmployeeData[] = []
  let usersUnsub: Unsubscribe | null = null

  const computeProgress = (): AdminEmployeeProgress[] =>
    employees.map((employee) => {
      const watchers = employeeWatchers.get(employee.uid)
      const taskDocs = watchers?.taskDocs?.docs ?? []
      const trainingDocs = watchers?.trainingDocs?.docs ?? []
      const clearanceDocs = watchers?.clearanceDocs?.docs ?? []

      // ── onboarding tasks (failed tasks excluded, mirrors Flutter) ──
      const relevantTasks = taskDocs.filter((t) => {
        const data = t.data()
        const status = parseTaskStatus(data.status)
        return status !== "noActionRequired"
      })
      const totalTasks = relevantTasks.length
      const completedTasks = relevantTasks.filter((t) => t.data().isCompleted === true).length
      const onboardingPct = totalTasks === 0 ? 0 : completedTasks / totalTasks

      // ── trainings ──
      const totalTrainings = trainingDocs.length
      const completedTrainings = trainingDocs.filter((t) => t.data().status === "completed").length
      const trainingPct = totalTrainings === 0 ? 0 : completedTrainings / totalTrainings

      // ── clearance ──
      const totalClearances = clearanceDocs.length
      const completedClearances = clearanceDocs.filter((t) => t.data().status === "verified").length
      const clearancePct = totalClearances === 0 ? 0 : completedClearances / totalClearances

      // ── overall (average of modules that contain data) ──
      let activeModules = 0
      let sumProgress = 0
      if (totalTasks > 0) {
        activeModules++
        sumProgress += onboardingPct
      }
      if (totalTrainings > 0) {
        activeModules++
        sumProgress += trainingPct
      }
      if (totalClearances > 0) {
        activeModules++
        sumProgress += clearancePct
      }
      const overallPct = activeModules === 0 ? 0 : sumProgress / activeModules

      return {
        uid: employee.uid,
        name: employee.name,
        email: employee.email,
        overallProgress: overallPct,
        onboardingProgress: onboardingPct,
        trainingProgress: trainingPct,
        clearanceProgress: clearancePct,
        lastLogin: employee.lastLogin,
        isActive: employee.isActive,
      }
    })

  const emit = () => onData(computeProgress())

  const attachEmployeeStreams = (uid: string): EmployeeWatchers => {
    const entry: EmployeeWatchers = {
      taskDocs: null,
      trainingDocs: null,
      clearanceDocs: null,
    }

    entry.unsubTasks = onSnapshot(
      collection(db, FIREBASE_COLLECTIONS.users, uid, FIREBASE_COLLECTIONS.onboardingTasks),
      (snapshot) => {
        entry.taskDocs = snapshot
        emit()
      },
      onError,
    )
    entry.unsubTrainings = onSnapshot(
      collection(db, FIREBASE_COLLECTIONS.users, uid, FIREBASE_COLLECTIONS.trainings),
      (snapshot) => {
        entry.trainingDocs = snapshot
        emit()
      },
      onError,
    )
    entry.unsubClearance = onSnapshot(
      collection(db, FIREBASE_COLLECTIONS.users, uid, FIREBASE_COLLECTIONS.clearanceItems),
      (snapshot) => {
        entry.clearanceDocs = snapshot
        emit()
      },
      onError,
    )

    return entry
  }

  const detachEmployeeStreams = (uid: string): void => {
    const entry = employeeWatchers.get(uid)
    if (!entry) {
      return
    }
    entry.unsubTasks?.()
    entry.unsubTrainings?.()
    entry.unsubClearance?.()
    employeeWatchers.delete(uid)
  }

  usersUnsub = onSnapshot(
    usersQuery,
    (snapshot) => {
      const nextEmployees: EmployeeData[] = []
      const nextIds = new Set<string>()

      for (const doc of snapshot.docs) {
        const data = doc.data()
        nextIds.add(doc.id)
        nextEmployees.push({
          uid: doc.id,
          name: typeof data.name === "string" && data.name.length > 0 ? data.name : "Employee",
          email: str(data.email),
          lastLogin: toDate(data.lastLogin) ?? toDate(data.createdAt) ?? new Date(),
          isActive: data.isActive !== false,
          doc,
        })
      }

      // Reconcile employee stream lifecycle (add/remove) — avoids leaks when
      // employees are created/deactivated mid-session.
      for (const uid of employeeWatchers.keys()) {
        if (!nextIds.has(uid)) {
          detachEmployeeStreams(uid)
        }
      }
      for (const uid of nextEmployees.map((employee) => employee.uid)) {
        if (!employeeWatchers.has(uid)) {
          employeeWatchers.set(uid, attachEmployeeStreams(uid))
        }
      }

      employees = nextEmployees
      emit()
    },
    onError,
  )

  return () => {
    usersUnsub?.()
    for (const uid of Array.from(employeeWatchers.keys())) {
      detachEmployeeStreams(uid)
    }
  }
}

/* ══ 4. Compliance alerts derivation ═════════════════════════════════════ */

/**
 * Synthesizes compliance alerts from action-required tasks — port of the
 * Flutter `complianceAlertsProvider`: Overdue (dueDate passed, not
 * completed) or Signature Needed (waitingForApprover), oldest due first.
 */
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
