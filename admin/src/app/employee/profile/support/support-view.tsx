"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, HelpCircle, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { sendSupportTicketMessage } from "@/lib/employee/employee-actions"

export function EmployeeSupportView({
  employeeUid,
  employeeName,
  adminId,
}: {
  employeeUid: string
  employeeName: string
  adminId: string | null
}) {
  const [category, setCategory] = useState("Onboarding Forms")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!subject.trim() || !message.trim()) {
      setError("Please fill in both subject and message details.")
      return
    }
    setSending(true)
    try {
      await sendSupportTicketMessage({
        employeeId: employeeUid,
        employeeName,
        adminId,
        category,
        subject,
        message,
      })
      setSubject("")
      setMessage("")
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send support message.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/employee/profile"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          aria-label="Back to Profile"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Contact Support</h1>
          <p className="text-xs text-slate-500">Send a question or issue report directly to management</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          <span>Topic Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={sending}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900"
          >
            <option value="Onboarding Forms">Onboarding Forms</option>
            <option value="Trainings & Certificates">Trainings &amp; Certificates</option>
            <option value="Clearance Verification">Clearance Verification</option>
            <option value="Account & Login">Account &amp; Login</option>
            <option value="Technical Issue">Technical Issue</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          <span>Subject *</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={sending}
            placeholder="Brief summary of your question"
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          <span>Message *</span>
          <textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={sending}
            placeholder="Describe what you need help with..."
            className="rounded-md border border-slate-300 bg-white p-3 text-sm font-normal text-slate-900"
          />
        </label>

        {error && (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {error}
          </div>
        )}

        {sent && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <HelpCircle className="h-4 w-4 shrink-0" />
            <span>Your support request was sent to your administrator.</span>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={sending} className="bg-sky-700 text-white hover:bg-sky-800">
            <Send className="mr-1.5 h-4 w-4" />
            {sending ? "Sending..." : "Submit Request"}
          </Button>
        </div>
      </form>
    </div>
  )
}
