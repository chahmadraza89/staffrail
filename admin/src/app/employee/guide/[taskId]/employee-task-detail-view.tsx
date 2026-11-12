"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { EmployeeTaskDispatcher } from "@/components/employee/employee-task-dispatcher"
import { STATUS_UI } from "@/lib/admin/task-status"
import {
  EMPTY_EMPLOYEE_WORKSPACE,
  subscribeEmployeeWorkspace,
  type EmployeeWorkspaceSnapshot,
} from "@/lib/employee/employee-streams"

export function EmployeeTaskDetailView({
  employeeUid,
  employeeName,
  adminId,
  taskId,
}: {
  employeeUid: string
  employeeName: string
  adminId: string | null
  taskId: string
}) {
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

  const task = workspace.tasks.find((t) => t.id === taskId)
  const ready = workspace.ready.tasks

  return (
    <div className="space-y-6" data-testid="employee-task-detail-view">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/employee/guide"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            aria-label="Back to Onboarding Guide"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              {task?.title ?? taskId}
            </h1>
            <p className="text-xs text-slate-500">
              {task?.subtitle ?? "Onboarding Requirement"}
            </p>
          </div>
        </div>
        {task && (
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            {STATUS_UI[task.status]?.label ?? task.status}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {!ready ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading requirement details…
        </div>
      ) : !task ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          This onboarding requirement was not found on your profile.
        </div>
      ) : (
        <EmployeeTaskDispatcher
          employeeId={employeeUid}
          employeeName={workspace.profile?.name ?? employeeName}
          adminId={workspace.profile?.adminId ?? adminId}
          task={task}
          allTasks={workspace.tasks}
        />
      )}
    </div>
  )
}
