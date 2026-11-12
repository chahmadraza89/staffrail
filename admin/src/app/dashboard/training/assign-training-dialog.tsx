"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Loader2, Search, Send, UsersRound } from "lucide-react"

import { EmployeeActionError } from "@/lib/admin/employee-actions"
import {
  assignTraining,
  MAX_ASSIGNMENT_RECIPIENTS,
  type AssignTrainingResult,
} from "@/lib/admin/training-actions"
import type {
  AdminTrainingTemplate,
  TrainingStaffMember,
} from "@/lib/admin/training-models"
import type { LiveQueryResult } from "@/lib/react/use-live-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * "Assign New Training" — port of the Flutter AssignTrainingPanel
 * (admin_training/presentation/screens/widgets/training_assign_card.dart).
 *
 * Flutter loads all employees (inactive included) and assigns to whichever
 * ids are selected, overwriting existing training docs. The web dialog
 * keeps the same flow but:
 *   - inactive employees are visible yet not selectable (and are excluded
 *     from "All Staff");
 *   - template/staff lists must be READY (not connecting/stale) before the
 *     action is enabled, so a partial list can never be mistaken for the
 *     whole clinic;
 *   - existing assignments are preserved by `assignTraining` and reported
 *     back to the page instead of silently resetting progress.
 */

type AudienceMode = "all" | "individual"

interface AssignTrainingDialogProps {
  open: boolean
  adminUid: string
  templates: LiveQueryResult<AdminTrainingTemplate[]>
  staff: LiveQueryResult<TrainingStaffMember[]>
  onOpenChange: (open: boolean) => void
  onAssigned: (
    result: AssignTrainingResult,
    context: { templateTitle: string; audienceSize: number },
  ) => void
}

function todayAsInputValue(): string {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, "0")
  const day = `${now.getDate()}`.padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

