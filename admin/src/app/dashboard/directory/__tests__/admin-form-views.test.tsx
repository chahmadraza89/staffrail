// @vitest-environment jsdom
/**
 * Admin document renderer tests — a port of the Flutter admin form views.
 * Documents are exercised through `AdminAcknowledgeFormView` so the dispatch
 * order (which specialized view wins) is covered as well.
 */
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render } from "@testing-library/react"

import { getLegalContent } from "@/lib/admin/legal-content"
import type { TaskStatus } from "@/lib/admin/task-status"

import {
  AdminAcknowledgeFormView,
  type TaskFormModel,
} from "@/app/dashboard/directory/[employeeId]/admin-form-views"

function makeTask(overrides: Partial<TaskFormModel> = {}): TaskFormModel {
  return {
    id: "onboarding_acknowledgment_form",
    title: "Onboarding Acknowledgment form",
    status: "submitted" as TaskStatus,
    employeeName: "Jane Doe",
    formData: {},
    adminFormData: {},
    signatureUrl: null,
    adminSignatureUrl: null,
    fileUrl: null,
    signedAt: null,
    updatedAt: new Date(2026, 9, 12),
    ...overrides,
  }
}

function renderDocument(task: TaskFormModel) {
  return render(
    <AdminAcknowledgeFormView task={task} legalContent={getLegalContent(task.id)} />,
  )
}

afterEach(() => {
  cleanup()
})

describe("AdminAcknowledgeFormView — shell", () => {
  it("renders the company letterhead, title, footer and agency address", () => {
    renderDocument(makeTask({ formData: { fullName: "Jane Doe" }, signatureUrl: "typed:Jane Doe" }))
    const text = document.body.textContent ?? ""
    expect(text).toContain("BHMH")
    expect(text).toContain("Onboarding Acknowledgment form")
    expect(text).toContain("Bright Horizons Mental Health, LLC")
    expect(text).toContain("3634 Glenn Lakes Lane, Suite 195-B")
    expect(text).toContain("Missouri City, Texas 77459 - 4062")
    // Typed signature is rendered as the signature text, not as a URL.
    expect(text).toContain("Jane Doe")
  })

  it("hides submitted values until the task left notStarted/pending", () => {
    renderDocument(
      makeTask({
        status: "notStarted" as TaskStatus,
        formData: { fullName: "Jane Doe" },
        signatureUrl: "typed:Jane Doe",
      }),
    )
    const text = document.body.textContent ?? ""
    expect(text).not.toContain("Jane Doe")
  })

  it("renders the admin counter-signature block only when a signature exists", () => {
    const { unmount } = renderDocument(
      makeTask({
        formData: { fullName: "Jane Doe" },
        signatureUrl: "typed:Jane Doe",
        adminSignatureUrl: "typed:Dana Admin",
        adminFormData: { supervisorName: "Dana Admin", verificationDate: "2026-10-01" },
      }),
    )
    expect(document.body.textContent).toContain("Authorized Agency Representative Signature")
    expect(document.body.textContent).toContain("Dana Admin")
    unmount()

    renderDocument(makeTask({ formData: { fullName: "Jane Doe" } }))
    expect(document.body.textContent).not.toContain("Authorized Agency Representative Signature")
  })
})

