"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmployeeActionError } from "@/lib/admin/employee-actions"
import { updateEmployeeProfileDetails } from "@/lib/employee/employee-actions"

export function EmployeeEditProfileView({
  employeeUid,
  initialName,
  initialPhone,
  initialDepartment,
}: {
  employeeUid: string
  initialName: string
  initialPhone: string
  initialDepartment: string
}) {
  const [name, setName] = useState(initialName)
  const [phoneNumber, setPhoneNumber] = useState(initialPhone)
  const [department, setDepartment] = useState(initialDepartment)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      await updateEmployeeProfileDetails({
        employeeId: employeeUid,
        name,
        phoneNumber,
        department,
      })
      setSuccess("Profile updated cleanly.")
    } catch (err) {
      setError(err instanceof EmployeeActionError || err instanceof Error ? err.message : "Update failed.")
    } finally {
      setSaving(false)
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
          <h1 className="text-xl font-semibold text-slate-900">Edit Profile</h1>
          <p className="text-xs text-slate-500">Update your display name and contact metadata</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          <span>Full Name *</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          <span>Department</span>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            disabled={saving}
            placeholder="e.g., Clinical Services"
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          <span>Phone Number</span>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={saving}
            placeholder="(555) 123-4567"
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900"
          />
        </label>

        {error && (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            {success}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="bg-sky-700 text-white hover:bg-sky-800">
            <Save className="mr-1.5 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}
