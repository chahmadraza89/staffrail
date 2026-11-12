"use client"

import { useCallback, useMemo, useState, type ReactNode } from "react"
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CircleCheck,
  Plus,
  RefreshCw,
  Rocket,
  ShieldCheck,
  TrendingUp,
  UsersRound,
  X,
} from "lucide-react"

import {
  buildTrainingCompliance,
  deriveTrainingStats,
  subscribeTrainingAssignments,
  subscribeTrainingStaff,
  subscribeTrainingTemplates,
  trainingComplianceFor,
} from "@/lib/admin/training-streams"
import type {
  AdminTrainingStats,
  AdminTrainingTemplate,
  TrainingAssignment,
  TrainingStaffMember,
} from "@/lib/admin/training-models"
import { isIndexCompatibilityError } from "@/lib/admin/stream-protocol"
import { useLiveQuery, type LiveQueryResult } from "@/lib/react/use-live-query"
import { useManagedClock } from "@/lib/react/use-managed-clock"
import { logAuditAction } from "@/lib/admin/audit-actions"

import { AssignTrainingDialog } from "@/app/dashboard/training/assign-training-dialog"
import { ComplianceReportDialog } from "@/app/dashboard/training/compliance-report-dialog"
import { CreateTemplateDialog } from "@/app/dashboard/training/create-template-dialog"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

/**
 * Training management — port of the Flutter admin_training web screen
 * (admin_training_web.dart):
 *
 *   1. counters: total templates / overall compliance / overdue trainings
 *      (clicking any of them opens the compliance report, like Flutter);
 *   2. "Assign New Training" entry card;
 *   3. the template grid with per-template completion;
 *   4. a Quick Info / Help panel.
 *
 * Live data arrives through three independent streams (templates,
 * assignments, staff). Each panel distinguishes connecting / ready / failed,
 * and:
 *   - statistics and template progress never show fabricated zeros while a
 *     source is still connecting;
 *   - empty states appear only after the relevant listener delivered;
 *   - failures keep retained data visible with an explicit stale note and a
 *     Retry that resubscribes;
 *   - assignment/create actions are disabled until the lists they depend on
 *     are fully loaded;
 *   - the overdue counter is derived against a managed clock (60 s interval
 *     plus visibility refresh), so a passing deadline updates without any
 *     Firestore snapshot or write.
 */

const EMPTY_TEMPLATES: AdminTrainingTemplate[] = []
const EMPTY_ASSIGNMENTS: TrainingAssignment[] = []
const EMPTY_STAFF: TrainingStaffMember[] = []

type FlashMessage = { tone: "success" | "warning"; text: string }

interface TrainingViewProps {
  adminUid: string
  adminEmail: string
}

