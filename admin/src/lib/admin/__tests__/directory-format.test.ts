import { describe, expect, it } from "vitest"

import {
  DEFAULT_DIRECTORY_FILTER,
  applyDirectoryFilter,
  formatLastActivity,
  getInitials,
  getPhase,
  matchesDirectorySearch,
  type DirectoryFilter,
} from "@/lib/admin/directory-format"
import type { AdminEmployeeProgress } from "@/lib/admin/dashboard-models"

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const employee = (overrides: Partial<AdminEmployeeProgress>): AdminEmployeeProgress => ({
  uid: "e1",
  name: "Ahmad Raza",
  email: "ahmad@example.com",
  overallProgress: 0.5,
  onboardingProgress: 0.5,
  trainingProgress: 0.5,
  clearanceProgress: 0.5,
  lastLogin: new Date("2026-10-18T10:00:00Z"),
  isActive: true,
  ...overrides,
})

describe("getInitials (Flutter parity)", () => {
  it("uses first letters of the first two words", () => {
    expect(getInitials("John Doe")).toBe("JD")
    expect(getInitials("ahmad raza")).toBe("AR")
  })

  it("single word or short names fall back to two letters", () => {
    expect(getInitials("Ahmad")).toBe("AH")
    expect(getInitials("A")).toBe("A")
  })

  it("empty guard", () => {
    expect(getInitials("")).toBe("??")
    expect(getInitials(null)).toBe("??")
    expect(getInitials("   ")).toBe("??")
  })
})

describe("formatLastActivity (Flutter parity)", () => {
  const now = new Date("2026-10-18T12:00:00Z")

  it("recent activity strings", () => {
    expect(formatLastActivity(new Date(now.getTime() - 10_000), now)).toBe("Active just now")
    expect(formatLastActivity(new Date(now.getTime() - 5 * MINUTE), now)).toBe("Active 5m ago")
    expect(formatLastActivity(new Date(now.getTime() - 3 * HOUR), now)).toBe("Active 3h ago")
    expect(formatLastActivity(new Date(now.getTime() - 2 * DAY), now)).toBe("Active 2d ago")
  })

  it("beyond a week switches to a date (day/month like the Flutter app)", () => {
    const old = new Date(now.getTime() - 10 * DAY)
    expect(formatLastActivity(old, now)).toBe(`Active on ${old.getDate()}/${old.getMonth() + 1}`)
  })

  it("missing/null lastLogin is treated as just now", () => {
    expect(formatLastActivity(null, now)).toBe("Active just now")
  })
})

describe("getPhase (Flutter thresholds)", () => {
  it("maps progress bands to phase text/tone", () => {
    expect(getPhase(0).text).toBe("Onboarding Phase")
    expect(getPhase(0.32).text).toBe("Onboarding Phase")
    expect(getPhase(0.34).text).toBe("Training Phase")
    expect(getPhase(0.65).text).toBe("Training Phase")
    expect(getPhase(0.67).text).toBe("Final Review")
    expect(getPhase(0.999).text).toBe("Final Review")
    expect(getPhase(1).text).toBe("Compliant")
  })

  it("highest (compliant) phase matches the emerald tone from Flutter", () => {
    expect(getPhase(1).tone).toBe("green")
    expect(getPhase(0.1).tone).toBe("orange")
  })
})

describe("applyDirectoryFilter / matchesDirectorySearch", () => {
  const list = [
    employee({ uid: "a", isActive: true }),
    employee({ uid: "b", isActive: false }),
    employee({ uid: "c", isActive: true, name: "Sara Khan", email: "sara@x.dev" }),
  ]

  it("default filter is active (parity)", () => {
    expect(DEFAULT_DIRECTORY_FILTER).toBe("active")
  })

  it("filters by activation state", () => {
    const active = applyDirectoryFilter(list, "active")
    expect(active.map((item) => item.uid)).toEqual(["a", "c"])
    const deactivated = applyDirectoryFilter(list, "deactivated")
    expect(deactivated.map((item) => item.uid)).toEqual(["b"])
    const all: DirectoryFilter = "all"
    expect(applyDirectoryFilter(list, all)).toHaveLength(3)
  })

  it("search matches name or email, case-insensitive", () => {
    expect(matchesDirectorySearch(list[2], "sara")).toBe(true)
    expect(matchesDirectorySearch(list[2], "SARA")).toBe(true)
    expect(matchesDirectorySearch(list[0], "x.dev")).toBe(false)
    expect(matchesDirectorySearch(list[2], "x.dev")).toBe(true)
    expect(matchesDirectorySearch(list[0], "  ")).toBe(true)
  })
})
