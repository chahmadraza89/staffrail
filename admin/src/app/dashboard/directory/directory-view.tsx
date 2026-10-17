"use client"

import Link from "next/link"
import { useCallback, useMemo, useState, type FormEvent } from "react"
import {
  CirclePlus,
  CircleUser,
  Copy,
  FilePenLine,
  Loader2,
  Search,
  UserRoundSearch,
  X,
} from "lucide-react"

import {
  subscribeAdminEmployeesProgress,
} from "@/lib/admin/dashboard-streams"
import type { AdminEmployeeProgress } from "@/lib/admin/dashboard-models"
import {
  DEFAULT_DIRECTORY_FILTER,
  applyDirectoryFilter,
  formatLastActivity,
  getInitials,
  getPhase,
  matchesDirectorySearch,
  type DirectoryFilter,
} from "@/lib/admin/directory-format"
import {
  deactivateEmployee,
  registerStaff,
  updateEmployee,
  EmployeeActionError,
} from "@/lib/admin/employee-actions"
import { useLiveQuery } from "@/lib/react/use-live-query"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

/**
 * Employee Directory — port of the Flutter AdminDirectoryListData +
 * AdminDirectoryProfileCard + AdminEmployeeForm flows:
 *   - live employee cards (overall/onboarding/training progress, phase chip,
 *     last-activity text)
 *   - Active/Deactivated/All filter chips (default: Active)
 *   - client-side name/email search
 *   - Add New Staff (registerStaff callable + seeding, reset-link success
 *     dialog), Edit (name/email update), Deactivate (soft delete)
 */

const EMPTY: AdminEmployeeProgress[] = []

const FILTER_LABELS: Array<{ value: DirectoryFilter; label: string }> = [
  { value: "active", label: "Active" },
  { value: "deactivated", label: "Deactivated" },
  { value: "all", label: "All" },
]

export function DirectoryView({
  adminUid,
  adminEmail,
}: {
  adminUid: string
  adminEmail: string
}) {
  const [filter, setFilter] = useState<DirectoryFilter>(DEFAULT_DIRECTORY_FILTER)
  const [search, setSearch] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AdminEmployeeProgress | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<AdminEmployeeProgress | null>(null)

  const subscribe = useCallback(
    (ctrl: Parameters<typeof subscribeAdminEmployeesProgress>[1]) =>
      subscribeAdminEmployeesProgress(adminUid, ctrl),
    [adminUid],
  )
  const employees = useLiveQuery<AdminEmployeeProgress[]>({
    key: adminUid,
    subscribe,
    initialData: EMPTY,
  })

  const visible = useMemo(
    () =>
      applyDirectoryFilter(employees.data, filter).filter((employee) =>
        matchesDirectorySearch(employee, search),
      ),
    [employees.data, filter, search],
  )

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employee Directory</h1>
          <p className="text-muted-foreground text-sm">Signed in as {adminEmail}</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <CirclePlus className="mr-2 size-4" />
          Add New Staff
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <FilterChips value={filter} onChange={setFilter} />
        <div className="relative w-full max-w-xs">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={search}
            placeholder="Search employees…"
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {employees.status === "error" ? (
        <LiveErrorCard error={employees.error} retry={employees.retry} />
      ) : null}

      {employees.status === "connecting" ? (
        <ConnectingGrid />
      ) : visible.length === 0 ? (
        <EmptyState
          hasAnyEmployees={employees.data.length > 0}
          filter={filter}
          searching={search.trim().length > 0}
        />
      ) : (
        <GridWrapper>
          {visible.map((employee) => (
            <ProfileCard
              key={employee.uid}
              employee={employee}
              onEdit={() => setEditTarget(employee)}
              onDeactivate={() => setConfirmTarget(employee)}
            />
          ))}
        </GridWrapper>
      )}

      <AddEmployeeDialog
        open={addOpen}
        adminUid={adminUid}
        onClose={() => setAddOpen(false)}
      />

      <EditEmployeeDialog
        employee={editTarget}
        onClose={() => setEditTarget(null)}
      />

      <DeactivateConfirmDialog
        employee={confirmTarget}
        onClose={() => setConfirmTarget(null)}
      />
    </div>
  )
}

/* ── scaffolding ────────────────────────────────────────────────────────── */

function ConnectingGrid() {
  return (
    <GridWrapper>
      {Array.from({ length: 3 }, (_, index) => (
        <Card key={index} data-testid="directory-skeleton" className="animate-pulse">
          <CardContent className="space-y-3 p-5">
            <div className="bg-muted h-10 w-10 rounded-full" />
            <div className="bg-muted h-4 w-3/4 rounded" />
            <div className="bg-muted h-3 w-1/2 rounded" />
            <div className="bg-muted h-2 w-full rounded-full" />
          </CardContent>
        </Card>
      ))}
    </GridWrapper>
  )
}

