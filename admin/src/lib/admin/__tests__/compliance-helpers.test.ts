/**
 * Compliance model tests — the Dart Builder port verified against the
 * quirk set PLUS the documented corrections in compliance-helpers.ts:
 *
 * Corrections (all 69 requirements visible):
 *  - the ten seeded ids the Dart category lists predates are Category 2;
 *  - unmatched onboarding records land in "Additional Requirements";
 *  - custom/retained-legacy trainings and clearances are appended;
 *  - identity is source+id: cross-module id collisions coexist (no shadow
 *    filter).
 *
 * Read-state semantics: pending modules contribute NOTHING; failed modules
 * render ONLY actually-delivered docs (never fabricated defaults); ready
 * modules render the full Dart template merge + extras.
 */
import { describe, expect, it } from "vitest"

import {
  ADDITIONAL_REQUIREMENTS_CATEGORY_ID,
  buildComplianceModel,
  isTaskCompleted,
  mapClearanceStatus,
  mapTrainingStatus,
  subtaskKey,
  taskProgressStats,
  taskStatusText,
  type ModuleRead,
} from "@/lib/admin/compliance-helpers"
import { DEFAULT_CLEARANCES, DEFAULT_ONBOARDING_TASKS, DEFAULT_TRAININGS } from "@/lib/admin/seed-templates"
import type {
  ClearanceStatusRaw,
  EmployeeClearanceDoc,
  EmployeeTaskDoc,
  EmployeeTrainingDoc,
  TrainingStatusRaw,
} from "@/lib/admin/employee-detail-streams"

function taskDoc(overrides: Partial<EmployeeTaskDoc> & { id: string }): EmployeeTaskDoc {
  return {
    title: "Onboarding Task", // the buggy title the Dart merge guards against
    subtitle: "Signed",
    status: "notStarted",
    actionType: null,
    isCompleted: false,
    updatedAt: null,
    completedAt: null,
    dueDate: null,
    fileUrl: null,
    signatureUrl: null,
    adminSignatureUrl: null,
    rejectionReason: null,
    formData: null,
    adminFormData: null,
    blankFormLink: null,
    signedAt: null,
    hasFormData: false,
    hasAdminFormData: false,
    ...overrides,
  }
}

function trainingDoc(overrides: Partial<EmployeeTrainingDoc> & { id: string }): EmployeeTrainingDoc {
  return {
    title: "Seed title",
    description: null,
    durationText: null,
    status: "notStarted",
    certificateUrl: null,
    completedAt: null,
    dueDate: null,
    assignedAt: null,
    rejectionReason: null,
    ...overrides,
  }
}

function clearanceDoc(overrides: Partial<EmployeeClearanceDoc> & { id: string }): EmployeeClearanceDoc {
  return {
    title: "Seed clearance",
    description: null,
    status: "pending",
    fileUrl: null,
    rejectionReason: null,
    dueDate: null,
    submittedAt: null,
    verifiedAt: null,
    ...overrides,
  }
}

const ready = <T>(items: T[]): ModuleRead<T> => ({ kind: "ready", items })
const failed = <T>(items: T[]): ModuleRead<T> => ({ kind: "failed", items })
const pending = <T>(): ModuleRead<T> => ({ kind: "pending" })

function category(byId: string, categories: ReturnType<typeof buildComplianceModel>["categories"]) {
  return categories.find((category) => category.id === byId)!
}

