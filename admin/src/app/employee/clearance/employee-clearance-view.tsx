"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  ShieldCheck,
} from "lucide-react"

import { Progress } from "@/components/ui/progress"
import {
  EMPTY_EMPLOYEE_WORKSPACE,
  formatPortalStatus,
  mapClearanceStatus,
  subscribeEmployeeWorkspace,
  type EmployeeWorkspaceSnapshot,
} from "@/lib/employee/employee-streams"

export function EmployeeClearanceView({ employeeUid }: { employeeUid: string }) {
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

  const ready = workspace.ready.clearances
  const items = workspace.clearances
  const clearedCount = items.filter((c) => c.status === "verified").length
  const pct = Math.round(workspace.progress.clearance * 100)

  return (
    <div className="space-y-6" data-testid="employee-clearance-view">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Verify Clearances
          </h1>
          <p className="text-sm text-slate-500">
            Upload required background checks, health screenings, and credential documents.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-right shadow-xs">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Clearance Score
          </p>
          <p className="text-lg font-bold text-sky-800">
            {ready ? `${clearedCount} / ${items.length} (${pct}%)` : "Syncing..."}
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
          Loading clearance checklist…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No clearance items required right now.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => {
            const mappedStatus = mapClearanceStatus(item.status)
            const isCleared = mappedStatus === "verified" || mappedStatus === "completed"
            const isRejected = mappedStatus === "rejected"
            return (
              <Link
                key={item.id}
                href={`/employee/clearance/${encodeURIComponent(item.id)}`}
                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-colors hover:border-sky-300"
              >
                <div>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {formatPortalStatus(mappedStatus)}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-slate-900 group-hover:text-sky-700">
                    {item.title}
                  </h2>
                  {isRejected && item.rejectionReason && (
                    <p className="mt-2 flex items-center gap-1 text-xs font-medium text-rose-700">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {item.rejectionReason}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    {isCleared ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Cleared
                      </>
                    ) : (
                      <>
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {item.dueDate
                          ? `Due ${item.dueDate.toLocaleDateString()}`
                          : "Action needed"}
                      </>
                    )}
                  </span>
                  <span className="inline-flex items-center font-medium text-sky-700">
                    Manage
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