function GridWrapper({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
}

function LiveErrorCard({
  error,
  retry,
}: {
  error: Error | null
  retry: () => void
}) {
  const code = (error as { code?: unknown } | null)?.code
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <p>
        Employee list could not be streamed.{error?.message ? ` (${error.message})` : ""}
        {code ? ` [${String(code)}]` : ""}
      </p>
      <Button size="sm" variant="outline" onClick={retry}>
        Retry
      </Button>
    </div>
  )
}

function EmptyState({
  hasAnyEmployees,
  filter,
  searching,
}: {
  hasAnyEmployees: boolean
  filter: DirectoryFilter
  searching: boolean
}) {
  let text: string
  if (searching) {
    text = "No employees match your search."
  } else if (filter === "deactivated") {
    text = "No deactivated employees."
  } else if (!hasAnyEmployees) {
    text = "No employees yet — add your first staff member."
  } else {
    text = "No active employees."
  }
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <UserRoundSearch className="text-muted-foreground size-8" />
      <p className="text-muted-foreground text-sm">{text}</p>
    </div>
  )
}

function FilterChips({
  value,
  onChange,
}: {
  value: DirectoryFilter
  onChange: (next: DirectoryFilter) => void
}) {
  return (
    <div className="flex flex-wrap gap-2" data-testid="directory-filters">
      {FILTER_LABELS.map((entry) => {
        const selected = entry.value === value
        return (
          <button
            key={entry.value}
            type="button"
            onClick={() => onChange(entry.value)}
            aria-pressed={selected}
            className={
              "rounded-lg border px-3 py-1.5 text-sm transition-colors " +
              (selected
                ? "bg-primary/15 border-primary/30 text-primary font-semibold"
                : "border-border text-muted-foreground hover:border-primary/20 hover:text-foreground")
            }
          >
            {entry.label}
          </button>
        )
      })}
    </div>
  )
}

/* ── profile card (AdminDirectoryProfileCard port) ─────────────────────── */

const TONE_CLASSES = {
  orange: "border-amber-200 bg-amber-50 text-amber-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  purple: "border-purple-200 bg-purple-50 text-purple-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
} as const

