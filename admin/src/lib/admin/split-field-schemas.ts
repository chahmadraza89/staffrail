import { ORG_CONFIG } from "@/lib/config/organization"

/**
 * Canonical schemas for dual-signature (`splitField`) onboarding documents,
 * competency evaluations, and annual/initial training audit tables.
 *
 * Ports field definitions and evaluation rubrics directly from Flutter:
 *  - lib/features/employee/on_boarding/presentation/split_field_form_view.dart
 *  - lib/features/employee/on_boarding/presentation/annual_training_form_view.dart
 *  - lib/features/employee/on_boarding/presentation/initial_training_form_view.dart
 *  - lib/core/config/app_legal_content.dart (competencyAreas)
 */

export type CompetencyTaskId = "cssp_competency" | "qmhp_cs_competency" | "lpha_competency"

export const COMPETENCY_AREAS: Record<CompetencyTaskId, readonly string[]> = {
  cssp_competency: [
    "Client Engagement",
    "Advocacy",
    "Documentation",
    "Crisis Response",
    "Professional Conduct",
    "Collaboration",
    "Time Management",
    "Policy Adherence",
  ],
  qmhp_cs_competency: [
    "Assessment & Screening",
    "Treatment Planning",
    "Documentation",
    "Clinical Skills",
    "Ethics & Confidentiality",
    "Crisis Intervention",
    "Trauma-Informed Care",
    "Collaboration",
  ],
  lpha_competency: [
    "Clinical Assessment",
    "Treatment Planning",
    "Supervision",
    "Ethics & Legal Compliance",
    "Documentation",
    "Collaboration",
    "Cultural Competency",
    "Quality Improvement",
  ],
}

export function competencyAreaSlug(area: string): string {
  return area.toLowerCase().replace(/\s+/g, "_")
}

export const COMPETENCY_RATING_OPTIONS = [
  { value: "1", label: "1 - Needs Immediate Improvement" },
  { value: "2", label: "2 - Developing / Below Expectations" },
  { value: "3", label: "3 - Meets Expectations" },
  { value: "4", label: "4 - Exceeds Expectations" },
  { value: "5", label: "5 - Exemplary / Role Model" },
] as const

export interface TrainingTopicRow {
  topicKey: `topic_${number}`
  label: string
  mappedTaskIds: readonly string[]
}

export const ANNUAL_TRAINING_TOPICS: readonly TrainingTopicRow[] = [
  {
    topicKey: "topic_1",
    label: "1. Code of Conduct & Corporate Compliance",
    mappedTaskIds: ["code_of_conduct_ethics", "corporate_compliance_acknowledge"],
  },
  {
    topicKey: "topic_2",
    label: "2. Cultural Competency Refresher",
    mappedTaskIds: ["cultural_competency"],
  },
  {
    topicKey: "topic_3",
    label: "3. Ethics and Professional Conduct",
    mappedTaskIds: ["code_of_conduct_ethics"],
  },
  {
    topicKey: "topic_4",
    label: "4. HIPAA and Confidentiality",
    mappedTaskIds: [
      "confidentiality_statement",
      "corporate_confidentiality_statement",
      "confidentiality_of_client___therapist___staff",
    ],
  },
  {
    topicKey: "topic_5",
    label: "5. Workplace Safety & Emergency Preparedness",
    mappedTaskIds: ["acknowledge_of_eoc_health_&_safety_policy"],
  },
  {
    topicKey: "topic_6",
    label: "6. Abuse, Neglect, and Exploitation Reporting",
    mappedTaskIds: ["alleged_abuse_neglect"],
  },
  {
    topicKey: "topic_7",
    label: "7. Infection Control Refresher",
    mappedTaskIds: ["infection_control_refresher"],
  },
  {
    topicKey: "topic_8",
    label: "8. Trauma-Informed Care Practices",
    mappedTaskIds: ["trauma_informed_care_practices"],
  },
]