describe("specialized document dispatch", () => {
  it("I-9 shows completion type, legacy metadata and citizenship attestation", () => {
    renderDocument(
      makeTask({
        id: "tax_documents_i_9",
        title: "Tax Documents (I-9)",
        formData: {
          completedVirtually: "true",
          fullName: "Jane Doe",
          ssn: "1111",
          citizenshipStatus: "A citizen of the United States",
        },
      }),
    )
    const text = document.body.textContent ?? ""
    expect(text).toContain("EMPLOYMENT ELIGIBILITY VERIFICATION (FORM I-9)")
    expect(text).toContain("Completed Virtually (Adobe)")
    expect(text).toContain("SUBMITTED METADATA (LEGACY)")
    expect(text).toContain("SSN (Last 4)")
    expect(text).toContain("1111")
    expect(text).toContain("ATTESTATION OF CITIZENSHIP/IMMIGRATION STATUS:")
    expect(text).toContain("A citizen of the United States")
  })

  it("I-9 with no submission shows 'Not Submitted Yet' and no metadata block", () => {
    renderDocument(
      makeTask({ id: "tax_documents_i_9", title: "Tax Documents (I-9)", formData: {} }),
    )
    expect(document.body.textContent).toContain("Not Submitted Yet")
    expect(document.body.textContent).not.toContain("SUBMITTED METADATA (LEGACY)")
  })

  it("W-9 shows the certification and uploaded-document filename", () => {
    renderDocument(
      makeTask({
        id: "tax_documents_w_9",
        title: "Tax Documents (W-9)",
        formData: { fullName: "Jane Doe", taxClassification: "Individual" },
        fileUrl:
          "https://firebasestorage.googleapis.com/v0/b/x/o/users%2Fa%2F1779348558389_w-9.pdf?alt=media",
      }),
    )
    const text = document.body.textContent ?? ""
    expect(text).toContain("REQUEST FOR TAXPAYER IDENTIFICATION NUMBER (FORM W-9)")
    expect(text).toContain("Completed Physically")
    expect(text).toContain("UPLOADED DOCUMENT")
    expect(text).toContain("w-9.pdf")
    expect(text).toContain("Certification under penalties of perjury:")
  })

  it("competency checklist renders the skills table with ratings", () => {
    renderDocument(
      makeTask({
        id: "employee_competency_checklist",
        title: "Competency Evaluation",
        formData: {
          skills: [
            { text: "Hand hygiene", rating: "Met" },
            { text: "Crisis de-escalation", rating: "Not Met" },
          ],
        },
      }),
    )
    const text = document.body.textContent ?? ""
    expect(text).toContain("COMPETENCY EVALUATION AND SKILLS CHECKLIST")
    expect(text).toContain("Hand hygiene")
    expect(text).toContain("Met")
    expect(text).toContain("Crisis de-escalation")
    expect(text).toContain("Not Met")
  })

  it("competency with no skills says so instead of rendering an empty table", () => {
    renderDocument(
      makeTask({ id: "qmhp_cs_competency", title: "QMHP Competency", formData: {} }),
    )
    expect(document.body.textContent).toContain("QMHP-CS CORE COMPETENCY EVALUATION")
    expect(document.body.textContent).toContain("No competency data has been submitted yet.")
  })

  it("annual training marks completed topics with the signed date", () => {
    renderDocument(
      makeTask({
        id: "annual_training",
        title: "Annual Training",
        formData: { topic_1: true, topic_2: false },
        signedAt: new Date(2026, 9, 12),
      }),
    )
    const text = document.body.textContent ?? ""
    expect(text).toContain("ANNUAL TRAINING AND IN-SERVICE LOG")
    expect(text).toContain("Code of Conduct & Corporate Compliance")
    expect(text).toContain("10/12/2026")
    expect(text).toContain("Verified")
    expect(text).toContain("Pending")
  })

  it("initial training uses its own topic list", () => {
    renderDocument(
      makeTask({ id: "initial_training", title: "Initial Training", formData: { topic_1: true } }),
    )
    expect(document.body.textContent).toContain("INITIAL TRAINING AND COMPETENCY LOG")
    expect(document.body.textContent).toContain("Types of Services")
    expect(document.body.textContent).toContain("Person Centered Planning")
  })

  it("code of conduct renders the welcome letter and eight ethics items", () => {
    renderDocument(makeTask({ id: "code_of_conduct_ethics", title: "Code of Conduct" }))
    const text = document.body.textContent ?? ""
    expect(text).toContain("WELCOME")
    expect(text).toContain("Code of Ethics/Conduct")
    expect(text).toContain("To reject bribery in all its forms")
    expect(text).toContain("To abide by this Code of Ethics")
  })

  it("alleged abuse renders only the submitted acknowledgments", () => {
    renderDocument(
      makeTask({
        id: "alleged_abuse_neglect",
        title: "Alleged Abuse",
        formData: {
          acknowledgments: [
            { text: "I must report immediately", checked: true },
            { text: "I may delay reporting", checked: false },
          ],
        },
      }),
    )
    const text = document.body.textContent ?? ""
    expect(text).toContain("REPORTING ALLEGED ABUSE OR NEGLECT")
    expect(text).toContain("I must report immediately")
    expect(text).toContain("I may delay reporting")
  })

  it("company property renders the full policy sections", () => {
    renderDocument(
      makeTask({ id: "acknowledge_of_company_property", title: "Company Property" }),
    )
    const text = document.body.textContent ?? ""
    expect(text).toContain("POLICY SUMMARY")
    expect(text).toContain("COMPANY PROPERTY COVERED")
    expect(text).toContain("USAGE AND RESPONSIBILITY")
    expect(text).toContain("ACKNOWLEDGMENT")
    expect(text).toContain("Office keys or key fobs")
  })

  it("direct deposit renders every bank field with N/A fallbacks", () => {
    renderDocument(
      makeTask({
        id: "direct_deposit_authorization",
        title: "Direct Deposit",
        formData: { fullName: "Jane Doe", bankName: "Chase" },
      }),
    )
    const text = document.body.textContent ?? ""
    expect(text).toContain("DIRECT DEPOSIT AUTHORIZATION")
    expect(text).toContain("BANK INFORMATION")
    expect(text).toContain("Jane Doe")
    expect(text).toContain("Chase")
    expect(text).toContain("N/A")
  })

  it("emergency medical renders both contact rows", () => {
    renderDocument(
      makeTask({
        id: "authorization_for_emergency_medical_care",
        title: "Emergency Medical",
        formData: {
          emergencyContact1Name: "Ann A",
          emergencyContact1Phone: "555-1",
          emergencyContact2Name: "Bob B",
          emergencyContact2Phone: "555-2",
        },
      }),
    )
    const text = document.body.textContent ?? ""
    expect(text).toContain("Authorization for Emergency Medical Care")
    expect(text).toContain("Ann A")
    expect(text).toContain("Bob B")
    expect(text).toContain("Print Name")
  })

  it("attestation checks only the selected drug-usage option", () => {
    renderDocument(
      makeTask({
        id: "attestation_form",
        title: "Attestation",
        formData: { illegalDrugsUsage: "I do not use illegal drugs" },
      }),
    )
    expect(document.body.textContent).toContain("Attestation Form")
    expect(document.body.textContent).toContain("(Check one) do")
    expect(document.body.textContent).toContain("use illegal drugs.")
  })

  it("vehicle documentation slices the policy text at 'Policy Summary'", () => {
    renderDocument(
      makeTask({
        id: "acknowledgement_of_vehicle_documentation",
        title: "Vehicle Documentation",
        formData: { fullName: "Jane Doe", positionTitle: "Therapist", signedDate: "2026-10-12" },
      }),
    )
    const text = document.body.textContent ?? ""
    expect(text).toContain("Acknowledgement of Vehicle Documentation")
    expect(text).toContain("Jane Doe")
    expect(text).toContain("Therapist")
    expect(text).toContain("2026-10-12")
  })

  it("initial orientation renders the effective-date banner and topics", () => {
    renderDocument(
      makeTask({
        id: "bhmh_initial_orientation",
        title: "Initial Orientation",
        formData: { fullName: "Jane Doe", position: "Therapist" },
      }),
    )
    const text = document.body.textContent ?? ""
    expect(text).toContain("ORIENTATION TOPICS COVERED")
    expect(text).toContain("Review Cycle")
    expect(text).toContain("Annual")
    expect(text).toContain("Mission, Vision, and Values")
  })

  it("driver's verification reads both legacy and current acknowledgment fields", () => {
    const { unmount } = renderDocument(
      makeTask({
        id: "drivers_verification",
        title: "Driver's Verification",
        formData: { ack_license: "true", ack_future: "true", exp_date_1: "2027-01-01" },
      }),
    )
    let text = document.body.textContent ?? ""
    expect(text).toContain("Employee Vehicle Inspection Form")
    expect(text).toContain("VEHICLE DOCUMENTATION EXPIRATION DATES")
    expect(text).toContain("2027-01-01")
    expect(text).not.toContain("Not Submitted Yet")
    unmount()

    renderDocument(
      makeTask({
        id: "drivers_verification",
        title: "Driver's Verification",
        formData: { ack_refusal: "true", ack_future: "true" },
      }),
    )
    text = document.body.textContent ?? ""
    expect(text).toContain("Employee Vehicle Inspection Form")
  })

  it("falls back to rendering submitted data when no specialized view applies", () => {
    renderDocument(
      makeTask({
        id: "some_custom_acknowledgment",
        title: "Custom Acknowledgment",
        formData: { customField: "custom value" },
        adminFormData: { position: "Therapist" },
      }),
    )
    const text = document.body.textContent ?? ""
    expect(text).toContain("EMPLOYEE SUBMISSION:")
    expect(text).toContain("CUSTOM FIELD")
    expect(text).toContain("custom value")
    expect(text).toContain("ADMINISTRATIVE REVIEW:")
    expect(text).toContain("POSITION")
  })

  it("renders verbatim legal content when no specialized view applies", () => {
    renderDocument(makeTask({ id: "corporate_confidentiality_statement", title: "Confidentiality" }))
    const text = document.body.textContent ?? ""
    expect(text).toContain("CONFIDENTIALITY OF CLIENT / THERAPIST / STAFF")
    expect(text).toContain("I have read and understand the above statement:")
    // Markdown emphasis markers are stripped for the on-screen document.
    expect(text).not.toContain("**")
    // Confidentiality forms use the therapist/staff signature labels.
    expect(text).toContain("Therapist/Staff Name :")
    expect(text).toContain("Therapist/Staff Signature :")
  })
})
