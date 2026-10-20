/**
 * Admin document renderers — port of
 * lib/features/admin/admin_directory/presentation/screens/widgets/
 * admin_acknowledge_form_view.dart + admin_form_views.dart.
 *
 * These are READ-ONLY renderings of what the employee submitted (plus the
 * administrative review payload). Layout, dispatch order, label text, and
 * field fallbacks match the Flutter source; only the styling primitives are
 * web-native (the reference uses Flutter/GoogleFonts).
 *
 * Two intentional display-only corrections:
 *  - Data rows JSON-render arrays/objects instead of Dart's `.toString()`
 *    (`[{text: ..., checked: true}]`), which was unreadable for reviewers.
 *  - Uploaded files are opened through a safe `<a rel="noreferrer">` link
 *    instead of `url_launcher`; the filename/cleanup rules are identical.
 */
import type { ReactNode } from "react"
import {
  Check,
  Circle,
  Square,
  SquareCheckBig,
  TriangleAlert,
  Upload,
} from "lucide-react"

import { fileNameFromUrl, formatFormLabel, formatFormValue } from "@/lib/admin/task-format"
import type { TaskStatus } from "@/lib/admin/task-status"

/** Everything the document renderers need, assembled by the review panel. */
export interface TaskFormModel {
  id: string
  title: string
  status: TaskStatus
  employeeName: string
  formData: Record<string, unknown> | null
  adminFormData: Record<string, unknown> | null
  signatureUrl: string | null
  adminSignatureUrl: string | null
  fileUrl: string | null
  signedAt: Date | null
  updatedAt: Date | null
}

// ── Value helpers ───────────────────────────────────────────────────────────

function text(value: unknown): string {
  if (typeof value === "string") {
    return value
  }
  if (value === null || value === undefined) {
    return ""
  }
  return String(value)
}

function textOr(value: unknown, fallback: string): string {
  const valueText = text(value)
  return valueText.length > 0 ? valueText : fallback
}

function recordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === "object" && !Array.isArray(item),
      )
    : []
}

// ── Shared primitives (admin_form_views.dart) ───────────────────────────────

function AckItem({ text: label, checked }: { text: string; checked: boolean }) {
  return (
    <div className="mb-3 flex items-start gap-3">
      {checked ? (
        <SquareCheckBig className="mt-0.5 size-5 shrink-0 text-[#109B85]" aria-hidden />
      ) : (
        <Square className="mt-0.5 size-5 shrink-0 text-slate-300" aria-hidden />
      )}
      <p
        className={
          checked
            ? "text-sm font-semibold text-slate-900"
            : "text-sm font-normal text-slate-400"
        }
      >
        {label}
      </p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-4">
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 border-b border-black/10 pb-1.5 text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  )
}

function SectionHeader({ children }: { children: string }) {
  return (
    <p className="text-sm font-black uppercase tracking-[0.08em] text-slate-900">
      {children}
    </p>
  )
}

function DescriptionText({ children }: { children: string }) {
  return <p className="whitespace-pre-line text-sm leading-relaxed text-slate-500">{children}</p>
}

function BulletItem({ children }: { children: string }) {
  return (
    <div className="mb-2 flex items-start gap-3 pl-1">
      <Circle className="mt-2 size-1.5 shrink-0 fill-slate-500 text-slate-500" aria-hidden />
      <p className="text-sm leading-relaxed text-slate-700">{children}</p>
    </div>
  )
}

// ── Specialized documents ───────────────────────────────────────────────────

