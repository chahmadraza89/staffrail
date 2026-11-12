import "server-only"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { SESSION_COOKIE } from "@/lib/auth/constants"
import { verifyLocalSessionCookie } from "@/lib/auth/local-token"
import { AppAuthError, type AuthFailureReason } from "@/lib/auth/types"
import { DATA_COLLECTIONS } from "@/lib/data/collections"
import { getAuthAccountByUid, getServerDataStore } from "@/lib/data/server-store"

export type PortalRole = "admin" | "employee"

export interface PortalSessionContext {
  uid: string
  email: string
  role: PortalRole
  profile: {
    name: string
    email: string
    role: PortalRole
    isActive: boolean
    adminId: string | null
    photoUrl: string | null
    department: string | null
    phoneNumber: string | null
    notificationPreferences: {
      pushEnabled: boolean
      emailEnabled: boolean
      taskReminders: boolean
      adminAlerts: boolean
    }
  }
}

export type SessionAnalysis =
  | { status: "authenticated"; context: PortalSessionContext }
  | { status: "rejected"; reason: AuthFailureReason; roleFound?: string }

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function asPrefs(raw: unknown): PortalSessionContext["profile"]["notificationPreferences"] {
  const rec = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  return {
    pushEnabled: rec.pushEnabled !== false,
    emailEnabled: rec.emailEnabled !== false,
    taskReminders: rec.taskReminders !== false,
    adminAlerts: rec.adminAlerts !== false,
  }
}

/**
 * Verifies the local signed session cookie on the server and resolves the
 * user's profile (`admin` or `employee`) from the in-memory store without redirecting.
 */
export async function analyzePortalSession(): Promise<SessionAnalysis> {
  const cookieStore = await cookies()
  const rawCookie = cookieStore.get(SESSION_COOKIE)?.value
  if (!rawCookie) {
    return { status: "rejected", reason: "invalid_session" }
  }

  let decoded: { uid: string; email?: string; email_verified?: boolean }
  try {
    const claims = verifyLocalSessionCookie(rawCookie)
    const account = getAuthAccountByUid(claims.uid)
    if (account) {
      if (account.disabled) {
        return { status: "rejected", reason: "account_inactive" }
      }
      verifyLocalSessionCookie(rawCookie, account.tokenValidAfter)
      decoded = {
        uid: claims.uid,
        email: account.email,
        email_verified: account.emailVerified,
      }
    } else {
      decoded = claims
    }
  } catch {
    return { status: "rejected", reason: "invalid_session" }
  }

  if (decoded.email_verified !== true) {
    return { status: "rejected", reason: "email_not_verified" }
  }

  const snap = await getServerDataStore().getDoc(`${DATA_COLLECTIONS.users}/${decoded.uid}`)
  if (!snap.exists()) {
    return { status: "rejected", reason: "profile_missing" }
  }

  const data = (snap.data() ?? {}) as Record<string, unknown>
  const roleRaw = asString(data.role)
  if (roleRaw !== "admin" && roleRaw !== "employee") {
    return { status: "rejected", reason: "not_admin", roleFound: roleRaw || undefined }
  }
  if (data.isActive !== true || data.deletedAt != null) {
    return { status: "rejected", reason: "account_inactive", roleFound: roleRaw }
  }

  const email = asString(data.email) || asString(decoded.email)

  return {
    status: "authenticated",
    context: {
      uid: decoded.uid,
      email,
      role: roleRaw,
      profile: {
        name: asString(data.name) || email || decoded.uid,
        email,
        role: roleRaw,
        isActive: true,
        adminId: asString(data.adminId) || null,
        photoUrl: asString(data.photoUrl) || null,
        department: asString(data.department) || null,
        phoneNumber: asString(data.phoneNumber) || null,
        notificationPreferences: asPrefs(data.notificationPreferences),
      },
    },
  }
}

export async function requireEmployeePageSession(): Promise<PortalSessionContext> {
  let analysis: SessionAnalysis
  try {
    analysis = await analyzePortalSession()
  } catch {
    redirect("/login?state=expired")
  }

  if (analysis.status !== "authenticated") {
    redirect("/login?state=expired")
  }
  if (analysis.context.role === "admin") {
    redirect("/dashboard")
  }
  return analysis.context
}

export async function requireEmployeeApi(): Promise<PortalSessionContext> {
  const analysis = await analyzePortalSession()
  if (analysis.status !== "authenticated") {
    throw new AppAuthError(analysis.reason)
  }
  if (analysis.context.role !== "employee") {
    throw new AppAuthError("not_admin")
  }
  return analysis.context
}
