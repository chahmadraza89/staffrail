"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { isSafeRedirectTarget } from "@/lib/auth/redirect"
import type { AuthFailureReason } from "@/lib/auth/types"
import { startAdminSignIn, type StartSignInFailure } from "@/lib/auth/client-auth"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type FormState = "idle" | "loading" | "invalid-credentials" | "access-denied" | "network-error" | "config"

const DENIED_MESSAGES: Partial<Record<AuthFailureReason, string>> = {
  email_not_verified: "This email address is not verified yet. Verify it and try again.",
  profile_missing: "No StaffRail profile was found for this account.",
  not_admin: "This account does not have active portal access to StaffRail.",
  account_inactive: "This account has been deactivated. Contact your administrator.",
}

const FAILURE_MESSAGES: Record<Exclude<FormState, "idle" | "loading">, string> = {
  "invalid-credentials": "Invalid email or password. Check your credentials and try again.",
  "access-denied": "This account cannot access the StaffRail portal.",
  "network-error": "Could not reach the StaffRail server. Check your connection and try again.",
  config: "The server session configuration is invalid. Check your server environment.",
}

const DEMO_ADMIN_EMAIL = "admin@staffrail.local"
const DEMO_EMPLOYEE_EMAIL = "employee@staffrail.local"
const DEMO_PASSWORD = "DemoPassword123!"

interface LoginFormProps {
  redirectTarget: string
  showRedirectNotice: boolean
}

export function LoginForm({ redirectTarget, showRedirectNotice }: LoginFormProps) {
  const router = useRouter()
  const [state, setState] = useState<FormState>("idle")
  const [deniedDetail, setDeniedDetail] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const busy = state === "loading"

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) {
      return
    }

    setState("loading")
    setDeniedDetail(null)

    const result: StartSignInFailure | Awaited<ReturnType<typeof startAdminSignIn>> =
      await startAdminSignIn(email.trim(), password, redirectTarget)

    if (result.status === "success") {
      const target = isSafeRedirectTarget(result.redirect)
        ? result.redirect
        : "/dashboard"
      router.replace(target)
      return
    }

    if (result.status === "access-denied") {
      setDeniedDetail(result.reason ? (DENIED_MESSAGES[result.reason] ?? null) : null)
    }
    setState(result.status)
  }

  return (
    <main className="from-background to-muted flex min-h-svh items-center justify-center bg-gradient-to-b px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">StaffRail Portal</CardTitle>
          <CardDescription>
            Sign in with your administrator or employee account
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit} noValidate>
          <CardContent className="space-y-4">
            {state !== "idle" && state !== "loading" ? (
              <div
                role="alert"
                className={
                  "rounded-md border px-3 py-2 text-sm " +
                  (state === "access-denied"
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "border-destructive/30 bg-destructive/5 text-destructive")
                }
              >
                {state === "access-denied" && deniedDetail
                  ? deniedDetail
                  : FAILURE_MESSAGES[state]}
                {state === "access-denied" && !deniedDetail ? (
                  <p className="mt-1 text-destructive/80 text-xs">
                    If you believe this is a mistake, contact your StaffRail
                    administrator.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="admin@staffrail.local"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={busy}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-sky-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={busy}
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 text-xs text-slate-600">
              <p className="mb-1.5 font-medium text-slate-700">Quick-fill local demo account:</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setEmail(DEMO_ADMIN_EMAIL)
                    setPassword(DEMO_PASSWORD)
                  }}
                >
                  Demo Admin
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setEmail(DEMO_EMPLOYEE_EMAIL)
                    setPassword(DEMO_PASSWORD)
                  }}
                >
                  Demo Employee
                </Button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="mt-2 flex-col gap-3">
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
            <p className="text-muted-foreground text-center text-xs">
              Need email confirmation?{" "}
              <Link href="/verify-email" className="font-medium text-sky-700 hover:underline">
                Verify your email
              </Link>
            </p>
            {showRedirectNotice ? (
              <p className="text-muted-foreground text-center text-xs">
                You will return to where you left off after signing in.
              </p>
            ) : null}
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
