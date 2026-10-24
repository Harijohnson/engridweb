import { DatabaseIcon, TriangleAlertIcon } from "lucide-react"
import Link from "next/link"

import { GuideBanner } from "@/components/common/guide-banner"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { Schemas } from "@/lib/api/client"
import { formatNumber, formatUkDateTimeWithYear } from "@/lib/format"
import { cn } from "@/lib/utils"

type Meta = Schemas["MetaResponse"]

function latestIngestion(meta: Meta): string | null {
  const finished = meta.ingestion
    .map((run) => run.finished_at)
    .filter((t): t is string => t != null)
    .sort()
  return finished.length ? finished[finished.length - 1] : null
}

export function DataStatusBadge({ meta }: { meta: Meta | undefined }) {
  if (!meta) return <Skeleton className="h-5 w-72 max-w-full rounded-full" />
  const { forecast, actual } = meta.coverage
  const ingested = latestIngestion(meta)
  const complete = forecast.missing === 0 && actual.missing === 0
  const Icon = complete ? DatabaseIcon : TriangleAlertIcon
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-auto flex-wrap py-1 whitespace-normal",
        !complete && "border-highlight bg-highlight text-highlight-foreground"
      )}
      title={
        ingested
          ? `Loaded from Elexon BMRS on ${formatUkDateTimeWithYear(ingested)} UK`
          : "Loaded from Elexon BMRS"
      }
    >
      <Icon aria-hidden />
      <span>
        {complete ? "Complete data" : "Some data missing"}
        {` · ${formatNumber(forecast.present)}/${formatNumber(forecast.expected)} forecast hours`}
        {` · ${formatNumber(actual.present)}/${formatNumber(actual.expected)} actual half-hours`}
      </span>
    </Badge>
  )
}

export function DashboardHeader({ meta }: { meta: Meta | undefined }) {
  return (
    <div className="flex flex-col gap-3">
      <GuideBanner />
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            Which wind forecast could you buy on, and how good was it?
          </h1>
          <p className="text-xs text-muted-foreground">
            GB wind, January 2026 · Elexon BMRS · newest forecast before your
            buying time, never a later one.{" "}
            <Link
              href="/guide"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              How this works
            </Link>
          </p>
        </div>
        <DataStatusBadge meta={meta} />
      </div>
    </div>
  )
}
