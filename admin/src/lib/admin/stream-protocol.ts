/**
 * Multi-listener stream engine — the stateful core behind `useLiveQuery`.
 *
 * A dashboard screen is fed by SEVERAL Firestore listeners at once
 * (statistics = users + tasks; employee progress = the employee list plus
 * one watcher per employee subcollection). A single global "connected"
 * boolean cannot represent that: statistics must not claim readiness before
 * BOTH of its listeners delivered their initial snapshots, and a failure in
 * one listener must stay failed even when the other listener keeps
 * succeeding.
 *
 * The engine therefore tracks every listener individually:
 *
 *   registered → announced during subscription start (pending)
 *   ready      → delivered at least one initial snapshot
 *   failed     → last callback was an error (until it emits again)
 *
 * Overall state derivation:
 *   error      if ANY listener is failed (with its error surfaced)
 *   ready      otherwise, when every registered listener is ready
 *   connecting otherwise (some listener has never delivered anything)
 *
 * "Empty" is simply "ready with empty results" — distinguishable from
 * "not loaded" (pending) and "failed" (errors), never fused together.
 *
 * Pure TypeScript, no React import — unit-testable without a DOM.
 */

export type Unsubscribe = () => void

export type LiveStatus = "connecting" | "ready" | "error"

/** A stream builder attaches one or more listeners through the controller. */
export type StreamBuilder<TData> = (ctrl: LiveStreamController<TData>) => Unsubscribe

/** Provided to stream builders. Tracks every underlying listener by id. */
export interface LiveStreamController<TData> {
  /**
   * Announce a listener BEFORE its first possible snapshot, so readiness
   * can never flash prematurely. Builders must call this synchronously at
   * start-up, and — for dynamically attached listeners (e.g. per-employee
   * watchers reconciled from a users snapshot) — within the same synchronous
   * block as the emit that follows.
   */
  listen(id: string): void
  /**
   * A snapshot arrived for listener `id`; `data` is the FULLY merged model
   * (the builder aggregates across listeners itself). Marks the listener
   * ready, clears its own previous error, and publishes data.
   */
  emit(id: string, data: TData): void
  /** The listener failed. It stays failed until it emits again. */
  fail(id: string, error: Error): void
  /** Detach a dynamically-registered listener (employee removed). */
  forget(id: string): void
}

export interface EngineState<TData> {
  data: TData
  status: LiveStatus
  /** FIRST unresolved error, in listener registration order. */
  error: Error | null
  /** All unresolved per-listener errors, for diagnostics. */
  errors: ReadonlyMap<string, Error>
  /** Listeners that delivered their initial snapshot. */
  ready: ReadonlySet<string>
  /** Announced listeners that never delivered anything yet (loading). */
  pending: ReadonlySet<string>
}

export function emptyEngineState<TData>(initialData: TData): EngineState<TData> {
  return {
    data: initialData,
    status: "connecting",
    error: null,
    errors: new Map(),
    ready: new Set(),
    pending: new Set(),
  }
}

export function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value))
}

export class LiveStreamEngine<TData>
  implements LiveStreamController<TData>
{
  private data: TData
  private registered = new Set<string>()
  private readySet = new Set<string>()
  private errorMap = new Map<string, Error>()
  private readonly views = new Set<(state: EngineState<TData>) => void>()
  private started = false
  private stopped = false
  private unsubscribe: Unsubscribe | null = null

  constructor(
    private readonly builder: StreamBuilder<TData>,
    initialData: TData,
  ) {
    this.data = initialData
  }

  /* ── lifecycle ───────────────────────────────────────────────────────── */

  /** Attaches the stream. Synchronous builder failures are surfaced via a
   *  microtask so React effects never call setState synchronously. */
  start(): void {
    if (this.started || this.stopped) {
      return
    }
    this.started = true
    try {
      this.unsubscribe = this.builder(this)
    } catch (error) {
      queueMicrotask(() => {
        if (this.stopped) {
          return
        }
        // Synchronous subscription-initialization failure → error state.
        this.registered.add(INIT_LISTENER_ID)
        this.fail(INIT_LISTENER_ID, toError(error))
      })
    }
  }

  /** Stops callbacks AND the underlying subscription set (idempotent). */
  dispose(): void {
    if (this.stopped) {
      return
    }
    this.stopped = true
    const unsubscribe = this.unsubscribe
    this.unsubscribe = null
    if (unsubscribe) {
      try {
        unsubscribe()
      } catch (error) {
        console.warn("[stream-engine] unsubscribe failed", error)
      }
    }
    this.views.clear()
  }

  /* ── LiveStreamController ────────────────────────────────────────────── */

  listen(id: string): void {
    // Registration alone is not user-visible state; readiness is derived
    // lazily from registered ∖ ready. No notification → effects stay
    // setState-free during subscription start-up.
    if (this.stopped) {
      return
    }
    this.registered.add(id)
  }

  emit(id: string, data: TData): void {
    if (this.stopped) {
      // Callbacks from disposed subscriptions must not change state.
      return
    }
    this.registered.add(id)
    this.readySet.add(id)
    this.errorMap.delete(id)
    this.data = data
    this.notify()
  }

  fail(id: string, error: Error): void {
    if (this.stopped) {
      return
    }
    this.registered.add(id)
    this.errorMap.set(id, toError(error))
    this.notify()
  }

  forget(id: string): void {
    if (this.stopped) {
      return
    }
    this.registered.delete(id)
    this.readySet.delete(id)
    this.errorMap.delete(id)
    this.notify()
  }

  /* ── views ───────────────────────────────────────────────────────────── */

  subscribeView(view: (state: EngineState<TData>) => void): Unsubscribe {
    this.views.add(view)
    return () => {
      this.views.delete(view)
    }
  }

  snapshot(): EngineState<TData> {
    const errors = new Map(this.errorMap)
    const ready = new Set(this.readySet)
    const pending = new Set<string>()
    for (const id of this.registered) {
      if (!ready.has(id) && !errors.has(id)) {
        pending.add(id)
      }
    }
    const error = errors.size > 0 ? errors.values().next().value ?? null : null
    const status: LiveStatus =
      error !== null
        ? "error"
        : this.registered.size > 0 && pending.size === 0
          ? "ready"
          : "connecting"
    return { data: this.data, status, error, errors, ready, pending }
  }

  private notify(): void {
    const state = this.snapshot()
    for (const view of this.views) {
      view(state)
    }
  }
}

/** Listener id used when a builder throws synchronously at start-up. */
export const INIT_LISTENER_ID = "*init*"

/**
 * Detects "missing composite index" style Firestore errors. These deserve a
 * dedicated, actionable message: deploy the bundled
 * `firestore.indexes.json`, then press Retry (live subscriptions do not
 * self-upgrade after the index appears).
 */
export function isIndexCompatibilityError(error: unknown): boolean {
  const code = (error as { code?: string })?.code ?? ""
  const message = String((error as Error)?.message ?? "")
  return (
    code === "failed-precondition" ||
    /requires.*(composite )?index|index.*(not|is not).{0,20}(found|available|created)|failed.?precondition/i.test(message)
  )
}
