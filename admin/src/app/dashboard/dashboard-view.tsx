"use client"

import Link from "next/link"
import { useCallback, useMemo, useState, type ReactNode } from "react"
import { AlertTriangle, CircleCheck, Clock, PenLine, RefreshCw, UsersRound } from "lucide-react"

import {
  DEFAULT_ACTION_TASK_PAGE_SIZE,
  deriveComplianceAlerts,
  subscribeAdminActionRequiredTasks,
  subscribeAdminDashboardStats,
  subscribeAdminEmployeesProgress,
} from "@/lib/admin/dashboard-streams"
import type {
  AdminDashboardStats,
  AdminEmployeeProgress,
  ActionRequiredTask,
  ComplianceAlert,
} from "@/lib/admin/dashboard-models"
import { isIndexCompatibilityError } from "@/lib/admin/stream-protocol"
import { STATUS_UI } from "@/lib/admin/task-status"
import { useLiveQuery, type LiveQueryResult } from "@/lib/react/use-live-query"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

/**
 * Admin dashboard — port of the Flutter admin_home web screen
 * (admin_home_web.dart + providers in dashboard_provider.dart):
 *   1. counters (onboarding 30d / completed today / active employees)
 *   2. action-required tiles (paginated, server-side actionable filter)
 *   3. compliance alerts (Overdue + Signature Needed), state-lifted from
 *      the task stream so loading/error/staleness is never faked
 *   4. employee-wise progress table
 *
 * Every panel distinguishes connecting / ready / error, empty results are
 * only shown as empty once a stream is complete, and partial pages say so.
 */

interface DashboardViewProps {
  adminUid: string
  adminEmail: string
}

const EMPTY_TASKS: ActionRequiredTask[] = []
const EMPTY_PROGRESS: AdminEmployeeProgress[] = []
const EMPTY_STATS: AdminDashboardStats = { onboarding: 0, completedToday: 0, active: 0 }

