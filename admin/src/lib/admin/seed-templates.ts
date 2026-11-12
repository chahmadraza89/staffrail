/**
 * Employee seeding templates — PORT of lib/core/config/onboarding_constants.dart.
 *
 * These documents are written client-side right after the `registerStaff`
 * Cloud Function creates the Auth account (same choreography as the Flutter
 * admin: callable first, template seeding second). Task/Training/Clearance
 * IDs are load-bearing: the employee app's Flutter code paths (e.g.
 * onboarding_service's driver's_verification migration) reference these
 * exact doc IDs, and employees can be created from EITHER client — the
 * generated IDs must be byte-identical in both.
 *
 * `inferActionType` is not used because every constant in the Flutter
 * source passes an explicit `actionType` — the mapping below carries it.
 */

/** CompilationSubTask.actionType / TaskActionType enum values in Firestore. */
export type TaskActionType = "acknowledgeSign" | "upload" | "splitField" | "fillAndSign"

export interface TaskTemplate {
  id: string
  title: string
  subtitle: string
  actionType: TaskActionType
}

export interface TrainingTemplate {
  id: string
  title: string
  durationText: string
}

export interface ClearanceTemplate {
  id: string
  title: string
  description: string
}

/**
 * Exact replica of the Dart slug in OnboardingConstants.create (onboarding
 * tasks): lowercase → spaces→_, '/'→_, strip ( ) , → '-'→_, ’→' .
 * ORDER MATTERS (e.g. "Tax Documents (I-9)" → "tax_documents_i_9").
 */
export function slugifyTaskId(title: string): string {
  return title
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("/", "_")
    .replaceAll("(", "")
    .replaceAll(")", "")
    .replaceAll(",", "")
    .replaceAll("-", "_")
    .replaceAll("’", "'")
}

/**
 * Exact replica of the Dart slug in OnboardingConstants._createTraining —
 * a DIFFERENT algorithm from the task slug: lowercase → spaces→_, strip
 * ( ) → ’→', THEN '/'→_. No comma rule and — load-bearing — NO dash rule,
 * so "Skills-Streaming" must produce "skills-streaming" (matching both the
 * Dart output and every training doc already created by the Flutter app),
 * NOT "skills_streaming".
 */
export function slugifyTrainingId(title: string): string {
  return title
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("(", "")
    .replaceAll(")", "")
    .replaceAll("’", "'")
    .replaceAll("/", "_")
}

function task(
  title: string,
  subtitle: string,
  actionType: TaskActionType,
): TaskTemplate {
  return { id: slugifyTaskId(title), title, subtitle, actionType }
}

// ── Onboarding tasks (categories from the Flutter source are preserved as
//    comments so diffs against lib/core/config stay trivial) ──────────────

export const DEFAULT_ONBOARDING_TASKS: TaskTemplate[] = [
  // ── CATEGORY 1: Employment Acceptance ─────────────────────────
  task("Onboarding Acknowledgment form", "Signature Required", "acknowledgeSign"),
  task("Signed offer letter", "Upload Required", "upload"),
  task("Job Description Acknowledgment", "Acknowledge Required", "acknowledgeSign"),

  // ── CATEGORY 2: HR Documentation ──────────────────────────────
  task("Driver’s Verification", "Dual-Signature Required", "splitField"),
  task("Driver’s License", "Upload Required", "upload"),
  task("Confidentiality Statement", "Acknowledge Required", "acknowledgeSign"),
  task("Proof of vehicle insurance", "Upload Required", "upload"),
  task("Vehicle Registration", "Upload Required", "upload"),
  task("Copy of SSC", "Upload Required", "upload"),
  task("Confidentiality of Client / Therapist / Staff", "Acknowledge Required", "acknowledgeSign"),
  task("Acknowledgement of Transporting Clients", "Acknowledge Required", "acknowledgeSign"),
  task("Cultural Competency", "Dual-Signature Required", "splitField"),
  task("Corporate Compliance Acknowledge", "Acknowledge Required", "acknowledgeSign"),
  task("Code of Conduct/Ethics", "Acknowledge Required", "acknowledgeSign"),
  task("Alleged Abuse/Neglect", "Dual-Signature Required", "splitField"),
  task("Acknowledge of EOC, Health & Safety policy", "Acknowledge Required", "acknowledgeSign"),
  task("Grievance Procedure", "Acknowledge Required", "acknowledgeSign"),
  task("Infection Control Refresher", "Acknowledge Required", "acknowledgeSign"),
  task("Trauma-Informed Care Practices", "Acknowledge Required", "acknowledgeSign"),
  task("Types of Services", "Acknowledge Required", "acknowledgeSign"),
  task("Person Centered Planning", "Acknowledge Required", "acknowledgeSign"),
  task("Documentation and Timelines", "Acknowledge Required", "acknowledgeSign"),
  task("Client Rights & Responsibilities", "Acknowledge Required", "acknowledgeSign"),
  task("Crisis Intervention Steps", "Acknowledge Required", "acknowledgeSign"),
  task("Mandatory Reporting", "Acknowledge Required", "acknowledgeSign"),
  task("Attestation form", "Fill & Sign Required", "fillAndSign"),
  task("Authorization for Emergency Medical Care", "Fill & Sign Required", "fillAndSign"),
  task("Acknowledgement of Vehicle Documentation", "Acknowledge Required", "acknowledgeSign"),
  task("Acknowledge of Company Property", "Acknowledge Required", "acknowledgeSign"),
  task("Tax Documents (I-9)", "Dual-Signature Required", "splitField"),
  task("Tax Documents (W-4)", "Dual-Signature Required", "splitField"),
  task("Tax Documents (W-1)", "Dual-Signature Required", "splitField"),
  task("Tax Documents (W-9)", "Dual-Signature Required", "splitField"),
  task("Direct Deposit Authorization", "Fill & Sign Required", "fillAndSign"),

  // ── CATEGORY 3: Professional Documents ───────────────────────
  task("Resume", "Upload Required", "upload"),
  task("3 Professional Letters of Recommendation", "Upload Required", "upload"),
  task("Copy of Highest Degree/Diploma certificate", "Upload Required", "upload"),
  task("Copy of Official transcripts of Highest Degree", "Upload Required", "upload"),
  task("Copy of License", "Upload Required", "upload"),
  task("Copy of Certification", "Upload Required", "upload"),

  // ── CATEGORY 4: Orientation ──────────────────────────────────
  task("Initial Orientation", "Acknowledge & Signature Required", "acknowledgeSign"),
  task("Initial Training", "Dual-Signature Required", "splitField"),
  task("Annual Training", "Dual-Signature Required", "splitField"),

  // ── CATEGORY 5: Competency Forms ─────────────────────────────
  task("CSSP Competency", "Dual-Signature Required", "splitField"),
  task("QMHP-CS Competency", "Dual-Signature Required", "splitField"),
  task("LPHA Competency", "Dual-Signature Required", "splitField"),
]

