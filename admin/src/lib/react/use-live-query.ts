"use client"

import { useCallback, useEffect, useState } from "react"

import {
  LiveStreamEngine,
  emptyEngineState,
  type EngineState,
  type StreamBuilder,
  type LiveStatus,
} from "@/lib/admin/stream-protocol"

/**
 * Real-time multi-listener subscription hook with an explicit lifecycle.
 *
 * NOTE: This intentionally does NOT use TanStack Query's queryFn for
 * subscriptions: with `initialData` + `staleTime: Infinity` TanStack treats
 * the initial data as fresh and never invokes a pending-forever queryFn, so
 * subscriptions never start. Instead this hook mounts/unmounts the stream
 * itself (subscribe on mount → unsubscribe on unmount) and tracks
 * connecting/ready/error/retry separately from "genuinely empty" results.
 *
 * Every underlying Firestore listener is tracked individually by
 * `LiveStreamEngine` (see stream-protocol.ts): statistics only claim
 * readiness after BOTH of its listeners delivered initial snapshots, one
 * listener's failure stays failed even while another continues, and empty
 * results are distinguishable from "not loaded" and "failed".
 *
 * TanStack Query remains the provider for non-live (one-shot / action)
 * queries on protected screens.
 */

export type { LiveStatus, StreamBuilder }

export interface LiveQueryResult<TData> {
  /** Latest snapshot (initialData until the first event arrives). */
  data: TData
  /** connecting → ready; error keeps last-known data for display + retry. */
  status: LiveStatus
  /** FIRST unresolved listener error, if any (data stays available). */
  error: Error | null
  /** Announced listeners that never delivered anything yet. */
  pending: ReadonlySet<string>
  /** Listeners that delivered their initial snapshot (and, until their next
   * event, still hold whatever their last good data was — even if they have
   * since failed: failed-but-ready === failed WITH retained data). */
  ready: ReadonlySet<string>
  /** All unresolved per-listener errors, for diagnostics. */
  errors: ReadonlyMap<string, Error>
  /** Retry disposes the current subscription set and starts a fresh one. */
  retry: () => void
}

export interface LiveQueryOptions<TData> {
  /**
   * Identity of the data source (usually the admin uid). Changing it tears
   * down the current subscriptions and resets state — a different account
   * must never inherit the previous account's data or listener state.
   */
  key: string
  /**
   * Subscription builder. MUST be referentially stable (useCallback) and
   * announce every listener via `ctrl.listen(id)` synchronously at start.
   */
  subscribe: StreamBuilder<TData>
  /** Shown before the first snapshot. */
  initialData: TData
  /** Do not subscribe until arguments resolve (e.g. uid present). */
  enabled?: boolean
}

export function useLiveQuery<TData>({
  key,
  subscribe,
  initialData,
  enabled = true,
}: LiveQueryOptions<TData>): LiveQueryResult<TData> {
  const [attempt, setAttempt] = useState(0)
  const [data, setData] = useState<TData>(initialData)
  const [state, setState] = useState<EngineState<TData>>(() => emptyEngineState(initialData))
  const [trackedKey, setTrackedKey] = useState(key)

  // Reset when the data source changes (account switch) — the officially
  // sanctioned "adjust state on prop change" render pattern; no stale data
  // from one account may ever be shown for another.
  if (trackedKey !== key) {
    setTrackedKey(key)
    setData(initialData)
    setState(emptyEngineState(initialData))
  }

  // The effect ONLY synchronizes React with the external system (starting /
  // disposing the engine); all state updates happen in engine callbacks,
  // per the Rules of React.
  useEffect(() => {
    if (!enabled) {
      return
    }

    const engine = new LiveStreamEngine<TData>(subscribe, initialData)
    let current = true

    const unsubscribeView = engine.subscribeView((next) => {
      if (!current) {
        return
      }
      setData(next.data)
      setState(next)
    })
    engine.start()

    return () => {
      current = false
      unsubscribeView()
      // Cleanup order: stop callbacks first, then the raw listeners —
      // a disposed subscription can never mutate current state.
      engine.dispose()
    }
    // initialData is a stable constant per panel; engine restarts on
    // key/subscribe changes or when the user retries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, subscribe, enabled, attempt])

  const retry = useCallback(() => {
    setData(initialData)
    setState(emptyEngineState(initialData))
    setAttempt((current) => current + 1)
  }, [initialData])

  return {
    data,
    status: state.status,
    error: state.error,
    pending: state.pending,
    ready: state.ready,
    errors: state.errors,
    retry,
  }
}
