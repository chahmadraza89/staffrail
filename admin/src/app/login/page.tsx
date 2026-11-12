import type { Metadata } from "next"

import { LoginForm } from "@/app/login/login-form"
import { isSafeRedirectTarget, normalizeRedirectTarget } from "@/lib/auth/redirect"

// Auth-related pages resolve per-request state (search params, session);
// treat as blocking routes.
export const instant = false

export const metadata: Metadata = {
  title: "Sign in",
}

interface LoginPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const raw = typeof params.redirect === "string" ? params.redirect : null
  // Normalized server-side; the client re-validates before navigating.
  const redirectTarget = normalizeRedirectTarget(raw)
  const showRedirectNotice = isSafeRedirectTarget(raw)

  return <LoginForm redirectTarget={redirectTarget} showRedirectNotice={showRedirectNotice} />
}
