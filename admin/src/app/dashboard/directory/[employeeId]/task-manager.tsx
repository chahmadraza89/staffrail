"use client"

import { useCallback, useMemo, useState, useSyncExternalStore } from "react"
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock4,
  Download,
  FileText,
  Hourglass,
  ImageIcon,
  Link2,
  Loader2,
  PenLine,
  User,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  subtaskKey,
  taskStatusText,
  type ComplianceCategory,
  type DetailSubTask,
} from "@/lib/admin/compliance-helpers"
import {
  MODULE_LABELS,
  moduleForSource,
  type EmployeeTaskDoc,
} from "@/lib/admin/employee-detail-streams"
import { EmployeeActionError } from "@/lib/admin/employee-actions"
import { getLegalContent } from "@/lib/admin/legal-content"
import {
  acceptTask,
  rejectTask,
  skipTask,
  updateBlankFormLink,
} from "@/lib/admin/task-actions"
import {
  BLANK_FORM_TASK_IDS,
  DEFAULT_BLANK_FORM_LINKS,
  canAcceptTask,
  canRejectTask,
  fileNameFromUrl,
  formatFormLabel,
  formatFormValue,
  formatSignature,
  formatTimelineDate,
  isDownloadAvailable,
  isImageUrl,
  isSubmittedStatus,
  isVerifiedStatus,
  statusTone,
} from "@/lib/admin/task-format"

import {
  AdminAcknowledgeFormView,
  AnnualTrainingFormView,
  InitialTrainingFormView,
  type TaskFormModel,
} from "./admin-form-views"

/**
 * Task manager / review panel — port of
 * lib/features/admin/admin_directory/presentation/task_panel_tile_data.dart
 * (TaskDetailPanel + TaskTile) and the split-screen TaskManagerSection.
 *
 * Layout: the Flutter WEB reference is a two-pane manager (checklist left,
 * detail right). We keep that on >= 1280px and open the same panel in a
 * dialog on narrower viewports.
 *
 * Safety corrections (documented in admin/README.md):
 *  - Actions are DISABLED while the task's owning module holds stale data
 *    (failed after a successful read). Approving from a snapshot that may be
 *    minutes old can double-review an already-decided task, so writes wait
 *    for a live read. The panel explains why instead of failing silently.
 *  - The admin upload control is not ported yet (Phase 5 owns uploads), and
 *    the audit-PDF button is replaced by direct links to uploaded files.
 *  - Split-field tasks keep the Flutter behaviour of hiding approve/reject
 *    here (their review path is the counter-signature form), but show a
 *    read-only employee + administrative submission summary so the reviewer
 *    can still inspect exactly what was submitted.
 */

const WIDE_QUERY = "(min-width: 1280px)"

function subscribeWide(callback: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {}
  }
  const query = window.matchMedia(WIDE_QUERY)
  query.addEventListener("change", callback)
  return () => query.removeEventListener("change", callback)
}

function wideSnapshot(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(WIDE_QUERY).matches
  )
}

function wideServerSnapshot(): boolean {
  return false
}

export function useIsWide(): boolean {
  return useSyncExternalStore(subscribeWide, wideSnapshot, wideServerSnapshot)
}

export interface TaskManagerSectionProps {
  categories: ComplianceCategory[]
  progressStats: { completed: number; remaining: number }
  staleCategory: (category: ComplianceCategory) => boolean
  employeeId: string
  employeeName: string
  /** Signed-in admin uid from the established session context. */
  adminUid: string
  /** Owner recorded on the employee profile (ownership-change detection). */
  employeeAdminId: string | null
  /** False for deactivated employees — review writes are blocked. */
  employeeActive: boolean
  /** Live onboarding docs (raw form data) for the selected row. */
  onboardingTasks: EmployeeTaskDoc[]
  /** True only while the owning module's read is live (not stale/pending). */
  actionsEnabled: Record<"onboarding" | "training" | "clearance", boolean>
}

