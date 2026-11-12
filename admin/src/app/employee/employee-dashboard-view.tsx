"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  Megaphone,
  Send,
  ShieldCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ComposeMessagePanel } from "@/components/admin/compose-message-panel"
import {
  subscribeEmployeeMessages,
  type StaffMessageItem,
} from "@/lib/admin/communication-streams"
import { STATUS_UI, type TaskStatus } from "@/lib/admin/task-status"
import {
  EMPTY_EMPLOYEE_WORKSPACE,
  formatPortalStatus,
  mapClearanceStatus,
  mapTrainingStatus,
  subscribeEmployeeWorkspace,
  type EmployeeWorkspaceSnapshot,
} from "@/lib/employee/employee-streams"

interface ActionQueueItem {
  id: string
  title: string
  status: TaskStatus
  href: string
  moduleLabel: string
  dueDate: Date | null
  rejectionReason?: string | null
}

function pctLabel(fraction: number): string {
  const pct = Math.round(Math.min(1, Math.max(0, fraction)) * 100)
  return `${pct}%`
}

function statusPriority(status: TaskStatus): number {
  if (status === "rejected" || status === "expired") return 0
  if (status === "pending" || status === "notStarted") return 1
  return 2
}

export function EmployeeDashboardView({
  employeeUid,
  employeeName,
  employeeEmail,
  adminId,
}: {
  employeeUid: string
  employeeName: string
  employeeEmail: string
  adminId: string | null
}) {
  const [workspace, setWorkspace] = useState<EmployeeWorkspaceSnapshot>(EMPTY_EMPLOYEE_WORKSPACE)
  const [messages, setMessages] = useState<StaffMessageItem[]>([])
  const [streamError, setStreamError] = useState<string | null>(null)
  const [contactOpen, setContactOpen] = useState(false)

  useEffect(() => {
    const unsubWs = subscribeEmployeeWorkspace(
      employeeUid,
      (snap) => setWorkspace(snap),
      (err) => setStreamError(err.message),
    )
    const unsubMsgs = subscribeEmployeeMessages(
      employeeUid,
      (items) => setMessages(items.slice(0, 6)),
      () => {},
    )
    return () => {
      unsubWs()
      unsubMsgs()
    }
  }, [employeeUid])

  const resolvedAdminId = workspace.profile?.adminId ?? adminId
  const resolvedName = workspace.profile?.name ?? employeeName

  const actionItems = useMemo<ActionQueueItem[]>(() => {
    const list: ActionQueueItem[] = []

    for (const t of workspace.tasks) {
      if (
        !t.isCompleted &&
        t.status !== "verified" &&
        t.status !== "completed" &&
        t.status !== "noActionRequired"
      ) {
        list.push({
          id: `task:${t.id}`,
          title: t.title,
          status: t.status,
          href: `/employee/guide/${encodeURIComponent(t.id)}`,
          moduleLabel: "Onboarding Guide",
          dueDate: t.dueDate,
          rejectionReason: t.rejectionReason,
        })
      }
    }

    for (const tr of workspace.trainings) {
      const mapped = mapTrainingStatus(tr.status)
      if (mapped !== "verified" && mapped !== "completed") {
        list.push({
          id: `training:${tr.id}`,
          title: tr.title,
          status: mapped,
          href: `/employee/training/${encodeURIComponent(tr.id)}`,
          moduleLabel: "Training",
          dueDate: tr.dueDate,
          rejectionReason: tr.rejectionReason,
        })
      }
    }

    for (const cl of workspace.clearances) {
      const mapped = mapClearanceStatus(cl.status)
      if (mapped !== "verified" && mapped !== "completed") {
        list.push({
          id: `clearance:${cl.id}`,
          title: cl.title,
          status: mapped,
          href: `/employee/clearance/${encodeURIComponent(cl.id)}`,
          moduleLabel: "Clearance",
          dueDate: cl.dueDate,
          rejectionReason: cl.rejectionReason,
        })
      }
    }

    return list.sort((a, b) => statusPriority(a.status) - statusPriority(b.status))
  }, [workspace.tasks, workspace.trainings, workspace.clearances])

  const ready =
    workspace.ready.tasks && workspace.ready.trainings && workspace.ready.clearances

  return (
    <div className="space-y-6" data-testid="employee-dashboard-view">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Welcome back, {resolvedName}
          </h1>
          <p className="text-sm text-slate-500">
            Track your onboarding documents, required trainings, and clearance status ({employeeEmail}).
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          data-testid="employee-contact-manager"
          onClick={() => setContactOpen(true)}
          className="bg-sky-700 text-white hover:bg-sky-800"
        >
          <Send className="mr-1.5 h-3.5 w-3.5" />
          Message Manager
        </Button>
      </header>

      {streamError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {streamError}
        </div>
      )}

      {/* Progress Tracker */}
      <section
        data-testid="employee-progress-tracker"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Overall Compliance Progress</h2>
            <p className="text-xs text-slate-500">
              Combined progress across onboarding, training modules, and clearances
            </p>
          </div>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-bold text-sky-800">
            {ready ? pctLabel(workspace.progress.overall) : "Syncing..."}
          </span>
        </div>
        <Progress value={Math.round(workspace.progress.overall * 100)} className="h-2.5" />

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span>Onboarding Guide</span>
              <span className="font-semibold">{pctLabel(workspace.progress.onboarding)}</span>
            </div>
            <Progress value={Math.round(workspace.progress.onboarding * 100)} className="mt-2 h-1.5" />
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span>Trainings</span>
              <span className="font-semibold">{pctLabel(workspace.progress.training)}</span>
            </div>
            <Progress value={Math.round(workspace.progress.training * 100)} className="mt-2 h-1.5" />
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span>Verify Clearance</span>
              <span className="font-semibold">{pctLabel(workspace.progress.clearance)}</span>
            </div>
            <Progress value={Math.round(workspace.progress.clearance * 100)} className="mt-2 h-1.5" />
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickActionCard
          href="/employee/guide"
          icon={BookOpenCheck}
          title="Onboarding Guide"
          description="Complete policies, acknowledgments & forms"
        />
        <QuickActionCard
          href="/employee/training"
          icon={GraduationCap}
          title="Training Modules"
          description="Upload certificates & verify completion"
        />
        <QuickActionCard
          href="/employee/clearance"
          icon={ShieldCheck}
          title="Verify Clearances"
          description="Submit background & health credentials"
        />
        <QuickActionCard
          href="/employee/profile/documents"
          icon={FileText}
          title="Document Center"
          description="View and download uploaded records"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Action Required */}
        <section
          data-testid="employee-action-required"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Clock className="h-4 w-4 text-sky-700" />
              Action Required
            </h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              {ready ? actionItems.length : "—"} remaining
            </span>
          </div>

          {!ready ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading your tasks…</p>
          ) : actionItems.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-emerald-200 bg-emerald-50/50 py-8 text-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-900">All caught up!</p>
              <p className="text-xs text-emerald-700">
                You have no pending or rejected requirements right now.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {actionItems.slice(0, 8).map((item) => {
                const ui = STATUS_UI[item.status]
                return (
                  <li key={item.id} className="py-3">
                    <Link
                      href={item.href}
                      className="group flex items-center justify-between gap-3 rounded-lg p-1 hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 group-hover:text-sky-700">
                          {item.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.moduleLabel} · {ui?.label ?? formatPortalStatus(item.status)}
                        </p>
                        {item.rejectionReason && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-rose-700">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            {item.rejectionReason}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-sky-700" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Management Updates */}
        <section
          data-testid="employee-management-updates"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Megaphone className="h-4 w-4 text-sky-700" />
              Management Updates
            </h2>
            <Link
              href="/employee/messages"
              className="text-xs font-medium text-sky-700 hover:underline"
            >
              Open Inbox
            </Link>
          </div>

          {messages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
              No announcements or manager messages yet.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {messages.map((msg) => (
                <li key={msg.id} className="space-y-1 py-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{msg.title}</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      {msg.recipientId === "broadcast"
                        ? "Announcement"
                        : msg.authorId === employeeUid
                          ? "Sent"
                          : "Direct"}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-slate-600">{msg.content}</p>
                  <p className="text-[11px] text-slate-400">From {msg.authorName}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ComposeMessagePanel
        open={contactOpen}
        onOpenChange={setContactOpen}
        authorId={employeeUid}
        authorName={resolvedName}
        recipients={
          resolvedAdminId
            ? [{ uid: resolvedAdminId, name: "Compliance Manager / Admin" }]
            : []
        }
        defaultRecipientId={resolvedAdminId || "broadcast"}
        lockRecipient={Boolean(resolvedAdminId)}
      />
    </div>
  )
}

function QuickActionCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string
  icon: typeof BookOpenCheck
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-colors hover:border-sky-300 hover:bg-sky-50/40"
    >
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-700 group-hover:bg-sky-100">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </Link>
  )
}