/** Parses a date input value in LOCAL time (the Flutter date picker is local). */
function parseDeadline(value: string): Date | null {
  if (value.length === 0) {
    return null
  }
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function AssignTrainingDialog({
  open,
  adminUid,
  templates,
  staff,
  onOpenChange,
  onAssigned,
}: AssignTrainingDialogProps) {
  const [templateId, setTemplateId] = useState("")
  const [deadline, setDeadline] = useState("")
  const [instructions, setInstructions] = useState("")
  const [mode, setMode] = useState<AudienceMode>("all")
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeStaff = useMemo(
    () => staff.data.filter((member) => member.isActive),
    [staff.data],
  )
  const activeIds = useMemo(
    () => new Set(activeStaff.map((member) => member.uid)),
    [activeStaff],
  )
  const filteredStaff = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (needle.length === 0) {
      return staff.data
    }
    return staff.data.filter((member) => member.name.toLowerCase().includes(needle))
  }, [search, staff.data])

  const selectedActiveIds = selectedIds.filter((id) => activeIds.has(id))
  const allActiveSelected =
    activeStaff.length > 0 && selectedActiveIds.length === activeStaff.length

  /** Template list and audience list must both be fully loaded and current. */
  const dataReady = templates.status === "ready" && staff.status === "ready"
  const audienceSize = mode === "all" ? activeStaff.length : selectedActiveIds.length
  const submitDisabled = submitting || !dataReady || templateId.length === 0 || audienceSize === 0

  const reset = () => {
    setTemplateId("")
    setDeadline("")
    setInstructions("")
    setMode("all")
    setSearch("")
    setSelectedIds([])
    setError(null)
    setSubmitting(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (next) {
      onOpenChange(true)
      return
    }
    if (submitting) {
      return
    }
    onOpenChange(false)
    setTimeout(reset, 150)
  }

  const toggleEmployee = (uid: string) => {
    if (!activeIds.has(uid)) {
      return
    }
    setSelectedIds((current) =>
      current.includes(uid)
        ? current.filter((id) => id !== uid)
        : [...current, uid],
    )
  }

  const toggleAll = () => {
    setSelectedIds(allActiveSelected ? [] : activeStaff.map((member) => member.uid))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!dataReady) {
      setError("Wait for the training and employee lists to finish loading.")
      return
    }
    if (templateId.length === 0) {
      setError("Please select a training template.")
      return
    }

    const audience =
      mode === "all" ? activeStaff.map((member) => member.uid) : selectedActiveIds

    if (audience.length === 0) {
      setError(
        mode === "all"
          ? "No active employees found to assign. Ensure staff are linked to your clinic."
          : "Select at least one active employee.",
      )
      return
    }
    if (audience.length > MAX_ASSIGNMENT_RECIPIENTS) {
      setError(
        `Select ${MAX_ASSIGNMENT_RECIPIENTS} employees or fewer per assignment. Split larger audiences into multiple batches.`,
      )
      return
    }

    const template = templates.data.find((entry) => entry.id === templateId)

    setSubmitting(true)
    try {
      const result = await assignTraining({
        adminUid,
        templateId,
        employeeIds: audience,
        deadline: parseDeadline(deadline),
        instructions,
      })
      onAssigned(result, {
        templateTitle: template?.title ?? "Training",
        audienceSize: audience.length,
      })
      reset()
      onOpenChange(false)
    } catch (caught) {
      setError(
        caught instanceof EmployeeActionError
          ? caught.message
          : "The training could not be assigned. Try again.",
      )
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        data-testid="assign-training-dialog"
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>Assign New Training</DialogTitle>
          <DialogDescription>
            Configure and deploy a training module to your team.
          </DialogDescription>
        </DialogHeader>

        <form
          data-testid="assign-training-form"
          className="space-y-6"
          onSubmit={handleSubmit}
        >
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">1. Training Details</h3>

            <div className="space-y-1.5">
              <Label htmlFor="assign-template">Select Training Template *</Label>
              <select
                id="assign-template"
                data-testid="assign-template-select"
                className="border-input dark:bg-input/30 h-9 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                value={templateId}
                disabled={submitting || templates.status !== "ready"}
                onChange={(event) => setTemplateId(event.target.value)}
              >
                <option value="">
                  {templates.status === "connecting"
                    ? "Loading templates…"
                    : templates.data.length === 0
                      ? "No templates available"
                      : "Choose a template"}
                </option>
                {templates.data.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                    {template.isActive ? "" : " (inactive)"}
                  </option>
                ))}
              </select>
              {templates.status === "error" ? (
                <QueryErrorNote
                  message="Training templates could not be streamed."
                  error={templates.error}
                  retry={templates.retry}
                  testId="assign-templates-error"
                />
              ) : null}
              {templates.status === "ready" && templates.data.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No templates exist yet. Publish a template first.
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="assign-deadline">Set Deadline</Label>
                <Input
                  id="assign-deadline"
                  data-testid="assign-deadline"
                  type="date"
                  min={todayAsInputValue()}
                  value={deadline}
                  disabled={submitting}
                  onChange={(event) => setDeadline(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assign-instructions">Instructions</Label>
                <Input
                  id="assign-instructions"
                  data-testid="assign-instructions"
                  value={instructions}
                  disabled={submitting}
                  placeholder="Optional notes prepended to the description"
                  onChange={(event) => setInstructions(event.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">2. Audience Selection</h3>

            <div
              className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1"
              role="group"
              aria-label="Audience selection mode"
            >
              <Button
                type="button"
                data-testid="assign-all-staff"
                aria-pressed={mode === "all"}
                variant={mode === "all" ? "default" : "ghost"}
                size="sm"
                disabled={submitting}
                onClick={() => setMode("all")}
              >
                <UsersRound className="mr-1.5 size-3.5" />
                All Staff
              </Button>
              <Button
                type="button"
                data-testid="assign-individual"
                aria-pressed={mode === "individual"}
                variant={mode === "individual" ? "default" : "ghost"}
                size="sm"
                disabled={submitting}
                onClick={() => setMode("individual")}
              >
                <Search className="mr-1.5 size-3.5" />
                Individually
              </Button>
            </div>

            {mode === "all" ? (
              <div className="bg-primary/5 border-primary/15 rounded-lg border p-4">
                <p className="text-sm font-semibold">Universal Assignment Mode</p>
                {staff.status === "connecting" ? (
                  <p className="text-muted-foreground mt-1 text-sm">Loading employees…</p>
                ) : staff.status === "error" ? (
                  <QueryErrorNote
                    message="The employee list could not be streamed."
                    error={staff.error}
                    retry={staff.retry}
                    testId="assign-staff-error"
                  />
                ) : (
                  <p className="text-muted-foreground mt-1 text-sm">
                    This module will be assigned to every active staff member linked to
                    your clinic ({activeStaff.length} active
                    {staff.data.length > activeStaff.length
                      ? `, ${staff.data.length - activeStaff.length} inactive excluded`
                      : ""}
                    ).
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                    <Input
                      data-testid="assign-search"
                      className="pl-8"
                      value={search}
                      disabled={submitting}
                      placeholder="Search team members…"
                      aria-label="Search team members"
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    data-testid="assign-select-all"
                    disabled={submitting || activeStaff.length === 0}
                    onClick={toggleAll}
                  >
                    {allActiveSelected ? "Clear" : "Select All"}
                  </Button>
                </div>

                <div className="max-h-64 overflow-y-auto rounded-lg border">
                  {staff.status === "connecting" ? (
                    <p className="text-muted-foreground p-4 text-sm">Loading employees…</p>
                  ) : staff.status === "error" ? (
                    <div className="p-3">
                      <QueryErrorNote
                        message="The employee list could not be streamed."
                        error={staff.error}
                        retry={staff.retry}
                        testId="assign-staff-error"
                      />
                    </div>
                  ) : filteredStaff.length === 0 ? (
                    <p className="text-muted-foreground p-4 text-sm">No employees found.</p>
                  ) : (
                    <ul className="divide-y">
                      {filteredStaff.map((member) => {
                        const checked = selectedIds.includes(member.uid)
                        return (
                          <li key={member.uid}>
                            <label
                              className={
                                "flex items-center gap-3 px-3 py-2.5 text-sm " +
                                (member.isActive
                                  ? "cursor-pointer hover:bg-muted/60"
                                  : "text-muted-foreground cursor-not-allowed")
                              }
                            >
                              <input
                                type="checkbox"
                                data-testid={`assign-employee-${member.uid}`}
                                className="accent-primary size-4"
                                checked={member.isActive && checked}
                                disabled={submitting || !member.isActive}
                                onChange={() => toggleEmployee(member.uid)}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">{member.name}</span>
                                {member.email ? (
                                  <span className="text-muted-foreground block truncate text-xs">
                                    {member.email}
                                  </span>
                                ) : null}
                              </span>
                              {member.isActive ? null : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">
                  {selectedActiveIds.length} of {activeStaff.length} active employees selected.
                </p>
              </div>
            )}
          </section>

          {error ? (
            <p role="alert" data-testid="assign-training-error" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}

          {!dataReady && !error ? (
            <p className="text-muted-foreground text-xs" data-testid="assign-not-ready">
              Wait for the training and employee lists to finish loading before assigning.
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="assign-submit"
              disabled={submitDisabled}
              title={
                !dataReady
                  ? "Waiting for live data"
                  : audienceSize === 0
                    ? "Choose at least one active employee"
                    : undefined
              }
            >
              {submitting ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 size-4" />
              )}
              {submitting ? "Assigning…" : "Assign Training"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function QueryErrorNote({
  message,
  error,
  retry,
  testId,
}: {
  message: string
  error: Error | null
  retry: () => void
  testId: string
}) {
  const code = (error as { code?: unknown } | null)?.code
  return (
    <div role="alert" data-testid={testId} className="mt-2 space-y-1">
      <p className="text-destructive text-sm">
        {message}
        {code ? ` (${String(code)})` : ""}
      </p>
      <Button type="button" size="xs" variant="outline" onClick={retry}>
        Retry
      </Button>
    </div>
  )
}
