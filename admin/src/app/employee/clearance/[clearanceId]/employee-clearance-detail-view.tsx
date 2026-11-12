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
  submitEmployeeClearance,
  uploadEmployeeFile,
} from "@/lib/employee/employee-actions"
import {
  EMPTY_EMPLOYEE_WORKSPACE,
  formatPortalStatus,
  mapClearanceStatus,
  subscribeEmployeeWorkspace,
  type EmployeeWorkspaceSnapshot,
} from "@/lib/employee/employee-streams"

export function EmployeeClearanceDetailView({
  employeeUid,
  employeeName,
  adminId,
  clearanceId,
}: {
  employeeUid: string
  employeeName: string
  adminId: string | null
  clearanceId: string
}) {
  const [workspace, setWorkspace] = useState<EmployeeWorkspaceSnapshot>(EMPTY_EMPLOYEE_WORKSPACE)
  const [expirationDateOverride, setExpirationDateOverride] = useState<string | null>(null)
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

  const clearance = workspace.clearances.find((c) => c.id === clearanceId)
  const ready = workspace.ready.clearances
  const expirationDate =
    expirationDateOverride ?? (clearance?.dueDate ? clearance.dueDate.toISOString().slice(0, 10) : "")
  const fileUrl = uploadedFileUrl ?? clearance?.fileUrl ?? ""

  const mappedStatus = clearance ? mapClearanceStatus(clearance.status) : null
  const isLocked = Boolean(
    mappedStatus &&
      (mappedStatus === "verified" ||
        mappedStatus === "completed" ||
        clearance?.status === "underReview"),
  )

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const uploaded = await uploadEmployeeFile({
        employeeId: employeeUid,
        scope: "clearance",
        itemId: clearanceId,
        file,
      })
      setUploadedFileUrl(uploaded.fileUrl)
      setSuccess(`Uploaded "${uploaded.fileName}".`)
    } catch (err) {
      setError(err instanceof EmployeeActionError || err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setUploading(false)
      event.target.value = ""
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!clearance) return
    setError(null)
    setSuccess(null)
    setSubmitting(true)
    try {
      await submitEmployeeClearance({
        employeeId: employeeUid,
        employeeName: workspace.profile?.name ?? employeeName,
        adminId: workspace.profile?.adminId ?? adminId,
        clearanceId: clearance.id,
        clearanceTitle: clearance.title,
        fileUrl,
        expirationDate: expirationDate || null,
      })
      setSuccess("Clearance evidence submitted for admin verification.")
    } catch (err) {
      setError(err instanceof EmployeeActionError || err instanceof Error ? err.message : "Submission failed.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6" data-testid="employee-clearance-detail-view">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/employee/clearance"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            aria-label="Back to Clearances"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              {clearance?.title ?? clearanceId}
            </h1>
            <p className="text-xs text-slate-500">Credential Verification Submission</p>
          </div>
        </div>
        {clearance && mappedStatus && (
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            {formatPortalStatus(mappedStatus)}
          </span>
        )}
      </div>

      {!ready ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading clearance item…
        </div>
      ) : !clearance ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          This clearance requirement was not found on your profile.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          {clearance.rejectionReason && (
            <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <div>
                <p className="font-semibold">Clearance Rejected</p>
                <p className="mt-0.5">{clearance.rejectionReason}</p>
              </div>
            </div>
          )}

          {isLocked && (
            <div className="flex items-center gap-3 rounded-lg border border-sky-200 bg-sky-50 p-4 text-xs text-sky-900">
              {mappedStatus === "verified" || mappedStatus === "completed" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Lock className="h-4 w-4 shrink-0 text-sky-700" />
              )}
              <span>
                {mappedStatus === "verified" || mappedStatus === "completed"
                  ? "This clearance has been verified and approved."
                  : "Under compliance review — editing is locked until reviewed."}
              </span>
            </div>
          )}

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 sm:max-w-xs">
            <span>Document Expiration Date (Optional)</span>
            <input
              type="date"
              disabled={isLocked}
              value={expirationDate}
              onChange={(e) => setExpirationDateOverride(e.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-sm font-normal text-slate-900 disabled:bg-slate-100"
            />
          </label>

          {!isLocked && (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center hover:border-sky-400">
              <FileUp className="mb-2 h-6 w-6 text-sky-700" />
              <span className="text-xs font-semibold text-slate-800">
                {uploading
                  ? "Uploading clearance document..."
                  : "Upload Supporting Credential (PDF, PNG, JPG <= 10 MB)"}
              </span>
              <input
                type="file"
                accept={EMPLOYEE_UPLOAD_ACCEPT}
                disabled={uploading}
                onChange={handleUpload}
                className="hidden"
              />
            </label>
          )}

          {fileUrl && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <span className="truncate font-medium text-slate-700">
                {fileNameFromUrl(fileUrl) || "Uploaded Clearance File"}
              </span>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-sky-700 hover:underline"
              >
                Open File
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
                data-testid="submit-clearance-button"
                className="bg-sky-700 text-white hover:bg-sky-800"
              >
                <Send className="mr-1.5 h-4 w-4" />
                {submitting ? "Submitting..." : "Submit for Verification"}
              </Button>
            </div>
          )}
        </form>
      )}
    </div>
  )
}
