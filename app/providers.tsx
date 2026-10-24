"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import { useState } from "react"

import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ApiError } from "@/lib/api/client"

const FIVE_MINUTES = 5 * 60 * 1000
const MAX_RETRIES = 2

function shouldRetry(failureCount: number, error: Error): boolean {
  // A 4xx will not fix itself; only retry network errors and 5xx.
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false
  }
  return failureCount < MAX_RETRIES
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Historical data: no need to refetch on focus. The backend has one
            // worker on PythonAnywhere, so avoid redundant requests.
            staleTime: FIVE_MINUTES,
            refetchOnWindowFocus: false,
            retry: shouldRetry,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </NuqsAdapter>
    </QueryClientProvider>
  )
}
