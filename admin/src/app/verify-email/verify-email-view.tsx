"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2, MailCheck, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { callLocalServerAction } from "@/lib/data/client-store"

export function VerifyEmailView() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [signInEmail, setSignInEmail] = useState("")
  const [signInPassword, setSignInPassword] = useState("")
  const [verified, setVerified] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cooldown <= 0) {
      return
    }
    const timer = setTimeout(() => setCooldown((prev) => Math.max(0, prev - 1)), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleCheckVerified = async () => {
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      const cleanEmail = signInEmail.trim()
      if (!cleanEmail || !signInPassword) {
        setError("Enter your work email and password below to check your verification status.")
        return
      }
      const res = await callLocalServerAction<{
        ok: boolean
        emailVerified: boolean
        email: string
      }>("verifyEmail", {
        email: cleanEmail,
        password: signInPassword,
        markVerified: false,
      })
      setUserEmail(res.email)
      if (res.emailVerified) {
        setVerified(true)
        setStatus("Your email is verified! You can now sign in to continue.")
      } else {
        setStatus("Email is not verified yet. Select 'Verify Email Now' below to confirm in local demo mode.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh verification status.")
    } finally {
      setBusy(false)
    }
  }

  const handleConfirmVerify = async () => {
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      const cleanEmail = signInEmail.trim()
      if (!cleanEmail || !signInPassword) {
        setError("Enter your work email and password below to verify your email.")
        return
      }
      const res = await callLocalServerAction<{
        ok: boolean
        emailVerified: boolean
        email: string
      }>("verifyEmail", {
        email: cleanEmail,
        password: signInPassword,
        markVerified: true,
      })
      setUserEmail(res.email)
      setVerified(true)
      setCooldown(60)
      setStatus("Email verified in local session. Proceed to sign in.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify email.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
          <MailCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Verify your email</h1>
          <p className="text-xs text-slate-500">
            {userEmail ? `Account: ${userEmail}` : "Email verification required before portal access"}
          </p>
        </div>
      </div>

      {verified ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              Email Verified
            </div>
            <p className="text-xs">Your email address has been confirmed. Proceed to sign in.</p>
          </div>
          <Button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full bg-sky-700 text-white hover:bg-sky-800"
          >
            Continue to Sign In
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Confirm your credentials to check verification status or mark your local demo account verified.
          </p>

          <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <p className="text-xs font-medium text-slate-700">
              Confirm your credentials:
            </p>
            <input
              type="email"
              value={signInEmail}
              disabled={busy}
              onChange={(e) => setSignInEmail(e.target.value)}
              placeholder="Work email address"
              aria-label="Work email address"
              data-testid="verify-email-input"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
            />
            <input
              type="password"
              value={signInPassword}
              disabled={busy}
              onChange={(e) => setSignInPassword(e.target.value)}
              placeholder="Password"
              aria-label="Password"
              data-testid="verify-password-input"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
            />
          </div>

          {status && (
            <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
              {status}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
            >
              {error}
            </div>
          )}

          <div className="space-y-2.5">
            <Button
              type="button"
              disabled={busy}
              onClick={handleCheckVerified}
              data-testid="verify-check-button"
              className="w-full bg-sky-700 text-white hover:bg-sky-800"
            >
              <RefreshCw className={`mr-1.5 h-4 w-4 ${busy ? "animate-spin" : ""}`} />
              I&apos;ve Verified My Email
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={busy || cooldown > 0}
              onClick={handleConfirmVerify}
              data-testid="verify-resend-button"
              className="w-full"
            >
              {cooldown > 0 ? `Verified (${cooldown}s)` : "Verify Email Now"}
            </Button>
          </div>

          <div className="pt-2 text-center">
            <Link href="/login" className="text-xs font-medium text-sky-700 hover:underline">
              Back to Sign In
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
