import { describe, expect, it } from "vitest"

import {
  DEFAULT_CLEARANCES,
  DEFAULT_ONBOARDING_TASKS,
  DEFAULT_TRAININGS,
  clearanceFields,
  onboardingTaskFields,
  slugifyTaskId,
  slugifyTrainingId,
  trainingFields,
} from "@/lib/admin/seed-templates"

/**
 * These templates are byte-parity-critical with the Flutter app
 * (lib/core/config/onboarding_constants.dart + domain DTOs): either client
 * may create an employee, and the employee app's code paths reference the
 * exact doc IDs produced here (e.g. the driver's_verification migration).
 *
 * NOTE: onboarding tasks and trainings use DIFFERENT Dart slug algorithms —
 * each is tested against its own Dart reference.
 */
describe("slugifyTaskId (OnboardingConstants.create parity)", () => {
  it("reproduces the exact task IDs the Flutter client generates", () => {
    // Driver's Verification — apostrophe variant is load-bearing: the
    // Flutter onboarding service references 'driver\'s_verification'.
    expect(slugifyTaskId("Driver’s Verification")).toBe("driver's_verification")
    // Slashes, parens, dashes, commas — ORDER MATTERS.
    expect(slugifyTaskId("Tax Documents (I-9)")).toBe("tax_documents_i_9")
    expect(slugifyTaskId("Code of Conduct/Ethics")).toBe("code_of_conduct_ethics")
    expect(slugifyTaskId("CPR / First Aid")).toBe("cpr___first_aid")
    expect(slugifyTaskId("Copy of Highest Degree/Diploma certificate")).toBe(
      "copy_of_highest_degree_diploma_certificate",
    )
    expect(slugifyTaskId("Acknowledge of EOC, Health & Safety policy")).toBe(
      "acknowledge_of_eoc_health_&_safety_policy",
    )
    expect(slugifyTaskId("QMHP-CS Competency")).toBe("qmhp_cs_competency")
    // Spaces → underscores, lowercase.
    expect(slugifyTaskId("Onboarding Acknowledgment form")).toBe(
      "onboarding_acknowledgment_form",
    )
  })

  it("keeps the dash rule the training slug does NOT have (dual-algorithm guard)", () => {
    // Guards against someone unifying the two slug helpers: the task
    // algorithm maps '-'→'_' (Dart create), the training one leaves it.
    expect(slugifyTaskId("Skills-Streaming")).toBe("skills_streaming")
  })
})

describe("slugifyTrainingId (OnboardingConstants._createTraining parity)", () => {
  it("reproduces _createTraining exactly: no dash rule, no comma rule", () => {
    // Load-bearing regression: Dash STAYS a dash — the Flutter app has
    // always produced 'skills-streaming', never 'skills_streaming'.
    expect(slugifyTrainingId("Skills-Streaming")).toBe("skills-streaming")
    // Slash → underscore (after spaces): "cpr / first aid" → "cpr___first_aid"
    // (space + slash + space each become an underscore).
    expect(slugifyTrainingId("CPR / First Aid")).toBe("cpr___first_aid")
    // Curly apostrophe → straight.
    expect(slugifyTrainingId("Barkley’s")).toBe("barkley's")
    expect(slugifyTrainingId("Seeking Safety")).toBe("seeking_safety")
  })
})

