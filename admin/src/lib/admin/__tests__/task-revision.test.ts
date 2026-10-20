import { describe, expect, it } from "vitest"

import { submissionRevision } from "@/lib/admin/task-revision"

describe("submissionRevision", () => {
  it("is independent of Firestore map field order", () => {
    expect(
      submissionRevision({ status: "submitted", fileUrl: "https://x", formData: { a: 1, b: 2 } }),
    ).toBe(
      submissionRevision({ formData: { b: 2, a: 1 }, fileUrl: "https://x", status: "submitted" }),
    )
  })

  it("preserves array order and detects replacement attachments", () => {
    const first = submissionRevision({ certificateUrls: ["a", "b"] })
    const reordered = submissionRevision({ certificateUrls: ["b", "a"] })
    const replaced = submissionRevision({ certificateUrls: ["a", "c"] })
    expect(first).not.toBe(reordered)
    expect(first).not.toBe(replaced)
  })

  it("normalises Firestore Timestamp shapes", () => {
    const millis = 1_700_000_000_123
    const fromParts = submissionRevision({
      updatedAt: { seconds: 1_700_000_000, nanoseconds: 123_000_000 },
    })
    const fromToDate = submissionRevision({
      updatedAt: { toDate: () => new Date(millis) },
    })
    expect(fromParts).toBe(fromToDate)
    expect(submissionRevision({ updatedAt: new Date(millis) })).toBe(fromParts)
    // Sub-millisecond precision still distinguishes values.
    expect(
      submissionRevision({ updatedAt: { seconds: 1_700_000_000, nanoseconds: 123_000_001 } }),
    ).not.toBe(fromParts)
  })

  it("distinguishes null/missing documents from real payloads", () => {
    expect(submissionRevision(null)).toBe("")
    expect(submissionRevision(undefined)).toBe("")
    expect(submissionRevision({})).not.toBe("")
  })
})