export function DashboardView({ adminUid, adminEmail }: DashboardViewProps) {
  // Growing the page re-subscribes with a larger limit so older approvals
  // (ordered updatedAt desc AFTER the server-side actionable filter) stay
  // reachable. Keyed with the page size: a new page = a fresh subscription.
  const [actionPageSize, setActionPageSize] = useState(DEFAULT_ACTION_TASK_PAGE_SIZE)

  const statsSubscribe = useCallback(
    (ctrl: Parameters<typeof subscribeAdminDashboardStats>[1]) =>
      subscribeAdminDashboardStats(adminUid, ctrl),
    [adminUid],
  )
  const tasksSubscribe = useCallback(
    (ctrl: Parameters<typeof subscribeAdminActionRequiredTasks>[2]) =>
      subscribeAdminActionRequiredTasks(adminUid, actionPageSize, ctrl),
    [adminUid, actionPageSize],
  )
  const progressSubscribe = useCallback(
    (ctrl: Parameters<typeof subscribeAdminEmployeesProgress>[1]) =>
      subscribeAdminEmployeesProgress(adminUid, ctrl),
    [adminUid],
  )

  const stats = useLiveQuery<AdminDashboardStats>({
    key: adminUid,
    subscribe: statsSubscribe,
    initialData: EMPTY_STATS,
  })
  const tasks = useLiveQuery<ActionRequiredTask[]>({
    key: `${adminUid}::${actionPageSize}`,
    subscribe: tasksSubscribe,
    initialData: EMPTY_TASKS,
  })
  const employees = useLiveQuery<AdminEmployeeProgress[]>({
    key: adminUid,
    subscribe: progressSubscribe,
    initialData: EMPTY_PROGRESS,
  })

  const alerts = useMemo<ComplianceAlert[]>(
    () => deriveComplianceAlerts(tasks.data),
    [tasks.data],
  )
  // A full page means the list may be truncated: counts and derived alerts
  // must be labelled partial instead of masquerading as complete results.
  const taskPageIsPartial = tasks.status !== "connecting" && tasks.data.length >= actionPageSize

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Live overview for {adminEmail}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/directory">
            <UsersRound className="mr-2 size-4" />
            Open directory
          </Link>
        </Button>
      </header>

      {stats.status === "error" ? (
        <LiveErrorBanner
          error={stats.error}
          retry={stats.retry}
          message="Live dashboard statistics could not be streamed."
        />
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Active Employees"
          value={stats.data.active}
          hint="role = employee, isActive"
          query={stats}
        />
        <StatCard
          label="Onboarding (30 days)"
          value={stats.data.onboarding}
          hint="joined in the last 30 days"
          query={stats}
        />
        <StatCard
          label="Completed Today"
          value={stats.data.completedToday}
          hint="tasks completed since midnight"
          query={stats}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ActionRequiredCard
          query={tasks}
          pageSize={actionPageSize}
          isPartial={taskPageIsPartial}
          onLoadMore={() =>
            setActionPageSize((current) => current + DEFAULT_ACTION_TASK_PAGE_SIZE)
          }
        />
        <ComplianceAlertsCard alerts={alerts} query={tasks} isPartial={taskPageIsPartial} />
      </section>

      <EmployeeProgressTable query={employees} />
    </div>
  )
}

/* ── shared UI bits ────────────────────────────────────────────────────── */

function LiveErrorBanner({
  error,
  retry,
  message,
}: {
  error: Error | null
  retry: () => void
  message: string
}) {
  const isIndexError = isIndexCompatibilityError(error)
  const code = (error as { code?: unknown } | null)?.code
  const details = code ? String(code) : ""

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <div className="min-w-0">
        <p className="font-medium">
          {isIndexError
            ? "Missing Firestore composite index."
            : message}
          {details ? ` (${details})` : ""}
        </p>
        <p className="text-destructive/80 mt-0.5 text-xs">
          {isIndexError
            ? "Create the bundled index (admin: firebase deploy --only firestore:indexes, index defined in firestore.indexes.json), then press Retry — live subscriptions do not upgrade themselves after the index is ready."
            : "Press Retry to resubscribe; the stream will reconnect on its own once the failure clears."}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={retry} className="shrink-0">
        <RefreshCw className="mr-1.5 size-3.5" />
        Retry
      </Button>
    </div>
  )
}

function ConnectingEmpty({ text }: { text: string }) {
  return <p className="text-muted-foreground animate-pulse py-6 text-center text-sm">{text}</p>
}

function StaleNote({ what }: { what: string }) {
  return (
    <p className="border-amber-200 bg-amber-50 text-amber-800 mt-2 rounded-md border px-3 py-1.5 text-xs">
      {what} are stale — retained from the last successful update. Retry to refresh.
    </p>
  )
}

/* ── counters ──────────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  hint,
  query,
}: {
  label: string
  value: number
  hint: string
  query: LiveQueryResult<AdminDashboardStats>
}) {
  const icon =
    label === "Active Employees" ? (
      <UsersRound className="size-4" />
    ) : label === "Onboarding (30 days)" ? (
      <Clock className="size-4" />
    ) : (
      <CircleCheck className="size-4" />
    )

  return (
    <Card className={query.status === "connecting" ? "opacity-60" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
        <span className="bg-primary/10 text-primary rounded-lg p-2">{icon}</span>
      </CardHeader>
      <CardContent>
        {query.status === "connecting" ? (
          <p className="text-muted-foreground text-3xl font-semibold tabular-nums">—</p>
        ) : (
          <p className="text-3xl font-semibold tabular-nums">{value}</p>
        )}
        <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
      </CardContent>
    </Card>
  )
}

/* ── action required ───────────────────────────────────────────────────── */

