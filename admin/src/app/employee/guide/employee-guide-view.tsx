"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Lock,
} from "lucide-react"

import { Progress } from "@/components/ui/progress"
import { STATUS_UI } from "@/lib/admin/task-status"
import {
  EMPTY_EMPLOYEE_WORKSPACE,
  formatPortalStatus,
  subscribeEmployeeWorkspace,
  type EmployeeWorkspaceSnapshot,
} from "@/lib/employee/employee-streams"

export function EmployeeGuideView({ employeeUid }: { employeeUid: string }) {
  const [workspace, setWorkspace] = useState<EmployeeWorkspaceSnapshot>(EMPTY_EMPLOYEE_WORKSPACE)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = subscribeEmployeeWorkspace(
      employeeUid,
      (snap) => setWorkspace(snap),
      (err) => setError(err.message),
    )
    return () => unsub()
  }, [employeeUid])

  const ready = workspace.ready.tasks
  const totalCount = workspace.tasks.length
  const completedCount = workspace.tasks.filter(
    (t) => t.isCompleted || t.status === "completed" || t.status === "verified",
  ).length
  const onboardingPct = Math.round(workspace.progress.onboarding * 100)

  const onboardingCategories = workspace.compliance.categories.filter((cat) =>
    cat.tasks.some((t) => t.taskSource === "onboarding"),
  )

  return (
    <div className="space-y-6" data-testid="employee-guide-view">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Onboarding Guide
          </h1>
          <p className="text-sm text-slate-500">
            Complete each policy acknowledgment, form, and document upload in order.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-right shadow-xs">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Onboarding Score
          </p>
          <p className="text-lg font-bold text-sky-800">
            {ready ? `${completedCount} / ${totalCount} (${onboardingPct}%)` : "Syncing..."}
          </p>
        </div>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <Progress value={onboardingPct} className="h-2" />
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      )}

      {!ready ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading onboarding steps…
        </div>
      ) : onboardingCategories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No onboarding requirements assigned yet.
        </div>
      ) : (
        <div className="space-y-5">
          {onboardingCategories.map((category) => {
            const categoryTasks = category.tasks.filter((t) => t.taskSource === "onboarding")
            const done = categoryTasks.filter(
              (t) => t.isCompleted || t.status === "completed" || t.status === "verified",
            ).length

            return (
              <section
                key={category.title}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <BookOpenCheck className="h-4 w-4 text-sky-700" />
                    <h2 className="text-base font-semibold text-slate-900">{category.title}</h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    {done} / {categoryTasks.length} complete
                  </span>
                </div>

                <ul className="divide-y divide-slate-100">
                  {categoryTasks.map((task) => {
                    const rawTask = workspace.tasks.find((t) => t.id === task.id)
                    const isDone =
                      task.isCompleted ||
                      task.status === "completed" ||
                      task.status === "verified"
                    const isRejected = task.status === "rejected"
                    const isInReview =
                      task.status === "submitted" ||
                      task.status === "pendingEmployerSignature" ||
                      task.status === "waitingForApprover"

                    return (
                      <li key={task.id}>
                        <Link
                          href={`/employee/guide/${encodeURIComponent(task.id)}`}
                          className="group flex items-center justify-between gap-4 py-3 hover:bg-slate-50/70"
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="mt-0.5 shrink-0">
                              {isDone ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              ) : isRejected ? (
                                <AlertCircle className="h-4 w-4 text-rose-600" />
                              ) : isInReview ? (
                                <Lock className="h-4 w-4 text-sky-600" />
                              ) : (
                                <Clock className="h-4 w-4 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900 group-hover:text-sky-700">
                                {task.title}
                              </p>
                              <p className="text-xs text-slate-500">
                                {task.subtitle || task.actionType}
                                {rawTask?.dueDate
                                  ? ` · Due ${rawTask.dueDate.toLocaleDateString()}`
                                  : ""}
                              </p>
                              {isRejected && task.rejectionReason && (
                                <p className="mt-1 text-xs font-medium text-rose-700">
                                  Needs correction: {task.rejectionReason}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
                              {STATUS_UI[task.status]?.label ?? formatPortalStatus(task.status)}
                            </span>
                            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-sky-700" />
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
