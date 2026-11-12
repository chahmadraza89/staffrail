"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, CheckCircle2, KeyRound, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { passwordRuleChecks } from "@/lib/admin/profile-models"
import { callLocalServerAction } from "@/lib/data/client-store"

export function ForgotPasswordForm() {
  const searchParams = useSearchParams()
  const resetToken = searchParams.get("token")?.trim() ?? ""

  const [email, setEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [demoResetPath, setDemoResetPath] = useState<string | null>(null)
  const [resetDone, setResetDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRequestReset = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const trimmed = email.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid work email address.")
      return
    }

    setSending(true)
    try {
      const result = await callLocalServerAction<{ ok: boolean; demoResetPath?: string | null }>(
        "requestPasswordReset",
        { email: trimmed },
      )
      setDemoResetPath(result.demoResetPath ?? null)
      setSent(true)
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Unable to send password reset request right now.",
      )
    } finally {
      setSending(false)
    }
  }

  const handleConfirmReset = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    const rules = passwordRuleChecks(newPassword)
    if (!rules.every((r) => r.met)) {
      setError("New password does not meet all security requirements.")
      return
    }

    setSending(true)
    try {
      await callLocalServerAction("confirmPasswordReset", {
        token: resetToken,
        newPassword,
      })
      setResetDone(true)
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Unable to complete password reset.",
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Reset your password</h1>
          <p className="text-xs text-slate-500">StaffRail Compliance Portal</p>
        </div>
      </div>

      {resetToken ? (
        resetDone ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <div className="mb-1 flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                Password updated
              </div>
              <p className="text-xs leading-relaxed">
                Your password has been reset. You can now sign in with your new password.
              </p>
            </div>
            <Button asChild className="w-full bg-sky-700 text-white hover:bg-sky-800">
              <Link href="/login">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to Sign In
              </Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleConfirmReset} className="space-y-4">
            <p className="text-sm text-slate-600">
              Enter a new password for your account.
            </p>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
              <span>New Password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={sending}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus:border-sky-500 focus:outline-none"
              />
            </label>
            {error && (
              <div
                role="alert"
                data-testid="forgot-error"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
              >
                {error}
              </div>
            )}
            <Button
              type="submit"
              disabled={sending}
              className="w-full bg-sky-700 text-white hover:bg-sky-800"
            >
              {sending ? "Resetting..." : "Update Password"}
            </Button>
          </form>
        )
      ) : sent ? (
        <div data-testid="forgot-password-success" className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              Reset link generated
            </div>
            <p className="text-xs leading-relaxed">
              If an account exists for <span className="font-medium">{email.trim()}</span>, a
              password reset token has been generated in the local demo session.
            </p>
            {demoResetPath ? (
              <p className="mt-2 text-xs">
                <Link href={demoResetPath} className="font-semibold text-sky-700 underline">
                  Open local password reset link
                </Link>
              </p>
            ) : null}
          </div>
          <Button asChild className="w-full bg-sky-700 text-white hover:bg-sky-800">
            <Link href="/login">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to Sign In
            </Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleRequestReset} className="space-y-4">
          <p className="text-sm text-slate-600">
            Enter your account email address to generate a password reset link.
          </p>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-slate-500" />
              Email Address
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={sending}
              placeholder="name@staffrail.local"
              autoComplete="email"
              data-testid="forgot-email-input"
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus:border-sky-500 focus:outline-none"
            />
          </label>

          {error && (
            <div
              role="alert"
              data-testid="forgot-error"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={sending}
            data-testid="forgot-submit"
            className="w-full bg-sky-700 text-white hover:bg-sky-800"
          >
            {sending ? "Sending reset link..." : "Send Reset Link"}
          </Button>

          <div className="pt-2 text-center">
            <Link href="/login" className="text-xs font-medium text-sky-700 hover:underline">
              Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}
