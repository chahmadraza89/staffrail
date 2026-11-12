"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  Bell,
  ChevronRight,
  KeyRound,
  LogOut,
  Mail,
  Pencil,
  ShieldCheck,
  Trash2,
} from "lucide-react"

import { splitProfileName, type AdminSelfProfile } from "@/lib/admin/profile-models"
import { endAdminSession } from "@/lib/auth/client-auth"

import { ProfileAvatar } from "@/app/dashboard/profile/profile-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * Admin profile overview — port of Flutter `AdminProfileView`
 * (admin_profile_view.dart + admin_profile_header.dart +
 * admin_profile_view_widgets.dart).
 *
 * Corrections (documented in admin/README.md):
 *  1. The Flutter "Push Notifications" toggle only mutates local widget state;
 *     it never writes a preference. The web panel shows a read-only
 *     "Mobile app" note instead of pretending the switch saves anything.
 *  2. "Delete Account" is presented as "Dissolve Workspace", matching what
 *     AuthViewModel.deleteWorkspace actually does.
 */
export function AdminProfileView({ profile }: { profile: AdminSelfProfile }) {
  const { firstName, lastName } = splitProfileName(profile.name)
  const roleLabel = profile.role === "admin" ? "Administrator" : "Employee"

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm">
          Manage your StaffRail administrator account.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <ProfileAvatar name={profile.name} photoUrl={profile.photoUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-semibold tracking-tight">
              {profile.name}
            </h2>
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <Mail className="size-3.5 shrink-0" />
              <span className="truncate">{profile.email}</span>
            </p>
            <Badge variant="secondary" className="mt-2">
              {roleLabel}
            </Badge>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard/profile/edit">
              <Pencil className="mr-2 size-4" />
              Edit Profile
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-5 sm:grid-cols-3">
            <ProfileField label="First Name" value={firstName || "—"} />
            <ProfileField label="Last Name" value={lastName || "—"} />
            <ProfileField label="Email Address" value={profile.email || "—"} />
          </dl>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Settings &amp; Preferences</CardTitle>
          <CardDescription>Security, privacy and session controls.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            <div className="flex items-center gap-4 px-4 py-4">
              <RowIcon icon={<Bell className="size-4" />} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">Push Notifications</p>
                <p className="text-muted-foreground text-xs">
                  Delivery is managed by the StaffRail mobile app. This console does not
                  store a notification preference.
                </p>
              </div>
              <Badge variant="outline" className="shrink-0">
                Mobile app
              </Badge>
            </div>

            <SettingsLink
              href="/dashboard/profile/password"
              icon={<KeyRound className="size-4" />}
              title="Change Password"
              description="Reauthenticate, then set a new password."
            />
            <SettingsLink
              href="/dashboard/profile/privacy"
              icon={<ShieldCheck className="size-4" />}
              title="Privacy &amp; Security"
              description="How StaffRail collects, uses and retains data."
            />
            <SettingsLink
              href="/dashboard/profile/delete"
              icon={<Trash2 className="size-4" />}
              title="Dissolve Workspace"
              description="Deactivate this admin and every linked employee account."
              destructive
            />
            <LogoutRow />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className="mt-1 truncate text-sm font-semibold">{value}</dd>
    </div>
  )
}

function RowIcon({ icon, destructive }: { icon: ReactNode; destructive?: boolean }) {
  return (
    <span
      className={
        "flex size-9 shrink-0 items-center justify-center rounded-full " +
        (destructive
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground")
      }
    >
      {icon}
    </span>
  )
}

function SettingsLink({
  href,
  icon,
  title,
  description,
  destructive,
}: {
  href: string
  icon: ReactNode
  title: string
  description: string
  destructive?: boolean
}) {
  return (
    <Link
      href={href}
      className="hover:bg-muted/50 focus-visible:bg-muted/50 flex items-center gap-4 px-4 py-4 outline-none transition-colors"
    >
      <RowIcon icon={icon} destructive={destructive} />
      <span className="min-w-0 flex-1">
        <span
          className={
            "block font-medium " + (destructive ? "text-destructive" : undefined)
          }
        >
          {title}
        </span>
        <span className="text-muted-foreground block text-xs">{description}</span>
      </span>
      <ChevronRight className="text-muted-foreground size-4 shrink-0" />
    </Link>
  )
}

function LogoutRow() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleLogout() {
    if (busy) {
      return
    }
    setBusy(true)
    await endAdminSession(queryClient)
    router.replace("/login")
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hover:bg-destructive/5 focus-visible:bg-destructive/5 flex w-full items-center gap-4 px-4 py-4 text-left outline-none transition-colors"
      >
        <span className="bg-destructive/10 text-destructive flex size-9 shrink-0 items-center justify-center rounded-full">
          <LogOut className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-destructive block font-semibold">Log out</span>
          <span className="text-muted-foreground block text-xs">
            End this browser session.
          </span>
        </span>
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!busy) {
            setOpen(next)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leaving so soon?</DialogTitle>
            <DialogDescription>
              You will need to sign back in to access the StaffRail admin console.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              data-testid="confirm-logout"
              disabled={busy}
              onClick={handleLogout}
            >
              {busy ? "Signing out…" : "Log out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
