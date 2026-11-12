"use client"

import { useState } from "react"
import { Bell, Send, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { publishStaffMessage } from "@/lib/admin/communication-actions"
import { EmployeeActionError } from "@/lib/admin/employee-actions"

export interface MessageRecipientOption {
  uid: string
  name: string
  email?: string | null
}

export interface ComposeMessagePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  authorId: string
  authorName: string
  recipients: MessageRecipientOption[]
  defaultRecipientId?: string
  lockRecipient?: boolean
  onSent?: (messageId: string) => void
}

export function ComposeMessagePanel({
  open,
  onOpenChange,
  authorId,
  authorName,
  recipients,
  defaultRecipientId = "broadcast",
  lockRecipient = false,
  onSent,
}: ComposeMessagePanelProps) {
  const [recipientId, setRecipientId] = useState(defaultRecipientId)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isPushEnabled, setIsPushEnabled] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError("Please enter a message subject.")
      return
    }
    if (!content.trim()) {
      setError("Please enter a message body.")
      return
    }

    const selectedRecipient = recipients.find((r) => r.uid === recipientId)
    setSending(true)
    try {
      const id = await publishStaffMessage({
        title,
        content,
        authorId,
        authorName,
        recipientId,
        recipientName: recipientId === "broadcast" ? "All Staff" : selectedRecipient?.name,
        isPushEnabled,
        broadcastRecipientUids:
          recipientId === "broadcast" ? recipients.map((r) => r.uid) : [],
      })
      setTitle("")
      setContent("")
      setIsPushEnabled(true)
      onSent?.(id)
      onOpenChange(false)
    } catch (err) {
      if (err instanceof EmployeeActionError || err instanceof Error) {
        setError(err.message)
      } else {
        setError("Failed to send message.")
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="compose-message-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4 text-sky-700" />
            {recipientId === "broadcast" ? "Broadcast Announcement" : "Send Direct Message"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!lockRecipient && (
            <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-slate-500" />
                Recipient Audience
              </span>
              <select
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                disabled={sending}
                data-testid="compose-recipient-select"
                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus:border-sky-500 focus:outline-none"
              >
                <option value="broadcast">All Staff (Broadcast)</option>
                {recipients.map((emp) => (
                  <option key={emp.uid} value={emp.uid}>
                    {emp.name}
                    {emp.email ? ` (${emp.email})` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
            <span>Subject</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={sending}
              placeholder="e.g., Q4 Policy Update or Missing Signature"
              data-testid="compose-title-input"
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus:border-sky-500 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
            <span>Message</span>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={sending}
              placeholder="Write your announcement or message..."
              data-testid="compose-content-input"
              className="rounded-md border border-slate-300 bg-white p-3 text-sm font-normal text-slate-900 focus:border-sky-500 focus:outline-none"
            />
          </label>

          <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={isPushEnabled}
              onChange={(e) => setIsPushEnabled(e.target.checked)}
              disabled={sending}
              className="h-4 w-4 rounded border-slate-300 text-sky-700"
            />
            <Bell className="h-3.5 w-3.5 text-slate-500" />
            <span>Trigger immediate notification alert to recipient(s)</span>
          </label>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
            >
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={sending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={sending}
              data-testid="compose-submit-button"
              className="bg-sky-700 text-white hover:bg-sky-800"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {sending ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
