// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, renderHook } from "@testing-library/react"

import { useLiveQuery } from "@/lib/react/use-live-query"
import type {
  LiveStreamController,
  StreamBuilder,
  Unsubscribe,
} from "@/lib/admin/stream-protocol"

afterEach(() => {
  cleanup()
})

/** Emitted callbacks capture so tests can drive the streams manually. */
interface Harness<T> {
  emits: Array<(data: T) => void>
  fails: Array<(error: Error) => void>
  unsubscribed: ReturnType<typeof vi.fn>[]
  /** count of builder invocations (= subscription attempts) */
  builds: number
  builder: StreamBuilder<T>
}

function makeHarness<T>(listenerCount = 1): Harness<T> {
  const harness: Harness<T> = {
    emits: [],
    fails: [],
    unsubscribed: [],
    builds: 0,
    builder: () => () => {},
  }
  harness.builder = (ctrl: LiveStreamController<T>): Unsubscribe => {
    harness.builds++
    const unsub = vi.fn()
    harness.unsubscribed.push(unsub)
    for (let index = 0; index < listenerCount; index++) {
      const id = listenerCount === 1 ? "listener" : `listener-${index}`
      ctrl.listen(id)
      harness.emits.push((data: T) => ctrl.emit(id, data))
      harness.fails.push((error: Error) => ctrl.fail(id, error))
    }
    return unsub
  }
  return harness
}

function render<T>(harness: Harness<T>, initialData: T, key = "admin-1") {
  return renderHook(
    ({ key }: { key: string }) =>
      useLiveQuery<T>({ key, subscribe: harness.builder, initialData }),
    { initialProps: { key } },
  )
}

describe("useLiveQuery — lifecycle and readiness", () => {
  it("runs the subscription on mount (regression: TanStack-style initialData starvation)", () => {
    const harness = makeHarness<string>()
    const { result } = render(harness, "seed")

    expect(result.current.status).toBe("connecting")
    expect(result.current.data).toBe("seed")
    expect(harness.builds).toBe(1)

    act(() => harness.emits[0]("first snapshot"))
    expect(result.current.status).toBe("ready")
    expect(result.current.data).toBe("first snapshot")
  })

  it("multi-listener readiness: ready only after every listener's initial snapshot", () => {
    const harness = makeHarness<{ n: number }>(2)
    const { result } = render(harness, { n: 0 })

    act(() => harness.emits[1]({ n: 1 })) // second listener first
    expect(result.current.status).toBe("connecting")
    expect(result.current.pending.has("listener-0")).toBe(true)

    act(() => harness.emits[0]({ n: 2 }))
    expect(result.current.status).toBe("ready")
    expect(result.current.data).toEqual({ n: 2 })
  })

  it("empty results are ready (distinguishable from connecting), not pending", () => {
    const harness = makeHarness<string[]>()
    const { result } = render(harness, [])

    act(() => harness.emits[0]([]))
    expect(result.current.status).toBe("ready")
    expect(result.current.data).toEqual([])
  })
})

describe("useLiveQuery — per-listener errors", () => {
  it("one listener failing shows error while the other continues succeeding; recovery clears only its own error", () => {
    const harness = makeHarness<string>(2)
    const { result } = render(harness, "seed")

    act(() => harness.emits[0]("a-1"))
    expect(result.current.status).toBe("connecting")
    act(() => harness.emits[1]("b-1"))
    expect(result.current.status).toBe("ready")

    const boom = new Error("permission-denied")
    act(() => harness.fails[1](boom))
    expect(result.current.status).toBe("error")
    expect(result.current.error).toBe(boom)
    expect(result.current.data).toBe("b-1") // last-known data retained

    // Listener 0 keeps succeeding — the error from listener 1 must survive.
    act(() => harness.emits[0]("a-2"))
    expect(result.current.status).toBe("error")
    expect(result.current.data).toBe("a-2")
    expect(result.current.errors.get("listener-1")).toBe(boom)

    // Only the failed listener's own new snapshot resolves its error.
    act(() => harness.emits[1]("b-2"))
    expect(result.current.status).toBe("ready")
    expect(result.current.errors.size).toBe(0)
  })

  it("synchronous builder throws surface through error state (microtask)", async () => {
    const builder: StreamBuilder<string> = () => {
      throw new Error("subscription init exploded")
    }
    const { result } = renderHook(() =>
      useLiveQuery<string>({ key: "admin-1", subscribe: builder, initialData: "seed" }),
    )

    expect(result.current.status).toBe("connecting")
    await act(async () => {}) // flush the deferred init-failure microtask

    expect(result.current.status).toBe("error")
    expect(String(result.current.error)).toContain("subscription init exploded")
  })
})

describe("useLiveQuery — retry / disposal / account switch", () => {
  it("retry: previous subscription set is cleaned up, fresh attempt runs, late old callbacks ignored", async () => {
    const harness = makeHarness<string>()
    const { result } = render(harness, "seed")

    act(() => harness.emits[0]("attempt-1-value"))
    expect(result.current.data).toBe("attempt-1-value")
    expect(result.current.status).toBe("ready")

    const attempt1Emits = [...harness.emits]
    const attempt1Unsubs = [...harness.unsubscribed]
    const buildsAfterOne = harness.builds

    act(() => result.current.retry())

    expect(attempt1Unsubs[0]).toHaveBeenCalledTimes(1) // cleaned up
    expect(harness.builds).toBe(buildsAfterOne + 1) // fresh attempt
    expect(result.current.status).toBe("connecting")
    expect(result.current.data).toBe("seed") // reset for the fresh attempt

    // Late callback from the disposed attempt-1 engine: ignored.
    act(() => attempt1Emits[0]("stale from attempt 1"))
    expect(result.current.data).toBe("seed")

    // New attempt delivers.
    act(() => harness.emits[harness.emits.length - 1]("attempt-2-value"))
    expect(result.current.data).toBe("attempt-2-value")
    expect(result.current.status).toBe("ready")
  })

  it("unmount: unsubscribe is called and late callbacks are ignored", () => {
    const harness = makeHarness<string>()
    const { result, unmount } = render(harness, "seed")

    act(() => harness.emits[0]("value"))
    unmount()

    expect(harness.unsubscribed[0]).toHaveBeenCalledTimes(1)
    act(() => harness.emits[0]("late"))
    expect(result.current.data).toBe("value")
  })

  it("source key (account) change: state resets and the old engine is disposed", () => {
    const harness = makeHarness<string>()
    const { result, rerender } = render(harness, "seed")

    act(() => harness.emits[0]("admin-1 data"))
    expect(result.current.data).toBe("admin-1 data")

    const firstUnsub = harness.unsubscribed[0]
    const buildsBefore = harness.builds

    rerender({ key: "admin-2" })

    // Account switched: no data inheritance across accounts.
    expect(result.current.data).toBe("seed")
    expect(result.current.status).toBe("connecting")
    expect(firstUnsub).toHaveBeenCalledTimes(1)
    expect(harness.builds).toBe(buildsBefore + 1)

    act(() => harness.emits[harness.emits.length - 1]("admin-2 data"))
    expect(result.current.data).toBe("admin-2 data")
  })

  it("retry after a failed stream re-subscribes (missing-index scenario)", async () => {
    const harness = makeHarness<string>()
    const { result } = render(harness, "seed")

    act(() => harness.fails[0](new Error("The query requires an index.")))
    expect(result.current.status).toBe("error")

    act(() => result.current.retry())
    expect(result.current.status).toBe("connecting")
    expect(result.current.error).toBeNull()
    expect(harness.builds).toBe(2)
  })
})