/** 1. Code of Conduct — welcome letter + eight ethics items. */
export function CodeOfConductFormView() {
  const ethics = [
    "To avoid real or perceived conflicts of interest",
    "To be honest and realistic when documenting services provided",
    "To reject bribery in all its forms",
    "To improve the understanding of behavioral health services",
    "To treat all staff and clients fairly and not engage in any acts of discrimination",
    "To provide safe environment for clients and staff",
    "Abide by all applicable federal and state laws, including HIPPA",
    "To abide by this Code of Ethics",
  ]

  return (
    <div className="space-y-4">
      <p className="text-center text-2xl font-extrabold tracking-wide text-red-600">WELCOME</p>
      <p className="text-center text-sm leading-relaxed text-slate-700">
        Welcome to Bright Horizons Mental Health, LLC. I would like to wish you much
        success here. I hope that your experience here will be challenging, enjoyable
        and rewarding.
      </p>
      <div className="text-center">
        <p className="text-sm font-bold text-slate-900">Sincerely,</p>
        <p className="font-serif text-2xl font-semibold italic text-slate-700">Shawn Mathai</p>
        <p className="text-[13px] font-bold text-slate-900">Chief Executive Officer</p>
      </div>
      <div className="h-px bg-slate-400" />
      <p className="text-center text-xl font-extrabold text-red-600">Code of Ethics/Conduct</p>
      <ol className="space-y-2">
        {ethics.map((item, index) => (
          <li key={item} className="flex gap-2 pl-4 text-sm font-bold leading-relaxed text-slate-900">
            <span className="w-6 shrink-0 font-semibold">{index + 1}.</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
      <p className="pt-4 text-[15px] font-bold text-slate-900">Acknowledgment</p>
      <p className="text-sm leading-relaxed text-slate-700">
        I acknowledge that I have received, read, and understood the Code of
        Ethics/Conduct document
      </p>
      <p className="text-sm leading-relaxed text-slate-700">
        I agree to comply with all applicable laws, regulations, and agency policies,
        and to conduct myself in a professional and ethical manner consistent with the
        mission and standards of Bright Horizons Mental Health, LLC.
      </p>
      <p className="text-sm leading-relaxed text-slate-700">
        I understand that failure to comply with these standards may result in
        disciplinary or corrective action, up to and including termination of employment
        or contractual agreement.
      </p>
    </div>
  )
}

/** 2. Alleged Abuse — only the submitted acknowledgments are shown. */
export function AllegedAbuseFormView({ task }: { task: TaskFormModel }) {
  const acknowledgments = recordArray(task.formData?.acknowledgments)
  return (
    <div>
      <SectionHeader>REPORTING ALLEGED ABUSE OR NEGLECT</SectionHeader>
      <div className="mt-4">
        <DescriptionText>
          BHMH is committed to ensuring the safety and well-being of all clients.
          Employees are mandatory reporters and must follow strict guidelines for
          reporting any suspected abuse, neglect, or exploitation.
        </DescriptionText>
      </div>
      <div className="mt-6">
        {acknowledgments.map((ack, index) => (
          <AckItem
            key={`${index}-${text(ack.text)}`}
            text={text(ack.text)}
            checked={ack.checked === true}
          />
        ))}
      </div>
    </div>
  )
}

/** 3. Company property policy. */
export function AcknowledgeOfCompanyPropertyFormView() {
  return (
    <div>
      <SectionHeader>POLICY SUMMARY</SectionHeader>
      <div className="mt-3 space-y-2">
        <DescriptionText>
          To ensure accountability, security, and proper maintenance of organizational
          resources, Bright Horizons Mental Health, LLC issues company property to
          employees and contractors as needed for the performance of their duties.
        </DescriptionText>
        <DescriptionText>
          This property is considered the sole property of Bright Horizons Mental
          Health, LLC and must be used responsibly, only for legitimate business
          purposes, and in accordance with agency policy.
        </DescriptionText>
      </div>

      <div className="mt-6">
        <SectionHeader>COMPANY PROPERTY COVERED</SectionHeader>
      </div>
      <div className="mt-3 space-y-2">
        <DescriptionText>Company property may include, but is not limited to:</DescriptionText>
        <BulletItem>Identification badges and access cards</BulletItem>
        <BulletItem>Office keys or key fobs</BulletItem>
        <BulletItem>Laptops, tablets, or mobile phones</BulletItem>
        <BulletItem>Agency documents, handbooks, or training materials</BulletItem>
        <BulletItem>Uniforms, equipment, or medical/safety supplies</BulletItem>
        <BulletItem>Software, electronic data, and confidential materials</BulletItem>
        <DescriptionText>
          All items remain the property of Bright Horizons Mental Health, LLC and must
          be returned in good working condition upon request, termination, or contract
          completion.
        </DescriptionText>
      </div>

      <div className="mt-6">
        <SectionHeader>USAGE AND RESPONSIBILITY</SectionHeader>
      </div>
      <div className="mt-3 space-y-2">
        <DescriptionText>
          By accepting company property, I acknowledge and agree to the following
          conditions:
        </DescriptionText>
        <BulletItem>
          Property is issued for professional use only and must not be used for
          personal or non-agency activities.
        </BulletItem>
        <BulletItem>
          I am responsible for the care, maintenance, and proper use of all assigned
          equipment or materials.
        </BulletItem>
        <BulletItem>
          Any loss, theft, or damage must be reported immediately to my supervisor or
          the administrative office.
        </BulletItem>
        <BulletItem>
          I understand that misuse, negligence, or unauthorized disclosure of
          information may result in disciplinary action, including financial liability
          or contract termination.
        </BulletItem>
        <BulletItem>
          Upon termination or at the agency&apos;s request, I will return all property
          in my possession to Bright Horizons Mental Health, LLC.
        </BulletItem>
      </div>

      <div className="mt-6">
        <SectionHeader>ACKNOWLEDGMENT</SectionHeader>
      </div>
      <div className="mt-3 space-y-2">
        <DescriptionText>
          I acknowledge that I have received company property as listed below (if
          applicable) and agree to the terms of this policy.
        </DescriptionText>
        <DescriptionText>
          I understand that failure to return company property or to comply with this
          policy may result in financial responsibility for replacement and/or legal
          action.
        </DescriptionText>
      </div>
    </div>
  )
}

/** 4. Direct deposit authorization. */
export function DirectDepositFormView({ task }: { task: TaskFormModel }) {
  const formData = task.formData ?? {}
  return (
    <div>
      <SectionHeader>DIRECT DEPOSIT AUTHORIZATION</SectionHeader>
      <div className="mt-3">
        <DescriptionText>
          I hereby authorize BHMH to initiate credit entries to my account at the
          financial institution indicated below.
        </DescriptionText>
      </div>
      <div className="mt-6">
        <InfoRow label="Employee Name" value={textOr(formData.fullName, "N/A")} />
        <InfoRow label="Date of Birth" value={textOr(formData.dateOfBirth, "N/A")} />
        <InfoRow label="SSN (Last 4)" value={textOr(formData.ssn, "N/A")} />
        <InfoRow label="Current Address" value={textOr(formData.address, "N/A")} />
        <InfoRow label="Email Address" value={textOr(formData.email, "N/A")} />
      </div>
      <div className="mt-4">
        <SectionHeader>BANK INFORMATION</SectionHeader>
      </div>
      <div className="mt-3">
        <InfoRow label="Bank Name" value={textOr(formData.bankName, "N/A")} />
        <InfoRow label="Account Type" value={textOr(formData.accountType, "N/A")} />
        <InfoRow label="Account Number" value={textOr(formData.accountNumber, "N/A")} />
        <InfoRow label="Routing Number" value={textOr(formData.routingNumber, "N/A")} />
      </div>
    </div>
  )
}

/** Shared completion-type badge + uploaded-document row (I-9 / W-9). */
function CompletionStatusAndFileLink({ task }: { task: TaskFormModel }) {
  const formData = task.formData ?? {}
  const hasSubmitted = Object.keys(formData).length > 0 || task.fileUrl !== null
  const completedVirtually = formData.completedVirtually === "true"
  const hasFile = task.fileUrl !== null && task.fileUrl.length > 0

  const completion = !hasSubmitted
    ? {
        label: "Not Submitted Yet",
        className: "border-slate-300 bg-slate-100 text-slate-500",
        icon: <Upload className="size-4" aria-hidden />,
      }
    : completedVirtually
      ? {
          label: "Completed Virtually (Adobe)",
          className: "border-sky-200 bg-sky-100 text-sky-700",
          icon: <Check className="size-4" aria-hidden />,
        }
      : {
          label: "Completed Physically",
          className: "border-green-200 bg-green-50 text-green-700",
          icon: <Check className="size-4" aria-hidden />,
        }

  return (
    <div className="mb-4">
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
        COMPLETION TYPE
      </p>
      <div className="mt-2">
        <span
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] font-semibold ${completion.className}`}
        >
          {completion.icon}
          {completion.label}
        </span>
      </div>

      {hasFile ? (
        <>
          <p className="mt-4 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
            UPLOADED DOCUMENT
          </p>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2">
            <TriangleAlert className="size-5 shrink-0 text-rose-600" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-700">
              {fileNameFromUrl(task.fileUrl!)}
            </span>
            <a
              href={task.fileUrl!}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-xs font-semibold text-sky-700 hover:underline"
            >
              Open
            </a>
          </div>
        </>
      ) : null}
    </div>
  )
}

/** 5. I-9 (Section 1) — completion type + legacy metadata. */
export function I9FormView({ task }: { task: TaskFormModel }) {
  const formData = task.formData ?? {}
  const hasLegacy =
    "fullName" in formData ||
    "dateOfBirth" in formData ||
    "ssn" in formData ||
    "address" in formData

  return (
    <div>
      <SectionHeader>EMPLOYMENT ELIGIBILITY VERIFICATION (FORM I-9)</SectionHeader>
      <div className="mt-6">
        <CompletionStatusAndFileLink task={task} />
      </div>
      {hasLegacy ? (
        <div className="mb-4">
          <SectionHeader>SUBMITTED METADATA (LEGACY)</SectionHeader>
          <div className="mt-4">
            {"fullName" in formData ? (
              <InfoRow label="Full Name" value={textOr(formData.fullName, "N/A")} />
            ) : null}
            {"dateOfBirth" in formData ? (
              <InfoRow label="Date of Birth" value={textOr(formData.dateOfBirth, "N/A")} />
            ) : null}
            {"ssn" in formData ? (
              <InfoRow label="SSN (Last 4)" value={textOr(formData.ssn, "N/A")} />
            ) : null}
            {"address" in formData ? (
              <InfoRow label="Address" value={textOr(formData.address, "N/A")} />
            ) : null}
          </div>
        </div>
      ) : null}
      {formData.citizenshipStatus !== null && formData.citizenshipStatus !== undefined ? (
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
            ATTESTATION OF CITIZENSHIP/IMMIGRATION STATUS:
          </p>
          <p className="mt-2 text-sm italic text-slate-700">
            {text(formData.citizenshipStatus)}
          </p>
        </div>
      ) : null}
    </div>
  )
}

/** 6. W-9 — completion type + legacy metadata + certification. */
export function W9FormView({ task }: { task: TaskFormModel }) {
  const formData = task.formData ?? {}
  const hasLegacy =
    "fullName" in formData ||
    "businessName" in formData ||
    "taxClassification" in formData ||
    "taxId" in formData ||
    "ssn" in formData

  return (
    <div>
      <SectionHeader>REQUEST FOR TAXPAYER IDENTIFICATION NUMBER (FORM W-9)</SectionHeader>
      <div className="mt-6">
        <CompletionStatusAndFileLink task={task} />
      </div>
      {hasLegacy ? (
        <div className="mb-4">
          <SectionHeader>SUBMITTED METADATA (LEGACY)</SectionHeader>
          <div className="mt-4">
            {"fullName" in formData ? (
              <InfoRow
                label="Name"
                value={textOr(formData.fullName, task.employeeName)}
              />
            ) : null}
            {"businessName" in formData ? (
              <InfoRow label="Business Name" value={textOr(formData.businessName, "N/A")} />
            ) : null}
            {"taxClassification" in formData ? (
              <InfoRow
                label="Tax Classification"
                value={textOr(formData.taxClassification, "N/A")}
              />
            ) : null}
            {"taxId" in formData || "ssn" in formData ? (
              <InfoRow
                label="SSN / EIN"
                value={textOr(formData.taxId ?? formData.ssn, "N/A")}
              />
            ) : null}
          </div>
        </div>
      ) : null}
      <p className="text-[11px] font-extrabold tracking-wide text-slate-500">
        Certification under penalties of perjury:
      </p>
      <p className="mt-2 text-sm italic text-slate-700">
        I certify that the information provided on this form is true, correct, and
        complete.
      </p>
    </div>
  )
}

/** 7. Competency skills checklist. */
export function CompetencyFormView({ task }: { task: TaskFormModel }) {
  const skills = recordArray(task.formData?.skills)
  const isQmhp = task.id === "qmhp_cs_competency"
  return (
    <div>
      <SectionHeader>
        {isQmhp
          ? "QMHP-CS CORE COMPETENCY EVALUATION"
          : "COMPETENCY EVALUATION AND SKILLS CHECKLIST"}
      </SectionHeader>
      <div className="mt-6">
        {skills.length === 0 ? (
          <DescriptionText>No competency data has been submitted yet.</DescriptionText>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2.5 text-xs font-extrabold">
                  Skill/Competency Description
                </th>
                <th className="border border-slate-300 p-2.5 text-center text-xs font-extrabold">
                  Rating
                </th>
              </tr>
            </thead>
            <tbody>
              {skills.map((skill, index) => {
                const rating = textOr(skill.rating, "N/A")
                return (
                  <tr key={`${index}-${text(skill.text)}`}>
                    <td className="border border-slate-300 p-2.5 text-[13px]">
                      {text(skill.text)}
                    </td>
                    <td
                      className={`border border-slate-300 p-2.5 text-center text-[13px] font-bold ${
                        rating === "Met" ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {rating}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const ANNUAL_TRAINING_TOPICS = [
  "Code of Conduct & Corporate Compliance",
  "Cultural Competency Refresher",
  "Ethics and Professional Conduct",
  "HIPAA and Confidentiality",
  "Workplace Safety & Emergency Preparedness",
  "Abuse, Neglect, and Exploitation Reporting",
  "Infection Control Refresher",
  "Trauma-Informed Care Practices",
] as const

const INITIAL_TRAINING_TOPICS = [
  "Types of Services",
  "Person Centered Planning",
  "Documentation and Timelines",
  "Client Rights & Responsibilities",
  "Cultural Competency",
  "Crisis Intervention Steps",
  "Corporate Compliance & Ethics",
  "Confidentiality / HIPAA",
  "Mandatory Reporting",
  "Abuse and Neglect Reporting",
] as const

function trainingSignedDate(signedAt: Date | null): string {
  if (!signedAt) {
    return "—"
  }
  return `${signedAt.getMonth() + 1}/${signedAt.getDate()}/${signedAt.getFullYear()}`
}

function TrainingTable({
  topics,
  formData,
  signedAt,
}: {
  topics: readonly string[]
  formData: Record<string, unknown>
  signedAt: Date | null
}) {
  const signedDate = trainingSignedDate(signedAt)
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="bg-slate-100">
          <th className="border border-slate-300 p-2.5 text-xs font-extrabold">
            Training Topic
          </th>
          <th className="border border-slate-300 p-2.5 text-center text-xs font-extrabold">
            Date Completed
          </th>
          <th className="border border-slate-300 p-2.5 text-center text-xs font-extrabold">
            Score/Status
          </th>
        </tr>
      </thead>
      <tbody>
        {topics.map((topic, index) => {
          const fieldId = `topic_${index + 1}`
          const checked = formData[fieldId] === true || formData[fieldId] === "true"
          return (
            <tr key={fieldId}>
              <td className="border border-slate-300 p-2.5 text-[13px]">{topic}</td>
              <td className="border border-slate-300 p-2.5 text-center text-[13px]">
                {checked ? signedDate : "—"}
              </td>
              <td
                className={`border border-slate-300 p-2.5 text-center text-[13px] font-bold ${
                  checked ? "text-green-700" : "text-slate-900"
                }`}
              >
                {checked ? "Verified" : "Pending"}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/** 8. Annual training log. */
export function AnnualTrainingFormView({ task }: { task: TaskFormModel }) {
  return (
    <div>
      <SectionHeader>ANNUAL TRAINING AND IN-SERVICE LOG</SectionHeader>
      <div className="mt-6">
        <TrainingTable
          topics={ANNUAL_TRAINING_TOPICS}
          formData={task.formData ?? {}}
          signedAt={task.signedAt}
        />
      </div>
    </div>
  )
}

/** 9. Initial training log. */
export function InitialTrainingFormView({ task }: { task: TaskFormModel }) {
  return (
    <div>
      <SectionHeader>INITIAL TRAINING AND COMPETENCY LOG</SectionHeader>
      <div className="mt-6">
        <TrainingTable
          topics={INITIAL_TRAINING_TOPICS}
          formData={task.formData ?? {}}
          signedAt={task.signedAt}
        />
      </div>
    </div>
  )
}

function ContactRow({
  number,
  name,
  phone,
  relation,
}: {
  number: string
  name: string
  phone: string
  relation: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="pt-1 text-sm font-bold">{number}</span>
      <div className="flex-1">
        <p className="border-b border-black/25 pb-1 text-sm">{name || "\u00A0"}</p>
        <p className="mt-1 text-[11px] text-slate-500">Print Name</p>
      </div>
      <div className="flex-1">
        <p className="border-b border-black/25 pb-1 text-sm">{phone || "\u00A0"}</p>
        <p className="mt-1 text-[11px] text-slate-500">Telephone Number</p>
      </div>
      <div className="flex-1">
        <p className="border-b border-black/25 pb-1 text-sm">{relation || "\u00A0"}</p>
        <p className="mt-1 text-[11px] text-slate-500">Relationship</p>
      </div>
    </div>
  )
}

/** 10. Emergency medical care authorization. */
export function EmergencyMedicalCareFormView({ task }: { task: TaskFormModel }) {
  const formData = task.formData ?? {}
  return (
    <div>
      <SectionHeader>Authorization for Emergency Medical Care</SectionHeader>
      <div className="mt-3">
        <DescriptionText>
          I authorize Bright Horizons Mental Health, LLC to seek and obtain emergency
          medical care on my behalf in the event of an emergency situation rendering me
          unable to obtain such care for myself.
        </DescriptionText>
      </div>
      <p className="mt-6 text-sm font-semibold text-slate-700">
        In case of an emergency please contact:
      </p>
      <div className="mt-3 space-y-4 rounded-lg border border-slate-300 bg-white p-4">
        <ContactRow
          number="1."
          name={text(formData.emergencyContact1Name)}
          phone={text(formData.emergencyContact1Phone)}
          relation={text(formData.emergencyContact1Relation)}
        />
        <ContactRow
          number="2."
          name={text(formData.emergencyContact2Name)}
          phone={text(formData.emergencyContact2Phone)}
          relation={text(formData.emergencyContact2Relation)}
        />
      </div>
    </div>
  )
}

/** 11. Attestation form. */
export function AttestationFormView({ task }: { task: TaskFormModel }) {
  const illegalDrugsUsage = text(task.formData?.illegalDrugsUsage)
  const doUse = illegalDrugsUsage === "I do use illegal drugs"
  const doNotUse = illegalDrugsUsage === "I do not use illegal drugs"

  return (
    <div>
      <SectionHeader>Attestation Form</SectionHeader>
      <div className="mt-3">
        <DescriptionText>
          {`Prior to accepting a position with Bright Horizons Mental Health, LLC, I hereby attest that I am capable of performing essential functions of job with or without accommodation.\n\nI hereby voluntarily consent to provide a urine specimen (or blood specimen as required for alcohol testing only) at a collection facility designated by Bright Horizons Mental Health, LLC, and further consent to have the specimen tested at a laboratory selected by Bright Horizons Mental Health, LLC.`}
        </DescriptionText>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-1 text-sm text-slate-700">
        <span>(Check one) do </span>
        {doUse ? (
          <SquareCheckBig className="size-[18px] text-[#109B85]" aria-hidden />
        ) : (
          <Square className="size-[18px] text-slate-400" aria-hidden />
        )}
        <span> or do not </span>
        {doNotUse ? (
          <SquareCheckBig className="size-[18px] text-[#109B85]" aria-hidden />
        ) : (
          <Square className="size-[18px] text-slate-400" aria-hidden />
        )}
        <span> use illegal drugs.</span>
      </div>
      <div className="mt-4">
        <DescriptionText>
          {`I hereby attest that I possess a current valid professional license/and or have the credentials required to perform the job duties. I will provide a copy of my current license/certification to Bright Horizons Mental Health, LLC.\n\nI hereby attest that I am not under any limitation of privileges or disciplinary actions associated with my current licensing board.\n\nI hereby attest that I have reported to Bright Horizons Mental Health, LLC. A current or past adverse actions that may present risk management concerns to include Medicare/Medicaid exclusion, or sanctions; ethical violations, criminal convictions, etc...`}
        </DescriptionText>
      </div>
    </div>
  )
}

/** 12. Vehicle documentation acknowledgement. */
export function VehicleDocFormView({ task, policyText }: { task: TaskFormModel; policyText: string }) {
  const formData = task.formData ?? {}
  const fullName = textOr(
    formData.fullName,
    textOr(task.adminFormData?.employeeName, "N/A"),
  )
  const positionTitle = textOr(formData.positionTitle, "N/A")
  const signedDate = textOr(
    formData.signedDate,
    task.updatedAt ? isoDate(task.updatedAt) : "N/A",
  )

  return (
    <div>
      <SectionHeader>Acknowledgement of Vehicle Documentation</SectionHeader>
      <div className="mt-4">
        <InfoRow label="Employee/Contractor Name" value={fullName} />
        <InfoRow label="Position/Title" value={positionTitle} />
        <InfoRow label="Date" value={signedDate} />
      </div>
      <div className="mt-6">
        <DescriptionText>{policyText}</DescriptionText>
      </div>
    </div>
  )
}

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`
}

// ── Initial orientation ─────────────────────────────────────────────────────

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[11px] font-semibold tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-[15px] font-extrabold text-slate-900">{value}</p>
    </div>
  )
}

export function InitialOrientationFormView({
  task,
  effectiveDate,
}: {
  task: TaskFormModel
  effectiveDate: string
}) {
  const formData = task.formData ?? {}
  const hasEmployeeInfo = "fullName" in formData || "position" in formData

  return (
    <div>
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-around">
        <MetadataItem label="Effective Date" value={effectiveDate} />
        <div className="hidden h-8 w-px bg-slate-200 sm:block" />
        <MetadataItem label="Review Cycle" value="Annual" />
      </div>

      {hasEmployeeInfo ? (
        <div className="mt-8">
          <p className="text-sm font-black uppercase tracking-[0.08em] text-slate-900">
            EMPLOYEE INFORMATION
          </p>
          <div className="mt-4">
            {"fullName" in formData ? (
              <InfoRow label="Full Legal Name" value={text(formData.fullName)} />
            ) : null}
            {"position" in formData ? (
              <InfoRow label="Position/Title" value={text(formData.position)} />
            ) : null}
            {"startDate" in formData ? (
              <InfoRow label="Start Date" value={text(formData.startDate)} />
            ) : null}
          </div>
        </div>
      ) : null}

      <p className="mt-2 text-sm font-black uppercase tracking-[0.08em] text-slate-900">
        ORIENTATION TOPICS COVERED
      </p>
      <div className="mt-5">
        <BulletItem>Mission, Vision, and Values of Bright Horizons Mental Health, LLC</BulletItem>
        <BulletItem>Code of Conduct and Corporate Compliance</BulletItem>
        <BulletItem>Confidentiality and HIPAA Policy</BulletItem>
        <BulletItem>Cultural Competency and Diversity Awareness</BulletItem>
        <BulletItem>Workplace Safety and Emergency Procedures</BulletItem>
        <BulletItem>Client Rights and Responsibilities</BulletItem>
        <BulletItem>Abuse, Neglect, and Exploitation Reporting</BulletItem>
        <BulletItem>Infection Control and Universal Precautions</BulletItem>
        <BulletItem>Incident and Grievance Reporting Procedures</BulletItem>
      </div>

      <p className="mt-8 text-sm font-black uppercase tracking-[0.08em] text-slate-900">
        ACKNOWLEDGMENT
      </p>
      <p className="mt-3 text-sm italic leading-relaxed text-slate-700">
        I acknowledge that I have completed the general orientation for Bright Horizons
        Mental Health, LLC and understand all topics presented. I have received copies
        of related policies and procedures.
      </p>
    </div>
  )
}

// ── Driver's verification ───────────────────────────────────────────────────

export function DriversVerificationFormView({ task }: { task: TaskFormModel }) {
  const formData = task.formData ?? {}
  const isLegacy = "ack_license" in formData
  const refusal = isLegacy ? "false" : textOr(formData.ack_refusal, "false")
  const submitted = isLegacy
    ? textOr(formData.ack_license, "false")
    : textOr(formData.ack_submitted, "false")
  const future = isLegacy ? "true" : textOr(formData.ack_future, "false")
  const expiration = textOr(formData.exp_date_1, "N/A")

  return (
    <div>
      <AckItem
        text="1. Due to non-presentation of valid Texas Driver's License and/or required Texas Liability vehicle insurance, I will not transport any recipients of this agency at any time, for any reason."
        checked={refusal === "true"}
      />
      <AckItem
        text="2. I have submitted a current Texas Driver's License and Texas Liability vehicle insurance."
        checked={submitted === "true"}
      />
      <AckItem
        text="3. I will provide Bright Horizons Mental Health, LLC Services with current License and Insurance as updated and upon request."
        checked={future === "true"}
      />
      <p className="mt-8 text-base font-bold text-slate-900">Employee Vehicle Inspection Form</p>
      <div className="mt-3">
        <AckItem
          text="I certify that the vehicle used for BHMH business has been inspected and is in safe operating condition."
          checked={formData.ack_inspection === "true"}
        />
      </div>
      <p className="mt-8 text-sm font-black uppercase tracking-[0.08em] text-slate-500">
        VEHICLE DOCUMENTATION EXPIRATION DATES
      </p>
      <div className="mt-5">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
          VEHICLE EXPIRATION DATE:
        </p>
        <p className="mt-1 border-b border-black/10 pb-1.5 text-sm font-semibold text-slate-800">
          {expiration}
        </p>
      </div>
    </div>
  )
}

// ── Legal section parsing (kept byte-compatible with Dart) ──────────────────

function getSectionContent(fullContent: string, sectionTitle: string): string {
  const lines = fullContent.split("\n")
  let startIndex = -1
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].includes(`**${sectionTitle}**`)) {
      startIndex = index + 1
      break
    }
  }
  if (startIndex === -1) {
    return ""
  }
  const result: string[] = []
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index]
    if (line.trim().startsWith("**") && !line.includes(sectionTitle)) {
      break
    }
    result.push(line)
  }
  return result.join("\n").trim()
}

function LegalSection({
  title,
  content,
  isList = false,
}: {
  title: string
  content: string
  isList?: boolean
}) {
  if (content.length === 0) {
    return null
  }
  return (
    <div>
      <p className="text-[17px] font-black text-slate-900">{title}</p>
      <div className="mt-3">
        {isList ? (
          content
            .split("\n")
            .filter((line) => line.trim().length > 0)
            .map((line, index) => {
              const trimmed = line.trim()
              const cleanLine = trimmed.startsWith("*") ? trimmed.slice(1).trim() : trimmed
              return (
                <div key={`${index}-${cleanLine}`} className="mb-2.5 flex items-start gap-3 pl-3">
                  <span className="text-lg font-bold leading-tight text-[#109B85]">•</span>
                  <p className="text-[15px] leading-relaxed text-slate-700">{cleanLine}</p>
                </div>
              )
            })
        ) : (
          <p className="text-[15px] leading-relaxed text-slate-700">{content}</p>
        )}
      </div>
    </div>
  )
}

// ── Footer fields / signatures ──────────────────────────────────────────────

function FooterField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:gap-3">
      <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500 sm:text-[13px] sm:normal-case sm:tracking-normal sm:text-slate-900">
        {label}
      </span>
      <span className="min-h-6 flex-1 border-b border-slate-900 pb-1 text-base font-medium text-slate-800">
        {value || "\u00A0"}
      </span>
    </div>
  )
}

function SignatureField({ label, text: signatureText }: { label: string; text: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:gap-3">
      <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500 sm:text-[13px] sm:normal-case sm:tracking-normal sm:text-slate-900">
        {label}
      </span>
      <span className="flex h-12 flex-1 items-end justify-center border-b-2 border-slate-900 font-serif text-2xl font-bold italic text-slate-900 sm:text-[32px]">
        {signatureText}
      </span>
    </div>
  )
}

function DataRow({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  return (
    <div className="mb-4">
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
        {formatFormLabel(fieldKey)}:
      </p>
      <p className="mt-1 break-words border-b border-black/10 pb-1.5 text-sm font-semibold text-slate-800">
        {formatFormValue(value)}
      </p>
    </div>
  )
}

function isConfidentialityForm(taskId: string): boolean {
  return (
    taskId === "corporate_confidentiality_statement" ||
    taskId === "confidentiality_of_client___therapist___staff"
  )
}

// ── Acknowledge document shell ──────────────────────────────────────────────

export function AdminAcknowledgeFormView({
  task,
  legalContent,
}: {
  task: TaskFormModel
  legalContent: string | null
}) {
  const taskIdNormalized = task.id.toLowerCase().replaceAll("’", "'")
  const isDriversVerification =
    taskIdNormalized.includes("driver") && !taskIdNormalized.includes("license")
  const isInitialOrientation =
    taskIdNormalized.includes("initial_orientation") ||
    taskIdNormalized.includes("initialorientation") ||
    taskIdNormalized.includes("bhmh_initial_orientation")

  const showFields = task.status !== "notStarted" && task.status !== "pending"
  const fullName = showFields ? textOr(task.formData?.fullName, task.employeeName) : ""
  const signedDate = showFields
    ? textOr(
        task.formData?.signedDate,
        task.updatedAt ? longDate(task.updatedAt) : "N/A",
      )
    : ""
  const effectiveDateShort = showFields
    ? textOr(
        task.formData?.signedDate,
        task.updatedAt ? shortDate(task.updatedAt) : "01/01/2026",
      )
    : ""

  const signatureData = task.signatureUrl ?? text(task.formData?.signatureData)
  let signatureText = ""
  if (showFields && signatureData.startsWith("typed:")) {
    signatureText = signatureData.slice("typed:".length)
  }

  const fullContent = legalContent ?? ""
  const hasSections =
    fullContent.includes("**Purpose**") || fullContent.includes("**Acknowledgement**")
  const position = textOr(
    task.formData?.position ?? task.adminFormData?.position,
    "N/A",
  )

  let documentBody: ReactNode
  if (isDriversVerification) {
    documentBody = <DriversVerificationFormView task={task} />
  } else if (isInitialOrientation) {
    documentBody = (
      <InitialOrientationFormView task={task} effectiveDate={effectiveDateShort} />
    )
  } else if (task.id === "code_of_conduct_ethics") {
    documentBody = <CodeOfConductFormView />
  } else if (task.id === "alleged_abuse_neglect") {
    documentBody = <AllegedAbuseFormView task={task} />
  } else if (task.id === "acknowledge_of_company_property") {
    documentBody = <AcknowledgeOfCompanyPropertyFormView />
  } else if (task.id === "direct_deposit_authorization") {
    documentBody = <DirectDepositFormView task={task} />
  } else if (task.id === "tax_documents_i_9") {
    documentBody = <I9FormView task={task} />
  } else if (task.id === "tax_documents_w_9") {
    documentBody = <W9FormView task={task} />
  } else if (task.id.includes("competency") && task.id !== "cultural_competency") {
    documentBody = <CompetencyFormView task={task} />
  } else if (task.id === "annual_training") {
    documentBody = <AnnualTrainingFormView task={task} />
  } else if (task.id === "initial_training") {
    documentBody = <InitialTrainingFormView task={task} />
  } else if (task.id === "authorization_for_emergency_medical_care") {
    documentBody = <EmergencyMedicalCareFormView task={task} />
  } else if (task.id === "attestation_form") {
    documentBody = <AttestationFormView task={task} />
  } else if (task.id === "acknowledgement_of_vehicle_documentation") {
    const splitIndex = fullContent.indexOf("Policy Summary")
    documentBody = (
      <VehicleDocFormView
        task={task}
        policyText={splitIndex !== -1 ? fullContent.slice(splitIndex) : fullContent}
      />
    )
  } else if (hasSections) {
    documentBody = (
      <div className="space-y-6">
        <LegalSection title="Purpose" content={getSectionContent(fullContent, "Purpose")} />
        <LegalSection
          title="Terms and Conditions"
          content={getSectionContent(fullContent, "Terms and Conditions")}
          isList
        />
        <LegalSection
          title="Acknowledgement"
          content={getSectionContent(fullContent, "Acknowledgement")}
        />
      </div>
    )
  } else if (fullContent.length > 0) {
    documentBody = (
      <p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-700">
        {fullContent.replaceAll("**", "")}
      </p>
    )
  } else if (
    (task.formData !== null && Object.keys(task.formData).length > 0) ||
    (task.adminFormData !== null && Object.keys(task.adminFormData).length > 0)
  ) {
    documentBody = <SubmittedDataFallback task={task} />
  } else {
    documentBody = null
  }

  const witnessData = text(task.formData?.witnessSignature)
  const witnessText = witnessData.startsWith("typed:")
    ? witnessData.slice("typed:".length)
    : ""
  const signatureLabel = isConfidentialityForm(task.id)
    ? "Therapist/Staff Signature :"
    : "Employee/Contractor Signature :"
  const nameLabel = isConfidentialityForm(task.id)
    ? "Therapist/Staff Name :"
    : "Employee/Contractor Name :"
  const hasInlineHeader =
    task.id === "acknowledge_of_eoc_health_&_safety_policy" ||
    task.id === "acknowledge_of_company_property"

  const adminSignature = task.adminSignatureUrl
    ? task.adminSignatureUrl.replace("typed:", "")
    : ""
  const adminDate = textOr(task.adminFormData?.verificationDate, signedDate)

  return (
    <div className="w-full rounded-sm border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] sm:p-10 lg:px-12 lg:py-14">
      <div className="flex justify-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-[#109B85]/10 text-lg font-black tracking-tight text-[#109B85]">
          BHMH
        </div>
      </div>

      {task.id !== "code_of_conduct_ethics" ? (
        <>
          <p className="mt-8 text-center text-[22px] font-black uppercase tracking-wide text-red-900">
            {task.title}
          </p>
          <div className="h-10" />
        </>
      ) : null}

      {hasInlineHeader ? (
        <div className="mb-10 grid gap-6 sm:grid-cols-[3fr_2fr_2fr] sm:items-end">
          <FooterField label="Employee/Contractor Name :" value={fullName} />
          <FooterField label="Position/Title :" value={position} />
          <FooterField label="Date :" value={signedDate} />
        </div>
      ) : null}

      {documentBody}

      <div className="h-20" />

      {!hasInlineHeader ? (
        <>
          <FooterField label={nameLabel} value={fullName} />
          <div className="h-8" />
        </>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-[2fr_1fr] sm:items-end">
        <SignatureField label={signatureLabel} text={signatureText} />
        <FooterField label="Date :" value={signedDate} />
      </div>

      {witnessText.length > 0 ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-[2fr_1fr] sm:items-end">
          <SignatureField label="Witness Signature :" text={witnessText} />
          <FooterField label="Date :" value={signedDate} />
        </div>
      ) : null}

      {task.adminSignatureUrl ? (
        <>
          <div className="my-10 h-px bg-black/10" />
          <FooterField
            label="Authorized Agency Representative :"
            value={textOr(task.adminFormData?.supervisorName, "BHMH Administrator")}
          />
          <div className="h-8" />
          <div className="grid gap-6 sm:grid-cols-[2fr_1fr] sm:items-end">
            <SignatureField
              label="Authorized Agency Representative Signature :"
              text={adminSignature}
            />
            <FooterField label="Date :" value={adminDate} />
          </div>
        </>
      ) : null}

      <div className="mt-10 text-center">
        <p className="text-xs font-bold text-slate-500">Bright Horizons Mental Health, LLC</p>
        <p className="text-[10px] text-slate-400">3634 Glenn Lakes Lane, Suite 195-B</p>
        <p className="text-[10px] text-slate-400">Missouri City, Texas 77459 - 4062</p>
      </div>
    </div>
  )
}

function SubmittedDataFallback({ task }: { task: TaskFormModel }) {
  return (
    <div>
      <p className="text-sm font-black tracking-[0.08em] text-slate-900">
        FORM SUBMISSION DATA
      </p>
      <div className="mt-5">
        {task.formData ? (
          <>
            <p className="text-xs font-extrabold text-[#109B85]">EMPLOYEE SUBMISSION:</p>
            <div className="mt-3">
              {Object.entries(task.formData)
                .filter(
                  ([key]) =>
                    key !== "signatureData" &&
                    key !== "signedDate" &&
                    key !== "witnessSignature",
                )
                .map(([key, value]) => (
                  <DataRow key={key} fieldKey={key} value={value} />
                ))}
            </div>
          </>
        ) : null}
        {task.adminFormData && Object.keys(task.adminFormData).length > 0 ? (
          <>
            <p className="text-xs font-extrabold text-blue-500">ADMINISTRATIVE REVIEW:</p>
            <div className="mt-3">
              {Object.entries(task.adminFormData)
                .filter(
                  ([key]) => key !== "adminSignatureData" && key !== "verificationDate",
                )
                .map(([key, value]) => (
                  <DataRow key={key} fieldKey={key} value={value} />
                ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function longDate(date: Date): string {
  return `${FULL_MONTHS[date.getMonth()]} ${String(date.getDate()).padStart(2, "0")}, ${date.getFullYear()}`
}

function shortDate(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`
}

const FULL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const
