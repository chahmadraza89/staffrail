"use client"

import Link from "next/link"
import { useCallback, useMemo, useState } from "react"
import {
  ArrowLeft,
  CheckCircle2,
  CircleUser,
  Clock4,
  FilePenLine,
  Hourglass,
  Loader2,
  TriangleAlert,
  X,
} from "lucide-react"

import {
  subscribeAdminEmployeesProgress,
} from "@/lib/admin/dashboard-streams"
import type { AdminEmployeeProgress } from "@/lib/admin/dashboard-models"
import {
  subscribeEmployeeDetail,
  EMPTY_DETAIL,
  type EmployeeDetailSnapshot,
} from "@/lib/admin/employee-detail-streams"
import {
  buildComplianceModel,
  taskProgressStats,
  taskStatusText,
  type ComplianceCategory,
  type DetailSubTask,
} from "@/lib/admin/compliance-helpers"
import { getInitials } from "@/lib/admin/directory-format"
import {
  completeEmployeeSetup,
  deactivateEmployee,
  updateEmployee,
  EmployeeActionError,
} from "@/lib/admin/employee-actions"
import { useLiveQuery } from "@/lib/react/use-live-query"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

/**
 * Employee Profile Detail view — port of the Flutter
 * AdminDirectoryInnerProfileCard (profile header + ProgressOverview +
 * TaskManagerSection) plus the directory's lifecycle actions:
 *   - live profile via subscribeAdminEmployeesProgress (same progress
 *     formulas as the Directory cards — single-sourced)
 *   - live onboarding_tasks/trainings/clearance below
 *     subscribeEmployeeDetail, merged + grouped into the Dart 7 categories
 *   - Edit (transactional), Deactivate (soft delete) with the same
 *     derived-staleness dialogs, and the durable "Complete setup"
 *     recovery for incomplete provisioning.
 * Task detail/review panel arrives with the next step.
 */

const EMPTY_EMPLOYEES: AdminEmployeeProgress[] = []

