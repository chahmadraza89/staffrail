"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, FileCheck2, PenLine, RotateCcw, Save, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { logAuditAction } from "@/lib/admin/audit-actions"
import { EmployeeActionError } from "@/lib/admin/employee-actions"
import { triggerNotification } from "@/lib/admin/notification-actions"
import {
  adminCounterSignTask,
  saveAdminSplitDraft,
  validateCounterSignFields,
} from "@/lib/admin/split-field-actions"
import {
  COMPETENCY_AREAS,
  competencyAreaSlug,
  detectCompetencyTaskId,
  getAdminSplitFieldSpecs,
  type SplitFieldInputSpec,
} from "@/lib/admin/split-field-schemas"
import { rejectTask } from "@/lib/admin/task-actions"
import type { TaskStatus } from "@/lib/admin/task-status"

export interface SplitFieldCounterSignPanelProps {
  employeeId: string
  employeeName: string
  taskId: string
  taskTitle: string
  taskStatus: TaskStatus
  isCompleted: boolean
  adminFormData: Record<string, unknown> | null
  adminSignatureUrl: string | null
  revision: string | null
  adminUid: string
  /** Optional display name of the signed-in admin for audit logs. */
  adminName?: string
  disabled: boolean
  disabledReason?: string
}

function initialFormValues(
  specs: SplitFieldInputSpec[],
  existing: Record<string, unknown> | null,
): Record<string, string> {
  const today = new Date().toISOString().slice(0, 10)
  const next: Record<string, string> = {}
  for (const spec of specs) {
    const raw = existing?.[spec.key]
    if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
      next[spec.key] = String(raw)
    } else if (spec.defaultValue !== undefined) {
      next[spec.key] = spec.defaultValue
    } else if (spec.type === "date") {
      next[spec.key] = today
    } else {
      next[spec.key] = ""
    }
  }
  return next
}

function initialTypedSignature(rawUrl: string | null): string {
  if (!rawUrl) {
    return ""
  }
  const trimmed = rawUrl.trim()
  if (trimmed.startsWith("typed:")) {
    return trimmed.slice(6).trim()
  }
  return trimmed
}

export function SplitFieldCounterSignPanel(props: SplitFieldCounterSignPanelProps) {
  return (
    <SplitFieldCounterSignForm
      key={`${props.taskId}:${props.revision ?? "0"}`}
      {...props}
    />
  )
}

function normalizeAdminSignatureValue(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }
  if (
    trimmed.startsWith("typed:") ||
    trimmed.startsWith("data:image/") ||
    /^https?:\/\//i.test(trimmed)
  ) {
    return trimmed
  }
  return `typed:${trimmed}`
}