describe("groupTasksIntoCategories — 8 category structure", () => {
  it("returns the 7 Dart categories in order plus the fallback group", () => {
    const { categories } = buildComplianceModel({
      tasks: ready([]),
      trainings: ready([]),
      clearances: ready([]),
    })
    expect(categories.map((entry) => [entry.id, entry.title])).toEqual([
      ["employment_acceptance", "Category 1: Employment Acceptance"],
      ["hr_documentation", "Category 2: HR Documentation"],
      ["professional_documentation", "Category 3: Professional Documents"],
      ["orientation", "Category 4: Orientation"],
      ["competency_forms", "Category 5: Competency Forms"],
      ["training_compliance", "Category 6: Training Compliance"],
      ["clearance", "Category 7: Clearance"],
      [ADDITIONAL_REQUIREMENTS_CATEGORY_ID, "Additional Requirements"],
    ])
  })

  it("a fresh employee shows ALL 69 requirements: 46 onboarding + 19 training + 4 clearance", () => {
    const { categories, allTasks } = buildComplianceModel({
      tasks: ready([]),
      trainings: ready([]),
      clearances: ready([]),
    })
    const sizes = categories.map((category) => category.tasks.length)
    // Category 2 carries the 23 Dart ids (two of which have no seeded doc)
    // PLUS the ten previously hidden ids → 31 rows. The fallback group is
    // structurally present but empty for a fresh employee (trailing 0).
    expect(sizes).toEqual([3, 31, 6, 3, 3, 19, 4, 0])
    // The fallback group is structurally present but empty for a fresh employee.
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(69)
    expect(allTasks).toHaveLength(69)
    // Every subtitle "x of y completed" starts at zero.
    for (const categoryEntry of categories) {
      expect(categoryEntry.subtitle).toBe(`0 of ${categoryEntry.tasks.length} completed`)
    }
  })

  it("the ten previously hidden seeded ids are visible in Category 2", () => {
    const hidden = [
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
    ]
    const { categories } = buildComplianceModel({ tasks: ready([]), trainings: ready([]), clearances: ready([]) })
    const hr = category("hr_documentation", categories)
    for (const id of hidden) {
      const row = hr.tasks.find((task) => task.id === id)
      expect(row, id).toBeDefined()
      expect(row!.status).toBe("notStarted")
    }
    // and each seeded id appears somewhere in the model exactly once
    for (const template of DEFAULT_ONBOARDING_TASKS) {
      const occurrences = categories
        .flatMap((entry) => entry.tasks)
        .filter((task) => task.id === template.id && task.taskSource === "onboarding")
      expect(occurrences, template.id).toHaveLength(1)
    }
  })

  it("matched tasks land in their Dart-listed category in id order", () => {
    const driver = taskDoc({ id: "driver's_verification", status: "signed", fileUrl: "https://f" })
    const { categories } = buildComplianceModel({
      tasks: ready([driver]),
      trainings: ready([]),
      clearances: ready([]),
    })
    const hr = category("hr_documentation", categories)
    expect(hr.tasks[0].id).toBe("driver's_verification")
    expect(hr.tasks[0].title).toBe("Driver’s Verification") // template title wins
    expect(hr.tasks[0].status).toBe("signed")
    expect(hr.subtitle).toBe("1 of 31 completed")
  })
})

describe("module read states — pending / failed / ready", () => {
  it("pending modules contribute NOTHING and show no counts", () => {
    const { categories, allTasks } = buildComplianceModel({
      tasks: pending(),
      trainings: ready([]),
      clearances: ready([]),
    })
    // The ready modules still show their template entries (19 + 4).
    expect(category("training_compliance", categories).tasks).toHaveLength(DEFAULT_TRAININGS.length)
    expect(category("clearance", categories).tasks).toHaveLength(DEFAULT_CLEARANCES.length)
    // The pending module fabricates nothing.
    expect(category("employment_acceptance", categories).tasks).toHaveLength(0)
    expect(allTasks).toHaveLength(23)
  })

  it("failed modules (never loaded) render no rows for their docs-empty retention", () => {
    const { categories, allTasks } = buildComplianceModel({
      tasks: failed([]),
      trainings: ready([]),
      clearances: ready([]),
    })
    expect(category("hr_documentation", categories).tasks).toHaveLength(0)
    expect(allTasks.some((task) => task.id === "signed_offer_letter")).toBe(false)
  })

  it("failed modules WITH retained docs show only the delivered docs — no template fabrication", () => {
    const driver = taskDoc({ id: "driver's_verification", status: "signed" })
    const custom = taskDoc({ id: "custom_extra_form", status: "acknowledged" })
    const { categories, allTasks } = buildComplianceModel({
      tasks: failed([driver, custom]),
      trainings: ready([]),
      clearances: ready([]),
    })
    const hr = category("hr_documentation", categories)
    // only the actually-delivered doc for a listed id
    expect(hr.tasks.map((task) => task.id)).toEqual(["driver's_verification"])
    expect(hr.tasks[0].title).toBe("Driver’s Verification") // template guard still applies
    // the unlisted custom doc goes to the fallback group
    expect(category(ADDITIONAL_REQUIREMENTS_CATEGORY_ID, categories).tasks.map((task) => task.id)).toEqual([
      "custom_extra_form",
    ])
    // none of the other 46 defaults masquerade as retained progress
    expect(allTasks.filter((task) => task.taskSource === "onboarding")).toHaveLength(2)
  })

  it("failed training/clearance modules render only delivered docs", () => {
    const { categories } = buildComplianceModel({
      tasks: ready([]),
      trainings: failed([trainingDoc({ id: DEFAULT_TRAININGS[5].id, status: "completed" })]),
      clearances: failed([clearanceDoc({ id: "custom_background_check", status: "verified" })]),
    })
    expect(category("training_compliance", categories).tasks).toHaveLength(1)
    expect(category("training_compliance", categories).tasks[0].isCompleted).toBe(true)
    expect(category("clearance", categories).tasks).toHaveLength(1)
  })
})

