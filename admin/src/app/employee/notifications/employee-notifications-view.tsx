"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Info,
  Trash2,
  XCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  clearAllNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/admin/communication-actions"
import {
  subscribeUserNotifications,
  type AppNotificationItem,
} from "@/lib/admin/communication-streams"

function iconFor(type: AppNotificationItem["type"]) {
  switch (type) {
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-amber-600" />
    case "error":
      return <XCircle className="h-4 w-4 text-rose-600" />
    default:
      return <Info className="h-4 w-4 text-sky-600" />
  }
}

function linkFor(item: AppNotificationItem): string | null {
  const meta = item.metadata
  if (!meta) return null
  if (typeof meta.taskId === "string" && meta.taskId) {
    return `/employee/guide/${encodeURIComponent(meta.taskId)}`
  }
  if (typeof meta.trainingId === "string" && meta.trainingId) {
    return `/employee/training/${encodeURIComponent(meta.trainingId)}`
  }
  if (typeof meta.clearanceId === "string" && meta.clearanceId) {
    return `/employee/clearance/${encodeURIComponent(meta.clearanceId)}`
  }
  return null
}

export function EmployeeNotificationsView({ employeeUid }: { employeeUid: string }) {
  const [items, setItems] = useState<AppNotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeUserNotifications(
      employeeUid,
      (list) => {
        setItems(list)
        setLoading(false)
      },
      () => setLoading(false),
    )
    return () => unsub()
  }, [employeeUid])

  const unreadIds = items.filter((n) => !n.isRead).map((n) => n.id)

  return (
    <div className="space-y-6" data-testid="employee-notifications-view">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-slate-500">
            Document reviews, training assignments, and compliance reminders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={unreadIds.length === 0}
            onClick={() => void markAllNotificationsRead(employeeUid, unreadIds)}
          >
            <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
            Mark All Read
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={items.length === 0}
            onClick={() =>
              void clearAllNotifications(
                employeeUid,
                items.map((n) => n.id),
              )
            }
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Clear All
          </Button>
        </div>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading notifications…</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-slate-500">
            <Bell className="h-6 w-6 text-slate-300" />
            <p className="text-sm">No notifications right now.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => {
              const target = linkFor(item)
              return (
                <li
                  key={item.id}
                  className={`flex items-start gap-3 py-3.5 ${item.isRead ? "opacity-75" : ""}`}
                >
                  <div className="mt-0.5 shrink-0">{iconFor(item.type)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <span className="text-xs text-slate-400">
                        {item.timestamp.getTime() > 0
                          ? item.timestamp.toLocaleDateString()
                          : "Recent"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600">{item.body}</p>
                    <div className="mt-2 flex items-center gap-3">
                      {!item.isRead && (
                        <button
                          type="button"
                          onClick={() => void markNotificationRead(employeeUid, item.id)}
                          className="text-xs font-medium text-sky-700 hover:underline"
                        >
                          Mark read
                        </button>
                      )}
                      {target && (
                        <Link
                          href={target}
                          className="text-xs font-medium text-slate-700 hover:underline"
                        >
                          Open requirement →
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
