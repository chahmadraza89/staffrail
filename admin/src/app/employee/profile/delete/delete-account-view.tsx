"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowLeft, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { endAdminSession } from "@/lib/auth/client-auth"
import { deactivateEmployeeAccount } from "@/lib/employee/employee-actions"

export function EmployeeDeleteAccountView({
  employeeUid,
  employeeName,
}: {
  employeeUid: string
  employeeName: string
}) {
  const router = useRouter()
  const [reason, setReason] = useState("")
  const [confirmText, setConfirmText] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canConfirm = confirmText.trim().toUpperCase() === "DEACTIVATE"

  const handleDeactivate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canConfirm) {
      setError('Type "DEACTIVATE" to confirm.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await deactivateEmployeeAccount({
        employeeId: employeeUid,
        employeeName,
        reason,
      })
      await endAdminSession()
      router.replace("/login")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not deactivate account.")
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/employee/profile"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          aria-label="Back to Profile"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-rose-700">Deactivate Account</h1>
          <p className="text-xs text-slate-500">Recoverable soft deactivation of portal access</p>
        </div>
      </div>

      <form onSubmit={handleDeactivate} className="space-y-4 rounded-xl border border-rose-200 bg-white p-6 shadow-xs">
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
          <p>
            Deactivating your account marks your employee status as inactive and signs you out. Your
            historical onboarding and training audit records remain preserved for compliance and can
            be restored by your administrator if needed.
          </p>
        </div>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          <span>Reason (Optional)</span>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={busy}
            className="rounded-md border border-slate-300 bg-white p-2.5 text-sm font-normal text-slate-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          <span>Type DEACTIVATE to confirm</span>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={busy}
            placeholder="DEACTIVATE"
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900"
          />
        </label>

        {error && (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/employee/profile")}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive" disabled={busy || !canConfirm}>
            <Trash2 className="mr-1.5 h-4 w-4" />
            {busy ? "Deactivating..." : "Deactivate Account"}
          </Button>
        </div>
      </form>
    </div>
  )
}
