"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Info,
  Megaphone,
  Send,
  Trash2,
  XCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  ComposeMessagePanel,
  type MessageRecipientOption,
} from "@/components/admin/compose-message-panel"
import {
  clearAllNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/admin/communication-actions"
import {
  subscribeAdminMessages,
  subscribeUserNotifications,
  type AppNotificationItem,
  type StaffMessageItem,
} from "@/lib/admin/communication-streams"
import { subscribeAdminEmployeesProgress } from "@/lib/admin/dashboard-streams"
import type { AdminEmployeeProgress } from "@/lib/admin/dashboard-models"

function iconForType(type: AppNotificationItem["type"]) {
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

function formatWhen(date: Date): string {
  if (!date || date.getTime() === 0) {
    return "Just now"
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function AdminNotificationsView({
  adminUid,
  adminName,
  adminEmail,
}: {
  adminUid: string
  adminName: string
  adminEmail: string
}) {
  const [notifications, setNotifications] = useState<AppNotificationItem[]>([])
  const [messages, setMessages] = useState<StaffMessageItem[]>([])
  const [recipients, setRecipients] = useState<MessageRecipientOption[]>([])
  const [loadingNotifs, setLoadingNotifs] = useState(true)
  const [composeOpen, setComposeOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubNotifs = subscribeUserNotifications(
      adminUid,
      (items) => {
        setNotifications(items)
        setLoadingNotifs(false)
      },
      (err) => {
        setError(err.message)
        setLoadingNotifs(false)
      },
    )
    const unsubMsgs = subscribeAdminMessages(
      adminUid,
      (items) => setMessages(items),
      () => {},
    )
    const unsubEmps = subscribeAdminEmployeesProgress(adminUid, {
      listen: () => {},
      emit: (_id: string, rows: AdminEmployeeProgress[]) => {
        setRecipients(
          rows
            .filter((r) => r.isActive)
            .map((r) => ({ uid: r.uid, name: r.name, email: r.email })),
        )
      },
      fail: () => {},
      forget: () => {},
    })
    return () => {
      unsubNotifs()
      unsubMsgs()
      unsubEmps()
    }
  }, [adminUid])

  const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id)

  const resolveDeepLink = (item: AppNotificationItem): string | null => {
    const empId = typeof item.metadata?.employeeId === "string" ? item.metadata.employeeId : null
    if (empId) {
      return `/dashboard/directory/${empId}`
    }
    return null
  }

  return (
    <div className="space-y-6" data-testid="admin-notifications-view">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications &amp; Messaging</h1>
          <p className="text-muted-foreground text-sm">
            Alerts, employee submissions, and staff announcements for {adminEmail}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={unreadIds.length === 0}
            onClick={() => void markAllNotificationsRead(adminUid, unreadIds)}
          >
            <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
            Mark All Read
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={notifications.length === 0}
            onClick={() =>
              void clearAllNotifications(
                adminUid,
                notifications.map((n) => n.id),
              )
            }
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Clear All
          </Button>
          <Button
            type="button"
            size="sm"
            data-testid="open-compose-message"
            onClick={() => setComposeOpen(true)}
            className="bg-sky-700 text-white hover:bg-sky-800"
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Compose Message
          </Button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Bell className="h-4 w-4 text-sky-700" />
              System Notifications
            </h2>
            {unreadIds.length > 0 && (
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800">
                {unreadIds.length} unread
              </span>
            )}
          </div>

          {loadingNotifs ? (
            <p className="text-sm text-slate-500">Loading notifications…</p>
          ) : notifications.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
              All caught up! No notifications right now.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {notifications.map((item) => {
                const href = resolveDeepLink(item)
                return (
                  <li
                    key={item.id}
                    className={`flex items-start gap-3 py-3 ${item.isRead ? "opacity-75" : ""}`}
                  >
                    <div className="mt-0.5 shrink-0">{iconForType(item.type)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <span className="shrink-0 text-xs text-slate-400">
                          {formatWhen(item.timestamp)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-600">{item.body}</p>
                      <div className="mt-2 flex items-center gap-3">
                        {!item.isRead && (
                          <button
                            type="button"
                            onClick={() => void markNotificationRead(adminUid, item.id)}
                            className="text-xs font-medium text-sky-700 hover:underline"
                          >
                            Mark read
                          </button>
                        )}
                        {href && (
                          <Link
                            href={href}
                            className="text-xs font-medium text-slate-700 hover:underline"
                          >
                            View record →
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

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Megaphone className="h-4 w-4 text-sky-700" />
              Messages &amp; Announcements
            </h2>
            <span className="text-xs text-slate-500">{messages.length} total</span>
          </div>

          {messages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
              No announcements or staff messages sent yet.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {messages.map((msg) => (
                <li key={msg.id} className="space-y-1 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{msg.title}</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {msg.recipientId === "broadcast"
                        ? "Broadcast"
                        : msg.recipientId === adminUid
                          ? "Direct Reply"
                          : `To ${msg.recipientName ?? msg.recipientId}`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{msg.content}</p>
                  <p className="text-[11px] text-slate-400">
                    From {msg.authorName} · {formatWhen(msg.timestamp)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ComposeMessagePanel
        open={composeOpen}
        onOpenChange={setComposeOpen}
        authorId={adminUid}
        authorName={adminName}
        recipients={recipients}
      />
    </div>
  )
}