export const INITIAL_TRAINING_TOPICS: readonly TrainingTopicRow[] = [
  {
    topicKey: "topic_1",
    label: "1. Types of Services",
    mappedTaskIds: ["types_of_services"],
  },
  {
    topicKey: "topic_2",
    label: "2. Person Centered Planning",
    mappedTaskIds: ["person_centered_planning"],
  },
  {
    topicKey: "topic_3",
    label: "3. Documentation and Timelines",
    mappedTaskIds: ["documentation_and_timelines"],
  },
  {
    topicKey: "topic_4",
    label: "4. Client Rights & Responsibilities",
    mappedTaskIds: ["client_rights_responsibilities"],
  },
  {
    topicKey: "topic_5",
    label: "5. Cultural Competency",
    mappedTaskIds: ["cultural_competency"],
  },
  {
    topicKey: "topic_6",
    label: "6. Crisis Intervention Steps",
    mappedTaskIds: ["crisis_intervention_steps"],
  },
  {
    topicKey: "topic_7",
    label: "7. Corporate Compliance & Ethics",
    mappedTaskIds: ["code_of_conduct_ethics", "corporate_compliance_acknowledge"],
  },
  {
    topicKey: "topic_8",
    label: "8. Confidentiality / HIPAA",
    mappedTaskIds: [
      "confidentiality_statement",
      "corporate_confidentiality_statement",
      "confidentiality_of_client___therapist___staff",
    ],
  },
  {
    topicKey: "topic_9",
    label: "9. Mandatory Reporting",
    mappedTaskIds: ["mandatory_reporting"],
  },
  {
    topicKey: "topic_10",
    label: "10. Abuse and Neglect Reporting",
    mappedTaskIds: ["alleged_abuse_neglect"],
  },
]

export const CODE_OF_CONDUCT_ETHICS_STATEMENTS: ReadonlyArray<{
  key: `ethics_${number}`
  label: string
}> = [
  {
    key: "ethics_1",
    label: "I uphold honesty, integrity, and client dignity in all clinical and administrative interactions.",
  },
  {
    key: "ethics_2",
    label: "I maintain strict professional boundaries and avoid dual relationships or conflicts of interest.",
  },
  {
    key: "ethics_3",
    label: `I protect client confidentiality under HIPAA, 42 CFR Part 2, and ${ORG_CONFIG.shortName} privacy policies.`,
  },
  {
    key: "ethics_4",
    label: "I document all services truthfully, accurately, and within required clinical timelines.",
  },
  {
    key: "ethics_5",
    label: "I reject discrimination, harassment, exploitation, or disrespect toward clients or colleagues.",
  },
  {
    key: "ethics_6",
    label: "I report suspected abuse, neglect, fraud, or compliance concerns promptly without fear of retaliation.",
  },
  {
    key: "ethics_7",
    label: "I accept no improper gifts, kickbacks, or personal financial gain from clients or referral sources.",
  },
  {
    key: "ethics_8",
    label: "I adhere to licensure rules, agency supervision directives, and continuing competency requirements.",
  },
]

export const DRIVERS_VERIFICATION_CHECKS: ReadonlyArray<{
  key: "ack_refusal" | "ack_submitted" | "ack_future" | "ack_inspection"
  label: string
}> = [
  {
    key: "ack_refusal",
    label: "I understand that refusing driving record verification disqualifies me from transporting clients or driving on agency business.",
  },
  {
    key: "ack_submitted",
    label: "I have submitted my valid driver's license, active personal auto insurance declaration, and/or MVR authorization.",
  },
  {
    key: "ack_future",
    label: `I agree to immediately report any license suspension, revocation, citation, or insurance lapse to ${ORG_CONFIG.shortName} management.`,
  },
  {
    key: "ack_inspection",
    label: `I consent to periodic driving history and vehicle safety verification as required by ${ORG_CONFIG.shortName} compliance policy.`,
  },
]

