/**
 * Compliance category model for the employee detail page — port of
 * lib/core/utils/compliance_helpers.dart (groupTasksIntoCategories) and the
 * merge Builder in
 * lib/features/admin/admin_directory/presentation/
 * profile_directory_inner_profile_card_data.dart.
 *
 * Load-bearing Dart quirks preserved EXACTLY (each footnoted below):
 *  1. Template title/actionType override the live document's own values
 *     ("prevent 'Onboarding Task' duplicates" fix in the Dart source).
 *  2. Onboarding tasks whose id is NOT one of the 46 defaults are appended
 *     ("dynamic task support"), but EXTRA TRAININGS/CLEARANCES that are not
 *     in the 19/4 defaults are DROPPED (the Dart code only ever maps the
 *     default lists for those two modules).
 *  3. A candidate task id that matches NO category id list silently falls
 *     out of the category view (e.g. tax_documents_w_4 / w_1 and several
 *     `acknowledgeSign` tasks the Dart category-2 list predates).
 *  4. Training status mapping: verified|completed→completed,
 *     underReview→submitted, inProgress→pending, otherwise→notStarted.
 *     Clearance mapping: verified→completed, underReview→submitted,
 *     pending→pending, otherwise→notStarted.
 *  5. The onboarding tile subtitle is REPLACED wholesale:
 *     done → "Completed on <date>", otherwise "Pending completion".
 */
import {
  DEFAULT_CLEARANCES,
  DEFAULT_ONBOARDING_TASKS,
  DEFAULT_TRAININGS,
} from "@/lib/admin/seed-templates"
import { TASK_STATUSES, type TaskStatus } from "@/lib/admin/task-status"
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

export interface ComplianceCategory {
  id: string
  title: string
  /** Dart createCategory: "<completed> of <total> completed". */
  subtitle: string
  tasks: DetailSubTask[]
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

/** Training → unified status (Dart Builder mapping, quirk 4). */
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

/** Clearance → unified status (Dart Builder mapping, quirk 4). */
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

/* ── merge + group (the Dart Builder, function-shaped) ────────────────── */

export interface ComplianceModelInput {
  /** Onboarding docs; `null` means the module's read FAILED — its template
   * entries must NOT be fabricated as if they were real progress. */
  tasks: EmployeeTaskDoc[] | null
  trainings: EmployeeTrainingDoc[] | null
  clearances: EmployeeClearanceDoc[] | null
}

function buildOnboardingSubTasks(tasks: EmployeeTaskDoc[] | null): DetailSubTask[] {
  if (tasks === null) {
    return []
  }
  // 1. Template entries seeded; live docs overlay them (quirk 1).
  const docById = new Map(tasks.map((task) => [task.id, task]))

  interface MergedOnboarding {
    id: string
    title: string
    status: TaskStatus
    actionType: string | null
    fileUrl: string | null
    updatedAt: Date | null
  }

  const templateIds = new Set<string>()
  const merged: MergedOnboarding[] = DEFAULT_ONBOARDING_TASKS.map(
    (template) => {
      templateIds.add(template.id)
      const actual = docById.get(template.id)
      if (actual) {
        return {
          id: actual.id,
          title: template.title,
          status: actual.status,
          actionType: template.actionType,
          fileUrl: actual.fileUrl,
          updatedAt: actual.updatedAt,
        }
      }
      return {
        id: template.id,
        title: template.title,
        status: "notStarted",
        actionType: template.actionType,
        fileUrl: null,
        updatedAt: null,
      }
    },
  )

  // 2. Dynamic extras: live docs not covered by a template (quirk 2a).
  for (const task of tasks) {
    if (!templateIds.has(task.id)) {
      merged.push({
        id: task.id,
        title: task.title,
        status: task.status,
        actionType: task.actionType,
        fileUrl: task.fileUrl,
        updatedAt: task.updatedAt,
      })
    }
  }

  return merged.map((entry) => ({
    id: entry.id,
    title: entry.title,
    subtitle: "Pending completion", // replaced in the final pass
    status: entry.status,
    actionType: entry.actionType,
    taskSource: "onboarding",
    isCompleted: false, // recomputed in the final pass
    fileUrl: entry.fileUrl,
    updatedAt: entry.updatedAt,
  }))
}

function buildTrainingSubTasks(trainings: EmployeeTrainingDoc[] | null): DetailSubTask[] {
  if (trainings === null) {
    return []
  }
  const docById = new Map(trainings.map((training) => [training.id, training]))

  return DEFAULT_TRAININGS.map((template): DetailSubTask => {
    // Extra (non-default) trainings are dropped — Dart parity (quirk 2b).
    const actual = docById.get(template.id)
    const rawStatus = actual?.status ?? "notStarted"
    return {
      id: template.id,
      title: template.title,
      subtitle: "Mandatory BHMH Training Module.",
      status: mapTrainingStatus(rawStatus),
      actionType: "upload",
      taskSource: "training",
      isCompleted: rawStatus === "verified" || rawStatus === "completed",
      fileUrl: actual?.certificateUrl ?? null,
      updatedAt: actual?.completedAt ?? actual?.assignedAt ?? null,
    }
  })
}

function buildClearanceSubTasks(clearances: EmployeeClearanceDoc[] | null): DetailSubTask[] {
  if (clearances === null) {
    return []
  }
  const docById = new Map(clearances.map((clearance) => [clearance.id, clearance]))

  return DEFAULT_CLEARANCES.map((template): DetailSubTask => {
    const actual = docById.get(template.id)
    const rawStatus = actual?.status ?? "pending"
    return {
      id: template.id,
      title: template.title,
      subtitle: template.description,
      status: mapClearanceStatus(rawStatus),
      actionType: "upload",
      taskSource: "clearance",
      isCompleted: rawStatus === "verified",
      fileUrl: actual?.fileUrl ?? null,
      updatedAt: actual?.verifiedAt ?? actual?.submittedAt ?? null,
    }
  })
}

/** Builds task lists in Dart-builder order, then filters + re-subtitles. */
export function buildComplianceModel(input: ComplianceModelInput): {
  categories: ComplianceCategory[]
  allTasks: DetailSubTask[]
} {
  const trainingSubTasks = buildTrainingSubTasks(input.trainings)
  const clearanceSubTasks = buildClearanceSubTasks(input.clearances)

  // 4. Final filter: general tasks may not shadow a training/clearance id.
  const trainingIds = new Set(trainingSubTasks.map((task) => task.id))
  const clearanceIds = new Set(clearanceSubTasks.map((task) => task.id))
  const finalTasks = buildOnboardingSubTasks(input.tasks).filter(
    (task) => !trainingIds.has(task.id) && !clearanceIds.has(task.id),
  )

  // Final pass: subtitle replaced wholesale, isCompleted recomputed.
  const finalSubTasks = finalTasks.map(
    (task): DetailSubTask => {
      const isDone = isTaskCompleted(task.status)
      return {
        ...task,
        subtitle: isDone ? `Completed on ${formatCompletedDate(task.updatedAt)}` : "Pending completion",
        isCompleted: isDone,
      }
    },
  )

  const categories = groupTasksIntoCategories({
    tasks: finalSubTasks,
    trainingSubTasks,
    clearanceSubTasks,
  })
  return { categories, allTasks: [...finalSubTasks, ...trainingSubTasks, ...clearanceSubTasks] }
}

/** ComplianceHelpers.groupTasksIntoCategories — the strict id lists are
 * Dart-verbatim; ids missing from the live set are skipped (quirk 3), and
 * general-task ids matching none of the lists fall out of the view. */
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

