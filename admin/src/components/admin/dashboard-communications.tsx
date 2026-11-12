"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, Megaphone, Send, ShieldCheck, Wrench } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  ComposeMessagePanel,
  type MessageRecipientOption,
} from "@/components/admin/compose-message-panel"
import {
  subscribeAdminMessages,
  subscribeUserNotifications,
  type AppNotificationItem,
  type StaffMessageItem,
} from "@/lib/admin/communication-streams"
import {
  runAdminComplianceAndRepair,
  type ComplianceRepairSummary,
} from "@/lib/admin/compliance-repair"
import { EmployeeActionError } from "@/lib/admin/employee-actions"

function formatCompactTime(date: Date): string {
  if (!date || date.getTime() === 0) {
    return "Recent"
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function DashboardCommunications({
  adminUid,
  adminName,
  recipients,
}: {
  adminUid: string
  adminName: string
  recipients: MessageRecipientOption[]
}) {
  const [notifications, setNotifications] = useState<AppNotificationItem[]>([])
  const [messages, setMessages] = useState<StaffMessageItem[]>([])
  const [composeOpen, setComposeOpen] = useState(false)
  const [repairBusy, setRepairBusy] = useState(false)
  const [repairSummary, setRepairSummary] = useState<ComplianceRepairSummary | null>(null)
  const [repairError, setRepairError] = useState<string | null>(null)

  useEffect(() => {
    const unsubNotifs = subscribeUserNotifications(
      adminUid,
      (items) => setNotifications(items.slice(0, 5)),
      () => {},
    )
    const unsubMsgs = subscribeAdminMessages(
      adminUid,
      (items) => setMessages(items.slice(0, 5)),
      () => {},
    )
    return () => {
      unsubNotifs()
      unsubMsgs()
    }
  }, [adminUid])

  const handleQuickRepair = async () => {
    setRepairBusy(true)
    setRepairError(null)
    setRepairSummary(null)
    try {
      const summary = await runAdminComplianceAndRepair({ adminUid, adminName })
      setRepairSummary(summary)
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
    <section
      data-testid="dashboard-communications"
      className="grid gap-6 lg:grid-cols-2"
    >
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Bell className="h-4 w-4 text-sky-700" />
            Recent Notifications
          </h2>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={repairBusy}
              onClick={handleQuickRepair}
              data-testid="dashboard-sync-repair"
            >
              <Wrench className="mr-1.5 h-3.5 w-3.5" />
              {repairBusy ? "Checking..." : "Sync & Repair"}
            </Button>
            <Link
              href="/dashboard/notifications"
              className="text-xs font-medium text-sky-700 hover:underline"
            >
              View all
            </Link>
          </div>
        </div>

        {repairSummary && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" />
            <span>
              Checked {repairSummary.employeesScanned} staff: repaired {repairSummary.repairedCount} record(s),
              expired {repairSummary.expiredCount} overdue item(s).
            </span>
          </div>
        )}
        {repairError && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {repairError}
          </div>
        )}

        {notifications.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-500">
            No recent notifications.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-2 py-2.5 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="truncate text-slate-600">{item.body}</p>
                </div>
                <span className="shrink-0 text-[11px] text-slate-400">
                  {formatCompactTime(item.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Megaphone className="h-4 w-4 text-sky-700" />
            Team Messages &amp; Broadcasts
          </h2>
          <Button
            type="button"
            size="sm"
            data-testid="dashboard-compose-message"
            onClick={() => setComposeOpen(true)}
            className="bg-sky-700 text-white hover:bg-sky-800"
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Compose
          </Button>
        </div>

        {messages.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-500">
            No recent broadcasts or direct messages.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {messages.map((msg) => (
              <li key={msg.id} className="py-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{msg.title}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                    {msg.recipientId === "broadcast" ? "Broadcast" : "Direct"}
                  </span>
                </div>
                <p className="line-clamp-2 text-slate-600">{msg.content}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {msg.authorName} · {formatCompactTime(msg.timestamp)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ComposeMessagePanel
        open={composeOpen}
        onOpenChange={setComposeOpen}
        authorId={adminUid}
        authorName={adminName}
        recipients={recipients}
      />
    </section>
  )
}