describe("correction — every unmatched record stays visible", () => {
  it("dynamic onboarding extras land in the Additional Requirements fallback group", () => {
    const custom = taskDoc({ id: "custom_extra_form", status: "acknowledged" })
    const { categories } = buildComplianceModel({
      tasks: ready([custom]),
      trainings: ready([]),
      clearances: ready([]),
    })
    const fallback = category(ADDITIONAL_REQUIREMENTS_CATEGORY_ID, categories)
    expect(fallback.tasks.map((task) => task.id)).toEqual(["custom_extra_form"])
    expect(fallback.subtitle).toBe("1 of 1 completed")
  })

  it("extra trainings and clearances are appended AFTER the template rows", () => {
    const { categories, allTasks } = buildComplianceModel({
      tasks: ready([]),
      trainings: ready([
        trainingDoc({ id: DEFAULT_TRAININGS[0].id, status: "verified" }),
        trainingDoc({ id: "custom_training_module", title: "Custom Module", status: "inProgress" }),
      ]),
      clearances: ready([
        clearanceDoc({ id: "custom_background_check", title: "Custom Check", status: "underReview" }),
      ]),
    })
    const trainingRows = category("training_compliance", categories).tasks
    expect(trainingRows).toHaveLength(DEFAULT_TRAININGS.length + 1)
    expect(trainingRows[trainingRows.length - 1]).toMatchObject({
      id: "custom_training_module",
      title: "Custom Module",
      status: "pending", // inProgress mapping
      taskSource: "training",
    })
    // custom subtitle comes from the document description, defaulting to the module text
    expect(trainingRows[trainingRows.length - 1].subtitle).toBe("Mandatory BHMH Training Module.")

    const clearanceRows = category("clearance", categories).tasks
    expect(clearanceRows).toHaveLength(DEFAULT_CLEARANCES.length + 1)
    expect(clearanceRows[clearanceRows.length - 1]).toMatchObject({
      id: "custom_background_check",
      status: "submitted",
      isCompleted: false,
    })
    // identity: 71 distinct (source, id) pairs — every requirement stays visible
    expect(allTasks).toHaveLength(19 + 1 + 4 + 1 + 46)
    expect(new Set(allTasks.map(subtaskKey)).size).toBe(allTasks.length)
  })

  it("custom training extras keep their own document description", () => {
    const { categories } = buildComplianceModel({
      tasks: ready([]),
      trainings: ready([
        trainingDoc({ id: "custom_training_module", description: "Client-provided module", status: "pending" }),
      ]),
      clearances: ready([]),
    })
    const rows = category("training_compliance", categories).tasks
    expect(rows[rows.length - 1].subtitle).toBe("Client-provided module")
  })

  it("identical ids in DIFFERENT modules stay distinct (no cross-module shadow filter)", () => {
    // An onboarding doc with id "start" (a training id) coexists with the training.
    const shadow = taskDoc({ id: "start", status: "rejected" })
    const { categories, allTasks } = buildComplianceModel({
      tasks: ready([shadow]),
      trainings: ready([trainingDoc({ id: "start", status: "completed" })]),
      clearances: ready([]),
    })
    // the onboarding copy is in the fallback group (id not in any Dart list)
    expect(category(ADDITIONAL_REQUIREMENTS_CATEGORY_ID, categories).tasks.some((task) => task.id === "start")).toBe(
      true,
    )
    // the training copy is in Category 6
    const trainingCopy = category("training_compliance", categories).tasks.filter((task) => task.id === "start")
    expect(trainingCopy).toHaveLength(1)
    expect(trainingCopy[0].status).toBe("completed")
    expect(trainingCopy[0].taskSource).toBe("training")
    // both requirements are counted by the banner
    expect(allTasks.filter((task) => task.id === "start")).toHaveLength(2)
  })
})

