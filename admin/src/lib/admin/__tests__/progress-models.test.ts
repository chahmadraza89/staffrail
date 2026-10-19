/**
 * Shared progress formula tests — pinned to the exact Flutter
 * streamAdminEmployeesProgress semantics that Dashboard, Directory and the
 * Detail page all reuse through computeModuleProgress:
 *   - onboarding counts the isCompleted FLAG over non-noActionRequired tasks
 *   - training counts raw status === "completed" over all docs
 *   - clearance counts raw status === "verified" over all docs
 *   - overall is the average of ONLY the modules that contain data
 */
import { describe, expect, it } from "vitest"

import { computeModuleProgress } from "@/lib/admin/progress-models"

describe("computeModuleProgress", () => {
  it("is zero when every module is empty", () => {
    expect(computeModuleProgress({ tasks: [], trainings: [], clearances: [] })).toEqual({
      onboarding: 0,
      training: 0,
      clearance: 0,
      overall: 0,
    })
  })

  it("onboarding: isCompleted flag over non-noActionRequired tasks", () => {
    const progress = computeModuleProgress({
      tasks: [
        { status: "completed", isCompleted: true },
        { status: "submitted", isCompleted: false },
        { status: "noActionRequired", isCompleted: true }, // excluded from BOTH counts
        { status: "verified", isCompleted: true },
      ],
      trainings: [],
      clearances: [],
    })
    expect(progress.onboarding).toBeCloseTo(2 / 3)
    // zero-total modules are excluded from the overall average: it IS onboarding
    expect(progress.overall).toBeCloseTo(2 / 3)
  })

  it("training uses the raw 'completed' status and clearance the raw 'verified' status", () => {
    const progress = computeModuleProgress({
      tasks: [],
      trainings: [
        { status: "completed" },
        { status: "underReview" },
        { status: "verified" }, // NOT counted for trainings (mapping is external)
      ],
      clearances: [
        { status: "verified" },
        { status: "pending" },
      ],
    })
    expect(progress.training).toBeCloseTo(1 / 3)
    expect(progress.clearance).toBeCloseTo(1 / 2)
    expect(progress.overall).toBeCloseTo((1 / 3 + 1 / 2) / 2)
  })

  it("overall averages ONLY modules that contain data", () => {
    const progress = computeModuleProgress({
      tasks: [{ status: "completed", isCompleted: true }],
      trainings: [], // zero-total → contributes nothing to the average
      clearances: [
        { status: "verified" },
        { status: "verified" },
      ],
    })
    expect(progress.overall).toBeCloseTo((1 + 1) / 2)
  })

  it("undefined / non-string raw statuses never crash the module counts", () => {
    const progress = computeModuleProgress({
      tasks: [],
      trainings: [{ status: undefined }, { status: null }, { status: "completed" }],
      clearances: [{ status: 42 }, { status: "verified" }],
    })
    expect(progress.training).toBeCloseTo(1 / 3)
    expect(progress.clearance).toBeCloseTo(1 / 2)
  })
})
