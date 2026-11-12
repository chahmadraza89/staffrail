"use client"

import Link from "next/link"
import { useState, type FormEvent } from "react"
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react"

import {
  ProfileActionError,
  changeAdminPassword,
} from "@/lib/admin/profile-actions"
import {
  isStrongPassword,
  passwordRuleChecks,
  passwordValidationMessage,
} from "@/lib/admin/profile-models"

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

/**
 * Change Password — port of Flutter `ChangePasswordView`
 * (admin_passoword_tile_view.dart).
 *
 * The current password is reauthenticated before `updatePassword`. The live
 * checklist uses the exact Flutter admin rules: 12+ characters, uppercase,
 * lowercase, number and special character.
 */
export function ChangePasswordView({
  uid,
  email,
}: {
  uid: string
  email: string
}) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const rules = passwordRuleChecks(newPassword)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy) {
      return
    }
    setSuccess(false)

    if (currentPassword.length === 0) {
      setError("Enter your current password.")
      return
    }
    const passwordError = passwordValidationMessage(newPassword)
    if (!isStrongPassword(newPassword)) {
      setError(passwordError ?? "Choose a stronger password.")
      return
    }
    if (confirmPassword.length === 0) {
      setError("Confirm your new password.")
      return
    }
    if (confirmPassword !== newPassword) {
      setError("The confirmation does not match the new password.")
      return
    }

    setError(null)
    setBusy(true)
    try {
      await changeAdminPassword({
        uid,
        email,
        currentPassword,
        newPassword,
      })
      setSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (caught) {
      setError(
        caught instanceof ProfileActionError
          ? caught.message
          : "Your password could not be updated. Please try again.",
      )
    } finally {
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
        <h1 className="text-2xl font-semibold tracking-tight">Security Settings</h1>
        <p className="text-muted-foreground text-sm">
          Reauthenticate with your current password before choosing a new one.
        </p>
      </header>

      {success ? (
        <Card className="border-emerald-600/30">
          <CardContent className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-medium">Password updated successfully.</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Use the new password the next time you sign in.
              </p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/dashboard/profile">Back to profile</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="size-4" />
                Change Password
              </CardTitle>
              <CardDescription>
                Your new password must meet every requirement below.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid gap-2">
                <Label htmlFor="current-password">Old Password</Label>
                <PasswordInput
                  id="current-password"
                  autoComplete="current-password"
                  value={currentPassword}
                  visible={showCurrent}
                  disabled={busy}
                  onToggle={() => setShowCurrent((value) => !value)}
                  onChange={setCurrentPassword}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="new-password">New Password</Label>
                <PasswordInput
                  id="new-password"
                  autoComplete="new-password"
                  value={newPassword}
                  visible={showNew}
                  disabled={busy}
                  onToggle={() => setShowNew((value) => !value)}
                  onChange={setNewPassword}
                />

                {newPassword.length > 0 ? (
                  <ul
                    data-testid="password-rules"
                    className="mt-1 grid gap-1.5 rounded-lg border bg-muted/30 p-3 text-xs sm:grid-cols-2"
                  >
                    {rules.map((rule) => (
                      <li key={rule.id} className="flex items-center gap-1.5">
                        {rule.met ? (
                          <CheckCircle2 className="size-3.5 text-emerald-600" />
                        ) : (
                          <XCircle className="text-muted-foreground size-3.5" />
                        )}
                        <span
                          className={
                            rule.met ? "text-foreground" : "text-muted-foreground"
                          }
                        >
                          {rule.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    At least 12 characters with uppercase, lowercase, a number and a
                    special character.
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <PasswordInput
                  id="confirm-password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  visible={showConfirm}
                  disabled={busy}
                  onToggle={() => setShowConfirm((value) => !value)}
                  onChange={setConfirmPassword}
                />
              </div>

              {error ? (
                <p role="alert" data-testid="password-error" className="text-destructive text-sm">
                  {error}
                </p>
              ) : null}
            </CardContent>

            <CardFooter className="justify-end gap-2">
              <Button asChild variant="outline" type="button">
                <Link href="/dashboard/profile">Cancel</Link>
              </Button>
              <Button type="submit" data-testid="password-submit" disabled={busy}>
                {busy ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 size-4" />
                )}
                {busy ? "Updating…" : "Update password"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}
    </div>
  )
}

function PasswordInput({
  id,
  value,
  visible,
  disabled,
  autoComplete,
  onChange,
  onToggle,
}: {
  id: string
  value: string
  visible: boolean
  disabled: boolean
  autoComplete: string
  onChange: (value: string) => void
  onToggle: () => void
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="pr-9"
      />
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-label={visible ? "Hide password" : "Show password"}
        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-md disabled:opacity-50"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}