describe("quirk 1 — template merge protects against duplicate titles", () => {
  it("the doc's buggy 'Onboarding Task' title is replaced by the template title", () => {
    const { categories } = buildComplianceModel({
      tasks: ready([taskDoc({ id: DEFAULT_ONBOARDING_TASKS[0].id, status: "signed" })]),
      trainings: ready([]),
      clearances: ready([]),
    })
    const cat1 = category("employment_acceptance", categories)
    expect(cat1.tasks[0].title).toBe("Onboarding Acknowledgment form")
    expect(cat1.tasks[0].actionType).toBe("acknowledgeSign")
  })

  it("missing template docs still render with template values (notStarted)", () => {
    const { categories } = buildComplianceModel({ tasks: ready([]), trainings: ready([]), clearances: ready([]) })
    const cat1 = category("employment_acceptance", categories)
    expect(cat1.tasks[0]).toMatchObject({
      id: DEFAULT_ONBOARDING_TASKS[0].id,
      status: "notStarted",
      isCompleted: false,
      fileUrl: null,
    })
  })
})

describe("training / clearance status mapping (quirk 4)", () => {
  it("trainings: verified|completed→completed, underReview→submitted, inProgress→pending", () => {
    expect(mapTrainingStatus("verified")).toBe("completed")
    expect(mapTrainingStatus("completed")).toBe("completed")
    expect(mapTrainingStatus("underReview")).toBe("submitted")
    expect(mapTrainingStatus("inProgress")).toBe("pending")
    expect(mapTrainingStatus("overdue")).toBe("notStarted")
    expect(mapTrainingStatus("actionRequired")).toBe("notStarted")
    expect(mapTrainingStatus("notStarted")).toBe("notStarted")
  })

  it("clearances: verified→completed, underReview→submitted, pending→pending", () => {
    expect(mapClearanceStatus("verified")).toBe("completed")
    expect(mapClearanceStatus("underReview")).toBe("submitted")
    expect(mapClearanceStatus("pending")).toBe("pending")
    expect(mapClearanceStatus("expired")).toBe("notStarted")
    expect(mapClearanceStatus("actionRequired")).toBe("notStarted")
  })

  it("training tiles keep the template description and are marked done per mapping", () => {
    const { categories } = buildComplianceModel({
      tasks: ready([]),
      trainings: ready([trainingDoc({ id: DEFAULT_TRAININGS[0].id, status: "underReview" })]),
      clearances: ready([]),
    })
    const first = category("training_compliance", categories).tasks[0]
    expect(first.status).toBe("submitted")
    expect(first.isCompleted).toBe(false)
    expect(first.taskSource).toBe("training")

    const cleared = buildComplianceModel({
      tasks: ready([]),
      trainings: ready([trainingDoc({ id: DEFAULT_TRAININGS[0].id, status: "verified" })]),
      clearances: ready([]),
    }).categories.find((entry) => entry.id === "training_compliance")!.tasks[0]
    expect(cleared.isCompleted).toBe(true)
    expect(cleared.subtitle).toBe("Mandatory BHMH Training Module.")
  })

  it("clearance tiles keep the template description and count 'verified' as done", () => {
    const { categories } = buildComplianceModel({
      tasks: ready([]),
      trainings: ready([]),
      clearances: ready([clearanceDoc({ id: DEFAULT_CLEARANCES[0].id, status: "verified" })]),
    })
    const clearanceCategory = category("clearance", categories)
    expect(clearanceCategory.tasks[0].isCompleted).toBe(true)
    expect(clearanceCategory.subtitle).toBe("1 of 4 completed")
  })
})

