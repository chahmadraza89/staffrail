/**
 * Employee-detail stream tests — the REAL `subscribeEmployeeDetail` against
 * an in-memory `firebase/firestore` fake. Covers the ownership-gated
 * subscription design: exactly one profile doc listener anchors the page,
 * the three document-module listeners attach ONLY after the gate passed
 * (doc.adminId === adminUid && role === "employee"), and any gate violation
 * (deletion, ownership/role change, profile failure) stops + resets the
 * module subscriptions with late callbacks generation-token-guarded.
 */
import { afterEach, describe, expect, it, vi } from "vitest"

import { LiveStreamEngine, type StreamBuilder } from "@/lib/admin/stream-protocol"
import {
  EMPTY_DETAIL,
  subscribeEmployeeDetail,
  mapClearanceDoc,
  mapTaskDoc,
  mapTrainingDoc,
  moduleForSource,
  parseEmployeeProfile,
  type EmployeeDetailSnapshot,
} from "@/lib/admin/employee-detail-streams"

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseFirestore: () => ({}),
}))

const fake = vi.hoisted(() => {
  type QuerySnapshot = { docs: Array<{ id: string; data: () => Record<string, unknown> }> }
  type DocSnapshot = { id: string; exists: () => boolean; data: () => Record<string, unknown> }
  type Ref = { kind: "doc" | "query"; path: string }
  type Listener = {
    onData: (snapshot: QuerySnapshot | DocSnapshot) => void
    onError: (error: Error) => void
    unsub: ReturnType<typeof vi.fn>
    kind: "doc" | "query"
  }
  const listeners = new Map<string, Listener>()

  function collection(_db: unknown, ...segments: string[]): Ref {
    return { kind: "query", path: segments.join("/") }
  }
  function doc(_db: unknown, ...segments: string[]): Ref {
    return { kind: "doc", path: segments.join("/") }
  }
  function onSnapshot(ref: Ref, onData: Listener["onData"], onError: Listener["onError"]): () => void {
    const listener: Listener = { onData, onError, unsub: vi.fn(), kind: ref.kind }
    listeners.set(ref.path, listener)
    listener.unsub.mockImplementation(() => {
      // Real unsubscribe detaches the listener (removes it from the store).
      if (listeners.get(ref.path) === listener) {
        listeners.delete(ref.path)
      }
    })
    return listener.unsub as unknown as () => void
  }

  return { listeners, collection, doc, onSnapshot }
})

vi.mock("firebase/firestore", () => fake)

type ProfileDoc =
  | { exists: true; data: Record<string, unknown> }
  | { exists: false }

function emitQuery(path: string, docs: Array<{ id: string; data: Record<string, unknown> }>): void {
  const listener = fake.listeners.get(path)
  if (!listener) {
    throw new Error(`no listener for ${path}`)
  }
  listener.onData({ docs: docs.map((entry) => ({ id: entry.id, data: () => entry.data })) })
}

function emitDoc(path: string, state: ProfileDoc): void {
  const listener = fake.listeners.get(path)
  if (!listener) {
    throw new Error(`no listener for ${path}`)
  }
  listener.onData({
    id: path.split("/").pop()!,
    exists: () => state.exists,
    data: () => (state.exists ? state.data : {}),
  })
}

function fail(path: string, error: Error): void {
  fake.listeners.get(path)!.onError(error)
}

const PROFILE_PATH = "users/e1"
const TASKS_PATH = "users/e1/onboarding_tasks"
const TRAININGS_PATH = "users/e1/trainings"
const CLEARANCE_PATH = "users/e1/clearance"

const ownedProfile = (overrides: Record<string, unknown> = {}): ProfileDoc => ({
  exists: true,
  data: {
    name: "Jane Doe",
    email: "jane@example.com",
    role: "employee",
    adminId: "adm-1",
    ...overrides,
  },
})

afterEach(() => {
  fake.listeners.clear()
  vi.restoreAllMocks()
})