export function EmployeeDetailView({
  employeeId,
  adminUid,
  adminEmail,
}: {
  employeeId: string
  adminUid: string
  adminEmail: string
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [staleNoticeDismissed, setStaleNoticeDismissed] = useState(false)
  const [setupRetrying, setSetupRetrying] = useState(false)
  const [setupRetryError, setSetupRetryError] = useState<string | null>(null)

  const subscribeProgress = useCallback(
    (ctrl: Parameters<typeof subscribeAdminEmployeesProgress>[1]) =>
      subscribeAdminEmployeesProgress(adminUid, ctrl),
    [adminUid],
  )
  const employees = useLiveQuery<AdminEmployeeProgress[]>({
    key: adminUid,
    subscribe: subscribeProgress,
    initialData: EMPTY_EMPLOYEES,
  })

  const subscribeDetail = useCallback(
    (ctrl: Parameters<typeof subscribeEmployeeDetail>[1]) =>
      subscribeEmployeeDetail(employeeId, ctrl),
    [employeeId],
  )
  const detail = useLiveQuery<EmployeeDetailSnapshot>({
    key: employeeId,
    subscribe: subscribeDetail,
    initialData: EMPTY_DETAIL,
  })

  const employee = useMemo(
    () => employees.data.find((entry) => entry.uid === employeeId) ?? null,
    [employees.data, employeeId],
  )

  const categories = useMemo(
    () =>
      buildComplianceModel({
        // A FAILED module's templates must never be fabricated as progress —
        // pass null so that module contributes nothing; the error banner
        // explains what did not load.
        tasks: detail.errors.has("onboardingTasks") ? null : detail.data.tasks,
        trainings: detail.errors.has("trainings") ? null : detail.data.trainings,
        clearances: detail.errors.has("clearance") ? null : detail.data.clearances,
      }).categories,
    [detail.data, detail.errors],
  )
  const progressStats = useMemo(() => taskProgressStats(categories), [categories])

  // Staleness is DERIVED (never an effect): the dialog closes reactively
  // when the live stream reports the target deactivated or removed.
  const showStaleEditNotice =
    editOpen &&
    (employee === null || !employee.isActive) &&
    !staleNoticeDismissed
  const staleEditNoticeCompleted = employee === null

  const handleCompleteSetup = useCallback(async () => {
    setSetupRetrying(true)
    setSetupRetryError(null)
    try {
      await completeEmployeeSetup({ uid: employeeId, adminUid })
    } catch (caught) {
      setSetupRetryError(
        caught instanceof EmployeeActionError
          ? caught.message
          : "Completing setup failed. Try again.",
      )
    } finally {
      setSetupRetrying(false)
    }
  }, [employeeId, adminUid])

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild size="icon-sm" variant="ghost" aria-label="Back to directory">
            <Link href="/dashboard/directory">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Employee Profile Detail</h1>
            <p className="text-muted-foreground text-sm">Signed in as {adminEmail}</p>
          </div>
        </div>
      </header>

      {employees.status === "connecting" ? (
        <DetailSkeleton testId="detail-skeleton" />
      ) : employees.status === "error" ? (
        <div className="space-y-4">
          <LiveErrorCard
            error={employees.error}
            retry={employees.retry}
            what="Employee profile could not be streamed."
          />
          {employee ? (
            <ProfileHeader
              employee={employee}
              onEdit={() => {
                setStaleNoticeDismissed(false)
                setEditOpen(true)
              }}
              onDeactivate={() => setConfirmOpen(true)}
              onRetainStale
            />
          ) : null}
        </div>
      ) : employee === null ? (
        <NotFoundPanel />
      ) : (
        <>
          <ProfileHeader
            employee={employee}
            onEdit={() => {
              setStaleNoticeDismissed(false)
              setEditOpen(true)
            }}
            onDeactivate={() => setConfirmOpen(true)}
          />

          {employee.setupStatus === "incomplete" ? (
            <div
              data-testid="detail-setup-incomplete"
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"
            >
              <p>
                <strong>{employee.name}</strong>&rsquo;s onboarding documents could not be set
                up yet — completing setup continues with the SAME account.
              </p>
              <Button size="sm" variant="outline" onClick={() => void handleCompleteSetup()} disabled={setupRetrying}>
                {setupRetrying ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
                Complete setup
              </Button>
            </div>
          ) : null}
          {setupRetryError ? (
            <div
              role="alert"
              data-testid="detail-setup-retry-error"
              className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              <p>Completing setup failed: {setupRetryError}</p>
              <Button size="sm" variant="outline" onClick={() => void handleCompleteSetup()} disabled={setupRetrying}>
                Try again
              </Button>
            </div>
          ) : null}

          <ProgressOverview employee={employee} />

          <ComplianceSection detail={detail} categories={categories} progressStats={progressStats} />

          <EditEmployeeDialog
            open={editOpen && employee !== null && employee.isActive}
            employee={employee}
            onClose={() => setEditOpen(false)}
          />

          <DeactivateConfirmDialog
            open={confirmOpen && employee !== null}
            employee={employee}
            onClose={() => setConfirmOpen(false)}
          />
        </>
      )}

      {showStaleEditNotice && employee ? (
        <div
          role="status"
          data-testid="stale-edit-notice"
          className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"
        >
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="flex-1">
            {staleEditNoticeCompleted
              ? "This employee no longer exists — the edit form was closed."
              : `${employee.name} was deactivated — deactivated employees can no longer be edited, so the form was closed.`}
          </p>
          <Button size="sm" variant="ghost" onClick={() => setStaleNoticeDismissed(true)}>
            Dismiss
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/* ── scaffolding ────────────────────────────────────────────────────────── */

function DetailSkeleton({ testId }: { testId: string }) {
  return (
    <div className="space-y-4" data-testid={testId}>
      <Card className="animate-pulse">
        <CardContent className="flex items-center gap-3 p-5">
          <div className="bg-muted size-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="bg-muted h-5 w-48 rounded" />
            <div className="bg-muted h-3 w-64 rounded" />
          </div>
        </CardContent>
      </Card>
      <Card className="animate-pulse" data-testid={`${testId}-bars`}>
        <CardContent className="space-y-3 p-5">
          <div className="bg-muted h-2 w-full rounded-full" />
          <div className="bg-muted h-2 w-full rounded-full" />
          <div className="bg-muted h-2 w-2/3 rounded-full" />
        </CardContent>
      </Card>
      <Card className="animate-pulse" data-testid={`${testId}-tasks`}>
        <CardContent className="space-y-3 p-5">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="bg-muted h-10 w-full rounded-md" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function LiveErrorCard({
  error,
  retry,
  what,
}: {
  error: Error | null
  retry: () => void
  what: string
}) {
  const code = (error as { code?: unknown } | null)?.code
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <p>
        {what}
        {error?.message ? ` (${error.message})` : ""}
        {code ? ` [${String(code)}]` : ""}
      </p>
      <Button size="sm" variant="outline" onClick={retry}>
        Retry
      </Button>
    </div>
  )
}

function NotFoundPanel() {
  return (
    <div data-testid="employee-not-found" className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <CircleUser className="text-muted-foreground size-8" />
      <p className="text-muted-foreground text-sm">Employee not found</p>
      <Button asChild size="sm" variant="outline">
        <Link href="/dashboard/directory">Back to directory</Link>
      </Button>
    </div>
  )
}

/* ── profile header (ProfileHeader port) ────────────────────────────────── */

function ProfileHeader({
  employee,
  onEdit,
  onDeactivate,
  onRetainStale,
}: {
  employee: AdminEmployeeProgress
  onEdit: () => void
  onDeactivate: () => void
  onRetainStale?: boolean
}) {
  return (
    <Card data-testid={onRetainStale ? "profile-header-stale" : "profile-header"}>
      <CardContent className="flex flex-wrap items-center gap-4 p-5">
        <span
          aria-hidden
          className={
            "flex size-14 shrink-0 items-center justify-center rounded-full text-base font-bold " +
            (employee.isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")
          }
        >
          {getInitials(employee.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{employee.name}</p>
          <p className="text-muted-foreground truncate text-sm">{employee.email ?? "No email provided"}</p>
        </div>
        <Badge variant={employee.isActive ? "secondary" : "outline"}>
          {employee.isActive ? "Active" : "Inactive"}
        </Badge>
        {employee.setupStatus === "incomplete" ? (
          <span className="border-amber-200 bg-amber-50 text-amber-700 rounded-md border px-2 py-0.5 text-xs font-medium">
            Setup incomplete
          </span>
        ) : null}
        {employee.isActive ? (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={onEdit}>
              <FilePenLine className="mr-1.5 size-3.5" />
              Edit Profile
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={onDeactivate}
            >
              Deactivate
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

/* ── progress overview (ProgressOverview port) ─────────────────────────── */

const BAR_TONES = {
  primary: "",
  blue: "[&_[data-slot=progress-indicator]]:bg-blue-500",
  amber: "[&_[data-slot=progress-indicator]]:bg-amber-500",
} as const

function percent(value: number): number {
  return Math.round(Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0)) * 100)
}

function DetailBar({
  label,
  value,
  tone,
  large,
}: {
  label: string
  value: number
  tone: keyof typeof BAR_TONES
  large?: boolean
}) {
  const pct = percent(value)
  return (
    <div className={large ? "space-y-1.5" : "space-y-1"}>
      <div className="flex items-center justify-between text-xs">
        <span className={large ? "font-medium" : "text-muted-foreground"}>{label}</span>
        <span className={large ? "font-semibold tabular-nums" : "text-muted-foreground tabular-nums"}>
          {pct}%
        </span>
      </div>
      <Progress
        value={pct}
        aria-label={`${label} progress ${pct}%`}
        data-testid={`detail-progress-${label.toLowerCase().replace(/\s+/g, "-")}`}
        className={`h-2 ${BAR_TONES[tone]}`}
      />
    </div>
  )
}

function ProgressOverview({ employee }: { employee: AdminEmployeeProgress }) {
  return (
    <Card data-testid="progress-overview">
      <CardContent className="space-y-4 p-5">
        <DetailBar label="Overall Progress" value={employee.overallProgress} tone="primary" large />
        <div className="grid gap-4 md:grid-cols-2">
          <DetailBar label="Onboarding" value={employee.onboardingProgress} tone="blue" />
          <DetailBar label="Training" value={employee.trainingProgress} tone="amber" />
        </div>
      </CardContent>
    </Card>
  )
}

/* ── compliance section (TaskManagerSection, checklist-lite) ───────────── */

function ComplianceSection({
  detail,
  categories,
  progressStats,
}: {
  detail: ReturnType<typeof useLiveQuery<EmployeeDetailSnapshot>>
  categories: ComplianceCategory[]
  progressStats: { completed: number; remaining: number }
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Compliance Categories</h2>

      {detail.status === "connecting" ? (
        <DetailSkeleton testId="compliance-skeleton" />
      ) : detail.status === "error" ? (
        <div className="space-y-2">
          <LiveErrorCard
            error={detail.error}
            retry={detail.retry}
            what="Compliance documents could not be streamed."
          />
          {categories.some((category) => category.tasks.length > 0) ? (
            <>
              <p data-testid="compliance-stale-note" className="text-muted-foreground text-xs">
                These tasks are stale — retained from the last successful update. Retry to refresh.
              </p>
              <TaskProgressBanner stats={progressStats} />
              <CategoryList categories={categories} />
            </>
          ) : null}
        </div>
      ) : categories.every((category) => category.tasks.length === 0) ? (
        // Dart parity: 'No compliance requirements found.' only after a
        // ready read — never for a failed or still-loading read.
        <div
          className="text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center text-sm"
          data-testid="no-requirements"
        >
          <Hourglass className="text-muted-foreground size-6" />
          No compliance requirements found.
        </div>
      ) : (
        <>
          <TaskProgressBanner stats={progressStats} />
          <CategoryList categories={categories} />
        </>
      )}
    </section>
  )
}

function TaskProgressBanner({ stats }: { stats: { completed: number; remaining: number } }) {
  return (
    <div
      data-testid="task-progress-banner"
      className="flex justify-between gap-4 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 px-5 py-4 text-white"
    >
      <StatBlock label="Completed" value={stats.completed} />
      <StatBlock label="Remaining" value={stats.remaining} />
    </div>
  )
}

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs opacity-80">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  )
}

function CategoryList({ categories }: { categories: ComplianceCategory[] }) {
  return (
    <div className="space-y-4">
      {categories
        .filter((category) => category.tasks.length > 0)
        .map((category) => (
          <CategoryBlock key={category.id} category={category} />
        ))}
    </div>
  )
}

function CategoryBlock({ category }: { category: ComplianceCategory }) {
  return (
    <Card data-testid={`category-${category.id}`}>
      <CardContent className="space-y-2 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{category.title}</h3>
          <span className="text-muted-foreground text-xs">{category.subtitle}</span>
        </div>
        <TaskTileList tasks={category.tasks} />
      </CardContent>
    </Card>
  )
}

const TILE_TONES: Record<string, string> = {
  slate: "bg-muted text-muted-foreground",
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  orange: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
}

function toneForStatus(status: DetailSubTask["status"]): keyof typeof TILE_TONES {
  // getStatusColor parity (admin_directory_helpers.dart): done states use
  // emerald green (handled by the caller), submitted-family blue, pending
  // family amber, rejected family red, everything else slate.
  if (status === "submitted" || status === "underReview") {
    return "blue"
  }
  if (status === "pending" || status === "required" || status === "waitingForApprover") {
    return "orange"
  }
  if (status === "rejected" || status === "expired") {
    return "red"
  }
  return "slate"
}

function TaskTileList({ tasks }: { tasks: DetailSubTask[] }) {
  return (
    <ul className="space-y-1">
      {tasks.map((task) => {
        const done = task.isCompleted
        const toneKey = done ? "green" : toneForStatus(task.status)
        return (
          <li
            key={task.id}
            className="hover:bg-muted/40 flex items-center gap-3 rounded-md px-2 py-2 text-sm"
            data-testid="task-tile"
          >
            <span
              aria-hidden
              className={`flex size-7 shrink-0 items-center justify-center rounded-md ${TILE_TONES[toneKey]}`}
            >
              {task.status === "noActionRequired" ? <X className="size-3.5" /> : <Clock4 className="size-3.5" />}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">{task.title}</span>
            <span className="text-muted-foreground hidden truncate text-xs sm:block sm:max-w-48">
              {task.subtitle}
            </span>
            <span className={"w-32 shrink-0 text-right text-xs font-medium " + (done ? "text-emerald-600" : "text-amber-600")}>
              {taskStatusText(task.status)}
            </span>
            <span aria-hidden className="shrink-0">
              {done ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : (
                <Hourglass className="size-4 text-amber-500" />
              )}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/* ── dialogs (AdminEmployeeForm/deactivate ports, same as Directory) ───── */

function EditEmployeeDialog({
  open,
  employee,
  onClose,
}: {
  open: boolean
  employee: AdminEmployeeProgress | null
  onClose: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!employee) {
      return
    }
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get("name") ?? "").trim()
    const email = String(formData.get("email") ?? "").trim()

    setError(null)
    if (name.length === 0) {
      setError("Name is required")
      return
    }
    if (email.length === 0 || !email.includes("@")) {
      setError("Invalid email format")
      return
    }
    setSubmitting(true)
    try {
      await updateEmployee({ uid: employee.uid, name, email })
      onClose()
    } catch (caught) {
      setError(
        caught instanceof EmployeeActionError ? caught.message : "Failed to update employee.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent data-testid="edit-employee-dialog" key={employee?.uid ?? "none"}>
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" data-testid="edit-employee-form">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Full Name</Label>
            <Input
              id="edit-name"
              name="name"
              key={`name-${employee?.uid ?? ""}`}
              defaultValue={employee?.name ?? ""}
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Email Address</Label>
            <Input
              id="edit-email"
              name="email"
              type="email"
              key={`email-${employee?.uid ?? ""}`}
              defaultValue={employee?.email ?? ""}
              disabled={submitting}
            />
          </div>
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Update Profile
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeactivateConfirmDialog({
  open,
  employee,
  onClose,
}: {
  open: boolean
  employee: AdminEmployeeProgress | null
  onClose: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!employee) {
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await deactivateEmployee(employee.uid)
      onClose()
    } catch (caught) {
      setError(
        caught instanceof EmployeeActionError ? caught.message : "Failed to deactivate employee.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent data-testid="deactivate-dialog" key={employee?.uid ?? "none"}>
        <DialogHeader>
          <DialogTitle>Deactivate employee?</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          {employee?.name ?? "This employee"} will be marked inactive. Their history and records are
          preserved (soft delete), and they can no longer sign in.
        </p>
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Deactivate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
