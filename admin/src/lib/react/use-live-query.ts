"use client"

import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query"

import type { Unsubscribe } from "@/lib/admin/dashboard-streams"

/**
 * Real-time bridge: Firestore `onSnapshot` subscriptions fed into TanStack
 * Query.
 *
 * The subscription lives inside the queryFn:
 *  - every snapshot pushes new data into the query cache via setQueryData
 *    (so `useQuery(...).data`, devtools, and cache invalidation all work
 *    as expected),
 *  - the promise stays pending; when the query is unmounted or disabled,
 *    the abort signal unsubscribes, so listeners never leak.
 */

export type SubscribeFn<TData> = (
  onData: (data: TData) => void,
  onError: (error: Error) => void,
) => Unsubscribe

export interface LiveQueryOptions<TData> {
  /** Realtime subscription factory. MUST be referentially stable (useCallback). */
  subscribe: SubscribeFn<TData>
  /** Shown before the first snapshot arrives. */
  initialData: TData
  /** Only subscribe when arguments resolve (e.g. uid present). */
  enabled?: boolean
}

export function useLiveQuery<TData>(
  queryKey: readonly unknown[],
  { subscribe, initialData, enabled = true }: LiveQueryOptions<TData>,
): TData {
  const client = useQueryClient()

  const { data = initialData } = useQuery<TData>({
    queryKey,
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: Infinity,
    gcTime: 0, // snapshots are external state; no point caching past unmount
    initialData,
    queryFn: (context) => {
      const unsubscribe = subscribe(
        (next) => client.setQueryData(context.queryKey, next),
        (error) => {
          // Keep the last snapshot; log for observability.
          console.error("[useLiveQuery] stream error for", context.queryKey, error)
        },
      )

      return new Promise<never>((_, reject) => {
        context.signal.addEventListener("abort", () => {
          unsubscribe()
          const abortError = new DOMException("live query aborted", "AbortError")
          reject(abortError)
        })
      }).catch((error) => {
        if ((error as Error).name === "AbortError") {
          // Expected lifecycle event — keep the cache, don't surface errors.
          return Promise.resolve(initialData) as Promise<never>
        }
        throw error
      })
    },
  })

  return data
}

/**
 * Callers define their subscribe factories with useCallback (array-literal
 * deps) so the subscription lifecycle stays stable across renders.
 */

export type { UseQueryOptions }
