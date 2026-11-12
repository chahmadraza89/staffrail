"use client"

/**
 * Client-side sign-in helpers shared by the login page UI.
 */
import type { AuthFailureReason } from "@/lib/auth/types"

export interface StartSignInResult {
  status: "success"
  redirect: string
}

export type StartSignInFailure =
  | { status: "invalid-credentials" }
  | { status: "access-denied"; reason?: AuthFailureReason }
  | { status: "network-error" }
  | { status: "config" }

/**
 * Exchanges email/password credentials + CSRF token for a signed HttpOnly
 * server session cookie.
 */
export async function startAdminSignIn(
  email: string,
  password: string,
  redirectTarget: string,
): Promise<StartSignInResult | StartSignInFailure> {
  if (!email.trim() || !password) {
    return { status: "invalid-credentials" }
  }

  try {
    const csrfToken = await fetchCsrfToken()
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-staffrail-csrf": csrfToken,
      },
      body: JSON.stringify({ email: email.trim(), password, redirect: redirectTarget }),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: AuthFailureReason }
      switch (payload.error) {
        case "invalid_session":
          return { status: "invalid-credentials" }
        case "not_configured":
        case "csrf_rejected":
          return { status: "config" }
        case "email_not_verified":
        case "profile_missing":
        case "not_admin":
        case "account_inactive":
          return { status: "access-denied", reason: payload.error }
        default:
          return { status: "network-error" }
      }
    }

    const payload = (await response.json()) as { ok?: boolean; redirect?: string }
    return { status: "success", redirect: payload.redirect ?? redirectTarget }
  } catch {
    return { status: "network-error" }
  }
}

async function fetchCsrfToken(): Promise<string> {
  const response = await fetch("/api/auth/csrf", { cache: "no-store" })
  if (!response.ok) {
    throw new Error("csrf-fetch-failed")
  }
  const payload = (await response.json()) as { token?: string }
  if (!payload.token) {
    throw new Error("csrf-token-missing")
  }
  return payload.token
}

/** Clears the server session cookie and client query caches. */
export async function endAdminSession(queryClient?: { clear: () => void }): Promise<void> {
  await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined)
  queryClient?.clear()
}
