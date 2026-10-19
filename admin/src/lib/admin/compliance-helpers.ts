/**
 * Compliance category model for the employee detail page — port of
 * lib/core/utils/compliance_helpers.dart (groupTasksIntoCategories) and the
 * merge Builder in
 * lib/features/admin/admin_directory/presentation/
 * profile_directory_inner_profile_card_data.dart.
 *
 * DELIBERATE CORRECTION of the inherited Flutter behavior (documented in
 * admin/README.md; no Firestore record is renamed/deleted/migrated):
 *  1. The strict Dart category id lists hid TEN SEEDED onboarding tasks
 *     (8 policy acknowledgments + the W-4/W-1 tax documents). Those ids are
 *     added to Category 2 so a fresh employee shows ALL 46 requirements.
 *  2. ANY onboarding record unclaimed by a category list lands in a visible
 *     fallback group ("Additional Requirements") instead of vanishing.
 *  3. Custom and retained-legacy training/clearance records are appended
 *     after the 19/4 template rows instead of being dropped.
 *  4. Identity is (source + document id): the same doc id may appear in two
 *     modules — they are distinct requirements and BOTH stay visible (the
 *     Dart code dropped one side of such collisions).
 *
 * Preserved Dart semantics:
 *  - Template title/actionType override the live document's own values
 *    ("prevent 'Onboarding Task' duplicates" fix in the Dart source).
 *  - Training status mapping: verified|completed→completed,
 *    underReview→submitted, inProgress→pending, otherwise→notStarted.
 *    Clearance mapping: verified→completed, underReview→submitted,
 *    pending→pending, otherwise→notStarted.
 *  - The onboarding tile subtitle is REPLACED wholesale:
 *    done → "Completed on <date>", otherwise "Pending completion".
 *  - Two Category-2 ids (corporate_confidentiality_statement,
 *    transportation_acknowledgement_statement) have NO default task; they
 *    only materialize when a real doc with that id exists — as in Dart.
 *
 * Read-state semantics: a module that has NOT successfully delivered a
 * first snapshot (pending, or failed without ever delivering) contributes
 * NOTHING — never-loaded defaults must not masquerade as progress.
 */
import {
  DEFAULT_CLEARANCES,
  DEFAULT_ONBOARDING_TASKS,
  DEFAULT_TRAININGS,
} from "@/lib/admin/seed-templates"
import { parseTaskStatus, TASK_STATUSES, type TaskStatus } from "@/lib/admin/task-status"
import type {
  ClearanceStatusRaw,
  EmployeeClearanceDoc,
  EmployeeTaskDoc,
  EmployeeTrainingDoc,
  TrainingStatusRaw,
} from "@/lib/admin/employee-detail-streams"

export type TaskSource = "onboarding" | "training" | "clearance"

export interface DetailSubTask {
  id: string
  title: string
  subtitle: string
  status: TaskStatus
  /** Raw Dart actionType (template's actionType wins for matched tasks). */
  actionType: string | null
  taskSource: TaskSource
  isCompleted: boolean
  fileUrl: string | null
  updatedAt: Date | null
}

/**
 * Identity is source + document id: identical ids in DIFFERENT modules are
 * distinct requirements and both remain visible.
 */
export function subtaskKey(task: DetailSubTask): string {
  return `${task.taskSource}:${task.id}`
}

export interface ComplianceCategory {
  id: string
  title: string
  /** Dart createCategory: "<completed> of <total> completed". */
  subtitle: string
  tasks: DetailSubTask[]
}

/**
 * A module's read state, derived by the view from the engine state:
 *   - pending        → the listener has never delivered (still loading)
 *   - ready          → delivered ≥1 successful snapshot; items = latest docs
 *   - failed         → the listener failed. `items` is the last DELIVERED
 *                      data retained (possibly empty) — real stale data,
 *                      NEVER fabricated defaults.
 */
export type ModuleRead<T> =
  | { kind: "pending" }
  | { kind: "ready"; items: T[] }
  | { kind: "failed"; items: T[] }

export interface ComplianceModelInput {
  tasks: ModuleRead<EmployeeTaskDoc>
  trainings: ModuleRead<EmployeeTrainingDoc>
  clearances: ModuleRead<EmployeeClearanceDoc>
}

