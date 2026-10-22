/**
 * Training stream mappers + derivations.
 *
 * These are the pure functions behind the Training screen: document → model
 * conversion, ordering, completion aggregation and the counters. Completion
 * counts BOTH `completed` and `verified` (admin approvals write `verified`),
 * which is the correction documented in admin/README.md.
 */
import { describe, expect, it } from "vitest"

import {
  buildTrainingCompliance,
  deriveTrainingStats,
  mapTrainingAssignment,
  mapTrainingStaff,
  mapTrainingTemplate,
  trainingComplianceFor,
} from "@/lib/admin/training-streams"
import {
  sortTrainingTemplates,
  type AdminTrainingTemplate,
  type TrainingAssignment,
} from "@/lib/admin/training-models"

const NOW = new Date("2026-10-23T12:00:00.000Z")

function template(
  id: string,
  overrides: Partial<AdminTrainingTemplate> = {},
): AdminTrainingTemplate {
  return {
    id,
    title: id,
    description: "",
    durationText: "",
    requirementType: "certificate",
    isActive: true,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  }
}

function assignment(
  id: string,
  overrides: Partial<TrainingAssignment> = {},
): TrainingAssignment {
  return {
    id,
    employeeId: null,
    adminId: "adm-1",
    title: id,
    description: "",
    durationText: "",
    status: "notStarted",
    dueDate: null,
    updatedAt: null,
    assignedAt: null,
    ...overrides,
  }
}

describe("mapTrainingTemplate", () => {
  it("applies the Dart defaults and keeps unknown requirement types", () => {
    expect(mapTrainingTemplate("t1", {})).toEqual({
      id: "t1",
      title: "Untitled Training",
      description: "",
      durationText: "",
      requirementType: "certificate",
      isActive: true,
      createdAt: null,
      updatedAt: null,
    })

    expect(
      mapTrainingTemplate("t2", {
        title: "CPR",
        requirementType: "someFutureType",
        isActive: false,
      }).requirementType,
    ).toBe("someFutureType")
  })

  it("parses both Firestore Timestamp shapes without throwing", () => {
    const mapped = mapTrainingTemplate("t1", {
      createdAt: { toDate: () => new Date("2026-01-02T00:00:00.000Z") },
      updatedAt: { seconds: 1_767_225_600 },
    })

    expect(mapped.createdAt?.toISOString()).toBe("2026-01-02T00:00:00.000Z")
    expect(mapped.updatedAt?.toISOString()).toBe("2026-01-01T00:00:00.000Z")
  })
})

describe("mapTrainingAssignment", () => {
  it("maps status, ownership and timestamps", () => {
    const mapped = mapTrainingAssignment("cpr", {
      employeeId: "emp-1",
      adminId: "adm-1",
      title: "CPR",
      status: "verified",
      dueDate: { seconds: 1_767_225_600 },
      assignedAt: { toDate: () => new Date("2026-01-01T00:00:00.000Z") },
    })

    expect(mapped.status).toBe("verified")
    expect(mapped.employeeId).toBe("emp-1")
    expect(mapped.adminId).toBe("adm-1")
    expect(mapped.dueDate?.toISOString()).toBe("2026-01-01T00:00:00.000Z")
    expect(mapped.assignedAt?.toISOString()).toBe("2026-01-01T00:00:00.000Z")
  })

  it("never throws on malformed payloads; unknown statuses become notStarted", () => {
    const mapped = mapTrainingAssignment("x", {
      title: 42,
      status: "mystery",
      dueDate: "not-a-date",
    })

    expect(mapped.title).toBe("")
    expect(mapped.status).toBe("notStarted")
    expect(mapped.dueDate).toBeNull()
  })
})

describe("mapTrainingStaff", () => {
  it("marks missing isActive as active and empty emails as null", () => {
    expect(mapTrainingStaff("emp-1", { name: "Sara", email: "" })).toEqual({
      uid: "emp-1",
      name: "Sara",
      email: null,
      isActive: true,
    })

    expect(
      mapTrainingStaff("emp-2", { name: "", isActive: false }),
    ).toMatchObject({ name: "Employee", isActive: false })
  })
})

describe("sortTrainingTemplates", () => {
  it("orders newest first and puts templates without createdAt last", () => {
    const sorted = sortTrainingTemplates([
      template("missing"),
      template("old", { createdAt: new Date("2026-01-01T00:00:00.000Z") }),
      template("new", { createdAt: new Date("2026-06-01T00:00:00.000Z") }),
    ])

    expect(sorted.map((entry) => entry.id)).toEqual(["new", "old", "missing"])
  })

  it("is deterministic for equal/missing timestamps", () => {
    const sorted = sortTrainingTemplates([
      template("b"),
      template("a"),
      template("c"),
    ])
    expect(sorted.map((entry) => entry.id)).toEqual(["a", "b", "c"])
  })
})

describe("buildTrainingCompliance", () => {
  it("counts completed AND verified, and ignores other statuses", () => {
    const compliance = buildTrainingCompliance([
      assignment("cpr", { status: "completed" }),
      assignment("cpr", { status: "verified" }),
      assignment("cpr", { status: "underReview" }),
      assignment("hipaa", { status: "actionRequired" }),
    ])

    expect(compliance.cpr).toEqual({ completed: 2, total: 3, rate: (2 / 3) * 100 })
    expect(compliance.hipaa).toEqual({ completed: 0, total: 1, rate: 0 })
  })

  it("returns an empty map without assignments and a safe fallback per template", () => {
    const compliance = buildTrainingCompliance([])
    expect(compliance).toEqual({})
    expect(trainingComplianceFor(compliance, "missing")).toEqual({
      completed: 0,
      total: 0,
      rate: 0,
    })
  })
})

describe("deriveTrainingStats", () => {
  it("matches the Flutter counters: all templates, 1-decimal rate, overdue unfinished", () => {
    const stats = deriveTrainingStats(
      [
        template("a"),
        template("b", { isActive: false }),
        template("c"),
      ],
      [
        assignment("a", { status: "completed" }),
        assignment("a", { status: "verified", dueDate: new Date("2026-10-01T00:00:00.000Z") }),
        assignment("a", {
          status: "actionRequired",
          dueDate: new Date("2026-10-01T00:00:00.000Z"),
        }),
        assignment("b", {
          status: "notStarted",
          dueDate: new Date("2026-11-01T00:00:00.000Z"),
        }),
      ],
      NOW,
    )

    expect(stats).toEqual({
      totalActive: 3,
      complianceRate: 50,
      overdueCount: 1,
    })
  })

  it("reports 0 (never NaN) when nothing is assigned", () => {
    expect(deriveTrainingStats([template("a")], [], NOW)).toEqual({
      totalActive: 1,
      complianceRate: 0,
      overdueCount: 0,
    })
  })

  it("rounds to one decimal place", () => {
    const stats = deriveTrainingStats(
      [],
      [
        assignment("a", { status: "completed" }),
        assignment("a", { status: "notStarted" }),
        assignment("a", { status: "notStarted" }),
      ],
      NOW,
    )
    expect(stats.complianceRate).toBe(33.3)
  })

  it("does not count a deadline that is exactly now, or a finished late training", () => {
    const stats = deriveTrainingStats(
      [],
      [
        assignment("a", { status: "notStarted", dueDate: new Date(NOW) }),
        assignment("b", {
          status: "verified",
          dueDate: new Date("2020-01-01T00:00:00.000Z"),
        }),
      ],
      NOW,
    )
    expect(stats.overdueCount).toBe(0)
  })
})
