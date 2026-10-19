/**
 * Compliance model tests — the Dart Builder port is verified against the
 * EXACT quirk set documented in compliance-helpers.ts: template title wins,
 * dynamic extras appended on onboarding but dropped for trainings/clearances,
 * unmatched ids fall out of categories, status mappings, subtitle rewrite.
 */
import { describe, expect, it } from "vitest"

import {
  buildComplianceModel,
  isTaskCompleted,
  mapClearanceStatus,
  mapTrainingStatus,
  taskProgressStats,
  taskStatusText,
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
    rejectionReason: null,
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

describe("groupTasksIntoCategories — Dart-verbatim structure", () => {
  it("always returns the 7 categories with the exact Dart titles in order", () => {
    const { categories } = buildComplianceModel({ tasks: [], trainings: [], clearances: [] })
    expect(categories.map((category) => [category.id, category.title])).toEqual([
      ["employment_acceptance", "Category 1: Employment Acceptance"],
      ["hr_documentation", "Category 2: HR Documentation"],
      ["professional_documentation", "Category 3: Professional Documents"],
      ["orientation", "Category 4: Orientation"],
      ["competency_forms", "Category 5: Competency Forms"],
      ["training_compliance", "Category 6: Training Compliance"],
      ["clearance", "Category 7: Clearance"],
    ])
  })

  it("a fresh employee shows the Dart-visible template set: 3/21/6/3/3/19/4", () => {
    const { categories } = buildComplianceModel({ tasks: [], trainings: [], clearances: [] })
    const sizes = categories.map((category) => category.tasks.length)
    // Category 2 lists 23 ids but two of them (corporate_confidentiality_statement,
    // transportation_acknowledgement_statement) have no default task in the 46 —
    // exactly the count the Flutter app shows a fresh employee.
    expect(sizes).toEqual([3, 21, 6, 3, 3, 19, 4])
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(59)
    // Every subtitle "x of y completed" starts at zero.
    for (const category of categories) {
      expect(category.subtitle).toBe(`0 of ${category.tasks.length} completed`)
    }
  })

  it("matched tasks land in their Dart-listed category in id order", () => {
    const driver = taskDoc({ id: "driver's_verification", status: "signed", fileUrl: "https://f" })
    const { categories } = buildComplianceModel({
      tasks: [driver],
      trainings: [],
      clearances: [],
    })
    const hr = categories.find((category) => category.id === "hr_documentation")!
    expect(hr.tasks[0].id).toBe("driver's_verification")
    expect(hr.tasks[0].title).toBe("Driver’s Verification") // template title wins
    expect(hr.tasks[0].status).toBe("signed")
    expect(hr.subtitle).toBe("1 of 21 completed")
  })

  it("null module (failed read) contributes NOTHING — no fabricated template tiles", () => {
    const { categories, allTasks } = buildComplianceModel({
      tasks: null, // onboarding read failed
      trainings: [],
      clearances: [],
    })
    // The successfully loaded modules still show their template entries.
    const trainingCategory = categories.find((category) => category.id === "training_compliance")!
    expect(trainingCategory.tasks).toHaveLength(DEFAULT_TRAININGS.length)
    // …but the failed module is absent entirely: its 46 defaults are NOT
    // rendered as if they were real pending work.
    expect(categories.find((category) => category.id === "hr_documentation")!.tasks).toHaveLength(0)
    expect(allTasks.some((task) => task.id === "signed_offer_letter")).toBe(false)
  })

  it("quirk 3: general-task ids matching NO category list fall out of the view", () => {
    // tax_documents_w_4 is seeded (46 defaults) but absent from every Dart list.
    const w4 = taskDoc({ id: "tax_documents_w_4" })
    const custom = taskDoc({ id: "custom_extra_form", status: "acknowledged" })
    const { categories, allTasks } = buildComplianceModel({
      tasks: [w4, custom],
      trainings: [],
      clearances: [],
    })
    for (const category of categories) {
      expect(category.tasks.some((entry) => entry.id === "tax_documents_w_4")).toBe(false)
      expect(category.tasks.some((entry) => entry.id === "custom_extra_form")).toBe(false)
    }
    // BUT they still exist in the model's task totals (banner counts stay honest).
    expect(allTasks.some((entry) => entry.id === "tax_documents_w_4")).toBe(true)
    expect(allTasks.some((entry) => entry.id === "custom_extra_form")).toBe(true)
  })

  it("quirk 2a: dynamic onboarding extras with a category id are displayed", () => {
    const qmhp = taskDoc({ id: "qmhp_cs_competency", status: "pendingEmployerSignature" })
    const { categories } = buildComplianceModel({ tasks: [qmhp], trainings: [], clearances: [] })
    const competencies = categories.find((category) => category.id === "competency_forms")!
    expect(competencies.tasks.map((task) => task.id)).toContain("qmhp_cs_competency")
    expect(competencies.tasks.find((task) => task.id === "qmhp_cs_competency")!.subtitle).toBe(
      "Pending completion",
    )
  })

  it("quirk 2b: extra trainings/clearances NOT in the defaults are dropped", () => {
    const { categories } = buildComplianceModel({
      tasks: [],
      trainings: [trainingDoc({ id: "custom_training_module" })],
      clearances: [clearanceDoc({ id: "custom_background_check" })],
    })
    const trainingCategory = categories.find((category) => category.id === "training_compliance")!
    const clearanceCategory = categories.find((category) => category.id === "clearance")!
    expect(trainingCategory.tasks).toHaveLength(DEFAULT_TRAININGS.length)
    expect(clearanceCategory.tasks).toHaveLength(DEFAULT_CLEARANCES.length)
  })

  it("general tasks never shadow a training/clearance id", () => {
    // Someone created an onboarding_tasks doc with id "start" (a training id).
    const shadow = taskDoc({ id: "start", status: "rejected" })
    const { categories } = buildComplianceModel({
      tasks: [shadow],
      trainings: [{ ...trainingDoc({ id: "start" }), status: "completed" }],
      clearances: [],
    })
    for (const category of categories) {
      const ids = category.tasks.map((task) => task.id)
      const starts = ids.filter((id) => id === "start")
      expect(starts.length).toBeLessThanOrEqual(1)
    }
  })
})

describe("quirk 1 — template merge protects against duplicate titles", () => {
  it("the doc's buggy 'Onboarding Task' title is replaced by the template title", () => {
    const { categories } = buildComplianceModel({
      tasks: [taskDoc({ id: DEFAULT_ONBOARDING_TASKS[0].id, status: "signed" })],
      trainings: [],
      clearances: [],
    })
    const cat1 = categories.find((category) => category.id === "employment_acceptance")!
    expect(cat1.tasks[0].title).toBe("Onboarding Acknowledgment form")
    expect(cat1.tasks[0].actionType).toBe("acknowledgeSign")
  })

  it("missing template docs still render with template values (notStarted)", () => {
    const { categories } = buildComplianceModel({ tasks: [], trainings: [], clearances: [] })
    const cat1 = categories.find((category) => category.id === "employment_acceptance")!
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
      tasks: [],
      trainings: [
        trainingDoc({ id: DEFAULT_TRAININGS[0].id, status: "underReview" }),
      ],
      clearances: [],
    })
    const trainingCategory = categories.find((category) => category.id === "training_compliance")!
    const first = trainingCategory.tasks[0]
    expect(first.status).toBe("submitted")
    expect(first.isCompleted).toBe(false)
    expect(first.taskSource).toBe("training")

    const cleared = buildComplianceModel({
      tasks: [],
      trainings: [trainingDoc({ id: DEFAULT_TRAININGS[0].id, status: "verified" })],
      clearances: [],
    }).categories.find((category) => category.id === "training_compliance")!.tasks[0]
    expect(cleared.isCompleted).toBe(true)
    expect(cleared.subtitle).toBe("Mandatory BHMH Training Module.")
  })

  it("clearance tiles keep the template description and count 'verified' as done", () => {
    const { categories } = buildComplianceModel({
      tasks: [],
      trainings: [],
      clearances: [clearanceDoc({ id: DEFAULT_CLEARANCES[0].id, status: "verified" })],
    })
    const clearanceCategory = categories.find((category) => category.id === "clearance")!
    expect(clearanceCategory.tasks[0].isCompleted).toBe(true)
    expect(clearanceCategory.subtitle).toBe("1 of 4 completed")
  })
})