/* ── status derivations ───────────────────────────────────────────────── */

/**
 * task_lock_helper.isTaskCompleted — terminal "did the work" states used
 * for progress counting and the tile's done check.
 */
export function isTaskCompleted(status: TaskStatus): boolean {
  return (
    status === "completed" ||
    status === "verified" ||
    status === "cleared" ||
    status === "signed" ||
    status === "acknowledged" ||
    status === "confirmed"
  )
}

/** Training → unified status (Dart Builder mapping). */
export function mapTrainingStatus(status: TrainingStatusRaw): TaskStatus {
  if (status === "verified" || status === "completed") {
    return "completed"
  }
  if (status === "underReview") {
    return "submitted"
  }
  if (status === "inProgress") {
    return "pending"
  }
  return "notStarted"
}

/** Clearance → unified status (Dart Builder mapping). */
export function mapClearanceStatus(status: ClearanceStatusRaw): TaskStatus {
  if (status === "verified") {
    return "completed"
  }
  if (status === "underReview") {
    return "submitted"
  }
  if (status === "pending") {
    return "pending"
  }
  return "notStarted"
}

/** OnboardingTaskTile status text (admin_onboarding_check_list.dart). */
export function taskStatusText(status: TaskStatus): string {
  if (status === "noActionRequired") {
    return "No Action Required"
  }
  if (status === "verified" || status === "completed") {
    return "Verified"
  }
  if (status === "submitted" || status === "signed" || status === "waitingForApprover") {
    return "Pending Review"
  }
  if (status === "notStarted") {
    return "Awaiting Submission"
  }
  if (status === "rejected") {
    return "Action Required"
  }
  const known = (TASK_STATUSES as readonly string[]).includes(status)
  return known ? status.toUpperCase() : "Pending Review"
}

