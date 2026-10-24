import { DatabaseIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { Schemas } from "@/lib/api/client"
import { formatNumber, formatUkDateTimeWithYear } from "@/lib/format"

type Meta = Schemas["MetaResponse"]

function latestIngestion(meta: Meta): string | null {
  const finished = meta.ingestion
    .map((run) => run.finished_at)
    .filter((t): t is string => t != null)
    .sort()
  return finished.length ? finished[finished.length - 1] : null
}

export function DataStatusBadge({ meta }: { meta: Meta | undefined }) {
  if (!meta) return <Skeleton className="h-5 w-72" />
  const { forecast, actual } = meta.coverage
  const ingested = latestIngestion(meta)
  const complete = forecast.missing === 0 && actual.missing === 0
  return (
    <Badge
      variant={complete ? "outline" : "destructive"}
      className="h-auto flex-wrap whitespace-normal"
    >
      <DatabaseIcon aria-hidden />
      <span>
        Elexon BMRS
        {ingested ? ` · loaded ${formatUkDateTimeWithYear(ingested)} UK` : ""}
        {` · ${formatNumber(forecast.present)}/${formatNumber(forecast.expected)} forecast hours`}
        {` · ${formatNumber(actual.present)}/${formatNumber(actual.expected)} actual half-hours`}
      </span>
    </Badge>
  )
}

export function DashboardHeader({ meta }: { meta: Meta | undefined }) {
  return (
    <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-1">
        <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
          EnGrid · Wind forecast monitor
        </p>
        <h1 className="text-lg font-semibold tracking-tight">
          Which wind forecast was available at the decision, and how good was
          it?
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          GB wind generation, January 2026. The forecast for each delivery hour
          is the newest one published at or before the decision cutoff, never a
          later one.{" "}
          <a
            href="#methodology"
            className="underline underline-offset-2 hover:text-foreground"
          >
            How this works
          </a>
        </p>
      </div>
      <DataStatusBadge meta={meta} />
    </header>
  )
}