describe("mapTaskDoc / mapTrainingDoc / mapClearanceDoc", () => {
  it("parses an onboarding task dto (dates, presence flags, fallbacks)", () => {
    const data = {
      title: "Resume",
      subtitle: null,
      status: "submitted",
      actionType: "upload",
      isCompleted: true,
      updatedAt: { seconds: 1700000000 },
      completedAt: { toDate: () => new Date(2026, 0, 5) },
      formData: { link: "x" },
      adminFormData: { supervisorName: "Dana" },
      adminSignatureUrl: "typed:Dana Admin",
      blankFormLink: "https://uscis.gov/i-9.pdf",
      signedAt: { toDate: () => new Date(2026, 0, 4) },
      fileUrl: "https://f",
      rejectionReason: "",
    }
    const mapped = mapTaskDoc("resume", data)
    expect(mapped).toMatchObject({
      id: "resume",
      title: "Resume",
      subtitle: null,
      status: "submitted",
      actionType: "upload",
      isCompleted: true,
      hasFormData: true,
      hasAdminFormData: true,
      fileUrl: "https://f",
      rejectionReason: null, // empty string → null
      formData: { link: "x" },
      adminFormData: { supervisorName: "Dana" },
      adminSignatureUrl: "typed:Dana Admin",
      blankFormLink: "https://uscis.gov/i-9.pdf",
    })
    expect(mapped.signedAt?.getTime()).toBe(new Date(2026, 0, 4).getTime())
    expect(mapped.updatedAt?.getTime()).toBe(1700000000 * 1000)
    expect(mapped.completedAt?.getTime()).toBe(new Date(2026, 0, 5).getTime())

    // Arrays are never treated as form maps (only plain objects are).
    const arrayForm = mapTaskDoc("arr", { formData: [1, 2] })
    expect(arrayForm.formData).toBeNull()
    expect(arrayForm.hasFormData).toBe(true)

    const empty = mapTaskDoc("blank", {})
    expect(empty).toMatchObject({
      title: "Untitled task",
      status: "notStarted",
      isCompleted: false,
    })
  })

  it("parses trainings/clearances with Dart enum fallbacks", () => {
    expect(mapTrainingDoc("start", { status: "verified" }).status).toBe("verified")
    expect(mapTrainingDoc("wip", { status: "bogus" }).status).toBe("notStarted")
    expect(mapClearanceDoc("tb", { status: "underReview" }).status).toBe("underReview")
    expect(mapClearanceDoc("wip", {}).status).toBe("pending")
    expect(mapTrainingDoc("x", { title: "", certificateUrl: " https://cert" }).certificateUrl).toBe(
      " https://cert",
    )
    expect(mapClearanceDoc("y", { fileUrl: "" }).fileUrl).toBeNull()
  })
})

describe("parseEmployeeProfile — Dashboard-mirroring field semantics", () => {
  it("applies the exact fallbacks of the Directory list parse", () => {
    const parsed = parseEmployeeProfile("e1", {
      name: "Jane",
      email: "jane@example.com",
      lastLogin: { toDate: () => new Date(2026, 0, 2) },
      createdAt: { toDate: () => new Date(2026, 0, 1) },
      isActive: false,
      setupStatus: "incomplete",
      adminId: "adm-1",
    })
    expect(parsed).toEqual({
      uid: "e1",
      name: "Jane",
      email: "jane@example.com",
      lastLogin: new Date(2026, 0, 2),
      isActive: false,
      setupStatus: "incomplete",
      adminId: "adm-1",
    })

    // fallbacks: missing name → "Employee", lastLogin → createdAt → now,
    // isActive default true, setupStatus only "incomplete" when the marker
    // says so, missing adminId → null (treated as not-owned by the gate).
    const fallback = parseEmployeeProfile("e2", {})
    expect(fallback.name).toBe("Employee")
    expect(fallback.email).toBeNull()
    expect(fallback.isActive).toBe(true)
    expect(fallback.setupStatus).toBe("complete")
    expect(fallback.adminId).toBeNull()
    expect(fallback.lastLogin.getTime()).toBeGreaterThan(0)

    expect(parseEmployeeProfile("e3", { setupStatus: "complete" }).setupStatus).toBe("complete")
    expect(parseEmployeeProfile("e3", { setupStatus: "bogus" }).setupStatus).toBe("complete")
  })
})

describe("moduleForSource", () => {
  it("maps each category task source onto its listener id", () => {
    expect(moduleForSource("onboarding")).toBe("onboardingTasks")
    expect(moduleForSource("training")).toBe("trainings")
    expect(moduleForSource("clearance")).toBe("clearance")
  })
})

