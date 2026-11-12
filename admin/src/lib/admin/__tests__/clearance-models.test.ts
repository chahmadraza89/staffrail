/**
 * Clearance (Verify) derivations — the pure math behind the Flutter
 * `AdminClearanceDomain` port.
 *
 * The tests pin the semantics the screen depends on: `expired` counts as
 * action required, recent approvals are unique employees, ordering is
 * newest-update-first with missing dates last, and only `underReview` rows
 * enter the review queue.
 */
import { describe, expect, it } from "vitest"

import {
  buildClearanceActions,
  buildClearanceHistory,
  buildRecentApprovals,
  clearanceStatusLabel,
  deriveClearanceStats,
  formatClearanceDateTime,
  formatClearanceHistoryDate,
  formatTimeAgo,
  initialsOf,
  sortClearances,
  type ClearanceRecord,
} from "@/lib/admin/clearance-models"

const NOW = new Date("2026-10-23T12:00:00.000Z")
const HOUR = 60 * 60 * 1000

function record(overrides: Partial<ClearanceRecord> = {}): ClearanceRecord {
  return {
    id: "clearance-1",
    employeeId: "emp-1",
    employeeName: "Sara Khan",
    adminId: "adm-1",
    title: "Background Check",
    description: "Criminal background verification",
    status: "underReview",
    fileUrl: "https://example.test/check.pdf",
    rejectionReason: null,
    dueDate: null,
    submittedAt: new Date("2026-10-20T09:00:00.000Z"),
    verifiedAt: null,
    updatedAt: new Date(NOW.getTime() - 2 * HOUR),
    revision: "revision-1",
    ...overrides,
  }
}

describe("clearance status labels", () => {
  it("labels every raw status", () => {
    expect(clearanceStatusLabel("pending")).toBe("Pending")
    expect(clearanceStatusLabel("underReview")).toBe("Under Review")
    expect(clearanceStatusLabel("verified")).toBe("Verified")
    expect(clearanceStatusLabel("expired")).toBe("Expired")
    expect(clearanceStatusLabel("actionRequired")).toBe("Action Required")
  })
})

describe("deriveClearanceStats", () => {
  it("counts pending review, verified and action-required (including expired)", () => {
    const stats = deriveClearanceStats([
      record({ id: "a", status: "underReview" }),
      record({ id: "b", status: "underReview" }),
      record({ id: "c", status: "verified" }),
      record({ id: "d", status: "actionRequired" }),
      record({ id: "e", status: "expired" }),
      record({ id: "f", status: "pending" }),
    ])

    expect(stats).toEqual({
      pendingReview: 2,
      verified: 1,
      actionRequired: 2,
      total: 6,
    })
  })

  it("returns zeroed counters for an empty list", () => {
    expect(deriveClearanceStats([])).toEqual({
      pendingReview: 0,
      verified: 0,
      actionRequired: 0,
      total: 0,
    })
  })
})

describe("buildClearanceActions", () => {
  it("keeps only under-review records, newest first", () => {
    const actions = buildClearanceActions(
      [
        record({ id: "older", updatedAt: new Date(NOW.getTime() - 3 * HOUR) }),
        record({ id: "verified", status: "verified" }),
        record({
          id: "newer",
          employeeName: null,
          updatedAt: new Date(NOW.getTime() - 30 * 60 * 1000),
        }),
      ],
      NOW,
    )

    expect(actions.map((item) => item.id)).toEqual(["newer", "older"])
    expect(actions[0]).toMatchObject({
      employeeId: "emp-1",
      employeeName: null,
      subtitle: "Submitted by Unknown",
      timeAgo: "30m ago",
    })
    expect(actions[1].timeAgo).toBe("3h ago")
  })

  it("falls back to \"Recently\" when the update timestamp is missing", () => {
    const [action] = buildClearanceActions([record({ updatedAt: null })], NOW)
    expect(action.timeAgo).toBe("Recently")
  })
})

