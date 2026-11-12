"use client"

import { useEffect, useState } from "react"
import { Megaphone, MessageSquare, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ComposeMessagePanel } from "@/components/admin/compose-message-panel"
import {
  subscribeEmployeeMessages,
  type StaffMessageItem,
} from "@/lib/admin/communication-streams"

export function EmployeeMessagesView({
  employeeUid,
  employeeName,
  adminId,
}: {
  employeeUid: string
  employeeName: string
  adminId: string | null
}) {
  const [messages, setMessages] = useState<StaffMessageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [composeOpen, setComposeOpen] = useState(false)

  useEffect(() => {
    const unsub = subscribeEmployeeMessages(
      employeeUid,
      (list) => {
        setMessages(list)
        setLoading(false)
      },
      () => setLoading(false),
    )
    return () => unsub()
  }, [employeeUid])

  return (
    <div className="space-y-6" data-testid="employee-messages-view">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Messages &amp; Announcements</h1>
          <p className="text-sm text-slate-500">
            Team-wide broadcasts and direct communications with your manager.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          data-testid="messages-contact-manager"
          onClick={() => setComposeOpen(true)}
          className="bg-sky-700 text-white hover:bg-sky-800"
        >
          <Send className="mr-1.5 h-3.5 w-3.5" />
          Contact Manager
        </Button>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading messages…</p>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-slate-500">
            <MessageSquare className="h-6 w-6 text-slate-300" />
            <p className="text-sm">No messages or announcements yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {messages.map((msg) => (
              <li key={msg.id} className="space-y-1.5 py-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-sky-700" />
                    <h2 className="text-sm font-semibold text-slate-900">{msg.title}</h2>
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    {msg.recipientId === "broadcast"
                      ? "Broadcast"
                      : msg.authorId === employeeUid
                        ? "Sent to Manager"
                        : "Direct Message"}
                  </span>
                </div>
                <p className="whitespace-pre-line text-sm text-slate-700">{msg.content}</p>
                <p className="text-xs text-slate-400">
                  {msg.authorName} ·{" "}
                  {msg.timestamp.getTime() > 0 ? msg.timestamp.toLocaleString() : "Recent"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ComposeMessagePanel
        open={composeOpen}
        onOpenChange={setComposeOpen}
        authorId={employeeUid}
        authorName={employeeName}
        recipients={adminId ? [{ uid: adminId, name: "Compliance Manager" }] : []}
        defaultRecipientId={adminId || "broadcast"}
        lockRecipient={Boolean(adminId)}
      />
    </div>
  )
}