export function TrainingView({ adminUid, adminEmail }: TrainingViewProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [flash, setFlash] = useState<FlashMessage | null>(null)

  const templatesSubscribe = useCallback(
    (ctrl: Parameters<typeof subscribeTrainingTemplates>[1]) =>
      subscribeTrainingTemplates(adminUid, ctrl),
    [adminUid],
  )
  const assignmentsSubscribe = useCallback(
    (ctrl: Parameters<typeof subscribeTrainingAssignments>[1]) =>
      subscribeTrainingAssignments(adminUid, ctrl),
    [adminUid],
  )
  const staffSubscribe = useCallback(
    (ctrl: Parameters<typeof subscribeTrainingStaff>[1]) =>
      subscribeTrainingStaff(adminUid, ctrl),
    [adminUid],
  )

  const templates = useLiveQuery<AdminTrainingTemplate[]>({
    key: adminUid,
    subscribe: templatesSubscribe,
    initialData: EMPTY_TEMPLATES,
  })
  const assignments = useLiveQuery<TrainingAssignment[]>({
    key: adminUid,
    subscribe: assignmentsSubscribe,
    initialData: EMPTY_ASSIGNMENTS,
  })
  const staff = useLiveQuery<TrainingStaffMember[]>({
    key: adminUid,
    subscribe: staffSubscribe,
    initialData: EMPTY_STAFF,
  })

  const now = useManagedClock()
  const stats = useMemo<AdminTrainingStats>(
    () => deriveTrainingStats(templates.data, assignments.data, now),
    [templates.data, assignments.data, now],
  )
  const compliance = useMemo(
    () => buildTrainingCompliance(assignments.data),
    [assignments.data],
  )

  /**
   * Stats are shown only once BOTH sources delivered. A later failure keeps
   * the last known numbers visible (the banners say they are stale) instead
   * of resetting them to zero; a failure before the first snapshot must not
   * render fabricated zeros.
   */
  const showStats =
    templates.ready.has("templates") && assignments.ready.has("assignments")

  const progressMode: ProgressMode =
    assignments.status === "ready"
      ? "ready"
      : assignments.status === "connecting"
        ? "loading"
        : assignments.ready.has("assignments")
          ? "stale"
          : "unavailable"

  const handleCreated = (created: { id: string; title: string }) => {
    void logAuditAction({
      actorId: adminUid,
      actorName: adminEmail,
      actionType: "TRAINING_TEMPLATE_CREATED",
      targetId: created.id,
      description: `Published training template "${created.title}"`,
    })
    setFlash({
      tone: "success",
      text: `“${created.title}” was published. Assign it to staff when you are ready.`,
    })
  }

  const handleAssigned = (
    result: { assigned: number; skippedExisting: number; skippedInactive: number },
    context: { templateTitle: string; audienceSize: number },
  ) => {
    if (result.assigned > 0) {
      void logAuditAction({
        actorId: adminUid,
        actorName: adminEmail,
        actionType: "TRAINING_ASSIGNED",
        targetId: adminUid,
        description: `Assigned "${context.templateTitle}" to ${result.assigned} employee(s)`,
        metadata: result,
      })
    }
    const details: string[] = []
    if (result.assigned > 0) {
      details.push(
        `Assigned “${context.templateTitle}” to ${result.assigned} of ${context.audienceSize} selected staff.`,
      )
    }
    if (result.skippedExisting > 0) {
      details.push(
        `${result.skippedExisting} already had this training and ${
          result.skippedExisting === 1 ? "was" : "were"
        } left unchanged.`,
      )
    }
    if (result.skippedInactive > 0) {
      details.push(`${result.skippedInactive} inactive employee(s) were excluded.`)
    }
    if (result.assigned === 0) {
      details.unshift("No new assignments were created.")
    }

    setFlash({
      tone: result.assigned > 0 ? "success" : "warning",
      text: details.join(" "),
    })
  }

  return (
    <div className="space-y-6" data-testid="training-view">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employee Training</h1>
          <p className="text-muted-foreground text-sm">
            Live compliance for {adminEmail}
          </p>
        </div>
        <Button data-testid="create-template-open" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          Create New Template
        </Button>
      </header>

      {flash ? (
        <div
          role="status"
          data-testid="training-flash"
          data-tone={flash.tone}
          className={
            "flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm " +
            (flash.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900")
          }
        >
          <p className="min-w-0">{flash.text}</p>
          <button
            type="button"
            aria-label="Dismiss notification"
            className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
            onClick={() => setFlash(null)}
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      {templates.status === "error" ? (
        <LiveErrorBanner
          testId="training-templates-error"
          error={templates.error}
          retry={templates.retry}
          message="Training templates could not be streamed."
        />
      ) : null}
      {assignments.status === "error" ? (
        <LiveErrorBanner
          testId="training-assignments-error"
          error={assignments.error}
          retry={assignments.retry}
          message="Training progress could not be streamed."
        />
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          testId="training-stat-total"
          label="Total Active Trainings"
          value={`${stats.totalActive}`}
          hint="template documents"
          icon={<BookOpenCheck className="size-4" />}
          ready={showStats}
          onOpen={() => setReportOpen(true)}
        />
        <StatCard
          testId="training-stat-compliance"
          label="Overall Compliance Rate"
          value={`${stats.complianceRate.toFixed(1)}%`}
          hint="completed or verified assignments"
          icon={<TrendingUp className="size-4" />}
          ready={showStats}
          onOpen={() => setReportOpen(true)}
        />
        <StatCard
          testId="training-stat-overdue"
          label="Overdue Trainings"
          value={`${stats.overdueCount}`}
          hint="unfinished past the deadline"
          icon={<AlertTriangle className="size-4" />}
          ready={showStats}
          tone="danger"
          onOpen={() => setReportOpen(true)}
        />
      </section>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4">
          <span className="bg-primary/10 text-primary rounded-xl p-3">
            <Rocket className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Assign New Training</p>
            <p className="text-muted-foreground text-sm">
              Configure and deploy modules to your team.
            </p>
          </div>
          <Button
            variant="outline"
            data-testid="assign-training-open"
            onClick={() => setAssignOpen(true)}
          >
            Assign training
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </CardContent>
      </Card>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Active Training Modules</h2>
            <Badge variant="secondary" className="tabular-nums">
              {templates.status === "connecting" ? "…" : templates.data.length}
            </Badge>
          </div>

          <TemplateGrid
            query={templates}
            compliance={compliance}
            progressMode={progressMode}
          />
        </div>

        <QuickInfo stats={stats} ready={showStats} />
      </section>

      <CreateTemplateDialog
        open={createOpen}
        adminUid={adminUid}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
      <AssignTrainingDialog
        open={assignOpen}
        adminUid={adminUid}
        templates={templates}
        staff={staff}
        onOpenChange={setAssignOpen}
        onAssigned={handleAssigned}
      />
      <ComplianceReportDialog
        open={reportOpen}
        templates={templates}
        assignments={assignments}
        compliance={compliance}
        onOpenChange={setReportOpen}
      />
    </div>
  )
}

/* ── live-state helpers ────────────────────────────────────────────────── */

function LiveErrorBanner({
  error,
  retry,
  message,
  testId,
}: {
  error: Error | null
  retry: () => void
  message: string
  testId: string
}) {
  const isIndexError = isIndexCompatibilityError(error)
  const code = (error as { code?: unknown } | null)?.code

  return (
    <div
      role="alert"
      data-testid={testId}
      className="border-destructive/30 bg-destructive/10 text-destructive flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm"
    >
      <div className="min-w-0">
        <p className="font-medium">
          {isIndexError ? "Missing query index." : message}
          {code ? ` (${String(code)})` : ""}
        </p>
        <p className="text-destructive/80 mt-0.5 text-xs">
          {isIndexError
            ? "Verify your data store index configuration, then press Retry — live subscriptions do not upgrade themselves."
            : "Press Retry to resubscribe. Retained values are stale until the stream recovers."}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={retry} className="shrink-0">
        <RefreshCw className="mr-1.5 size-3.5" />
        Retry
      </Button>
    </div>
  )
}

/* ── counters ──────────────────────────────────────────────────────────── */

function StatCard({
  testId,
  label,
  value,
  hint,
  icon,
  ready,
  tone = "default",
  onOpen,
}: {
  testId: string
  label: string
  value: string
  hint: string
  icon: ReactNode
  ready: boolean
  tone?: "default" | "danger"
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      className="text-left"
      onClick={onOpen}
      aria-label={`${label}: view compliance report`}
    >
      <Card
        className={
          "h-full transition-colors hover:border-primary/40 hover:ring-primary/30 " +
          (tone === "danger" ? "ring-destructive/20" : "")
        }
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
          <span
            className={
              "rounded-lg p-2 " +
              (tone === "danger"
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary")
            }
          >
            {icon}
          </span>
        </CardHeader>
        <CardContent>
          <p
            data-testid={`${testId}-value`}
            className={
              "text-3xl font-semibold tabular-nums " +
              (ready ? "" : "text-muted-foreground animate-pulse")
            }
          >
            {ready ? value : "—"}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
        </CardContent>
      </Card>
    </button>
  )
}

/* ── template grid ─────────────────────────────────────────────────────── */

type ProgressMode = "loading" | "ready" | "stale" | "unavailable"

function TemplateGrid({
  query,
  compliance,
  progressMode,
}: {
  query: LiveQueryResult<AdminTrainingTemplate[]>
  compliance: ReturnType<typeof buildTrainingCompliance>
  progressMode: ProgressMode
}) {
  if (query.status === "connecting") {
    return (
      <p
        data-testid="training-loading"
        className="text-muted-foreground animate-pulse py-8 text-center text-sm"
      >
        Loading training modules…
      </p>
    )
  }

  if (query.data.length === 0) {
    if (query.status === "error") {
      return (
        <div className="space-y-2 py-6 text-center">
          <p className="text-muted-foreground text-sm">
            Training modules could not be loaded.
          </p>
          <Button size="sm" variant="outline" onClick={query.retry}>
            <RefreshCw className="mr-1.5 size-3.5" />
            Retry
          </Button>
        </div>
      )
    }
    return (
      <p
        data-testid="training-empty"
        className="text-muted-foreground border-dashed py-10 text-center text-sm"
      >
        No trainings have been created yet.
      </p>
    )
  }

  return (
    <div className="space-y-3" data-testid="training-list">
      {query.status === "error" ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
          Template list is stale — retained from the last successful update.
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {query.data.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            compliance={trainingComplianceFor(compliance, template.id)}
            progressMode={progressMode}
          />
        ))}
      </div>
    </div>
  )
}

function formatDate(date: Date | null): string | null {
  if (!date) {
    return null
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function TemplateCard({
  template,
  compliance,
  progressMode,
}: {
  template: AdminTrainingTemplate
  compliance: { completed: number; total: number; rate: number }
  progressMode: ProgressMode
}) {
  const progressVisible = progressMode === "ready" || progressMode === "stale"
  const created = formatDate(template.createdAt)

  return (
    <Card data-testid="training-template-card" data-template-id={template.id} className="h-full">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span className="bg-primary/10 text-primary rounded-xl p-2">
            <ShieldCheck className="size-4" />
          </span>
          <Badge variant="secondary" className="uppercase">
            {template.requirementType}
          </Badge>
        </div>
        <CardTitle className="line-clamp-2 text-base">{template.title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-muted-foreground line-clamp-2 min-h-10 text-sm">
          {template.description.length > 0 ? template.description : "No description provided."}
        </p>

        <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1">
            <CircleCheck className="size-3.5" />
            {template.durationText.length > 0 ? template.durationText : "Duration not set"}
          </span>
          {created ? <span>Created {created}</span> : null}
          {template.isActive ? null : <span>Inactive</span>}
        </div>

        <div className="space-y-1.5 border-t pt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Completion</span>
            {progressVisible ? (
              <span className="font-medium tabular-nums">
                {compliance.completed} / {compliance.total}
                <span className="text-muted-foreground ml-1">
                  ({compliance.rate.toFixed(1)}%)
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">
                {progressMode === "loading" ? "Loading…" : "Unavailable"}
              </span>
            )}
          </div>
          {progressVisible ? (
            <Progress value={Math.min(100, Math.max(0, compliance.rate))} />
          ) : (
            <Progress value={0} className="opacity-40" />
          )}
          <p className="text-muted-foreground text-xs">
            {progressVisible
              ? compliance.total === 0
                ? "Not assigned to any staff member yet."
                : `${compliance.completed} of ${compliance.total} staff members completed.${
                    progressMode === "stale" ? " (stale)" : ""
                  }`
              : progressMode === "loading"
                ? "Waiting for assignment data…"
                : "Assignment progress is unavailable."}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

/* ── quick info ────────────────────────────────────────────────────────── */

function QuickInfo({ stats, ready }: { stats: AdminTrainingStats; ready: boolean }) {
  return (
    <Card data-testid="training-quick-info" className="xl:sticky xl:top-20">
      <CardHeader>
        <CardTitle className="text-base">Quick Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-primary size-4 shrink-0" />
          <span className="min-w-0 flex-1">Global Compliance</span>
          <span className="font-semibold tabular-nums">
            {ready ? `${stats.complianceRate.toFixed(1)}%` : "—"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0 text-amber-600" />
          <span className="min-w-0 flex-1">Overdue Trainings</span>
          <span className="font-semibold tabular-nums">
            {ready ? stats.overdueCount : "—"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <UsersRound className="text-muted-foreground size-4 shrink-0" />
          <span className="min-w-0 flex-1">Training Templates</span>
          <span className="font-semibold tabular-nums">
            {ready ? stats.totalActive : "—"}
          </span>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-semibold">Help &amp; Guidelines</p>
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
            Templates define specific training requirements (e.g. certificates) that
            staff must complete and upload for verification. Publishing a template does
            not assign it; use “Assign New Training” to deploy it to all or selected
            active staff. Re-assigning never overwrites an employee&apos;s existing
            progress.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