  const pickByIds = (ids: readonly string[]): DetailSubTask[] =>
    ids.map((id) => input.tasks.find((task) => task.id === id) ?? null).filter(
      (task): task is DetailSubTask => task !== null,
    )

  // Dart-verbatim category lists.
  const category1Ids = [
    "onboarding_acknowledgment_form",
    "signed_offer_letter",
    "job_description_acknowledgment",
  ]
  const category2Ids = [
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
    "attestation_form",
    "authorization_for_emergency_medical_care",
    "acknowledgement_of_vehicle_documentation",
    "acknowledge_of_company_property",
    "tax_documents_i_9",
    "tax_documents_w_9",
    "direct_deposit_authorization",
  ]
  const category3Ids = [
    "resume",
    "3_professional_letters_of_recommendation",
    "copy_of_highest_degree_diploma_certificate",
    "copy_of_official_transcripts_of_highest_degree",
    "copy_of_license",
    "copy_of_certification",
  ]
  const category4Ids = ["bhmh_initial_orientation", "initial_training", "annual_training"]
  const category5Ids = ["cssp_competency", "qmhp_cs_competency", "lpha_competency"]

  return [
    createCategory("employment_acceptance", "Category 1: Employment Acceptance", pickByIds(category1Ids)),
    createCategory("hr_documentation", "Category 2: HR Documentation", pickByIds(category2Ids)),
    createCategory("professional_documentation", "Category 3: Professional Documents", pickByIds(category3Ids)),
    createCategory("orientation", "Category 4: Orientation", pickByIds(category4Ids)),
    createCategory("competency_forms", "Category 5: Competency Forms", pickByIds(category5Ids)),
    createCategory("training_compliance", "Category 6: Training Compliance", input.trainingSubTasks),
    createCategory("clearance", "Category 7: Clearance", input.clearanceSubTasks),
  ]
}

/** TaskProgressHeader (admin_directory_task_manager.dart): counts over all
 * tasks, excluding noActionRequired; completed via isTaskCompleted(status). */
export function taskProgressStats(categories: ComplianceCategory[]): {
  completed: number
  remaining: number
} {
  const all = categories.flatMap((category) => category.tasks)
  const counted = all.filter((task) => task.status !== "noActionRequired")
  const completed = counted.filter((task) => isTaskCompleted(task.status)).length
  return { completed, remaining: counted.length - completed }
}