describe("subscribeEmployeeDetail — ownership-gated subscription", () => {
  function start(): LiveStreamEngine<EmployeeDetailSnapshot> {
    const builder: StreamBuilder<EmployeeDetailSnapshot> = (ctrl) =>
      subscribeEmployeeDetail("e1", "adm-1", ctrl)
    const engine = new LiveStreamEngine<EmployeeDetailSnapshot>(builder, EMPTY_DETAIL)
    engine.start()
    return engine
  }

  it("attaches ONLY the profile listener until the ownership gate passes", () => {
    const engine = start()

    expect(fake.listeners.size).toBe(1)
    expect(fake.listeners.has(PROFILE_PATH)).toBe(true)
    expect(engine.snapshot().pending.has("profile")).toBe(true)
    expect(engine.snapshot().data.profile).toBeNull()
    engine.dispose()
  })

  it("gate passes → the three document modules attach and snapshots merge", () => {
    const engine = start()

    emitDoc(PROFILE_PATH, ownedProfile())

    // profile ready + all three modules registered (pending) — 4 listeners,
    // independent of any other employee/staff size.
    expect(fake.listeners.size).toBe(4)
    expect(engine.snapshot().ready.has("profile")).toBe(true)
    for (const id of ["onboardingTasks", "trainings", "clearance"]) {
      expect(engine.snapshot().pending.has(id)).toBe(true)
    }
    expect(engine.snapshot().data.profile).toEqual({
      state: "active",
      employee: expect.objectContaining({ uid: "e1", name: "Jane Doe", adminId: "adm-1" }),
    })

    emitQuery(TASKS_PATH, [{ id: "resume", data: { title: "Resume", status: "submitted" } }])
    emitQuery(TRAININGS_PATH, [])
    emitQuery(CLEARANCE_PATH, [])

    expect(engine.snapshot().status).toBe("ready")
    expect(engine.snapshot().data.tasks[0]?.id).toBe("resume")
    engine.dispose()
  })

  it("a missing profile doc → not-found stage, modules never attach", () => {
    const engine = start()

    emitDoc(PROFILE_PATH, { exists: false })

    expect(fake.listeners.size).toBe(1)
    expect(engine.snapshot().data.profile).toEqual({ state: "not-found" })
    expect(engine.snapshot().status).toBe("ready") // nothing pending anymore
    engine.dispose()
  })

  it("a foreign adminId, a missing adminId and non-employee roles are all rejected", () => {
    const engine = start()

    emitDoc(PROFILE_PATH, ownedProfile({ adminId: "admin-B" }))
    expect(engine.snapshot().data.profile).toEqual({ state: "not-owned" })
    expect(fake.listeners.size).toBe(1)

    emitDoc(PROFILE_PATH, { exists: true, data: { name: "NoOwner", role: "employee" } })
    expect(engine.snapshot().data.profile).toEqual({ state: "not-owned" })

    emitDoc(PROFILE_PATH, ownedProfile({ role: "admin" }))
    expect(engine.snapshot().data.profile).toEqual({ state: "not-owned" })
    engine.dispose()
  })

  it("an ownership flip mid-session stops + resets the module subscriptions (and back)", () => {
    const engine = start()

    emitDoc(PROFILE_PATH, ownedProfile())
    emitQuery(TASKS_PATH, [{ id: "resume", data: { title: "Resume" } }])
    expect(engine.snapshot().data.tasks).toHaveLength(1)
    expect(fake.listeners.size).toBe(4)

    // Ownership changes → gate violated.
    emitDoc(PROFILE_PATH, ownedProfile({ adminId: "admin-B" }))
    expect(fake.listeners.size).toBe(1) // profile remains, modules detached
    expect(engine.snapshot().data.profile).toEqual({ state: "not-owned" })
    // Reset semantics: the violating doc's module data must not leak.
    expect(engine.snapshot().data.tasks).toEqual([])

    // Ownership restored → modules re-attach fresh (empty retained cache).
    emitDoc(PROFILE_PATH, ownedProfile())
    expect(fake.listeners.size).toBe(4)
    expect(engine.snapshot().data.tasks).toEqual([])
    expect(engine.snapshot().pending.has("onboardingTasks")).toBe(true)
    engine.dispose()
  })

  it("deletion mid-session → not-found + stopped subscriptions; late module callbacks are ignored", () => {
    const engine = start()

    emitDoc(PROFILE_PATH, ownedProfile())
    emitQuery(TASKS_PATH, [{ id: "a", data: { title: "A" } }])
    const taskListener = fake.listeners.get(TASKS_PATH)!

    emitDoc(PROFILE_PATH, { exists: false })

    expect(taskListener.unsub).toHaveBeenCalled()
    expect(engine.snapshot().data.profile).toEqual({ state: "not-found" })
    expect(engine.snapshot().data.tasks).toEqual([])

    // A stale-generation module callback after the reset must not resurrect
    // data or throw — the raw listener is detached, but a racing in-flight
    // snapshot is only stopped by the generation token.
    expect(() => taskListener.onData({ docs: [{ id: "late", data: () => ({ title: "Late" }) }] })).not.toThrow()
    expect(engine.snapshot().data.tasks).toEqual([])
    engine.dispose()
  })

  it("one failed profile listener detaches the modules and keeps the last known stage", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const engine = start()

    emitDoc(PROFILE_PATH, ownedProfile())
    expect(fake.listeners.size).toBe(4)

    fail(PROFILE_PATH, new Error("permission denied"))

    expect(engine.snapshot().status).toBe("error")
    expect((engine.snapshot().errors as Map<string, Error>).get("profile")?.message).toBe(
      "permission denied",
    )
    // The last known stage is retained so the header can show stale data.
    expect(engine.snapshot().data.profile?.state).toBe("active")
    // But the module listeners were stopped — the gate can no longer be
    // asserted, so no document module keeps streaming.
    expect(fake.listeners.size).toBe(1)
    expect(engine.snapshot().data.tasks).toEqual([])
    void warn
    engine.dispose()
  })

  it("a failed module reports ITS error without clearing the others' data (retention)", () => {
    const engine = start()

    emitDoc(PROFILE_PATH, ownedProfile())
    emitQuery(TASKS_PATH, [{ id: "a", data: { title: "A" } }])
    emitQuery(TRAININGS_PATH, [{ id: "start", data: { title: "START", status: "completed" } }])
    fail(TRAININGS_PATH, new Error("index missing"))

    expect(engine.snapshot().status).toBe("error")
    expect((engine.snapshot().errors as Map<string, Error>).get("trainings")?.message).toBe(
      "index missing",
    )
    // The tasks snapshot survives (never hidden by another listener's error).
    expect(engine.snapshot().data.tasks[0]?.id).toBe("a")
    expect(engine.snapshot().ready.has("onboardingTasks")).toBe(true)
    // Failure-retention semantics: the failed listener stays `ready` once it
    // ever delivered, so the view can distinguish stale data from nothing.
    expect(engine.snapshot().ready.has("trainings")).toBe(true)
    engine.dispose()
  })

  it("a failed module that never delivered stays out of `ready` (never-loaded)", () => {
    const engine = start()

    emitDoc(PROFILE_PATH, ownedProfile())
    fail(TRAININGS_PATH, new Error("offline"))

    expect((engine.snapshot().errors as Map<string, Error>).has("trainings")).toBe(true)
    expect(engine.snapshot().ready.has("trainings")).toBe(false)
    engine.dispose()
  })

  it("a module failure recovers when the listener emits again", () => {
    const engine = start()

    emitDoc(PROFILE_PATH, ownedProfile())
    fail(TASKS_PATH, new Error("boom"))
    expect(engine.snapshot().errors.has("onboardingTasks")).toBe(true)

    emitQuery(TASKS_PATH, [{ id: "b", data: { title: "B" } }])
    emitQuery(TRAININGS_PATH, [])
    emitQuery(CLEARANCE_PATH, [])
    expect(engine.snapshot().status).toBe("ready")
    expect(engine.snapshot().data.tasks[0]?.id).toBe("b")
    engine.dispose()
  })

  it("dispose unsubscribes profile AND modules; late callbacks are ignored", () => {
    const warn = vi.spyOn(console, "error").mockImplementation(() => {})
    const engine = start()

    emitDoc(PROFILE_PATH, ownedProfile())
    expect(fake.listeners.size).toBe(4)
    const captured = [...fake.listeners.values()]
    engine.dispose()

    expect(captured).toHaveLength(4)
    for (const listener of captured) {
      expect(listener.unsub).toHaveBeenCalled()
    }

    // Late callbacks after disposal must not throw or resurrect data — the
    // raw listeners are detached, and the engine's stopped guard ignores
    // anything that still races through.
    expect(() => {
      for (const listener of captured) {
        if (listener.kind === "doc") {
          listener.onData({ id: "e1", exists: () => false, data: () => ({}) })
        } else {
          listener.onData({ docs: [] })
        }
      }
    }).not.toThrow()
    expect(engine.snapshot().data.tasks).toEqual([])
    expect(engine.snapshot().errors.size).toBe(0)
    void warn
  })
})
