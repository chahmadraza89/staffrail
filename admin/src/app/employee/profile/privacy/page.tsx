import Link from "next/link"
import { ArrowLeft, Shield } from "lucide-react"

import { requireEmployeePageSession } from "@/lib/auth/employee-guard"
import { ORG_CONFIG } from "@/lib/config/organization"

export const instant = false

export default async function EmployeePrivacyPage() {
  await requireEmployeePageSession()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/employee/profile"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          aria-label="Back to Profile"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Privacy &amp; Security</h1>
          <p className="text-xs text-slate-500">StaffRail Data Protection Standards</p>
        </div>
      </div>

      <article className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-700 shadow-xs">
        <div className="flex items-center gap-2 font-semibold text-slate-900">
          <Shield className="h-4 w-4 text-sky-700" />
          Confidentiality &amp; Credential Protection
        </div>
        <p>
          All signed onboarding policies, government identification uploads, training certificates,
          and clearance verification artifacts submitted through StaffRail are stored under encrypted
          transport and access-controlled storage rules limited to your profile and your assigned
          {ORG_CONFIG.name} compliance administrators.
        </p>
        <p>
          Every form acknowledgment, supervisor counter-signature, and document review action is
          recorded in an append-only compliance audit log for regulatory traceability.
        </p>
      </article>
    </div>
  )
}
