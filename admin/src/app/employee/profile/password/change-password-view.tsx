"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, KeyRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { passwordRuleChecks } from "@/lib/admin/profile-models"
import { callLocalServerAction } from "@/lib/data/client-store"

export function EmployeeChangePasswordView({ email }: { email: string }) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const rules = passwordRuleChecks(newPassword)
  const allMet = rules.every((r) => r.met)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!currentPassword) {
      setError("Enter your current password.")
      return
    }
    if (!allMet) {
      setError("New password does not meet all security requirements.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.")
      return
    }

    setBusy(true)
    try {
      await callLocalServerAction("changePassword", {
        currentPassword,
        newPassword,
      })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setSuccess("Password updated cleanly.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.")
    } finally {
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
          <h1 className="text-xl font-semibold text-slate-900">Change Password</h1>
          <p className="text-xs text-slate-500">{email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          <span>Current Password</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={busy}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          <span>New Password</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={busy}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900"
          />
        </label>

        <ul className="space-y-1 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className={`flex items-center gap-1.5 ${
                rule.met ? "text-emerald-700 font-medium" : "text-slate-500"
              }`}
            >
              <CheckCircle2 className={`h-3.5 w-3.5 ${rule.met ? "text-emerald-600" : "text-slate-300"}`} />
              {rule.label}
            </li>
          ))}
        </ul>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          <span>Confirm New Password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={busy}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900"
          />
        </label>

        {error && (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            {success}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={busy} className="bg-sky-700 text-white hover:bg-sky-800">
            <KeyRound className="mr-1.5 h-4 w-4" />
            {busy ? "Updating..." : "Update Password"}
          </Button>
        </div>
      </form>
    </div>
  )
}
