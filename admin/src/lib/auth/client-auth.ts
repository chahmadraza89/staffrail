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
 * Signs the admin in with the Firebase browser SDK first (so the browser
 * gets its own auth instance), then exchanges the ID token for a secure
 * HttpOnly server cookie.
 */
export async function startAdminSignIn(
  email: string,
  password: string,
  redirectTarget: string,
): Promise<StartSignInResult | StartSignInFailure> {
  let idToken: string

  try {
    const { signInWithEmailAndPassword } = await import("firebase/auth")
    const { getFirebaseAuth } = await import("@/lib/firebase/client")
    const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password)

    // Mirror the Flutter app: an unverified email is rejected up-front.
    if (!credential.user.emailVerified) {
      const { signOut } = await import("firebase/auth")
      const { getFirebaseAuth } = await import("@/lib/firebase/client")
      await signOut(getFirebaseAuth()).catch(() => undefined)
      return { status: "access-denied", reason: "email_not_verified" }
    }

    idToken = await credential.user.getIdToken()
  } catch (error) {
    return mapAuthError(error)
  }

  try {
    const csrfToken = await fetchCsrfToken()
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-staffrail-csrf": csrfToken,
      },
      body: JSON.stringify({ idToken, redirect: redirectTarget }),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: AuthFailureReason }
      switch (payload.error) {
        case "invalid_session":
          return { status: "invalid-credentials" }
        case "not_configured":
          return { status: "config" }
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

/** Clears the server cookie, the Firebase browser auth and client caches. */
export async function endAdminSession(queryClient?: { clear: () => void }): Promise<void> {
  // No CSRF header needed: DELETE only clears your own cookie, same-origin
  // is enforced server-side.
  await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined)

  try {
    const { signOut } = await import("firebase/auth")
    const { getFirebaseAuth } = await import("@/lib/firebase/client")
    await signOut(getFirebaseAuth())
  } catch {
    // Firebase may not be configured in this environment — cookie clear
    // above is the server-significant part.
  }

  queryClient?.clear()
}

function mapAuthError(error: unknown): StartSignInFailure {
  const code = (error as { code?: string })?.code ?? ""
  if (typeof code === "string" && (code.startsWith("auth/") || code.includes("firebase"))) {
    switch (code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
      case "auth/invalid-email":
        return { status: "invalid-credentials" }
      case "auth/user-disabled":
        return { status: "access-denied", reason: "account_inactive" }
      case "auth/too-many-requests":
        return { status: "invalid-credentials" }
      case "auth/network-request-failed":
        return { status: "network-error" }
      case "auth/invalid-api-key":
      case "auth/api-key-not-valid":
        return { status: "config" }
      default:
        return { status: "network-error" }
    }
  }
  return { status: "network-error" }
}