describe("onboarding tile subtitle rewrite (quirk 5)", () => {
  it("done tasks become `Completed on <local yyyy-mm-dd>`, others 'Pending completion'", () => {
    const at = new Date(2026, 0, 5, 14, 0, 0) // local Jan 5 2026
    const done = taskDoc({ id: "signed_offer_letter", status: "verified", updatedAt: at })
    const pending = taskDoc({ id: "job_description_acknowledgment", status: "submitted" })
    const { categories } = buildComplianceModel({ tasks: [done, pending], trainings: [], clearances: [] })
    const cat1 = categories.find((category) => category.id === "employment_acceptance")!
    expect(cat1.tasks.find((task) => task.id === "signed_offer_letter")!.subtitle).toBe("Completed on 2026-01-05")
    expect(cat1.tasks.find((task) => task.id === "job_description_acknowledgment")!.subtitle).toBe("Pending completion")
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

  it("taskProgressStats skips noActionRequired, completed via isTaskCompleted", () => {
    const { categories } = buildComplianceModel({
      tasks: [
        taskDoc({ id: "signed_offer_letter", status: "verified" }),
        taskDoc({ id: "copy_of_license", status: "acknowledged" }),
        taskDoc({ id: "attestation_form", status: "noActionRequired" }), // excluded
        taskDoc({ id: "resume", status: "submitted" }),
      ],
      trainings: [trainingDoc({ id: DEFAULT_TRAININGS[0].id, status: "completed" })],
      clearances: [clearanceDoc({ id: DEFAULT_CLEARANCES[0].id, status: "pending" })],
    })
    // counted: visible category tasks (59 = 3+21+6+3+3+19+4) minus the
    // skipped noActionRequired one — matches the Dart TaskProgressHeader,
    // which counts across the RENDERED categories.
    const stats = taskProgressStats(categories)
    expect(stats.completed).toBe(3) // verified + acknowledged + completed training
    expect(stats.completed + stats.remaining).toBe(58)
  })

  it("per-category subtitle reflects the completed counts", () => {
    const { categories } = buildComplianceModel({
      tasks: [taskDoc({ id: "signed_offer_letter", status: "verified" })],
      trainings: [],
      clearances: [],
    })
    expect(categories.find((category) => category.id === "employment_acceptance")!.subtitle).toBe("1 of 3 completed")
    expect(categories.find((category) => category.id === "professional_documentation")!.subtitle).toBe("0 of 6 completed")
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
