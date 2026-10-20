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
  MODULE_IDS,
  MODULE_LABELS,
  moduleForSource,
  subscribeEmployeeDetail,
  EMPTY_DETAIL,
  type EmployeeProfileDetail,
  type EmployeeDetailSnapshot,
  type ModuleId,
} from "@/lib/admin/employee-detail-streams"
import {
  buildComplianceModel,
  subtaskKey,
  taskProgressStats,
  taskStatusText,
  type ComplianceCategory,
  type DetailSubTask,
  type ModuleRead,
} from "@/lib/admin/compliance-helpers"
import { computeModuleProgress } from "@/lib/admin/progress-models"
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
 *
 *   - SINGLE-employee subscription: `subscribeEmployeeDetail` attaches the
 *     profile doc first and only then the three document modules, AFTER the
 *     ownership gate (doc.adminId === adminUid && role === "employee")
 *     passed — the workspace-wide employees stream is never subscribed
 *     here, so unrelated employees' listeners cannot affect this page.
 *   - The module snapshots feed BOTH the checklist grouping and the shared
 *     progress formulas (progress-models.ts, identical to Dashboard/Directory).
 *   - Module read states are explicit: pending modules visibly load and
 *     never fabricate default rows; failed modules show an actionable
 *     banner + Retry; previously delivered data is retained and labelled
 *     stale — never-loaded data never is. Counts are labelled partial
 *     whenever requirements are unavailable.
 *   - Edit (transactional), Deactivate (soft delete) with the same
 *     derived-staleness dialogs, and the durable "Complete setup" recovery.
 * Task detail/review panel arrives with the next step.
 */

type ModuleUiState = "pending" | "ready" | "failed-stale" | "failed-unavailable"