/** Dart: `t.updatedAt?.toString().split(' ')[0]` — a LOCAL yyyy-mm-dd. */
function formatCompletedDate(date: Date | null): string {
  if (date === null || Number.isNaN(date.getTime())) {
    return "Recently"
  }
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

/* ── merge + group ────────────────────────────────────────────────────── */

/** The fallback group for onboarding records unclaimed by any Dart list. */
export const ADDITIONAL_REQUIREMENTS_CATEGORY_ID = "additional_requirements"

/**
 * Merge shape for the three builders below:
 *   quirk 1 — template title/actionType override the live doc's own values
 *   ("prevent 'Onboarding Task' duplicates" fix in the Dart source).
 *   read.kind === "ready" → absent template docs ALSO render as defaults
 *   (the Dart-notStarted checklist). read.kind === "failed" → no
 *   fabrication: a row exists ONLY for a doc that was actually delivered.
 * Document order is preserved for everything not covered by a template
 * (custom and retained-legacy records append AFTER the Dart template rows).
 */
interface RawEntry {
  id: string
  title: string
  /** Raw module status (validated per module below). */
  status: string
  actionType: string | null
  fileUrl: string | null
  updatedAt: Date | null
}

function buildOnboardingEntries(read: ModuleRead<EmployeeTaskDoc>): RawEntry[] {
  if (read.kind === "pending") {
    return [] // never-loaded modules fabricate nothing
  }
  const docById = new Map(read.items.map((doc) => [doc.id, doc]))
  const templateById = new Map(DEFAULT_ONBOARDING_TASKS.map((template) => [template.id, template]))
  const entries: RawEntry[] = []
  const pushed = new Set<string>()

  if (read.kind === "ready") {
    for (const template of DEFAULT_ONBOARDING_TASKS) {
      const actual = docById.get(template.id)
      entries.push(
        actual
          ? { id: actual.id, title: template.title, status: actual.status, actionType: template.actionType, fileUrl: actual.fileUrl, updatedAt: actual.updatedAt }
          : { id: template.id, title: template.title, status: "notStarted", actionType: template.actionType, fileUrl: null, updatedAt: null },
      )
      pushed.add(template.id)
    }
  }
  for (const doc of read.items) {
    if (pushed.has(doc.id)) {
      continue
    }
    const template = templateById.get(doc.id)
    entries.push(
      template
        ? { id: doc.id, title: template.title, status: doc.status, actionType: template.actionType, fileUrl: doc.fileUrl, updatedAt: doc.updatedAt }
        : { id: doc.id, title: doc.title, status: doc.status, actionType: doc.actionType, fileUrl: doc.fileUrl, updatedAt: doc.updatedAt },
    )
    pushed.add(doc.id)
  }
  return entries
}

function buildTrainingEntries(read: ModuleRead<EmployeeTrainingDoc>): RawEntry[] {
  if (read.kind === "pending") {
    return []
  }
  const docById = new Map(read.items.map((doc) => [doc.id, doc]))
  const templateById = new Map(DEFAULT_TRAININGS.map((template) => [template.id, template]))
  const entries: RawEntry[] = []
  const pushed = new Set<string>()

  if (read.kind === "ready") {
    for (const template of DEFAULT_TRAININGS) {
      const actual = docById.get(template.id)
      entries.push(
        actual
          ? { id: actual.id, title: template.title, status: actual.status, actionType: "upload", fileUrl: actual.certificateUrl, updatedAt: actual.completedAt ?? actual.assignedAt ?? null }
          : { id: template.id, title: template.title, status: "notStarted", actionType: "upload", fileUrl: null, updatedAt: null },
      )
      pushed.add(template.id)
    }
  }
  for (const doc of read.items) {
    if (pushed.has(doc.id)) {
      continue
    }
    const template = templateById.get(doc.id)
    entries.push(
      template
        ? { id: doc.id, title: template.title, status: doc.status, actionType: "upload", fileUrl: doc.certificateUrl, updatedAt: doc.completedAt ?? doc.assignedAt ?? null }
        : { id: doc.id, title: doc.title, status: doc.status, actionType: "upload", fileUrl: doc.certificateUrl, updatedAt: doc.completedAt ?? doc.assignedAt ?? null },
    )
    pushed.add(doc.id)
  }
  return entries
}

function buildClearanceEntries(read: ModuleRead<EmployeeClearanceDoc>): RawEntry[] {
  if (read.kind === "pending") {
    return []
  }
  const docById = new Map(read.items.map((doc) => [doc.id, doc]))
  const templateById = new Map(DEFAULT_CLEARANCES.map((template) => [template.id, template]))
  const entries: RawEntry[] = []
  const pushed = new Set<string>()

  if (read.kind === "ready") {
    for (const template of DEFAULT_CLEARANCES) {
      const actual = docById.get(template.id)
      entries.push(
        actual
          ? { id: actual.id, title: template.title, status: actual.status, actionType: "upload", fileUrl: actual.fileUrl, updatedAt: actual.verifiedAt ?? actual.submittedAt ?? null }
          : { id: template.id, title: template.title, status: "pending", actionType: "upload", fileUrl: null, updatedAt: null },
      )
      pushed.add(template.id)
    }
  }
  for (const doc of read.items) {
    if (pushed.has(doc.id)) {
      continue
    }
    const template = templateById.get(doc.id)
    entries.push(
      template
        ? { id: doc.id, title: template.title, status: doc.status, actionType: "upload", fileUrl: doc.fileUrl, updatedAt: doc.verifiedAt ?? doc.submittedAt ?? null }
        : { id: doc.id, title: doc.title, status: doc.status, actionType: "upload", fileUrl: doc.fileUrl, updatedAt: doc.verifiedAt ?? doc.submittedAt ?? null },
    )
    pushed.add(doc.id)
  }
  return entries
}

function buildOnboardingRows(read: ModuleRead<EmployeeTaskDoc>): DetailSubTask[] {
  if (read.kind === "pending") {
    return []
  }
  // Final pass (quirk 5): the tile subtitle is replaced wholesale and
  // isCompleted derives from the STATUS, not the isCompleted flag.
  return buildOnboardingEntries(read).map((entry) => {
    const isDone = isTaskCompleted(parseTaskStatus(entry.status))
    return {
      id: entry.id,
      title: entry.title,
      subtitle: isDone ? `Completed on ${formatCompletedDate(entry.updatedAt)}` : "Pending completion",
      status: parseTaskStatus(entry.status),
      actionType: entry.actionType,
      taskSource: "onboarding",
      isCompleted: isDone,
      fileUrl: entry.fileUrl,
      updatedAt: entry.updatedAt,
    }
  })
}

function buildTrainingRows(read: ModuleRead<EmployeeTrainingDoc>): DetailSubTask[] {
  if (read.kind === "pending") {
    return []
  }
  const templateById = new Map(DEFAULT_TRAININGS.map((template) => [template.id, template]))
  return buildTrainingEntries(read).map((entry) => {
    const rawStatus = read.items.find((doc) => doc.id === entry.id)?.status ?? "notStarted"
    return {
      id: entry.id,
      title: entry.title,
      // Template-matched rows keep the Dart module description; custom and
      // retained-legacy extras keep their own document description.
      subtitle: templateById.has(entry.id)
        ? "Mandatory BHMH Training Module."
        : (read.items.find((doc) => doc.id === entry.id)?.description ?? "Mandatory BHMH Training Module."),
      status: mapTrainingStatus(rawStatus),
      actionType: entry.actionType,
      taskSource: "training",
      isCompleted: rawStatus === "verified" || rawStatus === "completed",
      fileUrl: entry.fileUrl,
      updatedAt: entry.updatedAt,
    }
  })
}

function buildClearanceRows(read: ModuleRead<EmployeeClearanceDoc>): DetailSubTask[] {
  if (read.kind === "pending") {
    return []
  }
  const templateById = new Map(DEFAULT_CLEARANCES.map((template) => [template.id, template]))
  return buildClearanceEntries(read).map((entry) => {
    const rawStatus = read.items.find((doc) => doc.id === entry.id)?.status ?? "pending"
    return {
      id: entry.id,
      title: entry.title,
      // Same rule as trainings: template description for matched rows, the
      // document's own description for custom/legacy extras.
      subtitle: templateById.has(entry.id)
        ? (templateById.get(entry.id)?.description ?? "")
        : (read.items.find((doc) => doc.id === entry.id)?.description ?? ""),
      status: mapClearanceStatus(rawStatus),
      actionType: entry.actionType,
      taskSource: "clearance",
      isCompleted: rawStatus === "verified",
      fileUrl: entry.fileUrl,
      updatedAt: entry.updatedAt,
    }
  })
}

/** Builds the visible rows per module, then groups into categories. */
export function buildComplianceModel(input: ComplianceModelInput): {
  categories: ComplianceCategory[]
  allTasks: DetailSubTask[]
} {
  const onboardingRows = buildOnboardingRows(input.tasks)
  const trainingRows = buildTrainingRows(input.trainings)
  const clearanceRows = buildClearanceRows(input.clearances)

  const categories = groupTasksIntoCategories({
    tasks: onboardingRows,
    trainingSubTasks: trainingRows,
    clearanceSubTasks: clearanceRows,
  })
  return { categories, allTasks: [...onboardingRows, ...trainingRows, ...clearanceRows] }
}

/** Dart-verbatim id lists, PLUS the ten seeded ids the Dart lists predates
 * (correction 1) — all of them are Category-2 acknowledgment/tax documents
 * in the Dart source's own ordering region. */
const CATEGORY_LIST_IDS = {
  employmentAcceptance: [
    "onboarding_acknowledgment_form",
    "signed_offer_letter",
    "job_description_acknowledgment",
  ],
  hrDocumentation: [
    "driver's_verification",
    "driver's_license",
    "confidentiality_statement",
    "proof_of_vehicle_insurance",
    "vehicle_registration",
    "copy_of_ssc",
    "corporate_confidentiality_statement",
    "confidentiality_of_client___therapist___staff",
    "transportation_acknowledgement_statement",
    "acknowledgement_of_transporting_clients",
    "cultural_competency",
    "corporate_compliance_acknowledge",
    "code_of_conduct_ethics",
    "alleged_abuse_neglect",
    "acknowledge_of_eoc_health_&_safety_policy",
    "grievance_procedure",
    // ── the ten hidden seeded tasks (this correction) ──
    "infection_control_refresher",
    "trauma_informed_care_practices",
    "types_of_services",
    "person_centered_planning",
    "documentation_and_timelines",
    "client_rights_&_responsibilities",
    "crisis_intervention_steps",
    "mandatory_reporting",
    "tax_documents_w_4",
    "tax_documents_w_1",
    // ── remaining Dart list ──
    "attestation_form",
    "authorization_for_emergency_medical_care",
    "acknowledgement_of_vehicle_documentation",
    "acknowledge_of_company_property",
    "tax_documents_i_9",
    "tax_documents_w_9",
    "direct_deposit_authorization",
  ],
  professionalDocumentation: [
    "resume",
    "3_professional_letters_of_recommendation",
    "copy_of_highest_degree_diploma_certificate",
    "copy_of_official_transcripts_of_highest_degree",
    "copy_of_license",
    "copy_of_certification",
  ],
  orientation: ["bhmh_initial_orientation", "initial_training", "annual_training"],
  competencyForms: ["cssp_competency", "qmhp_cs_competency", "lpha_competency"],
} as const

/** Groups onboarding rows into the 7 Dart categories + the visible
 * fallback group. Identity is source+id; the same-id-cross-module case is
 * resolved PER MODULE by the caller (each module's rows are grouped
 * separately), and the cross-module shadow filter of the Dart code is
 * deliberately gone (correction 4). */
export function groupTasksIntoCategories(input: {
  tasks: DetailSubTask[]
  trainingSubTasks: DetailSubTask[]
  clearanceSubTasks: DetailSubTask[]
}): ComplianceCategory[] {
  const createCategory = (
    id: string,
    title: string,
    subTasks: DetailSubTask[],
  ): ComplianceCategory => {
    const completedCount = subTasks.filter((task) => task.isCompleted).length
    const totalCount = subTasks.length
    return {
      id,
      title,
      subtitle: `${completedCount} of ${totalCount} completed`,
      tasks: subTasks,
    }
  }

  const claimed = new Set<string>()
  const pickByIds = (ids: readonly string[]): DetailSubTask[] =>
    ids
      .map((id) => {
        const task = input.tasks.find((entry) => entry.id === id && !claimed.has(entry.id))
        if (task) {
          claimed.add(task.id)
        }
        return task ?? null
      })
      .filter((task): task is DetailSubTask => task !== null)

  const category1 = pickByIds(CATEGORY_LIST_IDS.employmentAcceptance)
  const category2 = pickByIds(CATEGORY_LIST_IDS.hrDocumentation)
  const category3 = pickByIds(CATEGORY_LIST_IDS.professionalDocumentation)
  const category4 = pickByIds(CATEGORY_LIST_IDS.orientation)
  const category5 = pickByIds(CATEGORY_LIST_IDS.competencyForms)
  // Correction 2: everything unclaimed stays visible in the fallback group.
  const additional = input.tasks.filter((task) => !claimed.has(task.id))

  return [
    createCategory("employment_acceptance", "Category 1: Employment Acceptance", category1),
    createCategory("hr_documentation", "Category 2: HR Documentation", category2),
    createCategory("professional_documentation", "Category 3: Professional Documents", category3),
    createCategory("orientation", "Category 4: Orientation", category4),
    createCategory("competency_forms", "Category 5: Competency Forms", category5),
    createCategory("training_compliance", "Category 6: Training Compliance", input.trainingSubTasks),
    createCategory("clearance", "Category 7: Clearance", input.clearanceSubTasks),
    createCategory(
      ADDITIONAL_REQUIREMENTS_CATEGORY_ID,
      "Additional Requirements",
      additional,
    ),
  ]
}

/** TaskProgressHeader (admin_directory_task_manager.dart), over the
 * VISIBLE requirements: counts all displayed tasks excluding
 * noActionRequired; completed via isTaskCompleted(status). */
export function taskProgressStats(categories: ComplianceCategory[]): {
  completed: number
  remaining: number
} {
  const all = categories.flatMap((category) => category.tasks)
  const counted = all.filter((task) => task.status !== "noActionRequired")
  const completed = counted.filter((task) => isTaskCompleted(task.status)).length
  return { completed, remaining: counted.length - completed }
}
