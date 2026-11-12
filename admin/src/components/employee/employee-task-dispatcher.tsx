"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileUp,
  Lock,
  PenLine,
  Save,
  Send,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { SignaturePad } from "@/components/admin/signature-pad"
import { EmployeeActionError } from "@/lib/admin/employee-actions"
import type { EmployeeTaskDoc } from "@/lib/admin/employee-detail-streams"
import { getLegalContent } from "@/lib/admin/legal-content"
import {
  ANNUAL_TRAINING_TOPICS,
  CODE_OF_CONDUCT_ETHICS_STATEMENTS,
  COMPETENCY_AREAS,
  DRIVERS_VERIFICATION_CHECKS,
  INITIAL_TRAINING_TOPICS,
  detectCompetencyTaskId,
} from "@/lib/admin/split-field-schemas"
import {
  BLANK_FORM_TASK_IDS,
  DEFAULT_BLANK_FORM_LINKS,
  fileNameFromUrl,
} from "@/lib/admin/task-format"
import {
  EMPLOYEE_UPLOAD_ACCEPT,
  saveEmployeeTaskDraft,
  submitEmployeeTask,
  uploadEmployeeFile,
} from "@/lib/employee/employee-actions"

export interface EmployeeTaskDispatcherProps {
  employeeId: string
  employeeName: string
  adminId: string | null
  task: EmployeeTaskDoc
  allTasks: EmployeeTaskDoc[]
}

function asBool(val: unknown): boolean {
  return val === true || val === "true"
}

function asStr(val: unknown): string {
  return typeof val === "string" ? val : val !== undefined && val !== null ? String(val) : ""
}

function initialTypedSig(sig: string | null | undefined): string {
  if (!sig) return ""
  const trimmed = sig.trim()
  if (trimmed.startsWith("typed:")) {
    return trimmed.slice(6).trim()
  }
  return trimmed.startsWith("data:") || /^https?:\/\//i.test(trimmed) ? "" : trimmed
}

export function EmployeeTaskDispatcher(props: EmployeeTaskDispatcherProps) {
  return (
    <EmployeeTaskDispatcherInner
      key={`${props.task.id}:${props.task.revision ?? "0"}`}
      {...props}
    />
  )
}