export function TaskManagerSection({
  categories,
  progressStats,
  staleCategory,
  employeeId,
  employeeName,
  adminUid,
  employeeAdminId,
  employeeActive,
  onboardingTasks,
  actionsEnabled,
}: TaskManagerSectionProps) {
  const isWide = useIsWide()
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const allTasks = useMemo(() => categories.flatMap((category) => category.tasks), [categories])
  // DERIVED selection: a module failure can drop the selected row; the panel
  // then closes (desktop placeholder / dialog disappears) without effects.
  const selected = allTasks.find((task) => subtaskKey(task) === selectedKey) ?? null
  const onboardingById = useMemo(
    () => new Map(onboardingTasks.map((task) => [task.id, task])),
    [onboardingTasks],
  )
  const selectedDoc =
    selected && selected.taskSource === "onboarding"
      ? onboardingById.get(selected.id) ?? null
      : null

  const clearSelection = useCallback(() => setSelectedKey(null), [])

  const panel = selected ? (
    <TaskDetailPanel
      key={subtaskKey(selected)}
      task={selected}
      employeeId={employeeId}
      employeeName={employeeName}
      adminUid={adminUid}
      employeeAdminId={employeeAdminId}
      employeeActive={employeeActive}
      taskDoc={selectedDoc}
      actionsEnabled={actionsEnabled[selected.taskSource]}
      onClose={clearSelection}
    />
  ) : (
    <TaskDetailPlaceholder />
  )

  return (
    <section data-testid="task-manager" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Compliance Categories</h2>
        <p className="text-muted-foreground text-xs">
          Select a requirement to review its submission and status.
        </p>
      </div>

      <TaskProgressBanner stats={progressStats} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] xl:items-start">
        <div className="space-y-4">
          {categories
            .filter((category) => category.tasks.length > 0)
            .map((category) => (
              <CategoryBlock
                key={category.id}
                category={category}
                stale={staleCategory(category)}
                selectedKey={selectedKey}
                onSelect={setSelectedKey}
              />
            ))}
        </div>

        {isWide ? (
          <div className="xl:sticky xl:top-6">{panel}</div>
        ) : null}
      </div>

      {!isWide && selected ? (
        <Dialog open onOpenChange={(open) => (open ? undefined : clearSelection())}>
          <DialogContent
            data-testid="task-detail-dialog"
            showCloseButton={false}
            className="max-h-[90vh] w-[calc(100%-1rem)] overflow-hidden p-0 sm:max-w-3xl"
          >
            {panel}
          </DialogContent>
        </Dialog>
      ) : null}
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

function CategoryBlock({
  category,
  stale,
  selectedKey,
  onSelect,
}: {
  category: ComplianceCategory
  stale: boolean
  selectedKey: string | null
  onSelect: (key: string) => void
}) {
  return (
    <div
      data-testid={`category-${category.id}`}
      className="bg-card rounded-xl border shadow-sm"
    >
      <div className="space-y-2 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">
            {category.title}
            {stale ? (
              <span
                data-testid={`category-${category.id}-stale`}
                className="ml-2 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 align-middle text-xs font-medium text-amber-700"
              >
                Stale
              </span>
            ) : null}
          </h3>
          <span className="text-muted-foreground text-xs">{category.subtitle}</span>
        </div>
        <ul className="space-y-1">
          {category.tasks.map((task) => {
            const key = subtaskKey(task)
            return (
              <TaskTile
                key={key}
                task={task}
                selected={key === selectedKey}
                onSelect={onSelect}
              />
            )
          })}
        </ul>
      </div>
    </div>
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

function TaskTile({
  task,
  selected,
  onSelect,
}: {
  task: DetailSubTask
  selected: boolean
  onSelect: (key: string) => void
}) {
  const key = subtaskKey(task)
  const done = task.isCompleted
  const toneKey = done ? "green" : toneForStatus(task.status)
  return (
    <li>
      <button
        type="button"
        data-testid="task-tile"
        data-task-key={key}
        aria-pressed={selected}
        onClick={() => onSelect(key)}
        className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors ${
          selected ? "bg-muted ring-1 ring-border" : "hover:bg-muted/40"
        }`}
      >
        <span
          aria-hidden
          className={`flex size-7 shrink-0 items-center justify-center rounded-md ${TILE_TONES[toneKey]}`}
        >
          {task.status === "noActionRequired" ? (
            <X className="size-3.5" />
          ) : (
            <Clock4 className="size-3.5" />
          )}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{task.title}</span>
        <span className="text-muted-foreground hidden max-w-48 truncate text-xs sm:block">
          {task.subtitle}
        </span>
        <span
          className={
            "w-32 shrink-0 text-right text-xs font-medium " +
            (done ? "text-emerald-600" : "text-amber-600")
          }
        >
          {taskStatusText(task.status)}
        </span>
        <span aria-hidden className="shrink-0">
          {done ? (
            <CheckCircle2 className="size-4 text-emerald-600" />
          ) : (
            <Hourglass className="size-4 text-amber-500" />
          )}
        </span>
        <ChevronRight
          aria-hidden
          className={`size-4 shrink-0 ${selected ? "text-foreground" : "text-muted-foreground/60"}`}
        />
      </button>
    </li>
  )
}

/** Same labels as the Directory detail checklist (Dart `taskStatusText`). */
function TaskDetailPlaceholder() {
  return (
    <div
      data-testid="task-detail-placeholder"
      className="text-muted-foreground flex min-h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-8 text-center text-sm"
    >
      <FileText aria-hidden className="size-6" />
      Select a requirement to review it.
    </div>
  )
}

// ── Detail panel ────────────────────────────────────────────────────────────

const BADGE_TONES: Record<string, string> = {
  slate: "bg-slate-500 text-white",
  blue: "bg-sky-500 text-white",
  green: "bg-emerald-500 text-white",
  orange: "bg-amber-500 text-white",
  red: "bg-red-500 text-white",
}

export interface TaskDetailPanelProps {
  task: DetailSubTask
  employeeId: string
  employeeName: string
  adminUid: string
  /** Owner recorded on the live employee profile. */
  employeeAdminId: string | null
  employeeActive: boolean
  taskDoc: EmployeeTaskDoc | null
  actionsEnabled: boolean
  onClose?: () => void
}

type ReviewDialog = "verify" | "reject" | "skip"

/**
 * Everything a confirmation depends on. The dialog stores the snapshot taken
 * when it opened; any change (a replacement upload, another admin's decision,
 * module failure, ownership/activation change, or a different task) makes the
 * open confirmation invalid and disables its action.
 */
interface ReviewSnapshot {
  taskKey: string
  revision: string | null
  status: DetailSubTask["status"]
  actionsEnabled: boolean
  employeeActive: boolean
  adminUid: string
  employeeAdminId: string | null
  employeeId: string
}

function sameReviewSnapshot(a: ReviewSnapshot, b: ReviewSnapshot): boolean {
  return (
    a.taskKey === b.taskKey &&
    a.revision === b.revision &&
    a.status === b.status &&
    a.actionsEnabled === b.actionsEnabled &&
    a.employeeActive === b.employeeActive &&
    a.adminUid === b.adminUid &&
    a.employeeAdminId === b.employeeAdminId &&
    a.employeeId === b.employeeId
  )
}

export function TaskDetailPanel({
  task,
  employeeId,
  employeeName,
  adminUid,
  employeeAdminId,
  employeeActive,
  taskDoc,
  actionsEnabled,
  onClose,
}: TaskDetailPanelProps) {
  const [busy, setBusy] = useState<"accept" | "reject" | "skip" | "link" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [dialog, setDialog] = useState<ReviewDialog | null>(null)
  const [reviewed, setReviewed] = useState<ReviewSnapshot | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [linkDraft, setLinkDraft] = useState<string | null>(null)
  /**
   * Revision captured when blank-link editing began. If the document changes
   * while the admin types, the save conflicts instead of applying the link to
   * a submission the admin never saw.
   */
  const [linkBaseRevision, setLinkBaseRevision] = useState<{
    revision: string | null
  } | null>(null)
  /** Stored link wins over the Dart default (the doc is the source of truth). */
  const storedLink = taskDoc?.blankFormLink ?? defaultLinkFor(task.id)

  const isOnboarding = task.taskSource === "onboarding"
  const isSplitField = task.actionType === "splitField"
  const canAccept = canAcceptTask(task.status)
  const canReject = canRejectTask(task.status)
  const ownershipValid = employeeAdminId !== null && employeeAdminId === adminUid
  const blocked = !actionsEnabled || !employeeActive || !ownershipValid || busy !== null
  const skipped = task.status === "noActionRequired"
  const revision =
    task.taskSource === "onboarding" ? (taskDoc?.revision ?? null) : task.revision

  const snapshotNow = (): ReviewSnapshot => ({
    taskKey: subtaskKey(task),
    revision,
    status: task.status,
    actionsEnabled,
    employeeActive,
    adminUid,
    employeeAdminId,
    employeeId,
  })
  const currentReview = snapshotNow()
  const reviewStale =
    dialog !== null && reviewed !== null && !sameReviewSnapshot(reviewed, currentReview)

  const openReview = (kind: ReviewDialog) => {
    setError(null)
    setReviewed(snapshotNow())
    setDialog(kind)
  }
  const closeReview = () => {
    setDialog(null)
    setReviewed(null)
  }
  /**
   * Re-checks EVERYTHING at the moment the action runs. This is deliberately
   * duplicated with the button's disabled state: a confirmation opened while
   * live must not execute after the module/task/ownership state changed.
   */
  const currentReviewFor = (kind: ReviewDialog): ReviewSnapshot | null => {
    if (busy !== null) {
      setError("Another review action is still running. Wait for it to finish.")
      return null
    }
    if (!actionsEnabled) {
      setError(
        "This task's live data could not be refreshed. Review actions are disabled until the stream reconnects.",
      )
      return null
    }
    if (!ownershipValid) {
      setError(
        "Ownership of this employee changed. Refresh the page before reviewing requirements.",
      )
      return null
    }
    if (!employeeActive) {
      setError(
        "This employee is inactive. Reactivate the employee before reviewing requirements.",
      )
      return null
    }
    if (reviewed === null || !sameReviewSnapshot(reviewed, snapshotNow())) {
      setError(
        "This submission changed since you opened the confirmation. Review the latest version before acting.",
      )
      return null
    }
    if (dialog !== kind) {
      setError("This confirmation is no longer open. Reopen it to review the latest submission.")
      return null
    }
    return reviewed
  }

  const formData = taskDoc?.formData ?? null
  const adminFormData = taskDoc?.adminFormData ?? null

  const taskForm: TaskFormModel = {
    id: task.id,
    title: task.title,
    status: task.status,
    employeeName,
    formData,
    adminFormData,
    signatureUrl: taskDoc?.signatureUrl ?? null,
    adminSignatureUrl: taskDoc?.adminSignatureUrl ?? null,
    fileUrl: task.fileUrl,
    signedAt: taskDoc?.signedAt ?? null,
    updatedAt: task.updatedAt,
  }

  const fail = (caught: unknown, fallback: string) => {
    setError(caught instanceof EmployeeActionError ? caught.message : fallback)
  }

  const handleAccept = async () => {
    const review = currentReviewFor("verify")
    if (review === null) {
      return
    }
    if (!canAcceptTask(review.status)) {
      setError("This requirement can no longer be verified. Refresh and review its current status.")
      return
    }
    setBusy("accept")
    setError(null)
    setNotice(null)
    try {
      await acceptTask({
        employeeId,
        taskId: task.id,
        taskSource: task.taskSource,
        adminUid: review.adminUid,
        expectedRevision: review.revision,
        employeeName,
      })
      closeReview()
      setNotice("Task verified and approved.")
    } catch (caught) {
      fail(caught, "Failed to verify task.")
    } finally {
      setBusy(null)
    }
  }

  const handleReject = async () => {
    const reason = rejectReason.trim()
    if (reason.length === 0) {
      return
    }
    const review = currentReviewFor("reject")
    if (review === null) {
      return
    }
    if (!canRejectTask(review.status)) {
      setError("This requirement can no longer be rejected. Refresh and review its current status.")
      return
    }
    setBusy("reject")
    setError(null)
    setNotice(null)
    try {
      await rejectTask({
        employeeId,
        taskId: task.id,
        taskSource: task.taskSource,
        adminUid: review.adminUid,
        expectedRevision: review.revision,
        employeeName,
        reason,
      })
      closeReview()
      setRejectReason("")
      setNotice("Task rejected. The employee will see the reason.")
    } catch (caught) {
      fail(caught, "Failed to reject task.")
    } finally {
      setBusy(null)
    }
  }

  const handleSkip = async () => {
    const review = currentReviewFor("skip")
    if (review === null) {
      return
    }
    const skip = review.status !== "noActionRequired"
    setBusy("skip")
    setError(null)
    setNotice(null)
    try {
      await skipTask({
        employeeId,
        taskId: task.id,
        taskSource: task.taskSource,
        adminUid: review.adminUid,
        expectedRevision: review.revision,
        employeeName,
        skip,
      })
      closeReview()
      setNotice(skip ? "Requirement skipped." : "Requirement marked required again.")
    } catch (caught) {
      fail(caught, "Failed to update task.")
    } finally {
      setBusy(null)
    }
  }

  const handleSaveLink = async () => {
    if (busy !== null) {
      return
    }
    if (!actionsEnabled || !employeeActive) {
      setError(
        employeeActive
          ? "This task's live data could not be refreshed. Saving is disabled until the stream reconnects."
          : "This employee is inactive. Reactivate the employee before editing requirements.",
      )
      return
    }
    const draft = (linkDraft ?? storedLink).trim()
    if (!/^https?:\/\/\S+$/i.test(draft)) {
      setError("Enter a valid http(s) URL.")
      return
    }
    setBusy("link")
    setError(null)
    setNotice(null)
    try {
      await updateBlankFormLink({
        employeeId,
        taskId: task.id,
        taskSource: task.taskSource,
        adminUid,
        expectedRevision: (linkBaseRevision ?? { revision }).revision,
        newLink: draft,
      })
      setLinkDraft(draft)
      setLinkBaseRevision(null)
      setNotice("Blank form link updated.")
    } catch (caught) {
      fail(caught, "Failed to save blank form link.")
    } finally {
      setBusy(null)
    }
  }

  const showRawFormData =
    isOnboarding &&
    formData !== null &&
    Object.keys(formData).length > 0 &&
    task.actionType !== "splitField" &&
    task.actionType !== "acknowledgeSign" &&
    task.actionType !== "fillAndSign"

  const adminEntries = Object.entries(adminFormData ?? {}).filter(
    ([key]) => key !== "adminSignatureData" && key !== "verificationDate",
  )
  const hasAdminReview =
    Boolean(taskDoc?.rejectionReason) ||
    Boolean(taskDoc?.adminSignatureUrl) ||
    adminEntries.length > 0

  const showBlankLink =
    isOnboarding && (BLANK_FORM_TASK_IDS as readonly string[]).includes(task.id)
  const linkValue = linkDraft ?? storedLink
  const attachments = task.fileUrls
  const primaryFile = attachments[0] ?? null
  const downloadAvailable = isDownloadAvailable({
    actionType: task.actionType,
    fileUrl: primaryFile,
    status: task.status,
  })

  return (
    <article className="bg-card flex max-h-[90vh] flex-col overflow-hidden rounded-xl border shadow-sm xl:max-h-[calc(100vh-3rem)]">
      <header className="flex items-start gap-3 border-b px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold tracking-tight">{task.title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              data-testid="task-status-badge"
              className={`rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase ${
                BADGE_TONES[statusTone(task.status)]
              }`}
            >
              {task.status}
            </span>
            <span className="text-muted-foreground text-xs">
              {MODULE_LABELS[moduleForSource(task.taskSource)]}
            </span>
          </div>
        </div>
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close task review"
            data-testid="task-close"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {!actionsEnabled ? (
          <p
            role="status"
            data-testid="task-actions-unavailable"
            className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700"
          >
            <AlertCircle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            This task&rsquo;s live data could not be refreshed (stale snapshot). Review actions are
            disabled until the stream reconnects and the current status is known.
          </p>
        ) : null}
        {!employeeActive ? (
          <p
            role="status"
            data-testid="task-actions-inactive"
            className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
          >
            <AlertCircle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            This employee is inactive. Review actions are disabled until the employee is
            reactivated.
          </p>
        ) : null}
        {!ownershipValid ? (
          <p
            role="status"
            data-testid="task-actions-not-owner"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            <AlertCircle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            Ownership of this employee changed. Refresh the page; review actions stay disabled.
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            data-testid="task-action-error"
            className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm"
          >
            {error}
          </p>
        ) : null}
        {notice ? (
          <p
            role="status"
            data-testid="task-action-success"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
          >
            {notice}
          </p>
        ) : null}

        {attachments.length > 0 ? (
          <div className="space-y-2">
            {attachments.map((url, index) => (
              <FilePreview key={`${url}-${index}`} url={url} index={index} total={attachments.length} />
            ))}
          </div>
        ) : null}
        {taskDoc?.signatureUrl ? <SignaturePreview signature={taskDoc.signatureUrl} /> : null}

        {isOnboarding ? (
          <div
            data-testid="task-skip-card"
            className={`flex items-center gap-3 rounded-xl border p-4 ${
              skipped ? "bg-slate-50" : "bg-card"
            }`}
          >
            <span
              aria-hidden
              className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                skipped ? "bg-slate-100 text-slate-500" : "bg-blue-50 text-blue-500"
              }`}
            >
              <Hourglass className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Skip Form (Admin Option)</p>
              <p className="text-muted-foreground text-[11px]">
                {skipped
                  ? 'Marked as "No Action Required".'
                  : "Exclude this form from onboarding requirements."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={skipped}
              aria-label="Skip requirement"
              data-testid="task-skip-switch"
              disabled={blocked}
              onClick={() => openReview("skip")}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                skipped ? "bg-[#109B85]" : "bg-slate-300"
              }`}
            >
              <span
                aria-hidden
                className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
                  skipped ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        ) : null}

        {showBlankLink ? (
          <div
            data-testid="task-blank-link-card"
            className="bg-card rounded-xl border p-4"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-500"
              >
                <Link2 className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold">Blank Form URL (Admin Config)</p>
                <p className="text-muted-foreground text-[11px]">
                  Provide the Adobe/USCIS/IRS blank document link.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="url"
                aria-label="Blank form URL"
                data-testid="blank-form-link-input"
                value={linkValue}
                disabled={blocked}
                onChange={(event) => {
                  // Capture the revision the admin started editing; a live
                  // change during typing makes the save conflict.
                  setLinkBaseRevision((current) => current ?? { revision })
                  setLinkDraft(event.target.value)
                }}
                placeholder="https://..."
                className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13px] text-slate-800 outline-none focus-visible:border-slate-400 disabled:opacity-60"
              />
              <Button
                type="button"
                data-testid="blank-form-link-save"
                onClick={() => void handleSaveLink()}
                disabled={blocked || linkValue.trim().length === 0}
                className="h-9 rounded-lg bg-[#109B85] px-4 text-white hover:bg-[#0d8270]"
              >
                {busy === "link" ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </div>
        ) : null}

        {downloadAvailable && primaryFile ? (
          <a
            data-testid="task-download"
            href={primaryFile}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-[13px] font-bold text-emerald-600 hover:bg-emerald-100"
          >
            {task.actionType === "upload" ? (
              <Download className="size-4" />
            ) : (
              <FileText className="size-4" />
            )}
            {task.actionType === "upload"
              ? attachments.length > 1
                ? "Download First Attachment"
                : "Download Original"
              : "Open Submitted Document"}
          </a>
        ) : null}

        {isOnboarding && task.actionType !== "upload" ? (
          <div data-testid="task-form-view" className="border-t pt-5">
            <FormView task={taskForm} isSplitField={isSplitField} />
          </div>
        ) : null}

        <section>
          <h3 className="text-[15px] font-bold text-slate-800">Description</h3>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            {task.subtitle.length > 0
              ? task.subtitle
              : "Complete and submit all required documents for the new employee onboarding process."}
          </p>
        </section>

        <div className="h-px bg-slate-100" />

        <section>
          <h3 className="text-[15px] font-bold text-slate-800">Submitted Materials</h3>
          <p className="text-muted-foreground mt-2 text-[13px]">
            {attachments.length === 0 &&
            taskDoc?.signatureUrl == null &&
            (formData === null || Object.keys(formData).length === 0)
              ? "No submission data yet."
              : "Submission materials are shown in the preview section above."}
          </p>
        </section>

        {showRawFormData ? (
          <section data-testid="task-form-data">
            <h3 className="text-[15px] font-bold text-slate-800">Form Data</h3>
            <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              {Object.entries(formData ?? {}).map(([key, value]) => (
                <div key={key} className="flex items-start gap-2 text-[13px]">
                  <span className="text-muted-foreground shrink-0 font-semibold">{key}:</span>
                  <span className="min-w-0 break-words text-slate-800">
                    {formatFormValue(value)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {hasAdminReview ? (
          <section data-testid="task-admin-review">
            <h3 className="text-[15px] font-bold text-slate-800">Administrative Review</h3>
            {taskDoc?.rejectionReason ? (
              <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                Rejected: {taskDoc.rejectionReason}
              </p>
            ) : null}
            {adminEntries.length > 0 ? (
              <dl className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                {adminEntries.map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2 text-[13px]">
                    <dt className="text-muted-foreground shrink-0 font-semibold">
                      {formatFormLabel(key)}:
                    </dt>
                    <dd className="min-w-0 break-words text-slate-800">
                      {formatFormValue(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {taskDoc?.adminSignatureUrl ? (
              <p className="text-muted-foreground mt-2 text-xs">
                Administrator signature:{" "}
                <span className="font-serif text-base italic text-slate-800">
                  {formatSignature(taskDoc.adminSignatureUrl).text}
                </span>
              </p>
            ) : null}
            {typeof adminFormData?.verificationDate === "string" ? (
              <p className="text-muted-foreground mt-1 text-xs">
                Verified on {adminFormData.verificationDate}
              </p>
            ) : null}
          </section>
        ) : null}

        <section data-testid="task-timeline">
          <h3 className="text-[15px] font-bold text-slate-800">Activity Timeline</h3>
          <div className="mt-5">
            <ActivityTimeline task={task} />
          </div>
        </section>

        {!isSplitField ? (
          <div data-testid="task-actions" className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button
              type="button"
              data-testid="task-verify"
              onClick={() => openReview("verify")}
              disabled={!canAccept || blocked}
              className="h-11 flex-[2] rounded-xl bg-emerald-500 text-base font-extrabold text-white hover:bg-emerald-600"
            >
              {busy === "accept" ? (
                <Loader2 className="mr-2 size-5 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 size-5" />
              )}
              Verify &amp; Approve
            </Button>
            <Button
              type="button"
              variant="outline"
              data-testid="task-reject"
              onClick={() => openReview("reject")}
              disabled={!canReject || blocked}
              className="h-11 flex-1 rounded-xl border-red-500 text-base font-extrabold text-red-500 hover:bg-red-50"
            >
              Reject
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            Dual-signature forms are completed with the counter-signature form; approve/reject are
            intentionally not offered here (Flutter parity).
          </p>
        )}

        <div className="h-2" />
      </div>

      <Dialog
        open={dialog === "verify"}
        onOpenChange={(open) => {
          if (!open) {
            closeReview()
          }
        }}
      >
        <DialogContent data-testid="verify-dialog" className="sm:max-w-md">
          <h3 className="text-lg font-black text-slate-900">Verify Task?</h3>
          <p className="text-sm leading-relaxed text-slate-600">
            Are you sure you want to mark &ldquo;{task.title}&rdquo; as verified? This will complete
            the task for the employee.
          </p>
          {reviewStale ? (
            <p
              role="alert"
              data-testid="verify-stale-note"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700"
            >
              This submission changed since you opened this confirmation. Close it and review the
              latest version before acting.
            </p>
          ) : null}
          {error && dialog === "verify" ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeReview} disabled={busy === "accept"}>
              Cancel
            </Button>
            <Button
              type="button"
              data-testid="confirm-verify"
              onClick={() => void handleAccept()}
              disabled={
                busy !== null ||
                reviewStale ||
                !actionsEnabled ||
                !employeeActive ||
                !ownershipValid ||
                !canAccept
              }
              className="bg-emerald-500 text-white hover:bg-emerald-600"
            >
              {busy === "accept" ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              Verify
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === "reject"}
        onOpenChange={(open) => {
          if (!open) {
            closeReview()
          }
        }}
      >
        <DialogContent data-testid="reject-dialog" className="sm:max-w-md">
          <h3 className="text-lg font-black text-slate-900">Reject Task</h3>
          <p className="text-sm leading-relaxed text-slate-600">
            Please provide a reason for rejecting this task. The employee will see this feedback.
          </p>
          <Textarea
            data-testid="reject-reason"
            aria-label="Rejection reason"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Enter rejection reason..."
            rows={3}
            disabled={busy !== null}
            className="bg-slate-50"
          />
          {reviewStale ? (
            <p
              role="alert"
              data-testid="reject-stale-note"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700"
            >
              This submission changed since you opened this confirmation. Close it and review the
              latest version before acting.
            </p>
          ) : null}
          {error && dialog === "reject" ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeReview} disabled={busy === "reject"}>
              Cancel
            </Button>
            <Button
              type="button"
              data-testid="confirm-reject"
              onClick={() => void handleReject()}
              disabled={
                rejectReason.trim().length === 0 ||
                busy !== null ||
                reviewStale ||
                !actionsEnabled ||
                !employeeActive ||
                !ownershipValid ||
                !canReject
              }
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {busy === "reject" ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              Reject Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === "skip"}
        onOpenChange={(open) => {
          if (!open) {
            closeReview()
          }
        }}
      >
        <DialogContent data-testid="skip-dialog" className="sm:max-w-md">
          <h3 className="text-lg font-black text-slate-900">
            {skipped ? "Unskip Form?" : "Skip Form?"}
          </h3>
          <p className="text-sm leading-relaxed text-slate-600">
            {skipped
              ? `Are you sure you want to make "${task.title}" required again? The employee will need to complete it.`
              : `Are you sure you want to skip "${task.title}"? The employee will be allowed to skip it, and it will be excluded from progress calculations.`}
          </p>
          {reviewStale ? (
            <p
              role="alert"
              data-testid="skip-stale-note"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700"
            >
              This requirement changed since you opened this confirmation. Close it and review the
              latest version before acting.
            </p>
          ) : null}
          {error && dialog === "skip" ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeReview} disabled={busy === "skip"}>
              Cancel
            </Button>
            <Button
              type="button"
              data-testid="confirm-skip"
              onClick={() => void handleSkip()}
              disabled={
                busy !== null ||
                reviewStale ||
                !actionsEnabled ||
                !employeeActive ||
                !ownershipValid
              }
              className={skipped ? "bg-slate-600 text-white" : "bg-[#109B85] text-white"}
            >
              {busy === "skip" ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              {skipped ? "Make Required" : "Skip"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  )
}

function defaultLinkFor(taskId: string): string {
  return DEFAULT_BLANK_FORM_LINKS[taskId] ?? ""
}

function FilePreview({
  url,
  index,
  total,
}: {
  url: string
  index: number
  total: number
}) {
  const image = isImageUrl(url)
  const fileName = fileNameFromUrl(url)
  return (
    <div
      data-testid="task-file-preview"
      data-file-url={url}
      data-attachment-index={index}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
    >
      {image ? (
        // Firebase Storage download URLs are user-authored and not in the
        // Next image allow-list; a plain img keeps the preview dependency-free.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          data-testid="task-file-image"
          src={url}
          alt={fileName}
          className="max-h-64 w-full object-cover"
        />
      ) : null}
      <div className="flex items-center gap-3 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#109B85]">
          {image ? <ImageIcon className="size-5" /> : <FileText className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">
            {total > 1 ? `${index + 1}. ${fileName}` : fileName}
          </p>
          <p className="text-muted-foreground text-[11px]">
            {image ? "Image Attachment" : "Document File"}
            {total > 1 ? ` · ${index + 1} of ${total}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <a
            data-testid="task-file-open"
            data-file-url={url}
            data-attachment-index={index}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-sky-700 hover:underline"
          >
            Open
          </a>
          <a
            data-testid="task-file-download"
            data-file-url={url}
            data-attachment-index={index}
            href={url}
            download={fileName}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            Download
          </a>
        </div>
      </div>
    </div>
  )
}

function SignaturePreview({ signature }: { signature: string }) {
  const display = formatSignature(signature)
  return (
    <div
      data-testid="task-signature-preview"
      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#109B85]">
        <PenLine className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="font-serif text-2xl font-bold italic text-slate-900">{display.text}</p>
        <p className="text-muted-foreground text-[11px]">Employee Signature</p>
      </div>
    </div>
  )
}

function ActivityTimeline({ task }: { task: DetailSubTask }) {
  const submitted = isSubmittedStatus(task.status)
  const verified = isVerifiedStatus(task.status)
  return (
    <div className="flex items-start">
      <TimelineStep
        title="Assigned"
        date={formatTimelineDate(task.updatedAt)}
        active
        avatar={false}
      />
      <div
        aria-hidden
        className={`mt-4 h-0.5 flex-1 ${submitted ? "bg-emerald-500" : "bg-slate-300"}`}
      />
      <TimelineStep
        title="Submitted"
        date={submitted ? formatTimelineDate(task.updatedAt) : "Pending"}
        active={submitted}
        avatar
      />
      <div
        aria-hidden
        className={`mt-4 h-0.5 flex-1 ${verified ? "bg-emerald-500" : "bg-slate-300"}`}
      />
      <TimelineStep
        title="Verified"
        date={verified ? formatTimelineDate(task.completedAt) : "Pending"}
        active={verified}
        avatar={false}
      />
    </div>
  )
}

function TimelineStep({
  title,
  date,
  active,
  avatar,
}: {
  title: string
  date: string
  active: boolean
  avatar: boolean
}) {
  return (
    <div className="flex w-16 shrink-0 flex-col items-center text-center">
      <span
        aria-hidden
        className={`flex size-8 items-center justify-center rounded-full border-2 ${
          active
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-slate-300 bg-white text-slate-300"
        }`}
      >
        {avatar ? (
          <User className="size-4" />
        ) : active ? (
          <CheckCircle2 className="size-4" />
        ) : (
          <span className="size-2 rounded-full bg-current" />
        )}
      </span>
      <span
        className={`mt-2 text-[11px] font-bold ${active ? "text-slate-900" : "text-slate-400"}`}
      >
        {title}
      </span>
      <span className={`text-[10px] ${active ? "text-slate-500" : "text-slate-300"}`}>
        {date}
      </span>
    </div>
  )
}

// ── Form dispatch (TaskDetailPanel's split-field branch) ───────────────────

function FormView({ task, isSplitField }: { task: TaskFormModel; isSplitField: boolean }) {
  const legalContent = getLegalContent(task.id)
  if (!isSplitField) {
    return <AdminAcknowledgeFormView task={task} legalContent={legalContent} />
  }

  const idLower = task.id.toLowerCase()
  const titleLower = task.title.toLowerCase()
  const completed = task.status === "completed" || task.status === "verified"

  if (idLower.includes("annualtraining") || titleLower.includes("annual training")) {
    return <AnnualTrainingFormView task={task} />
  }
  if (idLower.includes("initialtraining") || titleLower.includes("initial training")) {
    return <InitialTrainingFormView task={task} />
  }
  if (
    (idLower.includes("cultural_competency") ||
      (idLower.includes("driver") && !idLower.includes("license"))) &&
    completed
  ) {
    return <AdminAcknowledgeFormView task={task} legalContent={legalContent} />
  }
  return <SplitFieldSummaryView task={task} legalContent={legalContent} />
}

function SplitFieldSummaryView({
  task,
  legalContent,
}: {
  task: TaskFormModel
  legalContent: string | null
}) {
  const employeeEntries = Object.entries(task.formData ?? {}).filter(
    ([key]) =>
      key !== "signatureData" &&
      key !== "witnessSignature" &&
      key !== "signedDate" &&
      !key.startsWith("admin"),
  )
  const adminEntries = Object.entries(task.adminFormData ?? {}).filter(
    ([key]) => key !== "adminSignatureData" && key !== "verificationDate",
  )
  const employeeSignature = formatSignature(
    task.signatureUrl ??
      (typeof task.formData?.signatureData === "string"
        ? task.formData.signatureData
        : null),
  )
  const hasAnyData =
    employeeEntries.length > 0 ||
    adminEntries.length > 0 ||
    task.signatureUrl !== null ||
    task.adminSignatureUrl !== null

  return (
    <div data-testid="split-field-summary" className="space-y-5">
      <div>
        <h3 className="text-sm font-bold text-slate-800">Dual-Signature Submission</h3>
        <p className="text-muted-foreground mt-1 text-xs">
          Read-only summary of the employee and administrator entries for this form.
        </p>
      </div>

      {legalContent ? (
        <details className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer text-[13px] font-semibold text-slate-700">
            Policy document
          </summary>
          <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-slate-600">
            {legalContent.replaceAll("**", "")}
          </p>
        </details>
      ) : null}

      {!hasAnyData ? (
        <p className="text-muted-foreground text-sm">No submission data yet.</p>
      ) : (
        <>
          {employeeEntries.length > 0 ? (
            <div>
              <p className="text-[11px] font-extrabold tracking-wide text-[#109B85] uppercase">
                Employee submission
              </p>
              <dl className="mt-2 space-y-2 rounded-xl border border-slate-200 p-4">
                {employeeEntries.map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2 text-[13px]">
                    <dt className="text-muted-foreground shrink-0 font-semibold">
                      {formatFormLabel(key)}:
                    </dt>
                    <dd className="min-w-0 break-words text-slate-800">
                      {formatFormValue(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {employeeSignature.text.length > 0 ? (
            <p className="text-muted-foreground text-xs">
              Employee signature:{" "}
              <span className="font-serif text-lg font-bold italic text-slate-800">
                {employeeSignature.text}
              </span>
            </p>
          ) : null}

          {adminEntries.length > 0 || task.adminSignatureUrl ? (
            <div>
              <p className="text-[11px] font-extrabold tracking-wide text-blue-500 uppercase">
                Administrative review
              </p>
              {adminEntries.length > 0 ? (
                <dl className="mt-2 space-y-2 rounded-xl border border-slate-200 p-4">
                  {adminEntries.map(([key, value]) => (
                    <div key={key} className="flex items-start gap-2 text-[13px]">
                      <dt className="text-muted-foreground shrink-0 font-semibold">
                        {formatFormLabel(key)}:
                      </dt>
                      <dd className="min-w-0 break-words text-slate-800">
                        {formatFormValue(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {task.adminSignatureUrl ? (
                <p className="text-muted-foreground mt-2 text-xs">
                  Administrator signature:{" "}
                  <span className="font-serif text-lg font-bold italic text-slate-800">
                    {formatSignature(task.adminSignatureUrl).text}
                  </span>
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
