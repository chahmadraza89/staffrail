"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileUp,
  Lock,
  Send,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmployeeActionError } from "@/lib/admin/employee-actions"
import { fileNameFromUrl } from "@/lib/admin/task-format"
import {
  EMPLOYEE_UPLOAD_ACCEPT,
  submitEmployeeTraining,
  uploadEmployeeFile,
} from "@/lib/employee/employee-actions"
import {
  EMPTY_EMPLOYEE_WORKSPACE,
  formatPortalStatus,
  mapTrainingStatus,
  subscribeEmployeeWorkspace,
  type EmployeeWorkspaceSnapshot,
} from "@/lib/employee/employee-streams"

export function EmployeeTrainingDetailView({
  employeeUid,
  employeeName,
  adminId,
  trainingId,
}: {
  employeeUid: string
  employeeName: string
  adminId: string | null
  trainingId: string
}) {
  const [workspace, setWorkspace] = useState<EmployeeWorkspaceSnapshot>(EMPTY_EMPLOYEE_WORKSPACE)
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  const [completedDateOverride, setCompletedDateOverride] = useState<string | null>(null)
  const [expirationDate, setExpirationDate] = useState("")
  const [noExpiration, setNoExpiration] = useState(false)
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const unsub = subscribeEmployeeWorkspace(
      employeeUid,
      (snap) => setWorkspace(snap),
      (err) => setError(err.message),
    )
    return () => unsub()
  }, [employeeUid])

  const training = workspace.trainings.find((t) => t.id === trainingId)
  const ready = workspace.ready.trainings
  const completedDate =
    completedDateOverride ??
    (training?.completedAt ? training.completedAt.toISOString().slice(0, 10) : today)
  const fileUrl =
    uploadedFileUrl ?? training?.certificateUrl ?? training?.certificateUrls[0] ?? null

  const mappedStatus = training ? mapTrainingStatus(training.status) : null
  const isLocked = Boolean(
    training &&
      (training.status === "underReview" ||
        training.status === "verified" ||
        training.status === "completed" ||
        mappedStatus === "verified" ||
        mappedStatus === "completed" ||
        mappedStatus === "submitted" ||
        mappedStatus === "underReview"),
  )

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const uploaded = await uploadEmployeeFile({
        employeeId: employeeUid,
        scope: "trainings",
        itemId: trainingId,
        file,
      })
      setUploadedFileUrl(uploaded.fileUrl)
      setSuccess(`Certificate "${uploaded.fileName}" uploaded cleanly.`)
    } catch (err) {
      setError(err instanceof EmployeeActionError || err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setUploading(false)
      event.target.value = ""
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!training) return
    setError(null)
    setSuccess(null)
    setSubmitting(true)
    try {
      await submitEmployeeTraining({
        employeeId: employeeUid,
        employeeName: workspace.profile?.name ?? employeeName,
        adminId: workspace.profile?.adminId ?? adminId,
        trainingId: training.id,
        trainingTitle: training.title,
        requirementType: "certificate",
        completedDate,
        expirationDate: noExpiration ? null : expirationDate,
        noExpiration,
        fileUrl,
        fileUrls: fileUrl ? [fileUrl] : [],
      })
      setSuccess("Training record submitted for administrator verification.")
    } catch (err) {
      setError(err instanceof EmployeeActionError || err instanceof Error ? err.message : "Submission failed.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6" data-testid="employee-training-detail-view">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/employee/training"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            aria-label="Back to Trainings"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              {training?.title ?? trainingId}
            </h1>
            <p className="text-xs text-slate-500">Training Compliance Requirement</p>
          </div>
        </div>
        {training && mappedStatus && (
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            {formatPortalStatus(mappedStatus)}
          </span>
        )}
      </div>

      {!ready ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading training details…
        </div>
      ) : !training ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          This training requirement was not found on your profile.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          {training.rejectionReason && (
            <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <div>
                <p className="font-semibold">Returned for Correction</p>
                <p className="mt-0.5">{training.rejectionReason}</p>
              </div>
            </div>
          )}

          {isLocked && (
            <div className="flex items-center gap-3 rounded-lg border border-sky-200 bg-sky-50 p-4 text-xs text-sky-900">
              {training.status === "verified" ||
              training.status === "completed" ||
              mappedStatus === "verified" ||
              mappedStatus === "completed" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Lock className="h-4 w-4 shrink-0 text-sky-700" />
              )}
              <span>
                {training.status === "verified" ||
                training.status === "completed" ||
                mappedStatus === "verified" ||
                mappedStatus === "completed"
                  ? "This training is verified and complete."
                  : "Submitted and locked pending administrator review."}
              </span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
              <span>Completion Date *</span>
              <input
                type="date"
                disabled={isLocked}
                value={completedDate}
                onChange={(e) => setCompletedDateOverride(e.target.value)}
                data-testid="training-completed-date"
                className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-sm font-normal text-slate-900 disabled:bg-slate-100"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
              <span>Expiration Date</span>
              <input
                type="date"
                disabled={isLocked || noExpiration}
                value={noExpiration ? "" : expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                data-testid="training-expiration-date"
                className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-sm font-normal text-slate-900 disabled:bg-slate-100"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              disabled={isLocked}
              checked={noExpiration}
              onChange={(e) => setNoExpiration(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span>This training certification does not expire</span>
          </label>

          {!isLocked && (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center hover:border-sky-400">
              <FileUp className="mb-2 h-6 w-6 text-sky-700" />
              <span className="text-xs font-semibold text-slate-800">
                {uploading
                  ? "Uploading certificate..."
                  : "Upload Training Certificate (PDF, PNG, JPG <= 10 MB)"}
              </span>
              <input
                type="file"
                accept={EMPLOYEE_UPLOAD_ACCEPT}
                disabled={uploading}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          )}

          {fileUrl && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <span className="truncate font-medium text-slate-700">
                {fileNameFromUrl(fileUrl) || "Uploaded Certificate"}
              </span>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-sky-700 hover:underline"
              >
                View Certificate
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"
            >
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
              {success}
            </div>
          )}

          {!isLocked && (
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={submitting || uploading}
                data-testid="submit-training-button"
                className="bg-sky-700 text-white hover:bg-sky-800"
              >
                <Send className="mr-1.5 h-4 w-4" />
                {submitting ? "Submitting..." : "Submit Training"}
              </Button>
            </div>
          )}
        </form>
      )}
    </div>
  )
}
