"use client"

import { useIsFetching, useQueryClient } from "@tanstack/react-query"
import { RefreshCwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useMeta } from "@/hooks/use-api"
import { formatUkTime } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Re-reads every section from the API (D23). It does not fetch new data from Elexon:
 * the analysis runs on the stored January 2026 data.
 */
export function RefreshButton() {
  const client = useQueryClient()
  const fetching = useIsFetching() > 0
  // The meta query is refetched by every refresh, so its time is the last refresh.
  const { dataUpdatedAt } = useMeta()

  return (
    <div className="flex items-center gap-2">
      {dataUpdatedAt > 0 ? (
        <span
          className="hidden text-muted-foreground xl:inline"
          aria-live="polite"
        >
          {fetching
            ? "Updating…"
            : `Updated ${formatUkTime(dataUpdatedAt)} UK`}
        </span>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        onClick={() => void client.invalidateQueries()}
        disabled={fetching}
        title="Load every section again from the analysis service"
      >
        <RefreshCwIcon
          data-icon="inline-start"
          aria-hidden
          className={cn(fetching && "animate-spin")}
        />
        <span className="sr-only sm:not-sr-only">Refresh</span>
      </Button>
    </div>
  )
}
