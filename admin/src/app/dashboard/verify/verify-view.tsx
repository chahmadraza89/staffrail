"use client"

import Link from "next/link"
import { useCallback, useMemo, type ReactNode } from "react"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  buildClearanceActions,
  buildRecentApprovals,
  deriveClearanceStats,
  type ClearanceRecentApprovals,
  type ClearanceRecord,
  type ClearanceStats,
} from "@/lib/admin/clearance-models"
import { subscribeAdminClearances } from "@/lib/admin/clearance-streams"
import { isIndexCompatibilityError } from "@/lib/admin/stream-protocol"
import { useLiveQuery } from "@/lib/react/use-live-query"
import { useManagedClock } from "@/lib/react/use-managed-clock"

/**
 * Verify (clearance management) — port of the Flutter `AdminClearanceWeb`
 * dashboard:
 *
 *   1. three counters (pending review / verified / action required);
 *   2. the pending-review queue, newest update first, each row opening the
 *      document review screen;
 *   3. an overview card with the same proportions;
 *   4. recent approvals (three unique employees + a "+N" chip).
 *
 * Read-state rules match the rest of the console:
 *   - no fabricated zeros while the single live query is connecting;
 *   - "No clearances pending review." appears only after a successful read;
 *   - a failure keeps retained rows visible with an explicit stale label and
 *     a Retry that resubscribes.
 */

const EMPTY_CLEARANCES: ClearanceRecord[] = []

interface VerifyViewProps {
  adminUid: string
  adminEmail: string
}

