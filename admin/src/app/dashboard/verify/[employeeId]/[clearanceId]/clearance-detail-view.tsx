"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useRef, useState } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  History,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react"

import { SignaturePad } from "@/components/admin/signature-pad"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  rejectClearance,
  verifyClearance,
} from "@/lib/admin/clearance-actions"
import { logAuditAction } from "@/lib/admin/audit-actions"
import { triggerNotification } from "@/lib/admin/notification-actions"
import {
  buildClearanceHistory,
  clearanceStatusLabel,
  formatClearanceDateTime,
  initialsOf,
  type ClearanceRecord,
} from "@/lib/admin/clearance-models"
import {
  EMPTY_CLEARANCE_DETAIL,
  subscribeClearanceDetail,
  type ClearanceDetailSnapshot,
  type ClearanceEmployee,
} from "@/lib/admin/clearance-streams"
import { isIndexCompatibilityError } from "@/lib/admin/stream-protocol"
import { fileNameFromUrl, isImageUrl } from "@/lib/admin/task-format"
import { useLiveQuery } from "@/lib/react/use-live-query"

/**
 * Clearance detail / review screen — port of the Flutter
 * `AdminClearanceView` split layout:
 *
 *   left   → employee information + activity history;
 *   right  → verification evidence (open/download) and the decision footer.
 *
 * Reviewer actions use the transactional `clearance-actions` writers. The
 * signature pad mirrors the Flutter "Verify & Sign" step, and the rejection
 * dialog requires a reason. Actions are available only for the current owned,
 * active employee with an `underReview` record whose live subscription is
 * fully ready (never on retained/stale data). Every decision is bound to an
 * immutable snapshot taken when it opens; replacement evidence or any
 * identity/status/stream change requires closing and reopening it.
 */

interface ClearanceDetailViewProps {
  employeeId: string
  clearanceId: string
  adminUid: string
  adminEmail: string
}

type ClearanceReviewKind = "verify" | "reject"

/**
 * Everything an open decision depends on. The dialog captures this snapshot
 * when it opens and submits only `snapshot.revision`; any later change to the
 * document, route identity, reviewer, ownership, activation or stream
 * eligibility invalidates the confirmation instead of silently reviewing
 * replacement evidence.
 */
interface ClearanceReviewSnapshot {
  employeeId: string
  clearanceId: string
  adminUid: string
  employeeUid: string
  employeeAdminId: string | null
  employeeRole: string | null
  employeeActive: boolean
  revision: string
  status: ClearanceRecord["status"]
  streamEligible: boolean
}

function sameReviewSnapshot(
  left: ClearanceReviewSnapshot,
  right: ClearanceReviewSnapshot,
): boolean {
  return (
    left.employeeId === right.employeeId &&
    left.clearanceId === right.clearanceId &&
    left.adminUid === right.adminUid &&
    left.employeeUid === right.employeeUid &&
    left.employeeAdminId === right.employeeAdminId &&
    left.employeeRole === right.employeeRole &&
    left.employeeActive === right.employeeActive &&
    left.revision === right.revision &&
    left.status === right.status &&
    left.streamEligible === right.streamEligible
  )
}