function ProfileCard({
  employee,
  onEdit,
  onDeactivate,
}: {
  employee: AdminEmployeeProgress
  onEdit: () => void
  onDeactivate: () => void
}) {
  const phase = getPhase(employee.overallProgress)
  const statusText = employee.isActive
    ? formatLastActivity(employee.lastLogin)
    : "Deactivated"

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className={
              "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold " +
              (employee.isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")
            }
          >
            {getInitials(employee.name)}
          </span>
          <div className="min-w-0 flex-1">
            <Link
              href={`/dashboard/directory/${employee.uid}`}
              className="block truncate font-semibold hover:underline"
            >
              {employee.name}
            </Link>
            <p className="text-muted-foreground truncate text-xs">{employee.email ?? "N/A"}</p>
          </div>
          <Badge variant={employee.isActive ? "secondary" : "outline"}>{statusText}</Badge>
        </div>

        <div className="space-y-2">
          <MiniProgress label="Overall" value={employee.overallProgress} tone="primary" />
          <div className="text-muted-foreground flex gap-4 text-[11px]">
            <span>Onboarding {percent(employee.onboardingProgress)}%</span>
            <span>Training {percent(employee.trainingProgress)}%</span>
            <span>Clearance {percent(employee.clearanceProgress)}%</span>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <span className={"rounded-md border px-2 py-0.5 text-xs font-medium " + TONE_CLASSES[phase.tone]}>
            {phase.text}
          </span>
          <span className="flex-1" />
          {employee.isActive ? (
            <>
              <Button asChild size="sm" variant="secondary">
                <Link href={`/dashboard/directory/${employee.uid}`}>Details</Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={onEdit}>
                <FilePenLine className="mr-1.5 size-3.5" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={onDeactivate}
              >
                Deactivate
              </Button>
            </>
          ) : (
            <Button asChild size="sm" variant="secondary">
              <Link href={`/dashboard/directory/${employee.uid}`}>View record</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function percent(value: number): number {
  return Math.round(Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0)) * 100)
}

function MiniProgress({ label, value, tone }: { label: string; value: number; tone: "primary" }) {
  const pct = percent(value)
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground w-14">{label}</span>
      <Progress
        value={pct}
        aria-label={`${label} progress ${pct}%`}
        data-tone={tone}
        className="h-2"
      />
      <span className="text-muted-foreground w-9 text-right tabular-nums">{pct}%</span>
    </div>
  )
}

/* ── dialogs (AdminEmployeeForm port) ──────────────────────────────────── */

function AddEmployeeDialog({
  open,
  adminUid,
  onClose,
}: {
  open: boolean
  adminUid: string
  onClose: () => void
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ uid: string; resetLink: string | null } | null>(null)
  const [copied, setCopied] = useState(false)

  const reset = () => {
    setName("")
    setEmail("")
    setError(null)
    setResult(null)
    setCopied(false)
  }

  const handleClose = () => {
    if (!submitting) {
      onClose()
      // Reset after the dialog animation window to avoid a visual flash.
      setTimeout(reset, 150)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (name.trim().length === 0) {
      setError("Name is required")
      return
    }
    if (email.trim().length === 0 || !email.trim().includes("@")) {
      setError("Invalid email format")
      return
    }
    setSubmitting(true)
    try {
      const registered = await registerStaff({
        name: name.trim(),
        email: email.trim(),
        adminUid,
      })
      setResult(registered)
      setName("")
      setEmail("")
    } catch (caught) {
      setError(
        caught instanceof EmployeeActionError ? caught.message : "Staff registration failed.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : handleClose())}>
      <DialogContent data-testid="add-employee-dialog">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>Staff Registered</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground text-sm">
              The account <strong>{result.uid}</strong> was created. Send the employee their
              password setup link (shown once):
            </p>
            <div className="border-border bg-muted/40 flex items-start gap-2 rounded-md border p-3 text-xs">
              <span className="min-w-0 flex-1 break-all">{result.resetLink ?? "(no link returned)"}</span>
              {result.resetLink ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(result.resetLink ?? "")
                      setCopied(true)
                    } catch {
                      setCopied(false)
                    }
                  }}
                >
                  <Copy className="mr-1.5 size-3.5" />
                  {copied ? "Copied" : "Copy"}
                </Button>
              ) : null}
            </div>
            <Button className="w-full" onClick={handleClose}>
              Done
            </Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="add-employee-form">
              <div className="space-y-1.5">
                <Label htmlFor="employee-name">Full Name</Label>
                <Input
                  id="employee-name"
                  value={name}
                  disabled={submitting}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Full Name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="employee-email">Email Address</Label>
                <Input
                  id="employee-email"
                  type="email"
                  value={email}
                  disabled={submitting}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="e.g. john@example.com"
                />
              </div>
              {error ? (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
                  <X className="mr-1.5 size-3.5" />
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CircleUser className="mr-2 size-4" />}
                  Add Employee
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function EditEmployeeDialog({
  employee,
  onClose,
}: {
  employee: AdminEmployeeProgress | null
  onClose: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!employee) {
      return
    }
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get("name") ?? "").trim()
    const email = String(formData.get("email") ?? "").trim()

    setError(null)
    if (name.length === 0) {
      setError("Name is required")
      return
    }
    if (email.length === 0 || !email.includes("@")) {
      setError("Invalid email format")
      return
    }
    setSubmitting(true)
    try {
      await updateEmployee({ uid: employee.uid, name, email })
      onClose()
    } catch (caught) {
      setError(
        caught instanceof EmployeeActionError ? caught.message : "Failed to update employee.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={employee !== null} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent data-testid="edit-employee-dialog" key={employee?.uid ?? "none"}>
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          data-testid="edit-employee-form"
        >
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Full Name</Label>
            {/* defaultValue keyed to the target so the form re-seeds per employee. */}
            <Input
              id="edit-name"
              name="name"
              key={`name-${employee?.uid ?? ""}`}
              defaultValue={employee?.name ?? ""}
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Email Address</Label>
            <Input
              id="edit-email"
              name="email"
              type="email"
              key={`email-${employee?.uid ?? ""}`}
              defaultValue={employee?.email ?? ""}
              disabled={submitting}
            />
          </div>
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Update Profile
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeactivateConfirmDialog({
  employee,
  onClose,
}: {
  employee: AdminEmployeeProgress | null
  onClose: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!employee) {
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await deactivateEmployee(employee.uid)
      onClose()
    } catch (caught) {
      setError(
        caught instanceof EmployeeActionError ? caught.message : "Failed to deactivate employee.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={employee !== null} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent data-testid="deactivate-dialog" key={employee?.uid ?? "none"}>
        <DialogHeader>
          <DialogTitle>Deactivate employee?</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          {employee?.name ?? "This employee"} will be marked inactive. Their history and records are
          preserved (soft delete), and they can no longer sign in.
        </p>
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Deactivate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
