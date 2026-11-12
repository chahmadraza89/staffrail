"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ExternalLink, FileText, Search } from "lucide-react"

import { fileNameFromUrl } from "@/lib/admin/task-format"
import {
  EMPTY_EMPLOYEE_WORKSPACE,
  formatPortalStatus,
  mapClearanceStatus,
  mapTrainingStatus,
  subscribeEmployeeWorkspace,
  type EmployeeWorkspaceSnapshot,
} from "@/lib/employee/employee-streams"

interface DocumentRecord {
  id: string
  module: "onboarding" | "training" | "clearance"
  moduleLabel: string
  title: string
  fileName: string
  fileUrl: string
  statusLabel: string
  sourceHref: string
  updatedAt: Date | null
}

export function EmployeeDocumentCenterView({ employeeUid }: { employeeUid: string }) {
  const [workspace, setWorkspace] = useState<EmployeeWorkspaceSnapshot>(EMPTY_EMPLOYEE_WORKSPACE)
  const [moduleFilter, setModuleFilter] = useState<"all" | "onboarding" | "training" | "clearance">(
    "all",
  )
  const [search, setSearch] = useState("")

  useEffect(() => {
    const unsub = subscribeEmployeeWorkspace(
      employeeUid,
      (snap) => setWorkspace(snap),
      () => {},
    )
    return () => unsub()
  }, [employeeUid])

  const documents = useMemo<DocumentRecord[]>(() => {
    const records: DocumentRecord[] = []

    for (const task of workspace.tasks) {
      if (task.fileUrl) {
        records.push({
          id: `task:${task.id}`,
          module: "onboarding",
          moduleLabel: "Onboarding",
          title: task.title,
          fileName: fileNameFromUrl(task.fileUrl) || `${task.title}.pdf`,
          fileUrl: task.fileUrl,
          statusLabel: formatPortalStatus(task.status),
          sourceHref: `/employee/guide/${encodeURIComponent(task.id)}`,
          updatedAt: task.updatedAt,
        })
      }
    }

    for (const training of workspace.trainings) {
      const url = training.certificateUrl ?? training.certificateUrls[0] ?? null
      if (url) {
        records.push({
          id: `training:${training.id}`,
          module: "training",
          moduleLabel: "Training",
          title: training.title,
          fileName: fileNameFromUrl(url) || `${training.title}.pdf`,
          fileUrl: url,
          statusLabel: formatPortalStatus(mapTrainingStatus(training.status)),
          sourceHref: `/employee/training/${encodeURIComponent(training.id)}`,
          updatedAt: training.completedAt ?? training.assignedAt ?? training.dueDate,
        })
      }
    }

    for (const clearance of workspace.clearances) {
      if (clearance.fileUrl) {
        records.push({
          id: `clearance:${clearance.id}`,
          module: "clearance",
          moduleLabel: "Clearance",
          title: clearance.title,
          fileName: fileNameFromUrl(clearance.fileUrl) || `${clearance.title}.pdf`,
          fileUrl: clearance.fileUrl,
          statusLabel: formatPortalStatus(mapClearanceStatus(clearance.status)),
          sourceHref: `/employee/clearance/${encodeURIComponent(clearance.id)}`,
          updatedAt: clearance.verifiedAt ?? clearance.submittedAt ?? clearance.dueDate,
        })
      }
    }

    const q = search.trim().toLowerCase()
    return records
      .filter((doc) => (moduleFilter === "all" ? true : doc.module === moduleFilter))
      .filter(
        (doc) =>
          !q ||
          doc.title.toLowerCase().includes(q) ||
          doc.fileName.toLowerCase().includes(q),
      )
      .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0))
  }, [workspace.tasks, workspace.trainings, workspace.clearances, moduleFilter, search])

  const ready = workspace.ready.tasks && workspace.ready.trainings && workspace.ready.clearances

  return (
    <div className="mx-auto max-w-4xl space-y-6" data-testid="employee-document-center">
      <div className="flex items-center gap-3">
        <Link
          href="/employee/profile"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          aria-label="Back to Profile"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Document Center</h1>
          <p className="text-sm text-slate-500">
            All uploaded files across your onboarding guide, training certificates, and clearances.
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents or filenames..."
              className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900"
            />
          </div>
          <select
            aria-label="Filter by module"
            value={moduleFilter}
            onChange={(e) =>
              setModuleFilter(e.target.value as "all" | "onboarding" | "training" | "clearance")
            }
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
          >
            <option value="all">All Modules</option>
            <option value="onboarding">Onboarding</option>
            <option value="training">Training</option>
            <option value="clearance">Clearance</option>
          </select>
        </div>

        {!ready ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading your uploaded files…</p>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-200 py-12 text-center text-slate-500">
            <FileText className="h-6 w-6 text-slate-300" />
            <p className="text-sm">No uploaded documents found matching this filter.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {documents.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-4 py-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={doc.sourceHref}
                      className="text-sm font-semibold text-slate-900 hover:text-sky-700"
                    >
                      {doc.title}
                    </Link>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {doc.moduleLabel}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {doc.fileName} · {doc.statusLabel}
                  </p>
                </div>

                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50"
                >
                  Open File
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