export function ClearanceDetailView({
  employeeId,
  clearanceId,
  adminUid,
  adminEmail,
}: ClearanceDetailViewProps) {
  const router = useRouter()

  const subscribe = useCallback(
    (ctrl: Parameters<typeof subscribeClearanceDetail>[3]) =>
      subscribeClearanceDetail(employeeId, clearanceId, adminUid, ctrl),
    [employeeId, clearanceId, adminUid],
  )

  const detail = useLiveQuery<ClearanceDetailSnapshot>({
    key: `${adminUid}:${employeeId}:${clearanceId}`,
    subscribe,
    initialData: EMPTY_CLEARANCE_DETAIL,
  })

  const [signing, setSigning] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reviewed, setReviewed] = useState<ClearanceReviewSnapshot | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const employee = detail.data.employee
  const clearance = detail.data.clearance
  const employeeReady = detail.ready.has("employee")
  const clearanceReady = detail.ready.has("clearance")
  const retained = detail.status === "error" && clearance !== null
  const employeeOwned =
    employee !== null &&
    employee.uid === employeeId &&
    employee.role === "employee" &&
    employee.adminId === adminUid
  const employeeActive = employee?.isActive === true
  const streamEligible =
    detail.status === "ready" && employeeReady && clearanceReady
  const canAct =
    streamEligible &&
    employeeOwned &&
    employeeActive &&
    clearance !== null &&
    clearance.status === "underReview"
  const reviewKind: ClearanceReviewKind | null = signing
    ? "verify"
    : rejectOpen
      ? "reject"
      : null

  const snapshotNow = (): ClearanceReviewSnapshot | null => {
    if (!employee || !clearance) {
      return null
    }
    return {
      employeeId,
      clearanceId,
      adminUid,
      employeeUid: employee.uid,
      employeeAdminId: employee.adminId,
      employeeRole: employee.role,
      employeeActive: employee.isActive,
      revision: clearance.revision,
      status: clearance.status,
      streamEligible,
    }
  }

  const currentReview = snapshotNow()
  const reviewStale =
    reviewed !== null &&
    reviewKind !== null &&
    (currentReview === null || !sameReviewSnapshot(reviewed, currentReview))

  const openReview = (kind: ClearanceReviewKind) => {
    if (busyRef.current) {
      return
    }
    const snapshot = snapshotNow()
    if (!canAct || snapshot === null) {
      return
    }
    setActionError(null)
    setReviewed(snapshot)
    if (kind === "verify") {
      setSigning(true)
    } else {
      setRejectOpen(true)
    }
  }

  const closeReview = () => {
    if (busyRef.current) {
      return
    }
    setSigning(false)
    setRejectOpen(false)
    setReviewed(null)
  }

  /**
   * Re-checks EVERY dependency at the moment an action runs. The disabled
   * controls are not sufficient: a decision opened while the stream was live
   * must never write after a replacement upload, status change, ownership or
   * activation change, or stream failure. The captured revision — never the
   * latest live revision — is what the transaction receives.
   */
  const currentReviewFor = (
    kind: ClearanceReviewKind,
  ): ClearanceReviewSnapshot | null => {
    if (busyRef.current) {
      setActionError("Another review action is still running. Wait for it to finish.")
      return null
    }
    if (!employee || !employeeOwned) {
      setActionError(
        "This employee is no longer available to your admin account. Refresh the page before reviewing clearances.",
      )
      return null
    }
    if (!employeeActive) {
      setActionError(
        "This employee is inactive. Reactivate the employee before reviewing clearances.",
      )
      return null
    }
    if (!streamEligible) {
      setActionError(
        "This clearance's live data is not fully ready. Review actions are disabled until the stream reconnects.",
      )
      return null
    }
    if (!clearance) {
      setActionError(
        "This clearance was deleted or moved after you opened it. Return to Verify and refresh the list.",
      )
      return null
    }
    if (clearance.status !== "underReview") {
      setActionError(
        "This clearance can no longer be reviewed because its status changed. Return to Verify to see its current status.",
      )
      return null
    }
    if (reviewed === null || reviewKind !== kind) {
      setActionError(
        "This confirmation is no longer open. Close it and reopen against the latest submission.",
      )
      return null
    }
    const current = snapshotNow()
    if (current === null || !sameReviewSnapshot(reviewed, current)) {
      setActionError(
        "This submission changed since you opened this decision. Close it and reopen against the latest submission before acting.",
      )
      return null
    }
    return reviewed
  }

  const header = (
    <header className="flex items-start gap-3">
      <Button asChild variant="outline" size="icon-sm" className="mt-1 shrink-0">
        <Link href="/dashboard/verify" aria-label="Back to Verify">
          <ArrowLeft className="size-4" />
        </Link>
      </Button>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">Clearance Detail</h1>
        <p className="text-muted-foreground text-sm">
          {employee?.name ?? "Reviewing uploaded evidence"} · {adminEmail}
        </p>
      </div>
    </header>
  )

  const runVerify = async (signatureData: string) => {
    const review = currentReviewFor("verify")
    if (review === null) {
      return
    }
    busyRef.current = true
    setBusy(true)
    setActionError(null)
    try {
      await verifyClearance({
        adminUid,
        employeeId,
        clearanceId,
        expectedRevision: review.revision,
        signatureData,
      })
      void logAuditAction({
        actorId: adminUid,
        actorName: adminEmail,
        actionType: "CLEARANCE_VERIFIED",
        targetId: employeeId,
        description: `Verified clearance "${clearance?.title ?? clearanceId}" for ${employee?.name ?? employeeId}`,
        metadata: { clearanceId },
      })
      void triggerNotification({
        targetUserId: employeeId,
        title: "Clearance Verified",
        body: `Your clearance requirement "${clearance?.title ?? clearanceId}" has been verified.`,
        type: "success",
        metadata: { clearanceId, type: "clearance_verified" },
      })
      router.push("/dashboard/verify")
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The clearance could not be verified. Try again.",
      )
      // Never retain an ink signature after a failed decision; a retry must
      // start from a fresh review of the latest submission.
      setSigning(false)
      setReviewed(null)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const runReject = async () => {
    const trimmed = reason.trim()
    if (trimmed.length === 0) {
      return
    }
    const review = currentReviewFor("reject")
    if (review === null) {
      return
    }
    busyRef.current = true
    setBusy(true)
    setActionError(null)
    try {
      await rejectClearance({
        adminUid,
        employeeId,
        clearanceId,
        expectedRevision: review.revision,
        reason: trimmed,
      })
      void logAuditAction({
        actorId: adminUid,
        actorName: adminEmail,
        actionType: "CLEARANCE_REJECTED",
        targetId: employeeId,
        description: `Rejected clearance "${clearance?.title ?? clearanceId}" for ${employee?.name ?? employeeId}: ${trimmed}`,
        metadata: { clearanceId, reason: trimmed },
      })
      void triggerNotification({
        targetUserId: employeeId,
        title: "Clearance Rejected",
        body: `Your clearance "${clearance?.title ?? clearanceId}" was rejected: ${trimmed}`,
        type: "error",
        metadata: { clearanceId, reason: trimmed, type: "clearance_rejected" },
      })
      setRejectOpen(false)
      router.push("/dashboard/verify")
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The clearance could not be rejected. Try again.",
      )
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  if (!employeeReady) {
    return (
      <div className="space-y-6" data-testid="clearance-detail">
        {header}
        {detail.status === "error" ? (
          <DetailErrorBanner detail={detail} retained={false} />
        ) : null}
        <StatePanel
          title={detail.status === "error" ? "Clearance unavailable." : "Loading clearance…"}
          body={
            detail.status === "error"
              ? "The employee profile could not be loaded. Press Retry to resubscribe."
              : "Waiting for the employee profile and document."
          }
          loading={detail.status !== "error"}
        />
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="space-y-6" data-testid="clearance-detail">
        {header}
        <StatePanel
          title="Clearance record not found."
          body="This record does not exist or belongs to another admin's employee."
        />
      </div>
    )
  }

  if (!employee.isActive) {
    return (
      <div className="space-y-6" data-testid="clearance-detail">
        {header}
        {detail.status === "error" ? (
          <DetailErrorBanner detail={detail} retained={false} />
        ) : null}
        <StatePanel
          testId="clearance-employee-inactive"
          title="Employee inactive."
          body="This employee has been deactivated. Reactivate the employee in the Directory before reviewing clearances."
        />
      </div>
    )
  }

  if (!clearanceReady && !clearance) {
    return (
      <div className="space-y-6" data-testid="clearance-detail">
        {header}
        {detail.status === "error" ? (
          <DetailErrorBanner detail={detail} retained={false} />
        ) : null}
        <StatePanel
          title={detail.status === "error" ? "Clearance unavailable." : "Loading clearance…"}
          body={
            detail.status === "error"
              ? "The document could not be loaded. Press Retry to resubscribe."
              : "Waiting for the clearance document."
          }
          loading={detail.status !== "error"}
        />
      </div>
    )
  }

  if (!clearance) {
    return (
      <div className="space-y-6" data-testid="clearance-detail">
        {header}
        <StatePanel
          title="Clearance record not found."
          body="This clearance was deleted or moved after the list loaded."
        />
      </div>
    )
  }

  const history = buildClearanceHistory(clearance)

  return (
    <div className="space-y-6" data-testid="clearance-detail">
      {header}

      {actionError ? (
        <div
          role="alert"
          data-testid="clearance-action-error"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm"
        >
          {actionError}
        </div>
      ) : null}

      {detail.status === "error" ? (
        <DetailErrorBanner detail={detail} retained={retained} />
      ) : null}

      {signing && reviewStale ? (
        <ReviewInvalidationNotice
          testId="clearance-verify-stale"
          onClose={closeReview}
        />
      ) : null}

      {retained ? (
        <p
          data-testid="clearance-detail-stale"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900"
        >
          Stale — this record is retained from the last successful read. Review
          actions are disabled until the stream recovers.
        </p>
      ) : null}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-6">
          <EmployeeCard employee={employee} clearance={clearance} />
          <HistoryCard history={history} />
        </div>

        <Card className="flex flex-col">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="text-primary size-4" />
              <CardTitle>Verification Evidence</CardTitle>
            </div>
            {clearance.fileUrl ? (
              <div className="flex items-center gap-3 text-xs font-semibold">
                <a
                  data-testid="clearance-file-open"
                  href={clearance.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sky-700 hover:underline"
                >
                  Open
                  <ExternalLink className="size-3" />
                </a>
                <a
                  data-testid="clearance-file-download"
                  href={clearance.fileUrl}
                  download={fileNameFromUrl(clearance.fileUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                >
                  Download
                  <Download className="size-3" />
                </a>
              </div>
            ) : null}
          </CardHeader>

          <CardContent className="flex-1">
            <DocumentPreview clearance={clearance} />
          </CardContent>

          <div className="bg-muted/30 border-t p-4">
            {clearance.status === "underReview" ? (
              canAct ? (
                signing ? (
                  <div className="space-y-3">
                    {reviewStale ? (
                      <p className="text-muted-foreground text-xs">
                        The signature was discarded. Close this decision and reopen
                        it against the latest submission.
                      </p>
                    ) : (
                      <SignaturePad
                        onConfirm={runVerify}
                        submitting={busy}
                        disabled={!canAct || busy}
                      />
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={closeReview}
                      disabled={busy}
                    >
                      <X className="mr-1.5 size-3.5" />
                      Cancel signing
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      data-testid="clearance-reject-open"
                      onClick={() => {
                        setReason("")
                        openReview("reject")
                      }}
                      disabled={busy || !canAct}
                    >
                      <X className="mr-1.5 size-3.5" />
                      Reject
                    </Button>
                    <Button
                      type="button"
                      data-testid="clearance-verify-open"
                      onClick={() => openReview("verify")}
                      disabled={busy || !canAct}
                    >
                      <ShieldCheck className="mr-1.5 size-3.5" />
                      Verify &amp; Sign
                    </Button>
                  </div>
                )
              ) : (
                <p className="text-muted-foreground text-xs">
                  Review actions are unavailable until the employee is active and
                  the clearance stream is fully ready.
                </p>
              )
            ) : clearance.status === "verified" ? (
              <div
                data-testid="clearance-verified-note"
                className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
              >
                <CheckCircle2 className="size-4" />
                <span className="font-medium">Verified</span>
                {clearance.verifiedAt ? (
                  <span className="text-xs text-emerald-800">
                    on {formatClearanceDateTime(clearance.verifiedAt)}
                  </span>
                ) : null}
              </div>
            ) : clearance.status === "actionRequired" ? (
              <div
                data-testid="clearance-rejected-note"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
              >
                <p className="font-medium">Rejected — awaiting a new upload.</p>
                {clearance.rejectionReason ? (
                  <p className="mt-1 text-xs">Reason: {clearance.rejectionReason}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-muted-foreground flex items-center gap-2 text-xs">
                <Clock className="size-3.5" />
                {clearance.status === "expired"
                  ? "This clearance has expired and cannot be reviewed until it is resubmitted."
                  : "No decision is available until the employee submits this clearance."}
              </p>
            )}
          </div>
        </Card>
      </div>

      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeReview()
          }
        }}
      >
        <DialogContent data-testid="clearance-reject-dialog">
          <DialogHeader>
            <DialogTitle>Reject Verification</DialogTitle>
            <DialogDescription>
              The employee sees this reason and must upload a new document.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            data-testid="clearance-reject-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Please specify the reason for rejection…"
            maxLength={2000}
            rows={3}
            disabled={busy || reviewStale}
            autoFocus
          />
          {reviewStale ? (
            <ReviewInvalidationNotice testId="clearance-reject-stale" />
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeReview}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              data-testid="clearance-reject-submit"
              onClick={runReject}
              disabled={
                busy ||
                reviewStale ||
                !canAct ||
                reason.trim().length === 0
              }
            >
              {busy ? "Rejecting…" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ── sub-components ────────────────────────────────────────────────────── */

function EmployeeCard({
  employee,
  clearance,
}: {
  employee: ClearanceEmployee
  clearance: ClearanceRecord
}) {
  const department = employee.department ?? "Clinical Staff"
  const roleLine = employee.department
    ? `${employee.department} Department`
    : "Staff Member"

  return (
    <Card data-testid="clearance-employee-card">
      <CardHeader>
        <CardTitle>Employee Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary flex size-14 shrink-0 items-center justify-center rounded-full text-base font-bold">
            {initialsOf(employee.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{employee.name}</p>
            <p className="text-muted-foreground truncate text-sm">{roleLine}</p>
          </div>
        </div>

        <div className="space-y-3 border-t pt-4">
          <InfoRow label="CLEARANCE TYPE" value={clearance.title} />
          <InfoRow
            label="SUBMITTED"
            value={
              clearance.submittedAt
                ? formatClearanceDateTime(clearance.submittedAt)
                : "N/A"
            }
          />
          <InfoRow label="DEPARTMENT" value={department} />
          {clearance.dueDate ? (
            <InfoRow
              label="DUE"
              value={formatClearanceDateTime(clearance.dueDate)}
            />
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground text-[11px] font-bold tracking-wide">
              STATUS
            </span>
            <StatusBadge status={clearance.status} />
          </div>
        </div>

        {clearance.status === "actionRequired" && clearance.rejectionReason ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
            Rejection reason: {clearance.rejectionReason}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground text-[11px] font-bold tracking-wide">
        {label}
      </span>
      <span className="max-w-[65%] truncate text-right text-sm font-semibold">
        {value}
      </span>
    </div>
  )
}

function StatusBadge({ status }: { status: ClearanceRecord["status"] }) {
  const className =
    status === "verified"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : status === "underReview"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : status === "actionRequired" || status === "expired"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-slate-200 bg-slate-50 text-slate-700"

  return (
    <Badge variant="outline" className={className} data-testid="clearance-status">
      {clearanceStatusLabel(status)}
    </Badge>
  )
}

function HistoryCard({
  history,
}: {
  history: ReturnType<typeof buildClearanceHistory>
}) {
  return (
    <Card data-testid="clearance-history">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-4" />
          History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-muted-foreground text-sm">No activity recorded yet.</p>
        ) : (
          <ol className="space-y-4">
            {history.map((event) => (
              <li key={`${event.title}:${event.timestamp}`} className="flex gap-3">
                <span
                  className={`mt-1.5 size-3 shrink-0 rounded-full ${historyDotClass(event.tone)}`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{event.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {event.timestamp} by {event.author}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

function historyDotClass(tone: "green" | "blue" | "red" | "amber"): string {
  switch (tone) {
    case "green":
      return "bg-emerald-500"
    case "blue":
      return "bg-blue-500"
    case "red":
      return "bg-red-500"
    case "amber":
      return "bg-amber-500"
  }
}

function DocumentPreview({ clearance }: { clearance: ClearanceRecord }) {
  const url = clearance.fileUrl
  if (!url) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-slate-50 p-8 text-center">
        <FileText className="text-muted-foreground size-10 opacity-40" />
        <p className="text-muted-foreground text-sm">
          No document is attached to this clearance yet.
        </p>
      </div>
    )
  }

  const image = isImageUrl(url)
  const fileName = fileNameFromUrl(url)

  return (
    <div className="space-y-4">
      {image ? (
        // Firebase Storage URLs are user-authored and not in the Next image
        // allow-list; a plain img keeps the preview dependency-free.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          data-testid="clearance-file-image"
          src={url}
          alt={fileName}
          className="max-h-[420px] w-full rounded-xl border object-contain"
        />
      ) : (
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl border bg-slate-50 p-8 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-white shadow-sm">
            <FileText className="size-8 text-slate-400" />
          </span>
          <p className="text-sm font-bold">{fileName}</p>
          <p className="text-muted-foreground text-xs">
            Uploaded document · open or download to review the evidence.
          </p>
        </div>
      )}
    </div>
  )
}

function ReviewInvalidationNotice({
  testId = "clearance-review-stale",
  onClose,
}: {
  testId?: string
  onClose?: () => void
}) {
  return (
    <div
      role="alert"
      data-testid={testId}
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
    >
      <p className="min-w-0">
        This submission changed after you opened this decision. Close it and
        reopen it against the latest submission before acting.
      </p>
      {onClose ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          className="shrink-0"
        >
          Close review
        </Button>
      ) : null}
    </div>
  )
}

function StatePanel({
  title,
  body,
  loading = false,
  retry,
  testId,
}: {
  title: string
  body: string
  loading?: boolean
  retry?: () => void
  testId?: string
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        {loading ? (
          <RefreshCw className="text-muted-foreground size-7 animate-spin" />
        ) : (
          <AlertTriangle className="size-7 text-amber-600" />
        )}
        <p className="font-semibold">{title}</p>
        <p className="text-muted-foreground max-w-md text-sm">{body}</p>
        {retry ? (
          <Button type="button" variant="outline" size="sm" onClick={retry}>
            <RefreshCw className="mr-1.5 size-3.5" />
            Retry
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

function DetailErrorBanner({
  detail,
  retained,
}: {
  detail: {
    error: Error | null
    retry: () => void
  }
  retained: boolean
}) {
  const isIndexError = isIndexCompatibilityError(detail.error)
  const code = (detail.error as { code?: unknown } | null)?.code

  return (
    <div
      role="alert"
      data-testid="clearance-detail-error"
      className="border-destructive/30 bg-destructive/10 text-destructive flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm"
    >
      <div className="min-w-0">
        <p className="font-medium">
          {isIndexError
            ? "Missing query index."
            : retained
              ? "This clearance could not be updated — the record below is stale."
              : "This clearance could not be streamed."}
          {code ? ` (${String(code)})` : ""}
        </p>
        <p className="text-destructive/80 mt-0.5 text-xs">
          Press Retry to resubscribe. No decision is written on stale data.
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={detail.retry}
        className="shrink-0"
      >
        <RefreshCw className="mr-1.5 size-3.5" />
        Retry
      </Button>
    </div>
  )
}
