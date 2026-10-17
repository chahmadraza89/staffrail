"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"

import { endAdminSession } from "@/lib/auth/client-auth"

import { Button } from "@/components/ui/button"

/**
 * Logout: clears the server session cookie, signs out the Firebase browser
 * instance, and clears any cached per-account client state (queries).
 */
export function SignOutButton({
  className,
  variant = "outline",
}: {
  className?: string
  variant?: "outline" | "ghost" | "default"
} = {}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)

  async function handleSignOut() {
    if (busy) {
      return
    }
    setBusy(true)
    await endAdminSession(queryClient)
    queryClient.clear() // belt & braces: clear per-account caches
    router.replace("/login")
    router.refresh()
  }

  return (
    <Button variant={variant} onClick={handleSignOut} disabled={busy} className={className}>
      {busy ? "Signing out…" : "Sign out"}
    </Button>
  )
}
