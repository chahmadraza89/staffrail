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
export function SignOutButton() {
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
    <Button variant="outline" onClick={handleSignOut} disabled={busy}>
      {busy ? "Signing out…" : "Sign out"}
    </Button>
  )
}