export function VerifyView({ adminUid, adminEmail }: VerifyViewProps) {
  const clearancesSubscribe = useCallback(
    (ctrl: Parameters<typeof subscribeAdminClearances>[1]) =>
      subscribeAdminClearances(adminUid, ctrl),
    [adminUid],
  )

  const clearances = useLiveQuery<ClearanceRecord[]>({
    key: adminUid,
    subscribe: clearancesSubscribe,
    initialData: EMPTY_CLEARANCES,
  })

  // Relative times ("2h ago") stay honest while the page is open.
  const now = useManagedClock()
  const stats = useMemo(() => deriveClearanceStats(clearances.data), [clearances.data])
  const actions = useMemo(
    () => buildClearanceActions(clearances.data, now),
    [clearances.data, now],
  )
  const recent = useMemo(
    () => buildRecentApprovals(clearances.data),
    [clearances.data],
  )

  const everLoaded = clearances.ready.has("clearances")
  const retained = clearances.status === "error" && everLoaded
  const showValues = everLoaded
  const showEmpty = showValues && actions.length === 0

  return (
    <div className="space-y-6" data-testid="verify-view">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Clearance Verification</h1>
        <p className="text-muted-foreground text-sm">
          Review uploaded background clearance documents for {adminEmail}
        </p>
      </header>

      {clearances.status === "error" ? (
        <ClearanceErrorBanner
          error={clearances.error}
          retry={clearances.retry}
          retained={retained}
        />
      ) : null}

      {retained ? (
        <p
          data-testid="verify-stale-note"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900"
        >
          Stale — showing the last successfully loaded clearance records. Review
          actions stay disabled in the detail view until the stream recovers.
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          testId="verify-stat-pending"
          label="Pending Review"
          value={stats.pendingReview}
          hint="uploaded, awaiting your decision"
          ready={showValues}
          icon={<Clock className="size-4" />}
          tone="pending"
        />
        <StatCard
          testId="verify-stat-verified"
          label="Verified"
          value={stats.verified}
          hint="approved clearances"
          ready={showValues}
          icon={<CheckCircle2 className="size-4" />}
          tone="verified"
        />
        <StatCard
          testId="verify-stat-action"
          label="Action Required"
          value={stats.actionRequired}
          hint="rejected or expired"
          ready={showValues}
          icon={<AlertTriangle className="size-4" />}
          tone="action"
        />
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ActionRequiredCard
          actions={actions}
          everLoaded={everLoaded}
          loading={clearances.status === "connecting"}
          stale={retained}
          showEmpty={showEmpty}
        />

        <div className="space-y-6">
          <OverviewCard stats={stats} ready={showValues} />
          <RecentApprovalsCard
            recent={recent}
            everLoaded={everLoaded}
            loading={clearances.status === "connecting"}
          />
        </div>
      </section>
    </div>
  )
}

/* ── cards ─────────────────────────────────────────────────────────────── */

function StatCard({
  testId,
  label,
  value,
  hint,
  ready,
  icon,
  tone,
}: {
  testId: string
  label: string
  value: number
  hint: string
  ready: boolean
  icon: ReactNode
  tone: "pending" | "verified" | "action"
}) {
  const iconClass =
    tone === "pending"
      ? "bg-amber-100 text-amber-700"
      : tone === "verified"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-red-100 text-red-700"

  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {label}
        </CardTitle>
        <span className={`rounded-lg p-2 ${iconClass}`}>{icon}</span>
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
  )
}

function ActionRequiredCard({
  actions,
  everLoaded,
  loading,
  stale,
  showEmpty,
}: {
  actions: ReturnType<typeof buildClearanceActions>
  everLoaded: boolean
  loading: boolean
  stale: boolean
  showEmpty: boolean
}) {
  return (
    <Card data-testid="verify-actions">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-primary h-5 w-1 rounded-full" />
            <CardTitle>Action Required</CardTitle>
            <Badge variant="secondary" className="tabular-nums">
              {everLoaded ? actions.length : "…"}
            </Badge>
          </div>
          <CardDescription>Newest uploads first</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {!everLoaded ? (
          loading ? (
            <p className="text-muted-foreground animate-pulse py-10 text-center text-sm">
              Loading clearances…
            </p>
          ) : (
            <p className="text-muted-foreground py-10 text-center text-sm">
              The pending-review queue will appear after a successful read.
            </p>
          )
        ) : showEmpty ? (
          <div data-testid="verify-actions-empty" className="py-10 text-center">
            <ShieldCheck className="text-muted-foreground mx-auto mb-3 size-8 opacity-40" />
            <p className="text-muted-foreground text-sm">
              No clearances pending review.
            </p>
            {stale ? (
              <p className="mt-1 text-xs text-amber-700">
                Stale — retained from the last successful read.
              </p>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y">
            {actions.map((item) => (
              <li
                key={`${item.employeeId}:${item.id}`}
                data-testid="verify-action-row"
                className="py-3 first:pt-0 last:pb-0"
              >
                {item.employeeId.length > 0 ? (
                  <Link
                    data-testid="verify-action-link"
                    href={`/dashboard/verify/${item.employeeId}/${item.id}`}
                    className="hover:bg-muted/60 group flex items-center gap-3 rounded-xl px-2 py-2"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                      <FileText className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {item.title}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {item.subtitle}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-muted-foreground text-[11px]">
                        {item.timeAgo}
                      </span>
                      <span className="text-primary inline-flex items-center text-xs font-semibold">
                        Review
                        <ArrowRight className="ml-1 size-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </span>
                  </Link>
                ) : (
                  <div
                    data-testid="verify-action-blocked"
                    className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2"
                  >
                    <AlertTriangle className="size-4 shrink-0 text-amber-700" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-amber-800">
                        This record has no employee link yet. It cannot be
                        reviewed until the Flutter repair restores it.
                      </p>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function OverviewCard({ stats, ready }: { stats: ClearanceStats; ready: boolean }) {
  const rows = [
    {
      key: "pending",
      label: "Pending Review",
      value: stats.pendingReview,
      bar: "bg-amber-500",
    },
    { key: "verified", label: "Verified", value: stats.verified, bar: "bg-emerald-500" },
    {
      key: "action",
      label: "Action Required",
      value: stats.actionRequired,
      bar: "bg-red-500",
    },
  ] as const

  const total = stats.total
  const percent = (value: number) => (total === 0 ? 0 : (value / total) * 100)

  return (
    <Card data-testid="verify-overview">
      <CardHeader>
        <CardTitle>Clearance Overview</CardTitle>
        <CardDescription>All clearance records for your staff</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {rows.map((row) => (
          <div key={row.key} data-testid={`verify-overview-${row.key}`}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">{row.label}</span>
              <span className="font-semibold tabular-nums">
                {ready ? row.value : "—"}
              </span>
            </div>
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full ${row.bar} ${ready ? "" : "opacity-30"}`}
                style={{ width: `${ready ? Math.min(100, percent(row.value)) : 0}%` }}
              />
            </div>
          </div>
        ))}
        <p className="text-muted-foreground text-[11px]">
          {ready
            ? `${total} clearance record${total === 1 ? "" : "s"} across your staff.`
            : "Waiting for the clearance stream…"}
        </p>
      </CardContent>
    </Card>
  )
}

function RecentApprovalsCard({
  recent,
  everLoaded,
  loading,
}: {
  recent: ClearanceRecentApprovals
  everLoaded: boolean
  loading: boolean
}) {
  const hasApprovals = recent.approvals.length > 0 || recent.additionalCount > 0

  return (
    <Card data-testid="verify-recent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-4" />
          Recent Approvals
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!everLoaded ? (
          <p className="text-muted-foreground py-2 text-sm">
            {loading ? "Loading approvals…" : "Unavailable until the stream recovers."}
          </p>
        ) : hasApprovals ? (
          <div className="space-y-3">
            <div className="flex -space-x-2" data-testid="verify-recent-avatars">
              {recent.approvals.map((approval) => (
                <span
                  key={approval.employeeId}
                  title={approval.name}
                  className={`flex size-9 items-center justify-center rounded-full border-2 border-white text-xs font-bold ${recentToneClass(approval.tone)}`}
                >
                  {approval.initials}
                </span>
              ))}
              {recent.additionalCount > 0 ? (
                <span className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-full border-2 border-white text-xs font-bold">
                  +{recent.additionalCount}
                </span>
              ) : null}
            </div>
            <p className="text-muted-foreground text-xs">Approved recently</p>
          </div>
        ) : (
          <p
            data-testid="verify-recent-empty"
            className="text-muted-foreground text-sm italic"
          >
            No recent approvals to show.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function recentToneClass(tone: "blue" | "green" | "purple" | "yellow" | "rose"): string {
  switch (tone) {
    case "blue":
      return "bg-blue-100 text-blue-800"
    case "green":
      return "bg-emerald-100 text-emerald-800"
    case "purple":
      return "bg-purple-100 text-purple-800"
    case "yellow":
      return "bg-yellow-100 text-yellow-800"
    case "rose":
      return "bg-rose-100 text-rose-800"
  }
}

/* ── live-state helpers ────────────────────────────────────────────────── */

function ClearanceErrorBanner({
  error,
  retry,
  retained,
}: {
  error: Error | null
  retry: () => void
  retained: boolean
}) {
  const isIndexError = isIndexCompatibilityError(error)
  const code = (error as { code?: unknown } | null)?.code

  return (
    <div
      role="alert"
      data-testid="verify-clearances-error"
      className="border-destructive/30 bg-destructive/10 text-destructive flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm"
    >
      <div className="min-w-0">
        <p className="font-medium">
          {isIndexError
            ? "Missing query index."
            : retained
              ? "Clearance records could not be updated — the lists below are stale."
              : "Clearance records could not be streamed."}
          {code ? ` (${String(code)})` : ""}
        </p>
        <p className="text-destructive/80 mt-0.5 text-xs">
          {isIndexError
            ? "Create the collection-group index for clearance.adminId, then press Retry — live subscriptions do not upgrade themselves."
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
