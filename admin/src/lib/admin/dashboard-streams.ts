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
import type { LiveStreamController } from "@/lib/admin/stream-protocol"
import { computeModuleProgress } from "@/lib/admin/progress-models"

/**
 * Real-time Firestore subscriptions for the admin dashboard — a faithful
 * port of the Flutter stream implementations in
 * lib/features/employee/on_boarding/data/data_source/onboarding_service.dart:
 *
 *  - streamAdminDashboardStats       → subscribeAdminDashboardStats
 *  - streamAdminActionRequiredTasks  → subscribeAdminActionRequiredTasks
 *  - streamAdminEmployeesProgress    → subscribeAdminEmployeesProgress
 *  - complianceAlertsProvider logic  → deriveComplianceAlerts
 *
 * All builders report per-listener readiness/errors through
 * `LiveStreamController` (stream-protocol.ts) so the UI can distinguish
 * "not loaded", "loaded but empty", and "failed" for every underlying
 * listener — and so one listener's failure is never silently hidden by
 * another listener's success.
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

/* ══ 1. Dashboard statistics ════════════════════════════════════════════ */

/**
 * Streams the (onboarding 30d, completed-today, active-employees) tuple.
 * TWO underlying listeners (users, collectionGroup onboarding_tasks),
 * combined latest-wins like the Flutter switchMap implementation.
 *
 * Readiness: the engine marks each of the two listeners ready on ITS first
 * snapshot; the panel only shows "ready" after both delivered. Each
 * snapshot publishes the fully merged tuple under its own listener id, so
 * a failure in one listener never clears the other's error and vice versa.
 */
export function subscribeAdminDashboardStats(
  adminId: string,
  ctrl: LiveStreamController<AdminDashboardStats>,
): Unsubscribe {
  const db = getFirebaseFirestore()

  // Announce both listeners up front: neither panel is "ready" until BOTH
  // delivered their first snapshot.
  ctrl.listen("users")
  ctrl.listen("tasks")

  type PartialStats = { onboarding?: number; active?: number; completedToday?: number }
  const latest: PartialStats = {}

  const merged = (): AdminDashboardStats => ({
    onboarding: latest.onboarding ?? 0,
    active: latest.active ?? 0,
    completedToday: latest.completedToday ?? 0,
  })

  const usersUnsub = onSnapshot(
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

      ctrl.emit("users", merged())
    },
    (error) => ctrl.fail("users", error),
  )

  const tasksUnsub = onSnapshot(
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

      ctrl.emit("tasks", merged())
    },
    (error) => ctrl.fail("tasks", error),
  )

  return () => {
    usersUnsub()
    tasksUnsub()
  }
}

/* ══ 2. Action-required tasks ═══════════════════════════════════════════ */

/**
 * Default page size for the actionable-task query. Older approvals stay
 * reachable by growing the page (the view re-subscribes with a larger
 * limit — see the "Load older approvals" control) rather than by a
 * newest-N-then-filter trick, which could silently omit approvals.
 */
export const DEFAULT_ACTION_TASK_PAGE_SIZE = 25

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
 * Correctness notes (the two earlier iterations got this wrong, copied from
 * Flutter):
 *
 *  1. The ACTIONABLE STATUSES are filtered SERVER-SIDE via `in`. The
 *     earlier design limited 50/25 newest tasks and filtered in memory, so
 *     a burst of newer non-actionable tasks (`notStarted` etc.) could
 *     silently hide an older `submitted` approval.
 *  2. There is intentionally NO `isCompleted` filter: an approval awaiting
 *     the admin's signature/action IS valid even if isCompleted is true —
 *     excluding those would hide valid work.
 *  3. No silent fallback. If the required composite index
 *     (adminId ASC, status ASC, updatedAt DESC — committed in
 *     firestore.indexes.json) is missing, the listener FAILS LOUDLY:
 *     the panel shows an actionable error (deploy the bundled indexes,
 *     then Retry) instead of a deceptively healthy "all caught up".
 *     Live subscriptions do not self-upgrade after the index appears —
 *     an existing failed panel needs Retry (or a page reload).
 *
 * Pagination: a single ordered query per page size. Growing the page
 * re-subscribes (the engine tears down the old subscription set and starts
 * fresh), which for admin-scale data is cheap and keeps one source of
 * truth for realtime updates. `results.length === pageSize` signals that
 * the page may be partial — the UI labels counts as partial and offers
 * "Load older approvals" instead of showing a complete looking list.
 */