function resolveModuleUi(
  errors: ReadonlyMap<string, Error>,
  ready: ReadonlySet<string>,
  id: ModuleId,
  /** Whether the module's last delivered snapshot carried any rows. */
  hasRetainedItems: boolean,
): ModuleUiState {
  if (errors.has(id)) {
    // A failed listener stays in `ready` if it EVER delivered — but a stale
    // label is only honest when the retained snapshot actually carried
    // rows: an empty retained read retains NOTHING (never describe
    // never-loaded defaults as retained results).
    return ready.has(id) && hasRetainedItems ? "failed-stale" : "failed-unavailable"
  }
  return ready.has(id) ? "ready" : "pending"
}

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

  const subscribeDetail = useCallback(
    (ctrl: Parameters<typeof subscribeEmployeeDetail>[2]) =>
      subscribeEmployeeDetail(employeeId, adminUid, ctrl),
    [employeeId, adminUid],
  )
  // The key covers BOTH identifiers: a different signed-in admin or a
  // different employee route must always restart a fresh subscription.
  const detail = useLiveQuery<EmployeeDetailSnapshot>({
    key: `${adminUid}|${employeeId}`,
    subscribe: subscribeDetail,
    initialData: EMPTY_DETAIL,
  })

  const stage = detail.data.profile
  const employee = stage?.state === "active" ? stage.employee : null
  const errors = detail.errors

  const moduleUi = useMemo(() => {
    const retainedHasItems: Record<ModuleId, boolean> = {
      onboardingTasks: detail.data.tasks.length > 0,
      trainings: detail.data.trainings.length > 0,
      clearance: detail.data.clearances.length > 0,
    }
    const states = {} as Record<ModuleId, ModuleUiState>
    for (const id of MODULE_IDS) {
      states[id] = resolveModuleUi(detail.errors, detail.ready, id, retainedHasItems[id])
    }
    return states
  }, [detail.data, detail.errors, detail.ready])

  const partialModules = MODULE_IDS.filter((id) => moduleUi[id] !== "ready")
  const staleModules = MODULE_IDS.filter((id) => moduleUi[id] === "failed-stale")
  const pendingModules = MODULE_IDS.filter((id) => moduleUi[id] === "pending")
  const failedModules = MODULE_IDS.filter(
    (id) => moduleUi[id] === "failed-stale" || moduleUi[id] === "failed-unavailable",
  )
  const allModulesPending = MODULE_IDS.every((id) => moduleUi[id] === "pending")
  const allModulesReady = MODULE_IDS.every((id) => moduleUi[id] === "ready")

  const moduleRead = <T,>(
    id: ModuleId,
    items: T[],
  ): ModuleRead<T> =>
    moduleUi[id] === "ready"
      ? { kind: "ready", items }
      : moduleUi[id] === "pending"
        ? { kind: "pending" }
        : // failed: retained items only if this listener ever delivered —
          // never-loaded modules contribute nothing (no fabrication).
          detail.ready.has(id)
          ? { kind: "failed", items }
          : { kind: "failed", items: [] }

  const categories = useMemo(
    () =>
      buildComplianceModel({
        tasks: moduleRead("onboardingTasks", detail.data.tasks),
        trainings: moduleRead("trainings", detail.data.trainings),
        clearances: moduleRead("clearance", detail.data.clearances),
      }).categories,
    // Module read states are derived above; the model recomputes whenever
    // the underlying engine state changes (data, or ready/error flips).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detail.data, detail.errors, detail.ready],
  )
  const progressStats = useMemo(() => taskProgressStats(categories), [categories])

  // Progress bars reuse the SAME module snapshots as the checklist, through
  // the shared Dashboard/Directory formulas (unavailable modules contribute
  // nothing — zero-total modules are excluded from the overall average).
  const progress = useMemo(
    () =>
      computeModuleProgress({
        tasks: detail.ready.has("onboardingTasks")
          ? detail.data.tasks.map((task) => ({ status: task.status, isCompleted: task.isCompleted }))
          : [],
        trainings: detail.ready.has("trainings")
          ? detail.data.trainings.map((training) => ({ status: training.status }))
          : [],
        clearances: detail.ready.has("clearance")
          ? detail.data.clearances.map((clearance) => ({ status: clearance.status }))
          : [],
      }),
    [detail.data, detail.ready],
  )

  // Staleness is DERIVED (never an effect): the dialog closes reactively
  // when the live stream reports the target deactivated or removed.
  const showStaleEditNotice =
    editOpen && (employee === null || !employee.isActive) && !staleNoticeDismissed
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

      {stage === null ? (
        detail.status === "error" ? (
          // Startup failures (including a synchronous subscription-builder
          // throw recorded under the engine's `*init*` listener) leave the
          // profile stage null. The engine's OVERALL status is authoritative
          // here — checking `errors.has("profile")` alone would miss *init*
          // failures and strand the page on its loading skeleton forever.
          <div className="space-y-4">
            <LiveErrorCard
              error={detail.error}
              retry={detail.retry}
              what="Employee profile could not be streamed."
            />
          </div>
        ) : (
          <DetailSkeleton testId="detail-skeleton" />
        )
      ) : stage.state === "not-found" ? (
        <NotFoundPanel />
      ) : stage.state === "not-owned" ? (
        <NotOwnedPanel />
      ) : (
        <>
          {errors.has("profile") ? (
            <LiveErrorCard
              error={errors.get("profile") ?? null}
              retry={detail.retry}
              what="Employee profile could not be streamed — the header below is the last retained snapshot."
            />
          ) : null}

          <ProfileHeader
            employee={stage.employee}
            stale={errors.has("profile")}
            onEdit={() => {
              setStaleNoticeDismissed(false)
              setEditOpen(true)
            }}
            onDeactivate={() => setConfirmOpen(true)}
          />

          {stage.employee.setupStatus === "incomplete" ? (
            <div
              data-testid="detail-setup-incomplete"
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"
            >
              <p>
                <strong>{stage.employee.name}</strong>&rsquo;s onboarding documents could not be
                set up yet — completing setup continues with the SAME account.
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

          <ProgressOverview progress={progress} partial={partialModules.length > 0} />

          <ComplianceSection
            categories={categories}
            progressStats={progressStats}
            allModulesPending={allModulesPending}
            allModulesReady={allModulesReady}
            failedModules={failedModules}
            pendingModules={pendingModules}
            partialModules={partialModules}
            staleModules={staleModules}
            error={detail.error}
            retry={detail.retry}
          />

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

      {showStaleEditNotice ? (
        <div
          role="status"
          data-testid="stale-edit-notice"
          className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"
        >
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="flex-1">
            {staleEditNoticeCompleted
              ? "This employee no longer exists — the edit form was closed."
              : `${employee?.name ?? "This employee"} was deactivated — deactivated employees can no longer be edited, so the form was closed.`}
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
      data-testid="live-error-card"
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
      <p className="text-muted-foreground text-xs">
        The document-module listeners were stopped and reset.
      </p>
      <Button asChild size="sm" variant="outline">
        <Link href="/dashboard/directory">Back to directory</Link>
      </Button>
    </div>
  )
}

function NotOwnedPanel() {
  return (
    <div data-testid="employee-not-owned" className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <CircleUser className="text-muted-foreground size-8" />
      <p className="text-muted-foreground text-sm">
        You do not have access to this employee record.
      </p>
      <p className="text-muted-foreground text-xs">
        The record belongs to another admin or is not an employee account. Document-module
        listeners were stopped and reset.
      </p>
      <Button asChild size="sm" variant="outline">
        <Link href="/dashboard/directory">Back to directory</Link>
      </Button>
    </div>
  )
}

/* ── profile header (ProfileHeader port) ────────────────────────────────── */

function ProfileHeader({
  employee,
  stale,
  onEdit,
  onDeactivate,
}: {
  employee: EmployeeProfileDetail
  stale: boolean
  onEdit: () => void
  onDeactivate: () => void
}) {
  return (
    <Card data-testid={stale ? "profile-header-stale" : "profile-header"}>
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
        {stale ? (
          <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            Stale
          </span>
        ) : null}
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
    <div
      className={large ? "space-y-1.5" : "space-y-1"}
      data-testid={`detail-progress-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-center justify-between text-xs">
        <span className={large ? "font-medium" : "text-muted-foreground"}>{label}</span>
        <span className={large ? "font-semibold tabular-nums" : "text-muted-foreground tabular-nums"}>
          {pct}%
        </span>
      </div>
      <Progress
        value={pct}
        aria-label={`${label} progress ${pct}%`}
        className={`h-2 ${BAR_TONES[tone]}`}
      />
    </div>
  )
}

function ProgressOverview({
  progress,
  partial,
}: {
  progress: ReturnType<typeof computeModuleProgress>
  partial: boolean
}) {
  return (
    <Card data-testid="progress-overview">
      <CardContent className="space-y-4 p-5">
        <DetailBar label="Overall Progress" value={progress.overall} tone="primary" large />
        <div className="grid gap-4 md:grid-cols-2">
          <DetailBar label="Onboarding" value={progress.onboarding} tone="blue" />
          <DetailBar label="Training" value={progress.training} tone="amber" />
        </div>
        {partial ? (
          <p data-testid="progress-overview-partial" className="text-muted-foreground text-xs">
            Progress bars are partial — some required sections are still loading or unavailable.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

/* ── compliance section (TaskManagerSection, checklist-lite) ──────────── */

function describeModules(ids: ModuleId[]): string {
  return ids.map((id) => MODULE_LABELS[id]).join(", ")
}

function ComplianceSection({
  categories,
  progressStats,
  allModulesPending,
  allModulesReady,
  failedModules,
  pendingModules,
  partialModules,
  staleModules,
  error,
  retry,
}: {
  categories: ComplianceCategory[]
  progressStats: { completed: number; remaining: number }
  allModulesPending: boolean
  allModulesReady: boolean
  failedModules: ModuleId[]
  pendingModules: ModuleId[]
  partialModules: ModuleId[]
  staleModules: ModuleId[]
  error: Error | null
  retry: () => void
}) {
  // Stale categories: a category is stale when its OWNING module holds
  // retained (previously delivered) data behind a live failure.
  const staleCategory = (category: ComplianceCategory): boolean => {
    if (staleModules.length === 0 || category.tasks.length === 0) {
      return false
    }
    return staleModules.includes(moduleForSource(category.tasks[0].taskSource))
  }
  const unavailableModules = failedModules.filter((id) => !staleModules.includes(id))
  const partialSegments = [
    pendingModules.length > 0 ? `still loading: ${describeModules(pendingModules)}` : null,
    staleModules.length > 0 ? `retained stale: ${describeModules(staleModules)}` : null,
    unavailableModules.length > 0 ? `unavailable: ${describeModules(unavailableModules)}` : null,
  ].filter((segment): segment is string => segment !== null)

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Compliance Categories</h2>

      {allModulesPending ? (
        // Nothing has ever loaded — a real loading state, not an empty one.
        <DetailSkeleton testId="compliance-skeleton" />
      ) : (
        <div className="space-y-3">
          {failedModules.length > 0 ? (
            <LiveErrorCard
              error={error}
              retry={retry}
              what={`Failed to stream some compliance requirements (${describeModules(failedModules)}).`}
            />
          ) : null}

          {pendingModules.length > 0 ? (
            <p
              data-testid="module-pending-note"
              className="text-muted-foreground flex items-center gap-2 text-xs"
            >
              <Loader2 aria-hidden className="size-3.5 animate-spin" />
              Still loading: {describeModules(pendingModules)}…
            </p>
          ) : null}

          {categories.some((category) => category.tasks.length > 0) ? (
            <>
              {staleModules.length > 0 ? (
                <p data-testid="compliance-stale-note" className="text-muted-foreground text-xs">
                  Sections shown with a &ldquo;Stale&rdquo; marker hold retained data from the
                  last successful update ({describeModules(staleModules)}). Retry to refresh.
                </p>
              ) : null}
              {partialModules.length > 0 ? (
                <p data-testid="progress-partial-note" className="text-muted-foreground text-xs">
                  Counts are partial — some requirements are unavailable ({partialSegments.join("; ")}).
                </p>
              ) : null}
              <TaskProgressBanner stats={progressStats} />
              <CategoryList categories={categories} staleCategory={staleCategory} />
            </>
          ) : allModulesReady ? (
            // Dart parity: 'No compliance requirements found.' only after a
            // fully ready read — never for a failed or still-loading read.
            <div
              className="text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center text-sm"
              data-testid="no-requirements"
            >
              <Hourglass className="text-muted-foreground size-6" />
              No compliance requirements found.
            </div>
          ) : null}
        </div>
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

function CategoryList({
  categories,
  staleCategory,
}: {
  categories: ComplianceCategory[]
  staleCategory: (category: ComplianceCategory) => boolean
}) {
  return (
    <div className="space-y-4">
      {categories
        .filter((category) => category.tasks.length > 0)
        .map((category) => (
          <CategoryBlock key={category.id} category={category} stale={staleCategory(category)} />
        ))}
    </div>
  )
}

function CategoryBlock({
  category,
  stale,
}: {
  category: ComplianceCategory
  stale: boolean
}) {
  return (
    <Card data-testid={`category-${category.id}`}>
      <CardContent className="space-y-2 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">
            {category.title}
            {stale ? (
              <span
                data-testid={`category-${category.id}-stale`}
                className="border-amber-200 bg-amber-50 text-amber-700 ml-2 rounded-md border px-1.5 py-0.5 align-middle text-xs font-medium"
              >
                Stale
              </span>
            ) : null}
          </h3>
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
            key={subtaskKey(task)}
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
  employee: EmployeeProfileDetail | null
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
  employee: EmployeeProfileDetail | null
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