describe("buildRecentApprovals", () => {
  it("shows three unique employees and counts the remainder", () => {
    const recent = buildRecentApprovals([
      record({
        id: "1",
        employeeId: "emp-1",
        employeeName: "Sara Khan",
        status: "verified",
        verifiedAt: new Date("2026-10-23T10:00:00.000Z"),
      }),
      record({
        id: "2",
        employeeId: "emp-1",
        employeeName: "Sara Khan",
        status: "verified",
        verifiedAt: new Date("2026-10-23T11:00:00.000Z"),
      }),
      record({
        id: "3",
        employeeId: "emp-2",
        employeeName: "Omar Ali",
        status: "verified",
        verifiedAt: new Date("2026-10-23T09:00:00.000Z"),
      }),
      record({
        id: "4",
        employeeId: "emp-3",
        employeeName: "Lina Noor",
        status: "verified",
        verifiedAt: new Date("2026-10-23T08:00:00.000Z"),
      }),
      record({
        id: "5",
        employeeId: "emp-4",
        employeeName: "Hadi Rami",
        status: "verified",
        verifiedAt: new Date("2026-10-23T07:00:00.000Z"),
      }),
      record({
        id: "6",
        employeeId: "emp-5",
        employeeName: "Unverified",
        status: "underReview",
      }),
    ])

    expect(recent.approvals.map((item) => item.employeeId)).toEqual([
      "emp-1",
      "emp-2",
      "emp-3",
    ])
    expect(recent.approvals[0]).toMatchObject({ initials: "SK", tone: "blue" })
    expect(recent.additionalCount).toBe(1)
  })

  it("ignores verified records without a timestamp or employee id", () => {
    const recent = buildRecentApprovals([
      record({ status: "verified", verifiedAt: null }),
      record({ status: "verified", verifiedAt: NOW, employeeId: null }),
    ])
    expect(recent).toEqual({ approvals: [], additionalCount: 0 })
  })
})

describe("sortClearances", () => {
  it("orders by updatedAt descending and missing dates last", () => {
    const sorted = sortClearances([
      record({ id: "missing", updatedAt: null }),
      record({ id: "old", updatedAt: new Date(NOW.getTime() - HOUR) }),
      record({ id: "new", updatedAt: NOW }),
    ])
    expect(sorted.map((item) => item.id)).toEqual(["new", "old", "missing"])
  })
})

describe("date and name formatting", () => {
  it("formats the detail and history timestamps like the Flutter DateFormats", () => {
    const date = new Date(2026, 9, 23, 9, 5)
    expect(formatClearanceDateTime(date)).toBe("Oct 23, 2026 at 09:05 AM")
    expect(formatClearanceHistoryDate(date)).toBe("Oct 23, 09:05 AM")
    expect(formatClearanceDateTime(null)).toBe("N/A")
    expect(formatClearanceHistoryDate(null)).toBe("Recently")
  })

  it("formats relative times", () => {
    expect(formatTimeAgo(new Date(NOW.getTime() - 2 * 24 * HOUR), NOW)).toBe("2d ago")
    expect(formatTimeAgo(new Date(NOW.getTime() - 5 * HOUR), NOW)).toBe("5h ago")
    expect(formatTimeAgo(new Date(NOW.getTime() - 5 * 60 * 1000), NOW)).toBe("5m ago")
    expect(formatTimeAgo(new Date(NOW.getTime() + HOUR), NOW)).toBe("Just now")
  })

  it("derives initials with a safe fallback", () => {
    expect(initialsOf("Sara Khan")).toBe("SK")
    expect(initialsOf("Sara")).toBe("S")
    expect(initialsOf("  ")).toBe("??")
    expect(initialsOf(null)).toBe("??")
  })
})

describe("buildClearanceHistory", () => {
  it("walks upload → verification", () => {
    const events = buildClearanceHistory(
      record({
        status: "verified",
        verifiedAt: new Date("2026-10-21T09:00:00.000Z"),
      }),
    )

    expect(events.map((event) => event.title)).toEqual([
      "Document Uploaded",
      "Clearance Verified",
    ])
    expect(events[1]).toMatchObject({ author: "Admin", tone: "blue", isLast: true })
  })

  it("shows rejection for actionRequired and pending review for underReview", () => {
    expect(
      buildClearanceHistory(
        record({ status: "actionRequired", updatedAt: NOW }),
      ).map((event) => event.title),
    ).toEqual(["Document Uploaded", "Clearance Rejected"])

    const pending = buildClearanceHistory(record({ status: "underReview" }))
    expect(pending[pending.length - 1]).toMatchObject({
      title: "Pending Review",
      timestamp: "Awaiting signature",
      tone: "amber",
    })
  })
})
