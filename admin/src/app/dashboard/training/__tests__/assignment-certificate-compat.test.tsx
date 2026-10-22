// @vitest-environment jsdom
/**
 * Certificate compatibility between a web assignment and the Flutter upload.
 *
 * Regression for the reviewed payload, which stored `certificateUrls: []` on
 * every NEW assignment. The Flutter upload path
 * (`TrainingDTO.updateCertificateToFirestore` in training_dto.dart) does a
 * partial update that writes ONLY the legacy `certificateUrl` field. Because
 * both readers give a present `certificateUrls` array precedence, that empty
 * array hid every uploaded certificate from the review panel.
 *
 * This test runs the complete production sequence:
 *   1. the REAL `assignTraining` transaction creates the employee document;
 *   2. the EXACT partial update of the Flutter certificate DTO is applied;
 *   3. the resulting document passes through the REAL stream mapper and the
 *      REAL compliance model;
 *   4. the review panel renders the uploaded certificate link.
 *
 * Existing documents are never migrated: an explicitly stored array (even an
 * empty one) remains authoritative, as covered by
 * directory/__tests__/training-certificates.test.tsx.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"

interface FakeState {
  docs: Map<string, Record<string, unknown>>
}

const state = vi.hoisted<FakeState>(() => ({ docs: new Map() }))

vi.mock("firebase/firestore", () => {
  function makeDoc(first: unknown, ...segments: string[]) {
    if (
      first !== null &&
      typeof first === "object" &&
      typeof (first as { path?: unknown }).path === "string" &&
      segments.length === 0
    ) {
      const id = "cpr"
      return { id, path: `${(first as { path: string }).path}/${id}` }
    }
    const path = segments.join("/")
    return { id: path.split("/").pop(), path }
  }

  function snapshotFor(path: string) {
    const data = state.docs.get(path)
    return {
      id: path.split("/").pop(),
      exists: () => data !== undefined,
      data: () => (data === undefined ? undefined : { ...data }),
    }
  }

  return {
    collection: (_db: unknown, name: string) => ({ path: name }),
    doc: makeDoc,
    serverTimestamp: () => "SERVER_TS",
    Timestamp: {
      fromDate: (date: Date) => ({ __timestamp: date.toISOString() }),
    },
    setDoc: async (ref: { path: string }, data: Record<string, unknown>) => {
      state.docs.set(ref.path, { ...data })
    },
    runTransaction: async (
      _db: unknown,
      updateFunction: (transaction: unknown) => Promise<unknown>,
    ) =>
      updateFunction({
        get: async (ref: { path: string }) => snapshotFor(ref.path),
        set: (ref: { path: string }, data: Record<string, unknown>) => {
          state.docs.set(ref.path, { ...data })
        },
      }),
  }
})

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseFirestore: () => ({}),
  getFirebaseFunctions: () => ({}),
}))

vi.mock("@/lib/admin/task-actions", () => ({
  acceptTask: vi.fn().mockResolvedValue(undefined),
  rejectTask: vi.fn().mockResolvedValue(undefined),
  skipTask: vi.fn().mockResolvedValue(undefined),
  updateBlankFormLink: vi.fn().mockResolvedValue(undefined),
}))

import { TaskDetailPanel } from "@/app/dashboard/directory/[employeeId]/task-manager"
import { buildComplianceModel } from "@/lib/admin/compliance-helpers"
import { mapTrainingDoc } from "@/lib/admin/employee-detail-streams"
import { assignTraining } from "@/lib/admin/training-actions"

const ADMIN = "adm-1"
const EMPLOYEE = "emp-1"
const TEMPLATE_ID = "cpr"
const CERTIFICATE_URL =
  "https://firebasestorage.googleapis.com/v0/b/bhmh-fd67c/o/cpr.pdf?alt=media"

function trainingPath(): string {
  return `users/${EMPLOYEE}/trainings/${TEMPLATE_ID}`
}

beforeEach(() => {
  state.docs.clear()
  state.docs.set(`training_templates/${TEMPLATE_ID}`, {
    title: "CPR",
    description: "Cardiopulmonary resuscitation",
    durationText: "45 mins",
    requirementType: "certificate",
    isActive: true,
  })
  state.docs.set(`users/${EMPLOYEE}`, {
    name: "Sara Khan",
    role: "employee",
    adminId: ADMIN,
    isActive: true,
  })
})

afterEach(() => {
  cleanup()
})

describe("web assignment → Flutter upload → review panel", () => {
  it("renders the certificate uploaded through the legacy field", async () => {
    const result = await assignTraining({
      adminUid: ADMIN,
      templateId: TEMPLATE_ID,
      employeeIds: [EMPLOYEE],
      deadline: null,
      instructions: "",
    })
    expect(result.assigned).toBe(1)

    const assigned = state.docs.get(trainingPath())!
    // No array was stored, so the legacy fallback stays available.
    expect("certificateUrls" in assigned).toBe(false)

    // Exact output of TrainingDTO.updateCertificateToFirestore with
    // status: TrainingStatus.underReview and both optional dates null:
    // certificateUrl, status, updatedAt, completedAt, noExpiration — and
    // nothing else. It is an UPDATE, so every assignment field remains.
    const flutterCertificateUpdate = {
      certificateUrl: CERTIFICATE_URL,
      status: "underReview",
      updatedAt: "SERVER_TS",
      completedAt: "SERVER_TS",
      noExpiration: false,
    }
    const afterUpload = { ...assigned, ...flutterCertificateUpdate }

    // The REAL mapper must recover the upload through the legacy fallback.
    const doc = mapTrainingDoc(TEMPLATE_ID, afterUpload)
    expect(doc.certificateUrl).toBe(CERTIFICATE_URL)
    expect(doc.certificateUrls).toEqual([CERTIFICATE_URL])
    expect(doc.status).toBe("underReview")

    // The REAL compliance model feeds that attachment to the review panel.
    const { allTasks } = buildComplianceModel({
      tasks: { kind: "ready", items: [] },
      trainings: { kind: "ready", items: [doc] },
      clearances: { kind: "ready", items: [] },
    })
    const task = allTasks.find(
      (row) => row.taskSource === "training" && row.id === TEMPLATE_ID,
    )!
    expect(task.fileUrls).toEqual([CERTIFICATE_URL])

    render(
      <TaskDetailPanel
        task={task}
        employeeId={EMPLOYEE}
        employeeName="Sara Khan"
        adminUid={ADMIN}
        employeeAdminId={ADMIN}
        employeeActive
        taskDoc={null}
        actionsEnabled
      />,
    )

    expect(screen.getAllByTestId("task-file-preview")).toHaveLength(1)
    expect(screen.getByTestId("task-file-open").getAttribute("href")).toBe(
      CERTIFICATE_URL,
    )
    expect(screen.getByTestId("task-file-download").getAttribute("href")).toBe(
      CERTIFICATE_URL,
    )
    expect(screen.queryByText("No submission data yet.")).toBeNull()
  })
})
