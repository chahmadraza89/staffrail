"use client"

import Link from "next/link"
import { useCallback, useMemo, type ReactNode } from "react"
import { AlertTriangle, CircleCheck, Clock, PenLine, UsersRound } from "lucide-react"

import {
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
import { STATUS_UI } from "@/lib/admin/task-status"
import { useLiveQuery, type SubscribeFn } from "@/lib/react/use-live-query"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

/**
 * Admin dashboard — port of the Flutter admin_home web screen
 * (admin_home_web.dart + providers in dashboard_provider.dart):
 *   1. counters (onboarding 30d / completed today / active employees)
 *   2. action-required tiles
 *   3. compliance alerts (overdue + signature needed)
 *   4. employee-wise progress table
 */

interface DashboardViewProps {
  adminUid: string
  adminEmail: string
}

const EMPTY_TASKS: ActionRequiredTask[] = []
const EMPTY_PROGRESS: AdminEmployeeProgress[] = []
const EMPTY_STATS: AdminDashboardStats = { onboarding: 0, completedToday: 0, active: 0 }

export function DashboardView({ adminUid, adminEmail }: DashboardViewProps) {
  const statsSubscribe = useCallback<SubscribeFn<AdminDashboardStats>>(
    (onData, onError) => subscribeAdminDashboardStats(adminUid, onData, onError),
    [adminUid],
  )
  const tasksSubscribe = useCallback<SubscribeFn<ActionRequiredTask[]>>(
    (onData, onError) => subscribeAdminActionRequiredTasks(adminUid, onData, onError),
    [adminUid],
  )
  const progressSubscribe = useCallback<SubscribeFn<AdminEmployeeProgress[]>>(
    (onData, onError) => subscribeAdminEmployeesProgress(adminUid, onData, onError),
    [adminUid],
  )

  const stats = useLiveQuery<AdminDashboardStats>(["dashboard/stats", adminUid], {
    subscribe: statsSubscribe,
    initialData: EMPTY_STATS,
  })
  const tasks = useLiveQuery<ActionRequiredTask[]>(["dashboard/action-required", adminUid], {
    subscribe: tasksSubscribe,
    initialData: EMPTY_TASKS,
  })
  const employees = useLiveQuery<AdminEmployeeProgress[]>(["dashboard/employees-progress", adminUid], {
    subscribe: progressSubscribe,
    initialData: EMPTY_PROGRESS,
  })

  const alerts = useMemo<ComplianceAlert[]>(() => deriveComplianceAlerts(tasks), [tasks])

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

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<UsersRound className="size-4" />}
          label="Active Employees"
          value={stats.active}
          hint="role = employee, isActive"
        />
        <StatCard
          icon={<Clock className="size-4" />}
          label="Onboarding (30 days)"
          value={stats.onboarding}
          hint="joined in the last 30 days"
        />
        <StatCard
          icon={<CircleCheck className="size-4" />}
          label="Completed Today"
          value={stats.completedToday}
          hint="tasks completed since midnight"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ActionRequiredCard tasks={tasks} />
        <ComplianceAlertsCard alerts={alerts} />
      </section>

      <EmployeeProgressTable employees={employees} />
    </div>
  )
}

/* ── counters ──────────────────────────────────────────────────────────── */

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode
  label: string
  value: number
  hint: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
        <span className="bg-primary/10 text-primary rounded-lg p-2">{icon}</span>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
        <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
      </CardContent>
    </Card>
  )
}

/* ── action required ───────────────────────────────────────────────────── */

function ActionRequiredCard({ tasks }: { tasks: ActionRequiredTask[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <span className="rounded-lg bg-amber-500/10 p-2">
          <AlertTriangle className="size-4 text-amber-600" />
        </span>
        <CardTitle className="text-base">Action Required</CardTitle>
        <Badge variant="secondary" className="ml-auto tabular-nums">
          {tasks.length}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            All caught up! No actions required.
          </p>
        ) : (
          tasks.map((task) => {
            const ui = STATUS_UI[task.status]
            return (
              <div
                key={task.id}
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
          })
        )}
      </CardContent>
    </Card>
  )
}

/* ── compliance alerts ─────────────────────────────────────────────────── */

function ComplianceAlertsCard({ alerts }: { alerts: ComplianceAlert[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <span className="rounded-lg bg-destructive/10 p-2">
          <PenLine className="text-destructive size-4" />
        </span>
        <CardTitle className="text-base">Compliance Alerts</CardTitle>
        <Badge variant="secondary" className="ml-auto tabular-nums">
          {alerts.length}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No overdue tasks and no signatures waiting for approval.
          </p>
        ) : (
          alerts.slice(0, 8).map((alert) => (
            <div
              key={`${alert.category}-${alert.id}`}
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
          ))
        )}
      </CardContent>
    </Card>
  )
}

/* ── employee progress ─────────────────────────────────────────────────── */

function EmployeeProgressTable({ employees }: { employees: AdminEmployeeProgress[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Employee Progress</CardTitle>
      </CardHeader>
      <CardContent>
        {employees.length === 0 ? (
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
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
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

/* ── helpers ───────────────────────────────────────────────────────────── */

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