function SplitFieldCounterSignForm({
  employeeId,
  employeeName,
  taskId,
  taskTitle,
  taskStatus,
  isCompleted,
  adminFormData,
  adminSignatureUrl,
  revision,
  adminUid,
  adminName,
  disabled,
  disabledReason,
}: SplitFieldCounterSignPanelProps) {
  const actorName = adminName?.trim() || "Administrator"
  const specs = useMemo(() => getAdminSplitFieldSpecs(taskId, taskTitle), [taskId, taskTitle])
  const competencyId = useMemo(() => detectCompetencyTaskId(taskId), [taskId])

  const [values, setValues] = useState<Record<string, string>>(() =>
    initialFormValues(specs, adminFormData),
  )
  const [typedSignature, setTypedSignature] = useState<string>(() =>
    initialTypedSignature(adminSignatureUrl),
  )
  const [submitting, setSubmitting] = useState<"draft" | "complete" | "reject" | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const awaitingEmployee =
    taskStatus === "notStarted" || taskStatus === "pending" || taskStatus === "rejected"
  const blockedTerminal = taskStatus === "expired" || taskStatus === "noActionRequired"
  const completed = isCompleted || taskStatus === "completed" || taskStatus === "verified"
  const readOnly = Boolean(disabled) || completed

  if (awaitingEmployee) {
    return (
      <div
        data-testid="split-field-counter-sign"
        className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-3 text-xs text-slate-600"
      >
        {taskStatus === "rejected"
          ? "This document was returned to the employee for revision. Dual-signature review unlocks after the employee resubmits."
          : "Dual-signature review unlocks automatically after the employee submits their portion."}
      </div>
    )
  }

  if (blockedTerminal) {
    return (
      <div
        data-testid="split-field-counter-sign"
        className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-3 text-xs text-slate-600"
      >
        Dual-signature actions are unavailable while this task is marked as{" "}
        <span className="font-semibold">{taskStatus}</span>.
      </div>
    )
  }

  const updateField = (key: string, nextValue: string) => {
    setValues((prev) => ({ ...prev, [key]: nextValue }))
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  const formatError = (err: unknown) => {
    if (err instanceof EmployeeActionError) {
      return err.message
    }
    if (err instanceof Error && err.message.trim().length > 0) {
      return err.message
    }
    return "An unexpected error occurred while saving your review."
  }

  const handleSaveDraft = async () => {
    setErrorMessage(null)
    setSuccessMessage(null)
    setSubmitting("draft")
    try {
      await saveAdminSplitDraft({
        employeeId,
        taskId,
        adminUid,
        adminFormData: values,
        adminSignatureUrl: normalizeAdminSignatureValue(typedSignature),
        expectedRevision: revision ?? undefined,
      })
      setSuccessMessage("Supervisor draft fields saved.")
    } catch (err) {
      setErrorMessage(formatError(err))
    } finally {
      setSubmitting(null)
    }
  }

  const handleCounterSign = async () => {
    setErrorMessage(null)
    setSuccessMessage(null)
    const sigValue = normalizeAdminSignatureValue(typedSignature) ?? ""

    const validationError = validateCounterSignFields(taskId, taskTitle, values, sigValue)
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setSubmitting("complete")
    try {
      await adminCounterSignTask({
        employeeId,
        taskId,
        adminUid,
        adminName: actorName,
        employeeName,
        taskTitle,
        adminFormData: values,
        adminSignatureUrl: sigValue,
        expectedRevision: revision ?? undefined,
      })
      setSuccessMessage("Document counter-signed and marked completed.")
    } catch (err) {
      setErrorMessage(formatError(err))
    } finally {
      setSubmitting(null)
    }
  }

  const handleReject = async () => {
    const trimmed = rejectReason.trim()
    if (!trimmed) {
      setErrorMessage("Enter a reason before rejecting this submission.")
      return
    }
    setErrorMessage(null)
    setSuccessMessage(null)
    setSubmitting("reject")
    try {
      await rejectTask({
        employeeId,
        taskId,
        taskSource: "onboarding",
        adminUid,
        reason: trimmed,
        expectedRevision: revision ?? null,
        employeeName,
      })
      void logAuditAction({
        actorId: adminUid,
        actorName,
        actionType: "SPLIT_FIELD_REJECTED",
        targetId: employeeId,
        description: `Rejected "${taskTitle}" for ${employeeName}: ${trimmed}`,
        metadata: { taskId, reason: trimmed },
      })
      void triggerNotification({
        targetUserId: employeeId,
        title: "Document Returned for Correction",
        body: `Your submission for "${taskTitle}" needs changes: ${trimmed}`,
        type: "error",
        metadata: { taskId, reason: trimmed, type: "task_rejected" },
      })
      setRejectOpen(false)
      setRejectReason("")
      setSuccessMessage("Submission rejected and returned to employee.")
    } catch (err) {
      setErrorMessage(formatError(err))
    } finally {
      setSubmitting(null)
    }
  }

  const nonCompetencySpecs = competencyId
    ? specs.filter((spec) => !spec.key.startsWith("rating_") && !spec.key.startsWith("comments_") && spec.key !== "overall_comments")
    : specs

  return (
    <div
      data-testid="split-field-counter-sign"
      className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileCheck2 className="h-4 w-4 text-sky-700" />
          <h4 className="text-sm font-semibold text-slate-900">
            Authorized Agency Counter-Signature
          </h4>
        </div>
        {completed ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Counter-Signed &amp; Completed
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            Supervisor Verification Required
          </span>
        )}
      </div>

      {disabled && disabledReason && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{disabledReason}</span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {nonCompetencySpecs.map((spec) => {
          const isWide = spec.type === "textarea"
          return (
            <label
              key={spec.key}
              className={`flex flex-col gap-1 text-xs font-medium text-slate-700 ${
                isWide ? "sm:col-span-2" : ""
              }`}
            >
              <span>
                {spec.label}
                {spec.required && <span className="ml-0.5 text-rose-600">*</span>}
              </span>
              {spec.type === "textarea" ? (
                <textarea
                  rows={3}
                  disabled={readOnly || submitting !== null}
                  value={values[spec.key] ?? ""}
                  onChange={(e) => updateField(spec.key, e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-normal text-slate-900 focus:border-sky-500 focus:outline-none disabled:bg-slate-100"
                />
              ) : (
                <input
                  type={spec.type === "date" ? "date" : "text"}
                  disabled={readOnly || submitting !== null}
                  value={values[spec.key] ?? ""}
                  onChange={(e) => updateField(spec.key, e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-normal text-slate-900 focus:border-sky-500 focus:outline-none disabled:bg-slate-100"
                />
              )}
            </label>
          )
        })}
      </div>

      {competencyId && (
        <div className="space-y-3 border-t border-slate-200 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Competency Domain Ratings (1 – 5 Rubric)
          </p>
          <div className="space-y-2.5">
            {COMPETENCY_AREAS[competencyId].map((area) => {
              const slug = competencyAreaSlug(area)
              const ratingKey = `rating_${slug}`
              const commentsKey = `comments_${slug}`
              const ratingSpec = specs.find((s) => s.key === ratingKey)
              return (
                <div
                  key={slug}
                  className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_200px]"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{area}</p>
                    <input
                      type="text"
                      placeholder="Optional evaluator notes"
                      disabled={readOnly || submitting !== null}
                      value={values[commentsKey] ?? ""}
                      onChange={(e) => updateField(commentsKey, e.target.value)}
                      className="mt-1.5 w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-800 focus:border-sky-500 focus:outline-none disabled:bg-slate-100"
                    />
                  </div>
                  <select
                    aria-label={`${area} rating`}
                    disabled={readOnly || submitting !== null}
                    value={values[ratingKey] ?? ""}
                    onChange={(e) => updateField(ratingKey, e.target.value)}
                    className="h-9 rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none disabled:bg-slate-100"
                  >
                    <option value="">Select rating...</option>
                    {(ratingSpec?.options ?? []).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            <span>Overall Evaluation Summary / Comments (Optional)</span>
            <textarea
              rows={2}
              disabled={readOnly || submitting !== null}
              value={values.overall_comments ?? ""}
              onChange={(e) => updateField("overall_comments", e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-normal text-slate-900 focus:border-sky-500 focus:outline-none disabled:bg-slate-100"
            />
          </label>
        </div>
      )}

      <div className="space-y-2 border-t border-slate-200 pt-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          <span className="flex items-center gap-1.5">
            <PenLine className="h-3.5 w-3.5 text-slate-500" />
            Typed Supervisor / Authorized Representative Signature
            <span className="text-rose-600">*</span>
          </span>
          <input
            type="text"
            data-testid="split-admin-signature-input"
            placeholder="Type your full legal name to sign"
            disabled={readOnly || submitting !== null}
            value={typedSignature}
            onChange={(e) => {
              setTypedSignature(e.target.value)
              setErrorMessage(null)
              setSuccessMessage(null)
            }}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-normal text-slate-900 focus:border-sky-500 focus:outline-none disabled:bg-slate-100"
          />
        </label>
        {typedSignature.trim().length > 0 && (
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800">
            <span className="block text-[10px] uppercase tracking-wider text-slate-400">
              Signature Preview
            </span>
            {/^https?:\/\//i.test(typedSignature.trim()) ||
            typedSignature.trim().startsWith("data:image/") ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={typedSignature.trim()}
                alt="Supervisor signature"
                className="mt-1 max-h-16 object-contain"
              />
            ) : (
              <span className="font-serif text-lg italic">{typedSignature.trim()}</span>
            )}
          </div>
        )}
      </div>

      {errorMessage && (
        <div
          data-testid="split-action-error"
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          data-testid="split-action-success"
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800"
        >
          {successMessage}
        </div>
      )}

      {!completed && rejectOpen && (
        <div
          data-testid="split-reject-dialog"
          className="space-y-2 rounded-lg border border-rose-200 bg-rose-50/70 p-3"
        >
          <p className="text-xs font-semibold text-rose-900">
            Return document to employee with feedback
          </p>
          <textarea
            rows={2}
            data-testid="split-reject-reason"
            placeholder="Explain what needs correction..."
            value={rejectReason}
            disabled={readOnly || submitting !== null}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full rounded border border-rose-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting !== null}
              onClick={() => {
                setRejectOpen(false)
                setRejectReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              data-testid="split-reject-confirm"
              disabled={readOnly || submitting !== null}
              onClick={handleReject}
            >
              {submitting === "reject" ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </div>
        </div>
      )}

      {!completed && (
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="split-save-draft"
            disabled={readOnly || submitting !== null}
            onClick={handleSaveDraft}
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {submitting === "draft" ? "Saving..." : "Save Admin Progress"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="split-reject-open"
            disabled={readOnly || submitting !== null}
            onClick={() => setRejectOpen((prev) => !prev)}
            className="border-rose-200 text-rose-700 hover:bg-rose-50"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reject Submission
          </Button>

          <Button
            type="button"
            size="sm"
            data-testid="split-counter-sign"
            disabled={readOnly || submitting !== null}
            onClick={handleCounterSign}
            className="bg-sky-700 text-white hover:bg-sky-800"
          >
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            {submitting === "complete" ? "Counter-Signing..." : "Counter-Sign & Complete"}
          </Button>
        </div>
      )}
    </div>
  )
}
