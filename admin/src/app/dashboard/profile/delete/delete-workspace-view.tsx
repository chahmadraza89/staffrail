"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, ArrowLeft, Loader2, ShieldAlert, Trash2 } from "lucide-react"

import {
  ProfileActionError,
  deleteAdminWorkspace,
} from "@/lib/admin/profile-actions"
import { endAdminSession } from "@/lib/auth/client-auth"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const CONFIRMATION_WORD = "DELETE"

const CONSEQUENCES = [
  "This admin profile is immediately deactivated and cannot sign in.",
  "Every employee profile linked to this workspace is deactivated with it.",
  "Onboarding, training and clearance records are preserved — nothing is permanently erased by this screen.",
  "Login accounts are preserved for a 30-day recovery window. Contact support to restore the workspace.",
] as const

/**
 * Dissolve Workspace — port of Flutter `AdminDeleteAccountData` +
 * `UserDeleteTile` (admin_delete_account_data.dart / user_delete_tile.dart).
 *
 * The Flutter confirmation copy says the action is "final and irreversible"
 * and that data is "permanently wiped"; the actual service is a cascading
 * soft-delete. This screen describes the real operation so an admin is never
 * misled about what has been erased.
 */
export function DeleteWorkspaceView({
  uid,
  email,
}: {
  uid: string
  email: string
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [confirmation, setConfirmation] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirmed = confirmation.trim() === CONFIRMATION_WORD
  const canSubmit = confirmed && password.length > 0 && !busy

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) {
      return
    }

    setError(null)
    setBusy(true)
    try {
      await deleteAdminWorkspace({ uid, email, password })
      await endAdminSession(queryClient)
      router.replace("/login")
      router.refresh()
    } catch (caught) {
      setError(
        caught instanceof ProfileActionError
          ? caught.message
          : "The workspace could not be dissolved. Please try again.",
      )
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard/profile">
            <ArrowLeft className="mr-1.5 size-4" />
            Profile
          </Link>
        </Button>
      </div>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dissolve Workspace</h1>
        <p className="text-muted-foreground text-sm">
          Deactivate this admin account and every employee linked to it.
        </p>
      </header>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <ShieldAlert className="size-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            This takes effect immediately. Auth accounts and records are retained for
            recovery rather than permanently deleted.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="bg-destructive/5 border-destructive/20 rounded-lg border p-4">
            <p className="text-destructive flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="size-4" />
              Once the workspace is dissolved:
            </p>
            <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
              {CONSEQUENCES.map((consequence) => (
                <li key={consequence} className="flex items-start gap-2">
                  <span className="bg-destructive mt-1.5 size-1.5 shrink-0 rounded-full" />
                  <span>{consequence}</span>
                </li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
            <div className="grid gap-2">
              <Label htmlFor="delete-confirmation">
                Type <span className="text-destructive font-bold">{CONFIRMATION_WORD}</span> to
                confirm
              </Label>
              <Input
                id="delete-confirmation"
                data-testid="delete-confirmation"
                autoComplete="off"
                value={confirmation}
                disabled={busy}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="delete-password">Enter your current password</Label>
              <Input
                id="delete-password"
                data-testid="delete-password"
                type="password"
                autoComplete="current-password"
                value={password}
                disabled={busy}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {error ? (
              <p role="alert" data-testid="delete-error" className="text-destructive text-sm">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button asChild variant="outline" type="button">
                <Link href="/dashboard/profile">Cancel</Link>
              </Button>
              <Button
                type="submit"
                variant="destructive"
                data-testid="delete-submit"
                disabled={!canSubmit}
              >
                {busy ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 size-4" />
                )}
                {busy ? "Dissolving…" : "Dissolve Workspace"}
              </Button>
            </div>
          </form>
        </CardContent>

        <CardFooter className="text-muted-foreground text-xs">
          The operation writes `isActive: false`, `deletedAt` and a deletion reason to
          the admin and linked employee documents.
        </CardFooter>
      </Card>
    </div>
  )
}
