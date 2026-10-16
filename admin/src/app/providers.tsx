"use client"

import { useState, type ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

/**
 * Stable TanStack Query provider.
 *
 * The QueryClient is created once per browser session (not per render) and
 * must be cleared when the signed-in account changes (see
 * `resetClientStateForAccountChange` in lib/auth/client-context.ts).
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Server-rendered data revalidation is explicit per screen.
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