export function subscribeAdminActionRequiredTasks(
  adminId: string,
  pageSize: number,
  ctrl: LiveStreamController<ActionRequiredTask[]>,
): Unsubscribe {
  const db = getFirebaseFirestore()

  ctrl.listen("tasks")

  const tasksQuery = query(
    collectionGroup(db, FIREBASE_COLLECTIONS.onboardingTasks),
    where("adminId", "==", adminId),
    where("status", "in", ACTION_REQUIRED_STATUSES as readonly string[]),
    orderBy("updatedAt", "desc"),
    limit(pageSize),
  )

  return onSnapshot(
    tasksQuery,
    (snapshot) => {
      // Server already narrowed to actionable statuses; no in-memory
      // status filter (and therefore no way for newer irrelevant tasks to
      // crowd older approvals out of a page).
      ctrl.emit(
        "tasks",
        snapshot.docs.map((doc) => mapActionTask(doc.id, doc.data())),
      )
    },
    (error) => ctrl.fail("tasks", error),
  )
}

/* ══ 3. Employee progress ═══════════════════════════════════════════════ */

/**
 * Real-time per-employee progress aggregation — port of
 * streamAdminEmployeesProgress: users where adminId+role==employee, then
 * three sub-collection watchers per employee (onboarding_tasks, trainings,
 * clearance); progress recalculated whenever any of them change.
 *
 * Listener bookkeeping:
 *   users          → announced once, ready on the employee-list snapshot.
 *   emp:{uid}:{module} → three per-employee listeners, announced/recalled
 *   dynamically as employees appear/disappear from the list.
 *
 * Completeness: results are only "ready" once the employee list AND every
 * currently-attached sub-collection watcher delivered their initial
 * snapshot — an employee with all-empty sub-collections becomes ready
 * normally (empty ≠ not-loaded ≠ failed, all distinguishable). When an
 * employee disappears mid-session their watchers are unsubscribed and
 * `forget()`-ed; their late callbacks are ignored via the removed flag.
 */
export function subscribeAdminEmployeesProgress(
  adminId: string,
  ctrl: LiveStreamController<AdminEmployeeProgress[]>,
): Unsubscribe {
  const db = getFirebaseFirestore()

  const MODULES = [
    FIREBASE_COLLECTIONS.onboardingTasks,
    FIREBASE_COLLECTIONS.trainings,
    FIREBASE_COLLECTIONS.clearanceItems,
  ] as const

  // The employee list listener is the anchor; per-employee watchers are
  // announced dynamically inside attachEmployeeStreams.
  ctrl.listen("users")

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
    setupStatus: "complete" | "incomplete"
    doc: DocumentSnapshot<DocumentData>
  }

  interface EmployeeWatchers {
    uid: string
    /** late-callback guard after the employee leaves the list */
    removed: boolean
    unsubs: Unsubscribe[]
    taskDocs: QuerySnapshot<DocumentData> | null
    trainingDocs: QuerySnapshot<DocumentData> | null
    clearanceDocs: QuerySnapshot<DocumentData> | null
  }

  const employeeWatchers = new Map<string, EmployeeWatchers>()
  let employees: EmployeeData[] = []

  const computeProgress = (): AdminEmployeeProgress[] =>
    employees.map((employee) => {
      const watchers = employeeWatchers.get(employee.uid)
      const taskDocs = watchers?.taskDocs?.docs ?? []
      const trainingDocs = watchers?.trainingDocs?.docs ?? []
      const clearanceDocs = watchers?.clearanceDocs?.docs ?? []

      // Shared pure progress formulas (progress-models.ts) — the SAME
      // implementation the Dashboard stats and the Detail page use.
      const progress = computeModuleProgress({
        tasks: taskDocs.map((t) => ({
          status: parseTaskStatus(t.data().status),
          isCompleted: t.data().isCompleted === true,
        })),
        trainings: trainingDocs.map((t) => ({ status: t.data().status })),
        clearances: clearanceDocs.map((t) => ({ status: t.data().status })),
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
    // Announce BEFORE the raw listeners can fire their first snapshots.
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
        onSnapshot(
          collection(db, FIREBASE_COLLECTIONS.users, uid, MODULES[moduleIndex]),
          (snapshot) => {
            // Ignored late callbacks (employee detached the same tick).
            if (entry.removed) {
              return
            }
            if (moduleIndex === 0) {
              entry.taskDocs = snapshot
            } else if (moduleIndex === 1) {
              entry.trainingDocs = snapshot
            } else {
              entry.clearanceDocs = snapshot
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
    // Recall the dynamic listeners so stale ids cannot keep the panel in
    // "connecting" or keep a false error after the employee is gone.
    for (const id of moduleIds(uid)) {
      ctrl.forget(id)
    }
  }

  const usersUnsub = onSnapshot(
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
          // Web-provisioning recovery state (durable across refresh/sign-in);
          // anything but an explicit "incomplete" is complete.
          setupStatus: data.setupStatus === "incomplete" ? "incomplete" : "complete",
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
          attachEmployeeStreams(uid)
        }
      }

      employees = nextEmployees
      ctrl.emit("users", computeProgress())
    },
    (error) => ctrl.fail("users", error),
  )

  return () => {
    usersUnsub()
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
 *
 * NOTE: the input is one PAGE of actionable tasks (orderBy updatedAt desc,
 * limit pageSize) — when the page is full the alerts are (potentially)
 * partial too, and the UI must label them as such.
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