describe("onboarding tile subtitle rewrite (quirk 5)", () => {
  it("done tasks become `Completed on <local yyyy-mm-dd>`, others 'Pending completion'", () => {
    const at = new Date(2026, 0, 5, 14, 0, 0) // local Jan 5 2026
    const done = taskDoc({ id: "signed_offer_letter", status: "verified", updatedAt: at })
    const pendingTask = taskDoc({ id: "job_description_acknowledgment", status: "submitted" })
    const { categories } = buildComplianceModel({
      tasks: ready([done, pendingTask]),
      trainings: ready([]),
      clearances: ready([]),
    })
    const cat1 = category("employment_acceptance", categories)
    expect(cat1.tasks.find((task) => task.id === "signed_offer_letter")!.subtitle).toBe("Completed on 2026-01-05")
    expect(cat1.tasks.find((task) => task.id === "job_description_acknowledgment")!.subtitle).toBe(
      "Pending completion",
    )
  })
})

describe("status text + progress stats", () => {
  it("taskStatusText matches the Dart OnboardingTaskTile mapping", () => {
    expect(taskStatusText("noActionRequired")).toBe("No Action Required")
    expect(taskStatusText("verified")).toBe("Verified")
    expect(taskStatusText("completed")).toBe("Verified")
    expect(taskStatusText("submitted")).toBe("Pending Review")
    expect(taskStatusText("signed")).toBe("Pending Review")
    expect(taskStatusText("waitingForApprover")).toBe("Pending Review")
    expect(taskStatusText("notStarted")).toBe("Awaiting Submission")
    expect(taskStatusText("rejected")).toBe("Action Required")
    expect(taskStatusText("pending")).toBe("PENDING")
    expect(taskStatusText("acknowledged")).toBe("ACKNOWLEDGED")
  })

  it("isTaskCompleted covers exactly the Dart terminal set", () => {
    for (const status of ["completed", "verified", "cleared", "signed", "acknowledged", "confirmed"] as const) {
      expect(isTaskCompleted(status)).toBe(true)
    }
    expect(isTaskCompleted("submitted")).toBe(false)
    expect(isTaskCompleted("noActionRequired")).toBe(false)
    expect(isTaskCompleted("pending")).toBe(false)
  })

  it("taskProgressStats counts over ALL visible requirements, skipping noActionRequired", () => {
    const { categories } = buildComplianceModel({
      tasks: ready([
        taskDoc({ id: "signed_offer_letter", status: "verified" }),
        taskDoc({ id: "copy_of_license", status: "acknowledged" }),
        taskDoc({ id: "attestation_form", status: "noActionRequired" }), // excluded
        taskDoc({ id: "resume", status: "submitted" }),
      ]),
      trainings: ready([trainingDoc({ id: DEFAULT_TRAININGS[0].id, status: "completed" })]),
      clearances: ready([clearanceDoc({ id: DEFAULT_CLEARANCES[0].id, status: "pending" })]),
    })
    const stats = taskProgressStats(categories)
    // counted: all 69 visible rows minus the skipped noActionRequired one
    expect(stats.completed).toBe(3) // verified + acknowledged + completed training
    expect(stats.completed + stats.remaining).toBe(68)
  })

  it("per-category subtitle reflects the completed counts", () => {
    const { categories } = buildComplianceModel({
      tasks: ready([taskDoc({ id: "signed_offer_letter", status: "verified" })]),
      trainings: ready([]),
      clearances: ready([]),
    })
    expect(category("employment_acceptance", categories).subtitle).toBe("1 of 3 completed")
    expect(category("professional_documentation", categories).subtitle).toBe("0 of 6 completed")
  })
})

describe("subtaskKey — identity (correction 4)", () => {
  it("same id in different modules yields different keys", () => {
    const base = {
      title: "",
      subtitle: "",
      status: "notStarted" as const,
      actionType: null,
      isCompleted: false,
      fileUrl: null,
      updatedAt: null,
      completedAt: null,
      rejectionReason: null,
    }
    expect(subtaskKey({ ...base, id: "start", taskSource: "onboarding" })).toBe("onboarding:start")
    expect(subtaskKey({ ...base, id: "start", taskSource: "training" })).toBe("training:start")
  })
})

describe("ClearanceStatusRaw / TrainingStatusRaw typing sanity", () => {
  it("raw unions are the Dart enums", () => {
    const clearance: ClearanceStatusRaw = "actionRequired"
    const training: TrainingStatusRaw = "overdue"
    expect(clearance).toBe("actionRequired")
    expect(training).toBe("overdue")
  })
})
