import { describe, expect, it } from "vitest"

import {
  canAcceptTask,
  canRejectTask,
  fileNameFromUrl,
  formatFormLabel,
  formatFormValue,
  formatIsoDate,
  formatLongDate,
  formatShortDate,
  formatSignature,
  formatTimelineDate,
  isDownloadAvailable,
  isImageUrl,
  isSubmittedStatus,
  isVerifiedStatus,
  statusTone,
} from "@/lib/admin/task-format"

describe("task-format — Dart formatting parity", () => {
  it("timeline dates use short months without padding (ActivityTimeline)", () => {
    expect(formatTimelineDate(new Date(2026, 9, 5))).toBe("Oct 5")
    expect(formatTimelineDate(null)).toBe("Pending")
    expect(formatTimelineDate(new Date(Number.NaN))).toBe("Pending")
  })

  it("document dates use the two Dart patterns plus vehicle yyyy-mm-dd", () => {
    const date = new Date(2026, 0, 5)
    expect(formatLongDate(date)).toBe("January 05, 2026")
    expect(formatShortDate(date)).toBe("01/05/2026")
    expect(formatIsoDate(new Date(2026, 10, 9))).toBe("2026-11-09")
    expect(formatLongDate(null)).toBe("N/A")
  })

  it("form labels insert a space before each capital and uppercase", () => {
    expect(formatFormLabel("fullName")).toBe("FULL NAME")
    expect(formatFormLabel("ssnLast4")).toBe("SSN LAST4")
    expect(formatFormLabel("emergencyContact1Name")).toBe("EMERGENCY CONTACT1 NAME")
    expect(formatFormLabel("tax_documents_i_9")).toBe("TAX DOCUMENTS I 9")
  })

  it("form values render primitives identically and structured values readably", () => {
    expect(formatFormValue("x")).toBe("x")
    expect(formatFormValue(4)).toBe("4")
    expect(formatFormValue(false)).toBe("false")
    expect(formatFormValue(null)).toBe("")
    expect(formatFormValue([{ text: "Yes", checked: true }])).toBe(
      '[{"text":"Yes","checked":true}]',
    )
  })

  it("cleans Firebase Storage filenames and strips timestamp prefixes", () => {
    expect(
      fileNameFromUrl(
        "https://firebasestorage.googleapis.com/v0/b/x/o/users%2Fabc%2F1779348558389_i-9.pdf?alt=media",
      ),
    ).toBe("i-9.pdf")
    expect(fileNameFromUrl("https://cdn.example/assets/photo.png?token=1")).toBe("photo.png")
    expect(fileNameFromUrl("https://cdn.example/a%20b.pdf")).toBe("a b.pdf")
    expect(fileNameFromUrl("")).toBe("")
  })

  it("detects image URLs exactly like the panel preview", () => {
    expect(isImageUrl("https://x/y.JPG?alt=media")).toBe(true)
    expect(isImageUrl("https://x/y.pdf")).toBe(false)
    expect(isImageUrl("https://x/y.webp")).toBe(true)
  })

  it("renders typed vs captured signatures", () => {
    expect(formatSignature("typed:John Doe")).toEqual({ isTyped: true, text: "John Doe" })
    expect(formatSignature("https://storage/sign.png")).toEqual({
      isTyped: false,
      text: "Digital Signature captured",
    })
    expect(formatSignature(null)).toEqual({ isTyped: false, text: "" })
  })

  it("mirrors the TaskDetailPanel status predicates", () => {
    expect(isSubmittedStatus("submitted")).toBe(true)
    expect(isSubmittedStatus("rejected")).toBe(false)
    expect(isSubmittedStatus("noActionRequired")).toBe(true)
    expect(isVerifiedStatus("verified")).toBe(true)
    expect(isVerifiedStatus("completed")).toBe(true)
    expect(isVerifiedStatus("cleared")).toBe(false)

    for (const status of [
      "submitted",
      "signed",
      "pendingEmployerSignature",
      "waitingForApprover",
      "rejected",
    ] as const) {
      expect(canAcceptTask(status)).toBe(true)
      expect(canRejectTask(status)).toBe(true)
    }
    expect(canAcceptTask("pending")).toBe(false)
    expect(canRejectTask("completed")).toBe(true)
    expect(canRejectTask("pending")).toBe(false)
  })

  it("download availability follows uploads vs submitted forms", () => {
    expect(
      isDownloadAvailable({ actionType: "upload", fileUrl: "https://f", status: "notStarted" }),
    ).toBe(true)
    expect(isDownloadAvailable({ actionType: "upload", fileUrl: null, status: "submitted" })).toBe(
      false,
    )
    expect(
      isDownloadAvailable({ actionType: "acknowledgeSign", fileUrl: null, status: "submitted" }),
    ).toBe(true)
    expect(
      isDownloadAvailable({ actionType: "acknowledgeSign", fileUrl: null, status: "notStarted" }),
    ).toBe(false)
  })

  it("status tones follow AdminDirectoryHelpers.getStatusColor", () => {
    expect(statusTone("verified")).toBe("green")
    expect(statusTone("completed")).toBe("green")
    expect(statusTone("cleared")).toBe("green")
    expect(statusTone("submitted")).toBe("blue")
    expect(statusTone("pendingEmployerSignature")).toBe("blue")
    expect(statusTone("pending")).toBe("orange")
    expect(statusTone("rejected")).toBe("red")
    expect(statusTone("expired")).toBe("red")
    expect(statusTone("notStarted")).toBe("slate")
  })
})
