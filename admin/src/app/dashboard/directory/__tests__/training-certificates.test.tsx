// @vitest-environment jsdom
/**
 * Training certificate attachments — through the REAL stream mapper, the
 * compliance builder and the review panel. Covers array-only, legacy-only,
 * duplicate, empty and malformed payloads (Dart DTO precedence preserved).
 */
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"

import { TaskDetailPanel } from "@/app/dashboard/directory/[employeeId]/task-manager"
import { buildComplianceModel } from "@/lib/admin/compliance-helpers"
import { mapTrainingDoc } from "@/lib/admin/employee-detail-streams"

vi.mock("@/lib/admin/task-actions", () => ({
  acceptTask: vi.fn().mockResolvedValue(undefined),
  rejectTask: vi.fn().mockResolvedValue(undefined),
  skipTask: vi.fn().mockResolvedValue(undefined),
  updateBlankFormLink: vi.fn().mockResolvedValue(undefined),
}))

function renderTraining(data: Record<string, unknown>) {
  const doc = mapTrainingDoc("start", data)
  const { allTasks } = buildComplianceModel({
    tasks: { kind: "ready", items: [] },
    trainings: { kind: "ready", items: [doc] },
    clearances: { kind: "ready", items: [] },
  })
  const task = allTasks.find(
    (row) => row.taskSource === "training" && row.id === "start",
  )!
  render(
    <TaskDetailPanel
      task={task}
      employeeId="emp-1"
      employeeName="Jane Doe"
      adminUid="adm-1"
      employeeAdminId="adm-1"
      employeeActive
      taskDoc={null}
      actionsEnabled
    />,
  )
  return { doc, task }
}

afterEach(() => {
  cleanup()
})

describe("training certificates — stream → compliance → panel", () => {
  it("renders every array attachment with open/download links and no empty state", () => {
    const { doc, task } = renderTraining({
      status: "underReview",
      certificateUrls: ["https://x/cert-a.pdf", "https://x/photo.PNG"],
    })

    expect(doc.certificateUrls).toEqual(["https://x/cert-a.pdf", "https://x/photo.PNG"])
    expect(task.fileUrls).toEqual(["https://x/cert-a.pdf", "https://x/photo.PNG"])
    expect(screen.getAllByTestId("task-file-preview")).toHaveLength(2)
    const opens = screen.getAllByTestId("task-file-open")
    const downloads = screen.getAllByTestId("task-file-download")
    expect(opens.map((link) => link.getAttribute("href"))).toEqual([
      "https://x/cert-a.pdf",
      "https://x/photo.PNG",
    ])
    expect(downloads.map((link) => link.getAttribute("href"))).toEqual([
      "https://x/cert-a.pdf",
      "https://x/photo.PNG",
    ])
    expect(screen.getByTestId("task-file-image").getAttribute("src")).toBe(
      "https://x/photo.PNG",
    )
    expect(screen.queryByText("No submission data yet.")).toBeNull()
    expect(screen.getByTestId("task-download").textContent).toContain(
      "Download First Attachment",
    )
  })

  it("falls back to the legacy certificateUrl when the array is absent", () => {
    const { doc, task } = renderTraining({
      status: "underReview",
      certificateUrl: "https://x/legacy.pdf",
    })
    expect(doc.certificateUrls).toEqual(["https://x/legacy.pdf"])
    expect(task.fileUrls).toEqual(["https://x/legacy.pdf"])
    expect(screen.getAllByTestId("task-file-preview")).toHaveLength(1)
    expect(screen.getByTestId("task-file-open").getAttribute("href")).toBe(
      "https://x/legacy.pdf",
    )
  })

  it("de-duplicates while preserving first-seen order", () => {
    const { doc } = renderTraining({
      status: "underReview",
      certificateUrls: ["https://x/b.pdf", "https://x/a.pdf", "https://x/b.pdf"],
    })
    expect(doc.certificateUrls).toEqual(["https://x/b.pdf", "https://x/a.pdf"])
    expect(screen.getAllByTestId("task-file-preview")).toHaveLength(2)
  })

  it("a present-but-empty array wins over the legacy field (Dart precedence)", () => {
    const { doc, task } = renderTraining({
      status: "underReview",
      certificateUrls: [],
      certificateUrl: "https://x/legacy.pdf",
    })
    expect(doc.certificateUrls).toEqual([])
    expect(task.fileUrls).toEqual([])
    expect(screen.queryAllByTestId("task-file-preview")).toHaveLength(0)
    expect(screen.getByText("No submission data yet.")).toBeTruthy()
  })

  it("drops malformed array entries without losing valid attachments", () => {
    const { doc } = renderTraining({
      status: "underReview",
      certificateUrls: [null, 42, "", "https://x/ok.pdf", { url: "no" }, "https://x/ok.pdf"],
    })
    expect(doc.certificateUrls).toEqual(["https://x/ok.pdf"])
    expect(screen.getAllByTestId("task-file-preview")).toHaveLength(1)
  })

  it("falls back to legacy when certificateUrls itself is malformed", () => {
    const { doc } = renderTraining({
      status: "underReview",
      certificateUrls: "not-an-array",
      certificateUrl: "https://x/legacy.pdf",
    })
    expect(doc.certificateUrls).toEqual(["https://x/legacy.pdf"])
    expect(screen.getAllByTestId("task-file-preview")).toHaveLength(1)
  })
})
