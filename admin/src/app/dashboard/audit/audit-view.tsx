"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, RefreshCw, Search, ShieldCheck, Wrench } from "lucide-react"

import { Button } from "@/components/ui/button"
import { subscribeAuditLogs, type AuditLogEntry } from "@/lib/admin/audit-actions"
import {
  runAdminComplianceAndRepair,
  type ComplianceRepairSummary,
} from "@/lib/admin/compliance-repair"
import { EmployeeActionError } from "@/lib/admin/employee-actions"

function formatAuditTime(date: Date | null): string {
  if (!date) {
    return "Pending timestamp"
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function AdminAuditView({
  adminUid,
  adminName,
  adminEmail,
}: {
  adminUid: string
  adminName: string
  adminEmail: string
}) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState("ALL")
  const [repairBusy, setRepairBusy] = useState(false)
  const [repairSummary, setRepairSummary] = useState<ComplianceRepairSummary | null>(null)
  const [repairError, setRepairError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = subscribeAuditLogs(
      { maxEntries: 150 },
      (items) => {
        setEntries(items)
        setLoading(false)
      },
      (err) => {
        setStreamError(err.message)
        setLoading(false)
      },
    )
    return () => unsub()
  }, [])

  const actionTypes = useMemo(() => {
    const set = new Set<string>()
    for (const item of entries) {
      if (item.actionType) {
        set.add(item.actionType)
      }
    }
    return ["ALL", ...Array.from(set).sort()]
  }, [entries])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter((entry) => {
      if (actionFilter !== "ALL" && entry.actionType !== actionFilter) {
        return false
      }
      if (!q) {
        return true
      }
      return (
        entry.actorName.toLowerCase().includes(q) ||
        entry.actionType.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.targetId.toLowerCase().includes(q)
      )
    })
  }, [entries, search, actionFilter])

  const handleRunRepair = async () => {
    setRepairBusy(true)
    setRepairError(null)
    setRepairSummary(null)
    try {
      const result = await runAdminComplianceAndRepair({
        adminUid,
        adminName,
      })
      setRepairSummary(result)
    } catch (err) {
      if (err instanceof EmployeeActionError || err instanceof Error) {
        setRepairError(err.message)
      } else {
        setRepairError("Compliance repair failed.")
      }
    } finally {
      setRepairBusy(false)
    }
  }

  return (
    <div className="space-y-6" data-testid="admin-audit-view">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit Logs &amp; Integrity</h1>
          <p className="text-muted-foreground text-sm">
            Immutable compliance event history and automated workspace repair tools ({adminEmail}).
          </p>
        </div>
        <Button
          type="button"
          data-testid="run-compliance-repair"
          disabled={repairBusy}
          onClick={handleRunRepair}
          className="bg-sky-700 text-white hover:bg-sky-800"
        >
          {repairBusy ? (
            <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Wrench className="mr-1.5 h-4 w-4" />
          )}
          {repairBusy ? "Running Repair & Compliance Sweep..." : "Sync & Repair Compliance"}
        </Button>
      </header>

      {repairSummary && (
        <div
          data-testid="repair-summary-banner"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-700" />
          <div>
            <span className="font-semibold">Workspace check complete: </span>
            Scanned {repairSummary.employeesScanned} employee(s), repaired{" "}
            {repairSummary.repairedCount} missing metadata field(s), and expired{" "}
            {repairSummary.expiredCount} overdue requirement(s).
          </div>
        </div>
      )}

      {repairError && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {repairError}
        </div>
      )}

      {streamError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {streamError}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search actor, action, target, or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
            />
          </div>
          <select
            aria-label="Filter by action type"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
          >
            {actionTypes.map((type) => (
              <option key={type} value={type}>
                {type === "ALL" ? "All Action Types" : type}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading audit trail…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
            No matching audit events found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="py-2.5 pr-4">Timestamp</th>
                  <th className="py-2.5 pr-4">Actor</th>
                  <th className="py-2.5 pr-4">Action</th>
                  <th className="py-2.5 pr-4">Description</th>
                  <th className="py-2.5">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((entry) => (
                  <tr key={entry.id} className="align-top hover:bg-slate-50/70">
                    <td className="whitespace-nowrap py-3 pr-4 text-xs text-slate-500">
                      {formatAuditTime(entry.timestamp)}
                    </td>
                    <td className="py-3 pr-4 text-xs font-medium text-slate-800">
                      {entry.actorName}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700">
                        <Activity className="h-3 w-3 text-sky-600" />
                        {entry.actionType}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-700">{entry.description}</td>
                    <td className="whitespace-nowrap py-3 font-mono text-xs text-slate-500">
                      {entry.targetId || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
