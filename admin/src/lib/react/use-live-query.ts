"use client"

import { useCallback, useEffect, useState } from "react"

import type { Unsubscribe } from "@/lib/admin/dashboard-streams"

/**
 * Real-time subscription hook with an explicit lifecycle.
 *
 * NOTE: This intentionally does NOT use TanStack Query's queryFn for
 * subscriptions: with `initialData` + `staleTime: Infinity` TanStack treats
 * the initial data as fresh and never invokes a pending-forever queryFn, so
 * subscriptions never start. Instead this hook mounts/unmounts the stream
 * itself (subscribe on mount → unsubscribe on unmount) and tracks
 * connecting/ready/error/retry separately from "genuinely empty" results.
 *
 * TanStack Query remains the provider for non-live (one-shot / action)
 * queries on protected screens.
 */

export type LiveStatus = "connecting" | "ready" | "error"

export type SubscribeFn<TData> = (
  onData: (data: TData) => void,
  onError: (error: Error) => void,
) => Unsubscribe

export interface LiveQueryResult<TData> {
  /** Latest snapshot (initialData until the first event arrives). */
  data: TData
  /** connecting → ready; error keeps last-known data for display + retry. */
  status: LiveStatus
  error: Error | null
  /** Retry restarts the subscription from scratch. */
  retry: () => void
}

export interface LiveQueryOptions<TData> {
  /** Subscription factory. MUST be referentially stable (useCallback). */
  subscribe: SubscribeFn<TData>
  /** Shown before the first snapshot. */
  initialData: TData
  /** Do not subscribe until arguments resolve (e.g. uid present). */
  enabled?: boolean
}

export function useLiveQuery<TData>({
  subscribe,
  initialData,
  enabled = true,
}: LiveQueryOptions<TData>): LiveQueryResult<TData> {
  const [data, setData] = useState<TData>(initialData)
  // "connecting" until the first snapshot/error of the current attempt.
  const [status, setStatus] = useState<LiveStatus>("connecting")
  const [error, setError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)

  // The effect ONLY synchronizes React with the external system (starting /
  // stopping the Firestore listener); all state updates happen in its
  // callbacks, per the Rules of React.
  useEffect(() => {
    if (!enabled) {
      return
    }

    const unsubscribe = subscribe(
      (next) => {
        setData(next)
        setStatus("ready")
        setError(null)
      },
      (streamError) => {
        // Keep last-known data so the UI can show it alongside the error
        // banner + retry instead of silently hiding the failure.
        setError(streamError)
        setStatus("error")
      },
    )

    return unsubscribe
    // All reactive values used here are listed; `subscribe` must be stable.
  }, [subscribe, enabled, attempt])

  // Event handler (not an effect): resetting the statuses for the next try.
  const retry = useCallback(() => {
    setStatus("connecting")
    setError(null)
    setAttempt((current) => current + 1)
  }, [])

  return { data, status, error, retry }
}