function ActionRequiredCard({
  query,
  pageSize,
  isPartial,
  onLoadMore,
}: {
  query: LiveQueryResult<ActionRequiredTask[]>
  pageSize: number
  isPartial: boolean
  onLoadMore: () => void
}) {
  const tasks = query.data

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <span className="rounded-lg bg-amber-500/10 p-2">
          <AlertTriangle className="size-4 text-amber-600" />
        </span>
        <CardTitle className="text-base">Action Required</CardTitle>
        <Badge variant="secondary" className="ml-auto tabular-nums">
          {query.status === "connecting" ? "…" : isPartial ? `${pageSize}+` : tasks.length}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {query.status === "connecting" ? (
          <ConnectingEmpty text="Loading tasks…" />
        ) : query.status === "error" ? (
          <div className="space-y-2 py-2">
            <LiveErrorBanner
              error={query.error}
              retry={query.retry}
              message="Required actions could not be streamed."
            />
            {tasks.length > 0 ? (
              <>
                <TaskList tasks={tasks} />
                <StaleNote what="These tasks" />
              </>
            ) : null}
          </div>
        ) : (
          <>
            {tasks.length === 0 && !isPartial ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                All caught up! No actions required.
              </p>
            ) : (
              <>
                <TaskList tasks={tasks} />
                {isPartial ? (
                  <p className="text-muted-foreground text-xs">
                    Showing the newest {pageSize} actionable tasks (partial — older approvals may
                    exist).
                  </p>
                ) : null}
                {isPartial ? (
                  <Button size="sm" variant="outline" onClick={onLoadMore} className="w-full">
                    Load older approvals
                  </Button>
                ) : null}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function TaskList({ tasks }: { tasks: ActionRequiredTask[] }) {
  return (
    <>
      {tasks.map((task) => {
        const ui = STATUS_UI[task.status]
        // Task IDs are only unique *per employee subcollection* — compose
        // them so two employees with the same task ID never collide.
        const key = `${task.employeeId ?? "unknown-employee"}::${task.id}`
        return (
          <div
            key={key}
            className="border-border flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{task.title}</p>
              <p className="text-muted-foreground text-xs">
                {task.employeeName ?? "Unknown Employee"}
                {task.dueDate ? ` · due ${formatDate(task.dueDate)}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ToneBadge tone={ui.tone}>{ui.label}</ToneBadge>
              <Button asChild size="sm" variant="secondary">
                <Link
                  href={
                    task.employeeId
                      ? `/dashboard/directory/${task.employeeId}`
                      : "/dashboard/directory"
                  }
                >
                  Review
                </Link>
              </Button>
            </div>
          </div>
        )
      })}
    </>
  )
}

/* ── compliance alerts ─────────────────────────────────────────────────── */

/**
 * Alerts derive from the task stream's current page, so the panel carries
 * THE TASK STREAM's state: connecting / error+retry / stale-noted retained
 * data — a failure of the underlying stream can never look like a clean
 * "no compliance issues" state, and a partial page is labelled partial.
 */
function ComplianceAlertsCard({
  alerts,
  query,
  isPartial,
}: {
  alerts: ComplianceAlert[]
  query: LiveQueryResult<ActionRequiredTask[]>
  isPartial: boolean
}) {
  const showRetainedAlerts = query.status === "error" && alerts.length > 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <span className="rounded-lg bg-destructive/10 p-2">
          <PenLine className="text-destructive size-4" />
        </span>
        <CardTitle className="text-base">Compliance Alerts</CardTitle>
        <Badge variant="secondary" className="ml-auto tabular-nums">
          {query.status === "connecting" ? "…" : `${alerts.length}${isPartial ? "+" : ""}`}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {query.status === "connecting" ? (
          <ConnectingEmpty text="Loading tasks…" />
        ) : query.status === "error" ? (
          <>
            <LiveErrorBanner
              error={query.error}
              retry={query.retry}
              message="Compliance alerts could not be streamed (the task stream failed)."
            />
            {showRetainedAlerts ? (
              <>
                <AlertList alerts={alerts} />
                <StaleNote what="These alerts" />
              </>
            ) : null}
          </>
        ) : alerts.length === 0 && !isPartial ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No overdue tasks and no signatures waiting for approval.
          </p>
        ) : alerts.length === 0 && isPartial ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No alerts among the loaded actionable tasks — load older approvals above for a complete
            assessment.
          </p>
        ) : (
          <>
            <AlertList alerts={alerts} />
            {isPartial ? (
              <p className="text-muted-foreground text-xs">
                Derived from the newest {query.data.length} actionable tasks — partial, not a
                complete compliance assessment. Load older approvals above.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function AlertList({ alerts }: { alerts: ComplianceAlert[] }) {
  return (
    <>
      {alerts.slice(0, 8).map((alert) => (
        <div
          key={`${alert.category}::${alert.employeeId}::${alert.id}`}
          className="border-border flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
        >
          <div className="min-w-0">
            <p className="truncate font-medium">{alert.taskTitle}</p>
            <p className="text-muted-foreground text-xs">
              {alert.employeeName}
              {alert.dueDate ? ` · due ${formatDate(alert.dueDate)}` : ""}
            </p>
          </div>
          <ToneBadge tone={alert.category === "Overdue" ? "red" : "orange"}>
            {alert.category}
          </ToneBadge>
        </div>
      ))}
    </>
  )
}

/* ── employee progress ─────────────────────────────────────────────────── */

function EmployeeProgressTable({ query }: { query: LiveQueryResult<AdminEmployeeProgress[]> }) {
  const employees = query.data

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Employee Progress</CardTitle>
      </CardHeader>
      <CardContent>
        {query.status === "connecting" ? (
          <ConnectingEmpty text="Loading employees…" />
        ) : query.status === "error" ? (
          <>
            <LiveErrorBanner
              error={query.error}
              retry={query.retry}
              message="Employee progress could not be streamed."
            />
            {employees.length > 0 ? (
              <>
                <EmployeeRows employees={employees} />
                <StaleNote what="This table" />
              </>
            ) : null}
          </>
        ) : employees.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No active employees yet — add them from the Directory.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Overall</TableHead>
                <TableHead>Onboarding</TableHead>
                <TableHead>Training</TableHead>
                <TableHead>Clearance</TableHead>
                <TableHead>Last login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <EmployeeRows employees={employees} />
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function EmployeeRows({ employees }: { employees: AdminEmployeeProgress[] }) {
  return (
    <>
      {employees.map((employee) => (
        <TableRow key={employee.uid}>
          <TableCell>
            <Link
              href={`/dashboard/directory/${employee.uid}`}
              className="font-medium hover:underline"
            >
              {employee.name}
            </Link>
            {!employee.isActive ? (
              <Badge variant="secondary" className="ml-2">
                inactive
              </Badge>
            ) : null}
          </TableCell>
          <TableCell className="w-[120px]">
            <ProgressBar value={employee.overallProgress} />
          </TableCell>
          <TableCell>{formatPct(employee.onboardingProgress)}</TableCell>
          <TableCell>{formatPct(employee.trainingProgress)}</TableCell>
          <TableCell>{formatPct(employee.clearanceProgress)}</TableCell>
          <TableCell className="text-muted-foreground text-xs">
            {formatDate(employee.lastLogin)}
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.round(clamp(value, 0, 1) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted h-2 w-full rounded-full">
        <div
          className={"h-2 rounded-full " + (pct === 100 ? "bg-emerald-500" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-muted-foreground w-10 text-right text-xs tabular-nums">{pct}%</span>
    </div>
  )
}

/* ── helpers & tone badge ──────────────────────────────────────────────── */

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0))
}

function formatPct(value: number): string {
  return `${Math.round(clamp(value, 0, 1) * 100)}%`
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

// Semantic tone badge (maps the Flutter status colors to tailwind classes).
const TONE_CLASSES = {
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  orange: "border-amber-200 bg-amber-50 text-amber-700",
  red: "border-red-200 bg-red-50 text-red-700",
  slate: "border-slate-200 bg-slate-50 text-slate-600",
} as const

function ToneBadge({
  tone,
  children,
}: {
  tone: "blue" | "green" | "orange" | "red" | "slate"
  children: ReactNode
}) {
  return (
    <span
      className={
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap " +
        TONE_CLASSES[tone]
      }
    >
      {children}
    </span>
  )
}
