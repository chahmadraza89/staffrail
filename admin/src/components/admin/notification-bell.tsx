"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"

import { subscribeUserNotifications } from "@/lib/admin/communication-streams"

export function NotificationBell({
  userId,
  href,
  active = false,
}: {
  userId: string
  href: string
  active?: boolean
}) {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!userId) {
      return
    }
    const unsub = subscribeUserNotifications(
      userId,
      (items) => {
        setUnreadCount(items.filter((item) => !item.isRead).length)
      },
      () => {
        // Non-blocking badge in header: ignore listener setup failure in unconfigured tests.
      },
    )
    return () => unsub()
  }, [userId])

  return (
    <Link
      href={href}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
        active
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span
          data-testid="unread-notification-badge"
          className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  )
}
