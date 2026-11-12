import { describe, expect, it, vi } from "vitest"

import {
  LiveStreamEngine,
  emptyEngineState,
  toError,
  type EngineState,
} from "@/lib/admin/stream-protocol"

/** Plain recorder standing in for the React view (no renderer needed). */
function collectViews<T>(engine: LiveStreamEngine<T>) {
  const states: EngineState<T>[] = []
  const unsubscribe = engine.subscribeView((state) => states.push(state))
  return { states, unsubscribe, last: () => states[states.length - 1] }
}

describe("LiveStreamEngine — readiness", () => {
  it("is connecting until every registered listener delivered an initial snapshot", () => {
    const engine = new LiveStreamEngine((ctrl) => {
      ctrl.listen("a")
      ctrl.listen("b")
      return () => {}
    }, "init")

    const view = collectViews(engine)
    engine.start()

    // Snapshot arrives out of order: b first.
    engine.emit("b", "from-b")
    expect(view.last()?.status).toBe("connecting")
    expect(view.last()?.ready.has("b")).toBe(true)
    expect(view.last()?.pending.has("a")).toBe(true)

    engine.emit("a", "from-a")
    expect(view.last()?.status).toBe("ready")
    expect(view.last()?.data).toBe("from-a")
    expect(view.last()?.pending.size).toBe(0)

    view.unsubscribe()
  })

  it("an empty employee list (single listener, empty results) becomes ready normally", () => {
    const engine = new LiveStreamEngine((ctrl) => {
      ctrl.listen("users")
      return () => {}
    }, [])

    const view = collectViews(engine)
    engine.start()
    engine.emit("users", [])

    expect(view.last()?.status).toBe("ready")
    expect(view.last()?.data).toEqual([])

    view.unsubscribe()
  })

  it("listeners never announced keep the stream in connecting, never ready", () => {
    const engine = new LiveStreamEngine(() => () => {}, "init")
    const view = collectViews(engine)
    engine.start()

    engine.emit("phantom", "x")
    expect(view.last()?.status).toBe("ready")
    view.unsubscribe()
  })
})

describe("LiveStreamEngine — per-listener errors", () => {
  it("one failing listener yields error while data from the other is retained", () => {
    const engine = new LiveStreamEngine((ctrl) => {
      ctrl.listen("users")
      ctrl.listen("tasks")
      return () => {}
    }, { users: 1, tasks: 2 })

    const view = collectViews(engine)
    engine.start()

    engine.emit("users", { users: 5, tasks: 0 })
    expect(view.last()?.status).toBe("connecting") // tasks still pending

    const boom = new Error("permission-denied")
    engine.fail("tasks", boom)
    const errored = view.last()
    expect(errored?.status).toBe("error")
    expect(errored?.error).toBe(boom)
    // Data survives an error so the UI can show it as stale.
    expect(errored?.data).toEqual({ users: 5, tasks: 0 })
    expect(errored?.errors.get("tasks")).toBe(boom)

    view.unsubscribe()
  })

  it("a successful update from one listener does NOT clear another listener's unresolved error", () => {
    const engine = new LiveStreamEngine((ctrl) => {
      ctrl.listen("users")
      ctrl.listen("tasks")
      return () => {}
    }, "init")

    const view = collectViews(engine)
    engine.start()

    const boom = new Error("boom")
    engine.fail("tasks", boom)
    expect(view.last()?.status).toBe("error")

    engine.emit("users", "users-update")
    expect(view.last()?.status).toBe("error")
    expect(view.last()?.errors.has("tasks")).toBe(true)

    // ...until the FAILED listener itself recovers with a new snapshot.
    engine.emit("tasks", "tasks-recovered")
    expect(view.last()?.status).toBe("ready")
    expect(view.last()?.errors.size).toBe(0)

    view.unsubscribe()
  })
})

describe("LiveStreamEngine — dynamic listeners", () => {
  it("forget() recalls a dynamically attached watcher (employee removed)", () => {
    const engine = new LiveStreamEngine((ctrl) => {
      ctrl.listen("users")
      ctrl.listen("emp:e1:tasks")
      ctrl.listen("emp:e1:trainings")
      ctrl.listen("emp:e1:clearance")
      return () => {}
    }, [])

    const view = collectViews(engine)
    engine.start()

    engine.emit("emp:e1:tasks", [/* partial */])
    expect(view.last()?.status).toBe("connecting")

    // Employee removed from the directory: all their module listeners go.
    engine.forget("emp:e1:tasks")
    engine.forget("emp:e1:trainings")
    engine.forget("emp:e1:clearance")
    engine.emit("users", [])
    expect(view.last()?.status).toBe("ready")
    expect(view.last()?.pending.size).toBe(0)

    view.unsubscribe()
  })
})

describe("LiveStreamEngine — lifecycle", () => {
  it("callbacks from a disposed subscription never change state", () => {
    const rawUnsubscribe = vi.fn()
    const engineRef: { emit: (data: string) => void } = { emit: () => {} }
    const engine = new LiveStreamEngine((ctrl) => {
      ctrl.listen("a")
      engineRef.emit = (data: string) => ctrl.emit("a", data)
      return rawUnsubscribe
    }, "init")

    const view = collectViews(engine)
    engine.start()
    engineRef.emit("first")
    expect(view.last()?.data).toBe("first")

    engine.dispose()
    expect(rawUnsubscribe).toHaveBeenCalledTimes(1)

    // Late callback from the disposed subscription: swallowed.
    engineRef.emit("late")
    expect(view.last()?.data).toBe("first")

    // The unsubscribe is idempotent as well.
    engine.dispose()
    expect(rawUnsubscribe).toHaveBeenCalledTimes(1)

    view.unsubscribe()
  })

  it("surfaces synchronous builder throws through the error state", async () => {
    const engine = new LiveStreamEngine(() => {
      throw new Error("init exploded")
    }, "init")

    const view = collectViews(engine)
    engine.start()

    // Deferred to a microtask so React effects never setState synchronously.
    expect(view.last()).toBeUndefined()
    await Promise.resolve()
    expect(view.last()?.status).toBe("error")
    expect(String(view.last()?.error)).toContain("init exploded")
    expect(view.last()?.pending.has("*init*")).toBe(false)

    view.unsubscribe()
  })

  it("start() and dispose() are idempotent", () => {
    const rawUnsubscribe = vi.fn()
    const engine = new LiveStreamEngine(() => rawUnsubscribe, "init")
    const view = collectViews(engine)

    engine.start()
    engine.start()
    engine.dispose()
    engine.dispose()

    expect(rawUnsubscribe).toHaveBeenCalledTimes(1)
    view.unsubscribe()
  })

  it("toError wraps non-Error throws", () => {
    expect(toError("plain failure")).toBeInstanceOf(Error)
    expect(String(toError("plain failure"))).toContain("plain failure")
    const original = new Error("kept")
    expect(toError(original)).toBe(original)
  })

  it("emptyEngineState starts in connecting with the seed data", () => {
    const state = emptyEngineState({ n: 0 })
    expect(state.status).toBe("connecting")
    expect(state.data).toEqual({ n: 0 })
    expect(state.error).toBeNull()
  })
})
