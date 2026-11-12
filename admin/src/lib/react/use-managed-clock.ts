"use client"

import { useEffect, useState } from "react"

/**
 * Managed wall clock for time-derived UI (currently the overdue training
 * counters).
 *
 * Live Firestore snapshots only change when a document changes. A deadline
 * passing is purely time-based: without a local clock the overdue count would
 * stay frozen until the next snapshot. This hook advances a `Date` on a
 * bounded interval and immediately refreshes when a hidden tab becomes
 * visible again, so returning to the page never shows a stale count.
 *
 * It is read-only: no Firestore reads or writes are involved. The interval
 * and the visibility listener are both removed on unmount.
 */

/** One minute: enough precision for due dates without waking the tab often. */
export const MANAGED_CLOCK_INTERVAL_MS = 60_000

export function useManagedClock(
  intervalMs: number = MANAGED_CLOCK_INTERVAL_MS,
): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const refresh = () => setNow(new Date())
    const timer = window.setInterval(refresh, intervalMs)

    const handleVisibilityChange = () => {
      // Hidden tabs throttle timers; refresh as soon as the page is visible
      // again (also covers a laptop resuming from sleep).
      if (document.visibilityState === "visible") {
        refresh()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [intervalMs])

  return now
}