describe("template contents", () => {
  it("carries the exact template counts from OnboardingConstants", () => {
    expect(DEFAULT_ONBOARDING_TASKS).toHaveLength(46)
    expect(DEFAULT_TRAININGS).toHaveLength(19)
    expect(DEFAULT_CLEARANCES).toHaveLength(4)
  })

  it("every onboarding task ID matches the Dart create() output verbatim", () => {
    expect(DEFAULT_ONBOARDING_TASKS.map((task) => task.id)).toEqual([
      // CATEGORY 1: Employment Acceptance
      "onboarding_acknowledgment_form",
      "signed_offer_letter",
      "job_description_acknowledgment",
      // CATEGORY 2: HR Documentation
      "driver's_verification",
      "driver's_license",
      "confidentiality_statement",
      "proof_of_vehicle_insurance",
      "vehicle_registration",
      "copy_of_ssc",
      "confidentiality_of_client___therapist___staff",
      "acknowledgement_of_transporting_clients",
      "cultural_competency",
      "corporate_compliance_acknowledge",
      "code_of_conduct_ethics",
      "alleged_abuse_neglect",
      "acknowledge_of_eoc_health_&_safety_policy",
      "grievance_procedure",
      "infection_control_refresher",
      "trauma_informed_care_practices",
      "types_of_services",
      "person_centered_planning",
      "documentation_and_timelines",
      "client_rights_&_responsibilities",
      "crisis_intervention_steps",
      "mandatory_reporting",
      "attestation_form",
      "authorization_for_emergency_medical_care",
      "acknowledgement_of_vehicle_documentation",
      "acknowledge_of_company_property",
      "tax_documents_i_9",
      "tax_documents_w_4",
      "tax_documents_w_1",
      "tax_documents_w_9",
      "direct_deposit_authorization",
      // CATEGORY 3: Professional Documents
      "resume",
      "3_professional_letters_of_recommendation",
      "copy_of_highest_degree_diploma_certificate",
      "copy_of_official_transcripts_of_highest_degree",
      "copy_of_license",
      "copy_of_certification",
      // CATEGORY 4: Orientation
      "bhmh_initial_orientation",
      "initial_training",
      "annual_training",
      // CATEGORY 5: Competency Forms
      "cssp_competency",
      "qmhp_cs_competency",
      "lpha_competency",
    ])
  })

  it("every training ID matches the Dart _createTraining output verbatim", () => {
    expect(DEFAULT_TRAININGS.map((training) => training.id)).toEqual([
      "start",
      "paya",
      "seeking_safety",
      "nurturing_parenting",
      "barkley's",
      "wraparound_planning",
      "ansa",
      "cans",
      "imr",
      "act",
      "supported_employment",
      "psh",
      "recovery_plan",
      "cps_reporting",
      "skills-streaming",
      "trauma_informed_care",
      "cpr___first_aid",
      "hipaa",
      "paph",
    ])
  })

  it("task templates always carry an explicit actionType (never inferred)", () => {
    const actionTypes = new Set(DEFAULT_ONBOARDING_TASKS.map((task) => task.actionType))
    expect(actionTypes).toEqual(
      new Set(["acknowledgeSign", "upload", "splitField", "fillAndSign"]),
    )
    expect(DEFAULT_ONBOARDING_TASKS.every((task) => task.subtitle.length > 0)).toBe(true)
  })

  it("all template IDs are unique per collection", () => {
    const idsOf = <T extends { id: string }>(items: T[]) => new Set(items.map((item) => item.id))
    expect(idsOf(DEFAULT_ONBOARDING_TASKS).size).toBe(DEFAULT_ONBOARDING_TASKS.length)
    expect(idsOf(DEFAULT_TRAININGS).size).toBe(DEFAULT_TRAININGS.length)
    expect(idsOf(DEFAULT_CLEARANCES).size).toBe(DEFAULT_CLEARANCES.length)
  })

  it("training durations match OnboardingConstants'", () => {
    const byId = new Map(DEFAULT_TRAININGS.map((training) => [training.id, training]))
    expect(byId.get("start")?.durationText).toBe("8 hours")
    expect(byId.get("hipaa")?.durationText).toBe("2 hours")
    expect(byId.get("cpr___first_aid")?.durationText).toBe("4 hours")
    expect(byId.get("skills-streaming")?.durationText).toBe("6 hours")
  })

  it("clearance templates keep the pending state and exact doc IDs", () => {
    expect(DEFAULT_CLEARANCES.map((clearance) => clearance.id)).toEqual([
      "driving_background_verification_report",
      "criminal_background_verification_report",
      "drug_screening_results",
      "tb_status_report",
    ])
  })
})

describe("Firestore field maps (DTO parity)", () => {
  const context = { employeeId: "e1", employeeName: "Ahmad", adminId: "adm-1" }

  it("onboarding tasks seed notStarted with all DTO fields", () => {
    const fields = onboardingTaskFields(
      { id: "x", title: "X", subtitle: "Upload Required", actionType: "upload" },
      context,
    )
    expect(fields).toMatchObject({
      title: "X",
      subtitle: "Upload Required",
      isCompleted: false,
      status: "notStarted",
      actionType: "upload",
      employeeName: "Ahmad",
      adminId: "adm-1",
      employeeId: "e1",
      isDraft: false,
      isLocked: false,
      fileUrl: null,
      signatureUrl: null,
      dueDate: null,
      completedAt: null,
    })
  })

  it("trainings seed notStarted with duration + assignedAt", () => {
    const now = new Date(2026, 9, 18)
    const fields = trainingFields(
      { id: "start", title: "START", durationText: "8 hours" },
      context,
      now,
    )
    expect(fields).toMatchObject({
      title: "START",
      durationText: "8 hours",
      status: "notStarted",
      noExpiration: false,
      assignedAt: now,
      employeeId: "e1",
      adminId: "adm-1",
      description: "Mandatory BHMH Training Module.",
    })
  })

  it("clearances seed pending", () => {
    const fields = clearanceFields(
      {
        id: "tb_status_report",
        title: "TB Status Report",
        description: "Official TB test results verification.",
      },
      context,
    )
    expect(fields).toMatchObject({
      title: "TB Status Report",
      status: "pending",
      employeeName: "Ahmad",
      adminId: "adm-1",
      verifiedAt: null,
      rejectionReason: null,
    })
  })
})
