import { describe, expect, it } from "vitest"

import {
  DEFAULT_CLEARANCES,
  DEFAULT_ONBOARDING_TASKS,
  DEFAULT_TRAININGS,
  clearanceFields,
  onboardingTaskFields,
  slugifyTemplateId,
  trainingFields,
} from "@/lib/admin/seed-templates"

/**
 * These templates are byte-parity-critical with the Flutter app
 * (lib/core/config/onboarding_constants.dart + domain DTOs): either client
 * may create an employee, and the employee app's code paths reference the
 * exact doc IDs produced here (e.g. the driver's_verification migration).
 */
describe("slugifyTemplateId (Dart slug parity)", () => {
  it("reproduces the exact IDs the Flutter client generates", () => {
    // Driver's Verification — apostrophe variant is load-bearing: the
    // Flutter onboarding service references 'driver\'s_verification'.
    expect(slugifyTemplateId("Driver’s Verification")).toBe("driver's_verification")
    // Slashes, parens, dashes.
    expect(slugifyTemplateId("Tax Documents (I-9)")).toBe("tax_documents_i_9")
    expect(slugifyTemplateId("Code of Conduct/Ethics")).toBe("code_of_conduct_ethics")
    expect(slugifyTemplateId("CPR / First Aid")).toBe("cpr___first_aid")
    expect(slugifyTemplateId("Copy of Highest Degree/Diploma certificate")).toBe(
      "copy_of_highest_degree_diploma_certificate",
    )
    // Spaces → underscores, lowercase.
    expect(slugifyTemplateId("Onboarding Acknowledgment form")).toBe(
      "onboarding_acknowledgment_form",
    )
  })
})

describe("template contents", () => {
  it("carries the exact template counts from OnboardingConstants", () => {
    expect(DEFAULT_ONBOARDING_TASKS).toHaveLength(46)
    expect(DEFAULT_TRAININGS).toHaveLength(19)
    expect(DEFAULT_CLEARANCES).toHaveLength(4)
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