function EmployeeTaskDispatcherInner({
  employeeId,
  employeeName,
  adminId,
  task,
  allTasks,
}: EmployeeTaskDispatcherProps) {
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  const existingData = task.formData ?? {}
  const legalContent = useMemo(() => getLegalContent(task.id), [task.id])

  const isDirectDepositInit = task.id.toLowerCase().includes("direct_deposit")
  const [formState, setFormState] = useState<Record<string, unknown>>(() => ({
    fullName: asStr(existingData.fullName) || employeeName,
    signedDate: asStr(existingData.signedDate) || today,
    trainingDate: asStr(existingData.trainingDate) || today,
    employmentStartDate: asStr(existingData.employmentStartDate) || today,
    evaluationDate: asStr(existingData.evaluationDate) || today,
    startDate: asStr(existingData.startDate) || today,
    ...(isDirectDepositInit
      ? { accountType: "Checking", depositAmount: "100% Net Pay" }
      : {}),
    ...existingData,
  }))
  const rawSigInit = (task.signatureUrl ?? asStr(existingData.signature)).trim()
  const isImageSigInit =
    rawSigInit.startsWith("data:image/") || /^https?:\/\//i.test(rawSigInit)
  const [typedSignature, setTypedSignature] = useState<string>(() =>
    initialTypedSig(rawSigInit),
  )
  const [drawnSignatureDataUrl, setDrawnSignatureDataUrl] = useState<string | null>(() =>
    isImageSigInit ? rawSigInit : null,
  )
  const [sigMode, setSigMode] = useState<"type" | "draw">(() => {
    if (isImageSigInit) return "draw"
    if (rawSigInit.startsWith("typed:")) return "type"
    return task.actionType === "signature" ? "draw" : "type"
  })
  const [witnessSignature, setWitnessSignature] = useState<string>(() =>
    initialTypedSig(asStr(existingData.witnessSignature).trim() || asStr(existingData.witnessName)),
  )

  const [fileUrl, setFileUrl] = useState<string | null>(task.fileUrl)
  const [fileUrls, setFileUrls] = useState<string[]>(() => {
    const existingList = Array.isArray(existingData.fileUrls)
      ? existingData.fileUrls.filter(
          (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
        )
      : []
    if (task.fileUrl && !existingList.includes(task.fileUrl)) {
      return [task.fileUrl, ...existingList]
    }
    return existingList
  })
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState<"draft" | "submit" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isLocked =
    task.isCompleted ||
    task.status === "completed" ||
    task.status === "verified" ||
    task.status === "submitted" ||
    task.status === "pendingEmployerSignature" ||
    task.status === "waitingForApprover" ||
    task.status === "noActionRequired"

  const idLower = task.id.toLowerCase()
  const titleLower = task.title.toLowerCase()
  const isAnnualTraining =
    idLower.includes("annualtraining") ||
    idLower.includes("annual_training") ||
    titleLower.includes("annual training")
  const isInitialTraining =
    idLower.includes("initialtraining") ||
    idLower.includes("initial_training") ||
    titleLower.includes("initial training")
  const isI9 = idLower.includes("tax_documents_i_9")
  const isW9 = idLower.includes("tax_documents_w_9")
  const isW4 = idLower.includes("tax_documents_w_4") || idLower.includes("tax_documents_w_1")
  const isDrivers = idLower.includes("driver") && !idLower.includes("license")
  const isCodeOfConduct = idLower.includes("code_of_conduct")
  const competencyId = detectCompetencyTaskId(task.id)
  const isEmergencyMedical = idLower.includes("emergency_medical")
  const isDirectDeposit = idLower.includes("direct_deposit")
  const isAttestation = idLower.includes("attestation")
  const isVehicleDoc = idLower.includes("vehicle_documentation")
  const isGenericSplitField =
    task.actionType === "splitField" &&
    !isI9 &&
    !isW9 &&
    !isW4 &&
    !isDrivers &&
    !isCodeOfConduct &&
    !competencyId &&
    !isAnnualTraining &&
    !isInitialTraining

  const blankFormHref =
    task.blankFormLink ??
    (BLANK_FORM_TASK_IDS.includes(task.id as (typeof BLANK_FORM_TASK_IDS)[number])
      ? DEFAULT_BLANK_FORM_LINKS[task.id as keyof typeof DEFAULT_BLANK_FORM_LINKS] ?? null
      : null)

  const setField = (key: string, value: unknown) => {
    setFormState((prev) => ({ ...prev, [key]: value }))
    setError(null)
    setSuccess(null)
  }

  const handleUploadChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const uploaded = await uploadEmployeeFile({
        employeeId,
        scope: "onboarding",
        itemId: task.id,
        file,
      })
      setFileUrl(uploaded.fileUrl)
      setFileUrls((prev) => [...prev, uploaded.fileUrl])
      setSuccess(`Uploaded "${uploaded.fileName}". Remember to submit when ready.`)
    } catch (err) {
      setError(err instanceof EmployeeActionError || err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setUploading(false)
      event.target.value = ""
    }
  }

  const buildNormalizedSignature = (): string | null => {
    if (sigMode === "draw" && drawnSignatureDataUrl) {
      return drawnSignatureDataUrl
    }
    const clean = initialTypedSig(typedSignature)
    if (!clean) {
      return null
    }
    return `typed:${clean}`
  }

  const buildNormalizedWitnessSignature = (): string | null => {
    const clean = initialTypedSig(witnessSignature)
    if (!clean) {
      return null
    }
    return `typed:${clean}`
  }

  const buildPayloadFormData = (sig: string | null): Record<string, unknown> => {
    const nextFormData: Record<string, unknown> = { ...formState }
    if (isEmergencyMedical) {
      delete nextFormData.witnessName
      delete nextFormData.witnessSignature
      const witnessSig = buildNormalizedWitnessSignature()
      if (witnessSig) {
        nextFormData.witnessSignature = witnessSig
      }
    }
    if (sig) {
      nextFormData.signature = sig
    }
    return nextFormData
  }

  const validateBeforeSubmit = (): string | null => {
    if (task.actionType === "upload") {
      if (!fileUrl && fileUrls.length === 0) {
        return "Please upload at least one document file before submitting."
      }
      return null
    }

    if (isCodeOfConduct) {
      if (!asStr(formState.fullName).trim() || !asStr(formState.position).trim()) {
        return "Please complete your Full Name and Position."
      }
      for (const item of CODE_OF_CONDUCT_ETHICS_STATEMENTS) {
        if (!asBool(formState[item.key])) {
          return "Please confirm all eight Code of Ethics commitments."
        }
      }
      if (!asBool(formState.final_ack) || !buildNormalizedSignature()) {
        return "Please complete the final acknowledgment and typed signature."
      }
      return null
    }

    if (task.actionType === "acknowledgeSign") {
      if (!asBool(formState.acknowledged)) {
        return "Please confirm the acknowledgment checkbox before submitting."
      }
      if (!buildNormalizedSignature()) {
        return "Please enter your typed signature before submitting."
      }
      return null
    }

    if (task.actionType === "signature") {
      if (!buildNormalizedSignature()) {
        return "Please draw or type your signature before submitting."
      }
      return null
    }

    if (isI9 || isW9) {
      const virtual = asBool(formState.completedVirtually)
      if (!virtual && !fileUrl && fileUrls.length === 0) {
        return "Please either mark the form completed virtually or upload your completed PDF."
      }
      return null
    }

    if (isW4) {
      if (!asStr(formState.fullName).trim() || !asStr(formState.filingStatus).trim()) {
        return "Please complete your Full Name and Filing Status."
      }
      if (!asBool(formState.w4_certification)) {
        return "Please check the W-4 Employee Certification statement."
      }
      if (!buildNormalizedSignature()) {
        return "Please enter your typed signature."
      }
      return null
    }

    if (isDrivers) {
      for (const item of DRIVERS_VERIFICATION_CHECKS) {
        if (!asBool(formState[item.key])) {
          return "Please acknowledge all four Driver's Verification statements."
        }
      }
      if (!buildNormalizedSignature()) {
        return "Please enter your typed signature."
      }
      return null
    }

    if (isAnnualTraining || isInitialTraining) {
      if (!asStr(formState.fullName).trim() || !asStr(formState.position).trim()) {
        return "Please complete your Full Name and Position."
      }
      if (!asBool(formState.final_ack) || !buildNormalizedSignature()) {
        return "Please confirm the final training attestation checkbox and typed signature."
      }
      return null
    }

    if (isEmergencyMedical) {
      if (
        !asStr(formState.emergencyContact1Name).trim() ||
        !asStr(formState.emergencyContact1Phone).trim()
      ) {
        return "Please provide at least Primary Emergency Contact Name and Phone."
      }
      if (!buildNormalizedSignature()) {
        return "Please enter your signature."
      }
      const cleanWitness = initialTypedSig(witnessSignature)
      if (!cleanWitness) {
        return "Please enter a witness signature."
      }
      if (cleanWitness.length < 2) {
        return "Witness signature must be at least 2 characters."
      }
      return null
    }

    if (isDirectDeposit) {
      if (
        !asStr(formState.bankName).trim() ||
        !asStr(formState.routingNumber).trim() ||
        !asStr(formState.accountNumber).trim()
      ) {
        return "Please provide Bank Name, Routing Number, and Account Number."
      }
      if (!buildNormalizedSignature()) {
        return "Please enter your signature."
      }
      return null
    }

    if (isAttestation) {
      if (!asStr(formState.illegalDrugsUsage).trim()) {
        return "Please select an attestation statement."
      }
      if (!buildNormalizedSignature()) {
        return "Please enter your signature."
      }
      return null
    }

    if (isGenericSplitField) {
      if (!asStr(formState.fullName).trim()) {
        return "Please enter your Full Legal Name before submitting."
      }
      if (!asBool(formState.acknowledged)) {
        return "Please confirm the acknowledgment statement before submitting."
      }
      if (!buildNormalizedSignature()) {
        return "Please provide your signature before submitting."
      }
      return null
    }

    if (task.actionType === "fillAndSign" || task.actionType === "splitField") {
      if (!buildNormalizedSignature()) {
        return "Please provide your typed signature before submitting."
      }
    }

    return null
  }

  const handleSaveDraft = async () => {
    setBusy("draft")
    setError(null)
    setSuccess(null)
    try {
      const sig = buildNormalizedSignature()
      await saveEmployeeTaskDraft({
        employeeId,
        taskId: task.id,
        formData: buildPayloadFormData(sig),
        fileUrl,
        fileUrls,
      })
      setSuccess("Draft progress saved.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft.")
    } finally {
      setBusy(null)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const validationError = validateBeforeSubmit()
    if (validationError) {
      setError(validationError)
      return
    }

    const sig = buildNormalizedSignature()
    setBusy("submit")
    try {
      await submitEmployeeTask({
        employeeId,
        employeeName,
        adminId,
        taskId: task.id,
        taskTitle: task.title,
        actionType: task.actionType ?? "form",
        formData: buildPayloadFormData(sig),
        signatureUrl: sig,
        fileUrl,
        fileUrls,
      })
      setSuccess(
        task.actionType === "splitField"
          ? "Submitted! Sent to your supervisor for agency counter-signature."
          : "Submitted successfully for admin review.",
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit requirement.")
    } finally {
      setBusy(null)
    }
  }

  const topicRows = isAnnualTraining
    ? ANNUAL_TRAINING_TOPICS
    : isInitialTraining
      ? INITIAL_TRAINING_TOPICS
      : null

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="employee-task-dispatcher">
      {task.rejectionReason && (
        <div
          data-testid="employee-rejection-banner"
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <p className="font-semibold">Returned for Correction</p>
            <p className="mt-0.5 text-xs">{task.rejectionReason}</p>
          </div>
        </div>
      )}

      {isLocked && (
        <div
          data-testid="employee-task-locked"
          className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900"
        >
          {task.isCompleted || task.status === "completed" || task.status === "verified" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <Lock className="h-5 w-5 shrink-0 text-sky-700" />
          )}
          <div>
            <p className="font-semibold">
              {task.isCompleted || task.status === "completed" || task.status === "verified"
                ? "Completed & Verified"
                : task.status === "pendingEmployerSignature"
                  ? "Awaiting Supervisor Counter-Signature"
                  : "Submitted for Admin Review"}
            </p>
            <p className="text-xs opacity-90">
              This submission is currently locked while verified or pending review.
            </p>
          </div>
        </div>
      )}

      {/* Legal Policy Content */}
      {typeof legalContent === "string" && legalContent.trim().length > 0 && (
        <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/70 p-5 text-xs leading-relaxed text-slate-700">
          {legalContent.split(/\n\s*\n/).map((block, idx) => (
            <p key={idx} className="mb-3 whitespace-pre-line last:mb-0">
              {block.trim()}
            </p>
          ))}
        </div>
      )}

      {/* Blank Form External Link for I-9 / W-9 */}
      {blankFormHref && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50/60 p-4 text-xs">
          <div>
            <p className="font-semibold text-slate-900">Official Blank Form</p>
            <p className="text-slate-600">
              Download or fill out the official form before confirming below.
            </p>
          </div>
          <a
            href={blankFormHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-medium text-sky-700 shadow-xs ring-1 ring-sky-200 hover:bg-sky-50"
          >
            Open Blank Form
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {/* I-9 / W-9 Virtual Completion + Upload */}
      {(isI9 || isW9) && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <label className="flex items-start gap-3 text-sm text-slate-800">
            <input
              type="checkbox"
              disabled={isLocked}
              checked={asBool(formState.completedVirtually)}
              onChange={(e) => setField("completedVirtually", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
            />
            <span>
              I completed this form virtually (e.g., via Adobe Sign / Acrobat or outside portal)
            </span>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldInput
              label="Full Legal Name"
              value={asStr(formState.fullName)}
              disabled={isLocked}
              onChange={(v) => setField("fullName", v)}
            />
            {isW9 && (
              <FieldInput
                label="Tax Classification (e.g., Individual / Sole Proprietor)"
                value={asStr(formState.taxClassification)}
                disabled={isLocked}
                onChange={(v) => setField("taxClassification", v)}
              />
            )}
          </div>
          <UploadBox
            disabled={isLocked}
            uploading={uploading}
            fileUrls={fileUrls}
            onUpload={handleUploadChange}
          />
        </div>
      )}

      {/* Upload Action */}
      {task.actionType === "upload" && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <UploadBox
            disabled={isLocked}
            uploading={uploading}
            fileUrls={fileUrls}
            onUpload={handleUploadChange}
          />
          <FieldTextarea
            label="Submission Notes (Optional)"
            value={asStr(formState.notes)}
            disabled={isLocked}
            onChange={(v) => setField("notes", v)}
          />
        </div>
      )}

      {/* W-4 */}
      {isW4 && (
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <FieldInput
            label="Full Legal Name *"
            value={asStr(formState.fullName)}
            disabled={isLocked}
            onChange={(v) => setField("fullName", v)}
          />
          <FieldInput
            label="Date of Birth"
            type="date"
            value={asStr(formState.dateOfBirth)}
            disabled={isLocked}
            onChange={(v) => setField("dateOfBirth", v)}
          />
          <FieldInput
            label="SSN (Last 4 Digits)"
            value={asStr(formState.ssn)}
            disabled={isLocked}
            onChange={(v) => setField("ssn", v)}
          />
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            <span>Filing Status *</span>
            <select
              disabled={isLocked}
              value={asStr(formState.filingStatus)}
              onChange={(e) => setField("filingStatus", e.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-sm font-normal text-slate-900"
            >
              <option value="">Select status...</option>
              <option value="Single">Single or Married filing separately</option>
              <option value="Married">Married filing jointly</option>
              <option value="Head of Household">Head of household</option>
            </select>
          </label>
          <FieldInput
            label="Mailing Address"
            value={asStr(formState.address)}
            disabled={isLocked}
            onChange={(v) => setField("address", v)}
          />
          <FieldInput
            label="Position"
            value={asStr(formState.position)}
            disabled={isLocked}
            onChange={(v) => setField("position", v)}
          />
          <label className="flex items-start gap-2.5 text-xs text-slate-800 sm:col-span-2">
            <input
              type="checkbox"
              disabled={isLocked}
              checked={asBool(formState.w4_certification)}
              onChange={(e) => setField("w4_certification", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
            />
            <span>
              Under penalties of perjury, I declare that this certificate, to the best of my knowledge
              and belief, is true, correct, and complete.
            </span>
          </label>
        </div>
      )}

      {/* Driver's Verification */}
      {isDrivers && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          {DRIVERS_VERIFICATION_CHECKS.map((item) => (
            <label key={item.key} className="flex items-start gap-3 text-xs text-slate-800">
              <input
                type="checkbox"
                disabled={isLocked}
                checked={asBool(formState[item.key])}
                onChange={(e) => setField(item.key, e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span>{item.label}</span>
            </label>
          ))}
          <FieldInput
            label="License / Insurance Expiration Date (Optional)"
            type="date"
            value={asStr(formState.exp_date_1)}
            disabled={isLocked}
            onChange={(v) => setField("exp_date_1", v)}
          />
        </div>
      )}

      {/* Code of Conduct */}
      {isCodeOfConduct && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <FieldInput
              label="Full Name *"
              value={asStr(formState.fullName)}
              disabled={isLocked}
              onChange={(v) => setField("fullName", v)}
            />
            <FieldInput
              label="Position *"
              value={asStr(formState.position)}
              disabled={isLocked}
              onChange={(v) => setField("position", v)}
            />
            <FieldInput
              label="Start Date"
              type="date"
              value={asStr(formState.startDate)}
              disabled={isLocked}
              onChange={(v) => setField("startDate", v)}
            />
          </div>
          <div className="space-y-2 border-t border-slate-100 pt-3">
            {CODE_OF_CONDUCT_ETHICS_STATEMENTS.map((stmt) => (
              <label key={stmt.key} className="flex items-start gap-2.5 text-xs text-slate-800">
                <input
                  type="checkbox"
                  disabled={isLocked}
                  checked={asBool(formState[stmt.key])}
                  onChange={(e) => setField(stmt.key, e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <span>{stmt.label}</span>
              </label>
            ))}
            <label className="flex items-start gap-2.5 pt-2 text-xs font-semibold text-slate-900">
              <input
                type="checkbox"
                disabled={isLocked}
                checked={asBool(formState.final_ack)}
                onChange={(e) => setField("final_ack", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span>I commit to abide by the StaffRail Code of Ethics &amp; Conduct.</span>
            </label>
          </div>
        </div>
      )}

      {/* Competency Evaluation Employee Section */}
      {competencyId && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldInput
              label="Employee Full Name *"
              value={asStr(formState.fullName)}
              disabled={isLocked}
              onChange={(v) => setField("fullName", v)}
            />
            <FieldInput
              label="Position / Role *"
              value={asStr(formState.position)}
              disabled={isLocked}
              onChange={(v) => setField("position", v)}
            />
            {competencyId === "lpha_competency" && (
              <FieldInput
                label="License Type (LCSW / LPC / LMFT / etc.)"
                value={asStr(formState.licenseType)}
                disabled={isLocked}
                onChange={(v) => setField("licenseType", v)}
              />
            )}
            <FieldInput
              label="Assigned Evaluator / Supervisor Name"
              value={asStr(formState.evaluatorName)}
              disabled={isLocked}
              onChange={(v) => setField("evaluatorName", v)}
            />
            <FieldInput
              label="Evaluation Date"
              type="date"
              value={asStr(formState.evaluationDate)}
              disabled={isLocked}
              onChange={(v) => setField("evaluationDate", v)}
            />
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-700">
              Competency Domains Covered (Rated by Supervisor upon Counter-Sign):
            </p>
            <ul className="grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
              {COMPETENCY_AREAS[competencyId].map((area) => (
                <li key={area}>• {area}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Annual / Initial Training Audit Tables */}
      {topicRows && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <FieldInput
              label="Employee Full Name *"
              value={asStr(formState.fullName)}
              disabled={isLocked}
              onChange={(v) => setField("fullName", v)}
            />
            <FieldInput
              label="Position *"
              value={asStr(formState.position)}
              disabled={isLocked}
              onChange={(v) => setField("position", v)}
            />
            <FieldInput
              label={isInitialTraining ? "Employment Start Date" : "Training Completion Date"}
              type="date"
              value={asStr(isInitialTraining ? formState.employmentStartDate : formState.trainingDate)}
              disabled={isLocked}
              onChange={(v) =>
                setField(isInitialTraining ? "employmentStartDate" : "trainingDate", v)
              }
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3">Attest</th>
                  <th className="py-2 pr-3">Training Topic</th>
                  <th className="py-2">Related Onboarding Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topicRows.map((row) => {
                  const linkedDone = row.mappedTaskIds.some((mappedId) =>
                    allTasks.some(
                      (t) =>
                        t.id.toLowerCase() === mappedId.toLowerCase() &&
                        (t.isCompleted || t.status === "completed" || t.status === "verified"),
                    ),
                  )
                  const checked = asBool(formState[row.topicKey]) || linkedDone
                  return (
                    <tr key={row.topicKey}>
                      <td className="py-2 pr-3">
                        <input
                          type="checkbox"
                          disabled={isLocked}
                          checked={checked}
                          onChange={(e) => setField(row.topicKey, e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      </td>
                      <td className="py-2 pr-3 font-medium text-slate-800">{row.label}</td>
                      <td className="py-2 text-slate-500">
                        {linkedDone ? (
                          <span className="text-emerald-700 font-medium">Completed in Guide</span>
                        ) : (
                          "Manual attestation"
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <label className="flex items-start gap-2.5 text-xs font-semibold text-slate-900">
            <input
              type="checkbox"
              disabled={isLocked}
              checked={asBool(formState.final_ack)}
              onChange={(e) => setField("final_ack", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
            />
            <span>
              I certify that I have completed and understood all training topics marked above.
            </span>
          </label>
        </div>
      )}

      {isGenericSplitField && (
        <div
          data-testid="employee-generic-split-fields"
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <FieldInput
              label="Full Legal Name *"
              value={asStr(formState.fullName)}
              disabled={isLocked}
              onChange={(v) => setField("fullName", v)}
            />
            <FieldInput
              label="Position / Title"
              value={asStr(formState.position)}
              disabled={isLocked}
              onChange={(v) => setField("position", v)}
            />
            <FieldInput
              label="Signed Date"
              type="date"
              value={asStr(formState.signedDate)}
              disabled={isLocked}
              onChange={(v) => setField("signedDate", v)}
            />
          </div>
          <label className="flex items-start gap-2.5 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              disabled={isLocked}
              checked={asBool(formState.acknowledged)}
              onChange={(e) => setField("acknowledged", e.target.checked)}
              data-testid="employee-split-ack-checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
            />
            <span>
              I have reviewed this orientation/policy requirement and submit my portion for
              supervisor counter-signature.
            </span>
          </label>
        </div>
      )}

      {/* Fill & Sign Specialized Layouts */}
      {isEmergencyMedical && (
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <FieldInput
            label="Employee Full Name"
            value={asStr(formState.fullName)}
            disabled={isLocked}
            onChange={(v) => setField("fullName", v)}
          />
          <FieldInput
            label="Preferred Hospital"
            value={asStr(formState.preferredHospital)}
            disabled={isLocked}
            onChange={(v) => setField("preferredHospital", v)}
          />
          <FieldInput
            label="Emergency Contact 1 Name *"
            value={asStr(formState.emergencyContact1Name)}
            disabled={isLocked}
            onChange={(v) => setField("emergencyContact1Name", v)}
          />
          <FieldInput
            label="Emergency Contact 1 Phone *"
            value={asStr(formState.emergencyContact1Phone)}
            disabled={isLocked}
            onChange={(v) => setField("emergencyContact1Phone", v)}
          />
          <FieldInput
            label="Emergency Contact 1 Relationship"
            value={asStr(formState.emergencyContact1Relation)}
            disabled={isLocked}
            onChange={(v) => setField("emergencyContact1Relation", v)}
          />
          <FieldInput
            label="Emergency Contact 2 Name"
            value={asStr(formState.emergencyContact2Name)}
            disabled={isLocked}
            onChange={(v) => setField("emergencyContact2Name", v)}
          />
          <FieldInput
            label="Emergency Contact 2 Phone"
            value={asStr(formState.emergencyContact2Phone)}
            disabled={isLocked}
            onChange={(v) => setField("emergencyContact2Phone", v)}
          />
          <FieldInput
            label="Emergency Contact 2 Relationship"
            value={asStr(formState.emergencyContact2Relation)}
            disabled={isLocked}
            onChange={(v) => setField("emergencyContact2Relation", v)}
          />
          <FieldInput
            label="Known Medical Allergies / Conditions"
            value={asStr(formState.medicalConditions)}
            disabled={isLocked}
            onChange={(v) => setField("medicalConditions", v)}
          />
          <div className="space-y-2 border-t border-slate-100 pt-3 sm:col-span-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
              <span>Witness Signature *</span>
              <input
                type="text"
                disabled={isLocked}
                value={witnessSignature}
                onChange={(e) => {
                  setWitnessSignature(e.target.value)
                  setError(null)
                  setSuccess(null)
                }}
                placeholder="Type witness full name as signature"
                data-testid="employee-witness-signature-input"
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm font-normal text-slate-900 focus:border-sky-500 focus:outline-none disabled:bg-slate-100"
              />
            </label>
            {initialTypedSig(witnessSignature).length > 0 && (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="block text-[10px] uppercase tracking-wider text-slate-400">
                  Witness Signature Preview
                </span>
                <span className="font-serif text-lg italic text-slate-900">
                  {initialTypedSig(witnessSignature)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {isDirectDeposit && (
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <FieldInput
            label="Employee Full Name *"
            value={asStr(formState.fullName)}
            disabled={isLocked}
            onChange={(v) => setField("fullName", v)}
          />
          <FieldInput
            label="Bank Name *"
            value={asStr(formState.bankName)}
            disabled={isLocked}
            onChange={(v) => setField("bankName", v)}
          />
          <FieldInput
            label="Routing Number *"
            value={asStr(formState.routingNumber)}
            disabled={isLocked}
            onChange={(v) => setField("routingNumber", v)}
          />
          <FieldInput
            label="Account Number *"
            value={asStr(formState.accountNumber)}
            disabled={isLocked}
            onChange={(v) => setField("accountNumber", v)}
          />
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            <span>Account Type</span>
            <select
              disabled={isLocked}
              value={asStr(formState.accountType) || "Checking"}
              onChange={(e) => setField("accountType", e.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-sm font-normal text-slate-900"
            >
              <option value="Checking">Checking</option>
              <option value="Savings">Savings</option>
            </select>
          </label>
          <FieldInput
            label="Deposit Percentage / Amount"
            value={asStr(formState.depositAmount) || "100% Net Pay"}
            disabled={isLocked}
            onChange={(v) => setField("depositAmount", v)}
          />
        </div>
      )}

      {isAttestation && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldInput
              label="Full Name"
              value={asStr(formState.fullName)}
              disabled={isLocked}
              onChange={(v) => setField("fullName", v)}
            />
            <FieldInput
              label="Position"
              value={asStr(formState.position)}
              disabled={isLocked}
              onChange={(v) => setField("position", v)}
            />
          </div>
          <p className="text-xs font-medium text-slate-700">Substance Use Attestation *</p>
          <label className="flex items-center gap-2 text-xs text-slate-800">
            <input
              type="radio"
              name="illegalDrugsUsage"
              disabled={isLocked}
              checked={asStr(formState.illegalDrugsUsage) === "I do not use illegal drugs"}
              onChange={() => setField("illegalDrugsUsage", "I do not use illegal drugs")}
            />
            <span>I do not use illegal drugs.</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-800">
            <input
              type="radio"
              name="illegalDrugsUsage"
              disabled={isLocked}
              checked={asStr(formState.illegalDrugsUsage) === "I do use illegal drugs"}
              onChange={() => setField("illegalDrugsUsage", "I do use illegal drugs")}
            />
            <span>I do use illegal drugs (explain below).</span>
          </label>
          <FieldTextarea
            label="Additional Explanation (If Applicable)"
            value={asStr(formState.explanation)}
            disabled={isLocked}
            onChange={(v) => setField("explanation", v)}
          />
        </div>
      )}

      {isVehicleDoc && (
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <FieldInput
            label="Full Name"
            value={asStr(formState.fullName)}
            disabled={isLocked}
            onChange={(v) => setField("fullName", v)}
          />
          <FieldInput
            label="Position / Title"
            value={asStr(formState.positionTitle)}
            disabled={isLocked}
            onChange={(v) => setField("positionTitle", v)}
          />
          <FieldInput
            label="Driver's License Number"
            value={asStr(formState.licenseNumber)}
            disabled={isLocked}
            onChange={(v) => setField("licenseNumber", v)}
          />
          <FieldInput
            label="Insurance Carrier & Policy #"
            value={asStr(formState.insuranceCarrier)}
            disabled={isLocked}
            onChange={(v) => setField("insuranceCarrier", v)}
          />
        </div>
      )}

      {/* Standard Acknowledgment Checkbox */}
      {task.actionType === "acknowledgeSign" && !isCodeOfConduct && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          {!isVehicleDoc && (
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldInput
                label="Full Legal Name"
                value={asStr(formState.fullName)}
                disabled={isLocked}
                onChange={(v) => setField("fullName", v)}
              />
              <FieldInput
                label="Signed Date"
                type="date"
                value={asStr(formState.signedDate)}
                disabled={isLocked}
                onChange={(v) => setField("signedDate", v)}
              />
            </div>
          )}
          <label className="flex items-start gap-2.5 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              disabled={isLocked}
              checked={asBool(formState.acknowledged)}
              onChange={(e) => setField("acknowledged", e.target.checked)}
              data-testid="employee-ack-checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
            />
            <span>I have read, understand, and agree to comply with this policy and requirement.</span>
          </label>
        </div>
      )}

      {/* Signature Capture Block (all signed actionTypes except pure upload) */}
      {task.actionType !== "upload" && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <PenLine className="h-3.5 w-3.5" />
              Employee Signature
            </span>
            {!isLocked && (
              <div className="flex gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setSigMode("type")}
                  className={`rounded-md px-2.5 py-1 font-medium ${
                    sigMode === "type"
                      ? "bg-sky-100 text-sky-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  Type Name
                </button>
                <button
                  type="button"
                  onClick={() => setSigMode("draw")}
                  className={`rounded-md px-2.5 py-1 font-medium ${
                    sigMode === "draw"
                      ? "bg-sky-100 text-sky-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  Draw Signature
                </button>
              </div>
            )}
          </div>

          {sigMode === "draw" ? (
            isLocked ? (
              drawnSignatureDataUrl ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <span className="mb-1 block text-[10px] uppercase tracking-wider text-slate-400">
                    Submitted Signature
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={drawnSignatureDataUrl}
                    alt="Employee signature"
                    className="max-h-24 object-contain"
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-500">Drawn signature recorded.</p>
              )
            ) : (
              <div className="space-y-2">
                <SignaturePad
                  onConfirm={(base64Png) => {
                    const dataUrl = base64Png.startsWith("data:")
                      ? base64Png
                      : `data:image/png;base64,${base64Png}`
                    setDrawnSignatureDataUrl(dataUrl)
                    setSuccess("Drawn signature captured cleanly.")
                  }}
                />
                {drawnSignatureDataUrl && (
                  <p className="text-xs font-medium text-emerald-700">
                    Drawn signature ready to submit.
                  </p>
                )}
              </div>
            )
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                disabled={isLocked}
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
                placeholder="Type your full legal name"
                data-testid="employee-signature-input"
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none disabled:bg-slate-100"
              />
              {typedSignature.trim().length > 0 && (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400">
                    Electronic Signature Preview
                  </span>
                  <span className="font-serif text-lg italic text-slate-900">
                    {typedSignature.trim()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div
          role="alert"
          data-testid="employee-task-error"
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          data-testid="employee-task-success"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800"
        >
          {success}
        </div>
      )}

      {!isLocked && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={busy !== null || uploading}
            onClick={handleSaveDraft}
            data-testid="employee-save-draft"
          >
            <Save className="mr-1.5 h-4 w-4" />
            {busy === "draft" ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            type="submit"
            disabled={busy !== null || uploading}
            data-testid="employee-submit-task"
            className="bg-sky-700 text-white hover:bg-sky-800"
          >
            <Send className="mr-1.5 h-4 w-4" />
            {busy === "submit" ? "Submitting..." : "Submit Requirement"}
          </Button>
        </div>
      )}
    </form>
  )
}

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: "text" | "date"
  disabled: boolean
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
      <span>{label}</span>
      <input
        type={type}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-sm font-normal text-slate-900 focus:border-sky-500 focus:outline-none disabled:bg-slate-100"
      />
    </label>
  )
}

function FieldTextarea({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
      <span>{label}</span>
      <textarea
        rows={3}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-300 bg-white p-2.5 text-sm font-normal text-slate-900 focus:border-sky-500 focus:outline-none disabled:bg-slate-100"
      />
    </label>
  )
}

function UploadBox({
  disabled,
  uploading,
  fileUrls,
  onUpload,
}: {
  disabled: boolean
  uploading: boolean
  fileUrls: string[]
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="space-y-3">
      {!disabled && (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center hover:border-sky-400 hover:bg-sky-50/40">
          <FileUp className="mb-2 h-6 w-6 text-sky-700" />
          <span className="text-xs font-semibold text-slate-800">
            {uploading ? "Uploading file..." : "Choose a file to upload (PDF, PNG, JPG, DOCX <= 10 MB)"}
          </span>
          <input
            type="file"
            accept={EMPLOYEE_UPLOAD_ACCEPT}
            disabled={uploading}
            onChange={onUpload}
            className="hidden"
          />
        </label>
      )}

      {fileUrls.length > 0 && (
        <ul className="space-y-1.5 text-xs">
          {fileUrls.map((url, idx) => (
            <li
              key={`${url}-${idx}`}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <span className="truncate font-medium text-slate-700">
                {fileNameFromUrl(url) || `Uploaded Document ${idx + 1}`}
              </span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-sky-700 hover:underline"
              >
                View
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
