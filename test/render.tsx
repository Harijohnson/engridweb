import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render } from "@testing-library/react"
import { NuqsTestingAdapter } from "nuqs/adapters/testing"
import type { ReactElement } from "react"

import { TooltipProvider } from "@/components/ui/tooltip"

type UrlUpdate = Parameters<
  NonNullable<React.ComponentProps<typeof NuqsTestingAdapter>["onUrlUpdate"]>
>[0]

/** Render with a fresh QueryClient (no retries) and an in-memory URL. */
export function renderWithProviders(
  ui: ReactElement,
  {
    searchParams = "",
    onUrlUpdate,
  }: { searchParams?: string; onUrlUpdate?: (event: UrlUpdate) => void } = {}
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  return render(
    <QueryClientProvider client={client}>
      <NuqsTestingAdapter
        searchParams={searchParams}
        onUrlUpdate={onUrlUpdate}
        hasMemory
      >
        <TooltipProvider>{ui}</TooltipProvider>
      </NuqsTestingAdapter>
    </QueryClientProvider>
  )
}
