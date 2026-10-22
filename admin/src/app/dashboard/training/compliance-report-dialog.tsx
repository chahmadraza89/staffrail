"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"

import type {
  AdminTrainingTemplate,
  TrainingAssignment,
  TrainingComplianceMap,
} from "@/lib/admin/training-models"
import { trainingComplianceFor } from "@/lib/admin/training-streams"
import type { LiveQueryResult } from "@/lib/react/use-live-query"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

/**
 * Compliance Report — port of the Flutter ComplianceReportDialog
 * (admin_training/presentation/screens/widgets/compliance_report_dialog.dart).
 *
 * Every template row shows the share of assigned employees who finished it.
 * Flutter prints "0.0%" while the assignments query is still loading, which
 * is indistinguishable from a genuinely unassigned module; the web dialog
 * shows "Loading…" until the assignment listener has delivered its first
 * snapshot, and keeps retained values (clearly marked stale) after a failure.
 */

interface ComplianceReportDialogProps {
  open: boolean
  templates: LiveQueryResult<AdminTrainingTemplate[]>
  assignments: LiveQueryResult<TrainingAssignment[]>
  compliance: TrainingComplianceMap
  onOpenChange: (open: boolean) => void
}

function toneClass(rate: number): string {
  if (rate > 80) {
    return "text-emerald-600"
  }
  if (rate > 50) {
    return "text-amber-600"
  }
  return "text-destructive"
}

export function ComplianceReportDialog({
  open,
  templates,
  assignments,
  compliance,
  onOpenChange,
}: ComplianceReportDialogProps) {
  const progressReady = assignments.status === "ready"
  const progressEverLoaded = assignments.ready.has("assignments")
  const showRetainedValues =
    assignments.status === "error" && progressEverLoaded

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="compliance-report-dialog"
        className="max-h-[85vh] overflow-y-auto sm:max-w-3xl"
      >
        <DialogHeader>
          <DialogTitle>Compliance Report</DialogTitle>
          <DialogDescription>
            Drill-down breakdown of all training modules.
          </DialogDescription>
        </DialogHeader>

        {templates.status === "error" ? (
          <ErrorNote
            message="Training modules could not be streamed."
            error={templates.error}
            retry={templates.retry}
            testId="compliance-templates-error"
          />
        ) : null}

        {assignments.status === "error" ? (
          <ErrorNote
            message={
              progressEverLoaded
                ? "Assignment progress could not be updated — values below are stale."
                : "Assignment progress could not be loaded."
            }
            error={assignments.error}
            retry={assignments.retry}
            testId="compliance-assignments-error"
          />
        ) : null}

        {templates.status === "connecting" ? (
          <p className="text-muted-foreground animate-pulse py-8 text-center text-sm">
            Loading training modules…
          </p>
        ) : templates.data.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No training modules found.
          </p>
        ) : (
          <ul className="divide-y" data-testid="compliance-rows">
            {templates.data.map((template) => {
              const entry = trainingComplianceFor(compliance, template.id)
              const showPercent = progressReady || showRetainedValues

              return (
                <li
                  key={template.id}
                  data-testid="compliance-row"
                  className="space-y-3 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{template.title}</p>
                      <p className="text-muted-foreground text-xs uppercase">
                        {template.requirementType}
                      </p>
                    </div>
                    {showPercent ? (
                      <p
                        data-testid={`compliance-percent-${template.id}`}
                        className={`shrink-0 text-sm font-bold tabular-nums ${toneClass(entry.rate)}`}
                      >
                        {entry.rate.toFixed(1)}%
                      </p>
                    ) : (
                      <p className="text-muted-foreground shrink-0 text-sm font-medium">
                        {assignments.status === "connecting" ? "Loading…" : "—"}
                      </p>
                    )}
                  </div>

                  {showPercent ? (
                    <Progress value={Math.min(100, Math.max(0, entry.rate))} />
                  ) : (
                    <Progress value={0} className="opacity-40" />
                  )}

                  <div className="text-muted-foreground flex items-center justify-between text-xs">
                    <span>
                      {showPercent
                        ? `${entry.completed} of ${entry.total} staff members completed.`
                        : assignments.status === "connecting"
                          ? "Waiting for assignment data…"
                          : "Progress unavailable."}
                    </span>
                    {template.isActive ? null : <span>Inactive template</span>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ErrorNote({
  message,
  error,
  retry,
  testId,
}: {
  message: string
  error: Error | null
  retry: () => void
  testId: string
}) {
  const code = (error as { code?: unknown } | null)?.code
  return (
    <div
      role="alert"
      data-testid={testId}
      className="border-destructive/30 bg-destructive/10 text-destructive flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
    >
      <span className="flex min-w-0 items-center gap-2">
        <AlertTriangle className="size-4 shrink-0" />
        <span className="min-w-0">
          {message}
          {code ? ` (${String(code)})` : ""}
        </span>
      </span>
      <Button size="xs" variant="outline" onClick={retry}>
        <RefreshCw className="mr-1 size-3" />
        Retry
      </Button>
    </div>
  )
}
