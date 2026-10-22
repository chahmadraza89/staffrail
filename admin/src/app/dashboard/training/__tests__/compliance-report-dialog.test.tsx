// @vitest-environment jsdom
/**
 * Compliance report read-state semantics.
 *
 * A failed template read is not an empty template list. The dialog may claim
 * "No training modules found." only after a successful, ready, empty read;
 * failures show the error + Retry, and retained (previously loaded) results —
 * including a retained-empty list — are explicitly marked stale.
 */
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"

import { ComplianceReportDialog } from "@/app/dashboard/training/compliance-report-dialog"
import { buildTrainingCompliance } from "@/lib/admin/training-streams"
import type {
  AdminTrainingTemplate,
  TrainingAssignment,
} from "@/lib/admin/training-models"
import type { LiveQueryResult } from "@/lib/react/use-live-query"

const TEMPLATE: AdminTrainingTemplate = {
  id: "cpr",
  title: "CPR",
  description: "Cardiopulmonary resuscitation",
  durationText: "45 mins",
  requirementType: "certificate",
  isActive: true,
  createdAt: new Date("2026-06-01T00:00:00.000Z"),
  updatedAt: null,
}

const ASSIGNMENT: TrainingAssignment = {
  id: "cpr",
  employeeId: null,
  adminId: "adm-1",
  title: "CPR",
  description: "",
  durationText: "",
  status: "completed",
  dueDate: null,
  updatedAt: null,
  assignedAt: null,
}

function ready<T>(data: T, listener: string): LiveQueryResult<T> {
  return {
    data,
    status: "ready",
    error: null,
    pending: new Set(),
    ready: new Set([listener]),
    errors: new Map(),
    retry: vi.fn(),
  }
}

function connecting<T>(data: T): LiveQueryResult<T> {
  return {
    data,
    status: "connecting",
    error: null,
    pending: new Set(["templates"]),
    ready: new Set(),
    errors: new Map(),
    retry: vi.fn(),
  }
}

function failed<T>(
  data: T,
  listener: string,
  everLoaded: boolean,
): LiveQueryResult<T> {
  const error = Object.assign(new Error("stream boom"), { code: "unavailable" })
  return {
    data,
    status: "error",
    error,
    pending: new Set(),
    ready: everLoaded ? new Set([listener]) : new Set(),
    errors: new Map([[listener, error]]),
    retry: vi.fn(),
  }
}

function dialog({
  templates,
  assignments = ready<TrainingAssignment[]>([], "assignments"),
  onOpenChange = vi.fn(),
}: {
  templates: LiveQueryResult<AdminTrainingTemplate[]>
  assignments?: LiveQueryResult<TrainingAssignment[]>
  onOpenChange?: () => void
}) {
  return (
    <ComplianceReportDialog
      open
      templates={templates}
      assignments={assignments}
      compliance={buildTrainingCompliance(assignments.data)}
      onOpenChange={onOpenChange}
    />
  )
}

afterEach(() => {
  cleanup()
})

describe("ComplianceReportDialog — failed reads vs empty reads", () => {
  it("shows only the loading state while connecting", () => {
    render(dialog({ templates: connecting<AdminTrainingTemplate[]>([]) }))

    expect(
      screen.getByText("Loading training modules…", { selector: "p" }),
    ).toBeInTheDocument()
    expect(screen.queryByTestId("compliance-empty")).toBeNull()
    expect(screen.queryByTestId("compliance-templates-error")).toBeNull()
    expect(screen.queryByTestId("compliance-rows")).toBeNull()
  })

  it("claims an empty list only after a successful, ready, empty read", () => {
    render(dialog({ templates: ready<AdminTrainingTemplate[]>([], "templates") }))

    expect(screen.getByTestId("compliance-empty").textContent).toContain(
      "No training modules found.",
    )
    expect(screen.queryByTestId("compliance-empty-stale")).toBeNull()
    expect(screen.queryByTestId("compliance-templates-error")).toBeNull()
  })

  it("shows the error and a working Retry — never the empty message — before the first snapshot", () => {
    const templates = failed<AdminTrainingTemplate[]>([], "templates", false)
    render(dialog({ templates }))

    const error = screen.getByTestId("compliance-templates-error")
    expect(error.textContent).toContain("Training modules could not be streamed.")
    expect(error.textContent).toContain("unavailable")
    expect(screen.queryByTestId("compliance-empty")).toBeNull()
    expect(screen.queryByTestId("compliance-rows")).toBeNull()

    fireEvent.click(within(error).getByRole("button", { name: /retry/i }))
    expect(templates.retry).toHaveBeenCalledTimes(1)
  })

  it("keeps retained rows visible and marks them stale after a failure", () => {
    const templates = failed([TEMPLATE], "templates", true)
    const assignments = ready([ASSIGNMENT], "assignments")
    render(dialog({ templates, assignments }))

    const error = screen.getByTestId("compliance-templates-error")
    expect(error.textContent).toContain("the list below is stale")
    expect(screen.getByTestId("compliance-templates-stale")).toHaveTextContent(
      "Stale — showing the last successfully loaded modules.",
    )
    expect(screen.getAllByTestId("compliance-row")).toHaveLength(1)
    expect(screen.getByTestId("compliance-percent-cpr").textContent).toBe("100.0%")
    expect(screen.queryByTestId("compliance-empty")).toBeNull()
  })

  it("marks a retained-empty result as stale instead of a fresh empty read", () => {
    render(dialog({ templates: failed<AdminTrainingTemplate[]>([], "templates", true) }))

    expect(screen.getByTestId("compliance-empty").textContent).toContain(
      "No training modules found.",
    )
    expect(screen.getByTestId("compliance-empty-stale").textContent).toContain(
      "Stale — retained from the last successful read.",
    )
    expect(screen.getByTestId("compliance-templates-error")).toBeInTheDocument()
  })

  it("recovers after Retry: the error clears and the successful empty read is shown", () => {
    const retry = vi.fn()
    const failedTemplates: LiveQueryResult<AdminTrainingTemplate[]> = {
      ...failed<AdminTrainingTemplate[]>([], "templates", false),
      retry,
    }

    const { rerender } = render(dialog({ templates: failedTemplates }))
    expect(screen.getByTestId("compliance-templates-error")).toBeInTheDocument()
    expect(screen.queryByTestId("compliance-empty")).toBeNull()

    fireEvent.click(
      within(screen.getByTestId("compliance-templates-error")).getByRole("button", {
        name: /retry/i,
      }),
    )
    expect(retry).toHaveBeenCalledTimes(1)

    // What the real hook does next: teardown + a fresh connecting engine, then
    // the first successful (empty) snapshot.
    rerender(dialog({ templates: ready<AdminTrainingTemplate[]>([], "templates") }))

    expect(screen.queryByTestId("compliance-templates-error")).toBeNull()
    expect(screen.getByTestId("compliance-empty").textContent).toContain(
      "No training modules found.",
    )
    expect(screen.queryByTestId("compliance-empty-stale")).toBeNull()
  })
})
