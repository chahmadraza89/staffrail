"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  GraduationCap,
} from "lucide-react"

import { Progress } from "@/components/ui/progress"
import {
  EMPTY_EMPLOYEE_WORKSPACE,
  formatPortalStatus,
  mapTrainingStatus,
  subscribeEmployeeWorkspace,
  type EmployeeWorkspaceSnapshot,
} from "@/lib/employee/employee-streams"

export function EmployeeTrainingView({ employeeUid }: { employeeUid: string }) {
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

  const ready = workspace.ready.trainings
  const trainings = workspace.trainings
  const doneCount = trainings.filter(
    (t) => t.status === "verified" || t.status === "completed",
  ).length
  const pct = Math.round(workspace.progress.training * 100)

  return (
    <div className="space-y-6" data-testid="employee-training-view">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Trainings</h1>
          <p className="text-sm text-slate-500">
            Track required clinical and compliance trainings and upload completion certificates.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-right shadow-xs">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Training Progress
          </p>
          <p className="text-lg font-bold text-sky-800">
            {ready ? `${doneCount} / ${trainings.length} (${pct}%)` : "Syncing..."}
          </p>
        </div>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <Progress value={pct} className="h-2" />
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      )}

      {!ready ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading assigned trainings…
        </div>
      ) : trainings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No training modules assigned to you yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {trainings.map((item) => {
            const mappedStatus = mapTrainingStatus(item.status)
            const isDone = mappedStatus === "verified" || mappedStatus === "completed"
            const isRejected = mappedStatus === "rejected"
            return (
              <Link
                key={item.id}
                href={`/employee/training/${encodeURIComponent(item.id)}`}
                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-colors hover:border-sky-300"
              >
                <div>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                      <GraduationCap className="h-4 w-4" />
                    </span>
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {formatPortalStatus(mappedStatus)}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-slate-900 group-hover:text-sky-700">
                    {item.title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.durationText || "Training Certification"}
                  </p>
                  {isRejected && item.rejectionReason && (
                    <p className="mt-2 flex items-center gap-1 text-xs font-medium text-rose-700">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {item.rejectionReason}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    {isDone ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Verified
                      </>
                    ) : (
                      <>
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {item.dueDate ? `Due ${item.dueDate.toLocaleDateString()}` : "Active"}
                      </>
                    )}
                  </span>
                  <span className="inline-flex items-center font-medium text-sky-700">
                    Open
                    <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
