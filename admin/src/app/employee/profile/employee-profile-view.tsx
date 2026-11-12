"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Bell,
  ChevronRight,
  FileText,
  HelpCircle,
  KeyRound,
  LogOut,
  Shield,
  Trash2,
  UserPen,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { endAdminSession } from "@/lib/auth/client-auth"
import { profileInitials, splitProfileName } from "@/lib/admin/profile-models"
import { updateEmployeeNotificationPreferences } from "@/lib/employee/employee-actions"
import {
  EMPTY_EMPLOYEE_WORKSPACE,
  subscribeEmployeeWorkspace,
  type EmployeeProfileData,
} from "@/lib/employee/employee-streams"

export function EmployeeProfileView({ initialProfile }: { initialProfile: EmployeeProfileData }) {
  const router = useRouter()
  const [profile, setProfile] = useState<EmployeeProfileData>(initialProfile)
  const [prefs, setPrefs] = useState(initialProfile.notificationPreferences)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [prefsFeedback, setPrefsFeedback] = useState<string | null>(null)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    const unsub = subscribeEmployeeWorkspace(
      initialProfile.uid,
      (snap) => {
        if (snap.profile) {
          setProfile(snap.profile)
          setPrefs(snap.profile.notificationPreferences)
        }
      },
      () => {},
    )
    return () => unsub()
  }, [initialProfile.uid])

  // Keep EMPTY_EMPLOYEE_WORKSPACE cleanly referenced when needed or fallback nicely.
  const name = profile.name || EMPTY_EMPLOYEE_WORKSPACE.profile?.name || initialProfile.email
  const { firstName, lastName } = splitProfileName(name)

  const togglePref = async (key: keyof typeof prefs) => {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    setSavingPrefs(true)
    setPrefsFeedback(null)
    try {
      await updateEmployeeNotificationPreferences({
        employeeId: profile.uid,
        preferences: next,
      })
      setPrefsFeedback("Notification preferences saved.")
    } catch {
      setPrefs(prefs)
      setPrefsFeedback("Could not update notification preferences right now.")
    } finally {
      setSavingPrefs(false)
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await endAdminSession()
      router.replace("/login")
      router.refresh()
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6" data-testid="employee-profile-view">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-lg font-bold text-sky-800">
            {profileInitials(name)}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{name}</h1>
            <p className="text-sm text-slate-500">{profile.email}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-800">
                Employee
              </span>
              {profile.department && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  {profile.department}
                </span>
              )}
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => setLogoutOpen(true)}
          className="border-rose-200 text-rose-700 hover:bg-rose-50"
        >
          <LogOut className="mr-1.5 h-4 w-4" />
          Log out
        </Button>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Personal Information</h2>
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-400">First Name</p>
            <p className="font-medium text-slate-800">{firstName || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Last Name</p>
            <p className="font-medium text-slate-800">{lastName || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Email</p>
            <p className="font-medium text-slate-800">{profile.email}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Phone Number</p>
            <p className="font-medium text-slate-800">{profile.phoneNumber || "Not set"}</p>
          </div>
        </div>
      </section>

      <section
        data-testid="employee-notification-settings"
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-sky-700" />
            <h2 className="text-base font-semibold text-slate-900">Notification Preferences</h2>
          </div>
          {prefsFeedback && <span className="text-xs text-sky-700">{prefsFeedback}</span>}
        </div>
        <div className="divide-y divide-slate-100">
          {(
            [
              ["pushEnabled", "Push Notifications", "Receive immediate alerts on device and web"],
              ["emailEnabled", "Email Summaries", "Receive compliance status reminders via email"],
              ["taskReminders", "Due Date Reminders", "Alert before onboarding or training expiration"],
              ["adminAlerts", "Supervisor Messages", "Notify when an administrator leaves feedback"],
            ] as const
          ).map(([key, label, hint]) => (
            <div key={key} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{label}</p>
                <p className="text-xs text-slate-500">{hint}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs[key]}
                aria-label={label}
                disabled={savingPrefs}
                onClick={() => void togglePref(key)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  prefs[key] ? "bg-sky-700" : "bg-slate-200"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    prefs[key] ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-xs">
        <SettingsRow href="/employee/profile/documents" icon={FileText} label="Document Center" hint="View and download uploaded onboarding, training, and clearance files" />
        <SettingsRow href="/employee/profile/edit" icon={UserPen} label="Edit Profile" hint="Update your display name, department, and phone number" />
        <SettingsRow href="/employee/profile/password" icon={KeyRound} label="Change Password" hint="Update your StaffRail password (12+ chars security standard)" />
        <SettingsRow href="/employee/profile/privacy" icon={Shield} label="Privacy & Security" hint="Review confidentiality and HIPAA security practices" />
        <SettingsRow href="/employee/profile/support" icon={HelpCircle} label="Contact Support" hint="Message your compliance manager or help desk" />
        <SettingsRow
          href="/employee/profile/delete"
          icon={Trash2}
          label="Deactivate Account"
          hint="Request recoverable account deactivation"
          danger
        />
      </section>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign out of StaffRail?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Your active session on this browser will end cleanly.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setLogoutOpen(false)} disabled={loggingOut}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? "Signing out..." : "Sign out"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SettingsRow({
  href,
  icon: Icon,
  label,
  hint,
  danger = false,
}: {
  href: string
  icon: typeof FileText
  label: string
  hint: string
  danger?: boolean
}) {
  return (
    <Link href={href} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            danger ? "bg-rose-50 text-rose-700" : "bg-sky-50 text-sky-700"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className={`text-sm font-medium ${danger ? "text-rose-700" : "text-slate-900"}`}>
            {label}
          </p>
          <p className="text-xs text-slate-500">{hint}</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-400" />
    </Link>
  )
}