export interface SplitFieldInputSpec {
  key: string
  label: string
  type: "text" | "date" | "textarea" | "select"
  required: boolean
  placeholder?: string
  defaultValue?: string
  options?: ReadonlyArray<{ value: string; label: string }>
}

export type SplitFieldAdminVariant =
  | "i9"
  | "trainer"
  | "competency"
  | "standard"

export function detectCompetencyTaskId(taskId: string): CompetencyTaskId | null {
  const lower = taskId.toLowerCase()
  if (lower.includes("cssp_competency")) {
    return "cssp_competency"
  }
  if (lower.includes("qmhp_cs_competency")) {
    return "qmhp_cs_competency"
  }
  if (lower.includes("lpha_competency")) {
    return "lpha_competency"
  }
  return null
}

export function detectSplitFieldAdminVariant(taskId: string, title = ""): SplitFieldAdminVariant {
  const idLower = taskId.toLowerCase()
  const titleLower = title.toLowerCase()
  if (idLower.includes("tax_documents_i_9") || idLower === "i9") {
    return "i9"
  }
  if (detectCompetencyTaskId(idLower) !== null) {
    return "competency"
  }
  if (
    idLower.includes("annualtraining") ||
    idLower.includes("annual_training") ||
    titleLower.includes("annual training") ||
    idLower.includes("initialtraining") ||
    idLower.includes("initial_training") ||
    titleLower.includes("initial training") ||
    idLower.includes("tax_documents_w_9") ||
    idLower.includes("initial_orientation") ||
    idLower.includes("tax_documents_w_4") ||
    idLower.includes("tax_documents_w_1")
  ) {
    return "trainer"
  }
  return "standard"
}

export function getAdminSplitFieldSpecs(taskId: string, title = ""): SplitFieldInputSpec[] {
  const variant = detectSplitFieldAdminVariant(taskId, title)
  if (variant === "i9") {
    return [
      { key: "authRepName", label: "Authorized Representative Name", type: "text", required: true },
      { key: "authRepTitle", label: "Title of Authorized Representative", type: "text", required: true },
      {
        key: "orgName",
        label: "Organization Name",
        type: "text",
        required: true,
        defaultValue: ORG_CONFIG.name,
      },
      { key: "verificationDate", label: "Verification Date", type: "date", required: true },
    ]
  }

  if (variant === "competency") {
    const compId = detectCompetencyTaskId(taskId)!
    const areas = COMPETENCY_AREAS[compId]
    const fields: SplitFieldInputSpec[] = [
      { key: "supervisorName", label: "Evaluator / Supervisor Name", type: "text", required: true },
      { key: "verificationDate", label: "Evaluation / Verification Date", type: "date", required: true },
    ]
    for (const area of areas) {
      const slug = competencyAreaSlug(area)
      fields.push({
        key: `rating_${slug}`,
        label: `${area} — Rating`,
        type: "select",
        required: true,
        options: COMPETENCY_RATING_OPTIONS,
      })
      fields.push({
        key: `comments_${slug}`,
        label: `${area} — Comments (Optional)`,
        type: "textarea",
        required: false,
      })
    }
    fields.push({
      key: "overall_comments",
      label: "Overall Evaluation Summary / Comments (Optional)",
      type: "textarea",
      required: false,
    })
    return fields
  }

  if (variant === "trainer") {
    return [
      { key: "supervisorTrainer", label: "Supervisor / Trainer Name", type: "text", required: true },
      { key: "verificationDate", label: "Verification Date", type: "date", required: true },
      { key: "comments", label: "Reviewer Comments (Optional)", type: "textarea", required: false },
    ]
  }

  return [
    { key: "supervisorName", label: "Supervisor Name", type: "text", required: true },
    { key: "verificationDate", label: "Verification Date", type: "date", required: true },
    { key: "comments", label: "Reviewer Comments (Optional)", type: "textarea", required: false },
  ]
}