// ── Trainings (19 mandatory modules, duration text preserved) ──────────

const TRAINING_DURATIONS: Array<[string, string]> = [
  ["START", "8 hours"],
  ["PAYA", "6 hours"],
  ["Seeking Safety", "4 hours"],
  ["Nurturing Parenting", "6 hours"],
  ["Barkley’s", "4 hours"],
  ["Wraparound Planning", "8 hours"],
  ["ANSA", "4 hours"],
  ["CANS", "4 hours"],
  ["IMR", "6 hours"],
  ["ACT", "8 hours"],
  ["Supported Employment", "4 hours"],
  ["PSH", "4 hours"],
  ["Recovery Plan", "4 hours"],
  ["CPS Reporting", "2 hours"],
  ["Skills-Streaming", "6 hours"],
  ["Trauma Informed Care", "4 hours"],
  ["CPR / First Aid", "4 hours"],
  ["HIPAA", "2 hours"],
  ["PAPH", "8 hours"],
]

export const DEFAULT_TRAININGS: TrainingTemplate[] = TRAINING_DURATIONS.map(
  ([title, durationText]) => ({
    id: slugifyTrainingId(title),
    title,
    durationText,
  }),
)

// ── Clearance items (status "pending" in the Flutter source) ─────────────

export const DEFAULT_CLEARANCES: ClearanceTemplate[] = [
  {
    id: "driving_background_verification_report",
    title: "Driving Background Verification Report",
    description: "Official driving record verification.",
  },
  {
    id: "criminal_background_verification_report",
    title: "Criminal Background Verification Report",
    description: "Official state/federal criminal history report.",
  },
  {
    id: "drug_screening_results",
    title: "Drug Screening Results",
    description: "Official drug screening results verification.",
  },
  {
    id: "tb_status_report",
    title: "TB Status Report",
    description: "Official TB test results verification.",
  },
]

/* ── Firestore field maps (parity with the domain DTOs) ────────────────── */

export interface SeedContext {
  employeeId: string
  employeeName: string
  adminId: string
}

/**
 * Fields for users/{uid}/onboarding_tasks/{taskId} — parity with
 * OnboardingTaskDTO.toFirestore for a freshly seeded task. The caller adds
 * `updatedAt: serverTimestamp()` (stream-injected, not representable pure).
 */
export function onboardingTaskFields(
  template: TaskTemplate,
  context: SeedContext,
): Record<string, unknown> {
  return {
    title: template.title,
    subtitle: template.subtitle,
    isCompleted: false,
    status: "notStarted",
    actionType: template.actionType,
    employeeName: context.employeeName,
    fileUrl: null,
    signatureUrl: null,
    formData: null,
    isDraft: false,
    isLocked: false,
    rejectionReason: null,
    adminId: context.adminId,
    employeeId: context.employeeId,
    completedAt: null,
    dueDate: null,
    signedAt: null,
    adminFormData: null,
    adminSignatureUrl: null,
    formSchema: null,
    policyContent: null,
    blankFormLink: null,
  }
}

/**
 * Fields for users/{uid}/trainings/{trainingId} — parity with
 * TrainingDTO.toFirestore (matching Flutter's `assignedAt: DateTime.now()`).
 */
export function trainingFields(
  template: TrainingTemplate,
  context: Omit<SeedContext, "employeeName">,
  assignedAt: Date,
): Record<string, unknown> {
  return {
    title: template.title,
    description: "Mandatory Training Module.",
    durationText: template.durationText,
    status: "notStarted",
    certificateUrl: null,
    certificateUrls: null,
    dueDate: null,
    completedAt: null,
    expirationDate: null,
    completionDate: null,
    assignedAt: assignedAt,
    noExpiration: false,
    rejectionReason: null,
    employeeId: context.employeeId,
    adminId: context.adminId,
  }
}

/**
 * Fields for users/{uid}/clearance/{itemId} — parity with
 * ClearanceDTO.toFirestore for a pending item.
 */
export function clearanceFields(
  template: ClearanceTemplate,
  context: SeedContext,
): Record<string, unknown> {
  return {
    title: template.title,
    description: template.description,
    status: "pending",
    fileUrl: null,
    employeeId: context.employeeId,
    employeeName: context.employeeName,
    adminId: context.adminId,
    rejectionReason: null,
    dueDate: null,
    submittedAt: null,
    verifiedAt: null,
  }
}
