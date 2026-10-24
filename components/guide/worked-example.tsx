"use client"

import { ArrowRightIcon } from "lucide-react"
import Link from "next/link"

import { ChartSkeleton, ErrorState } from "@/components/common/data-states"
import { WORKED_EXAMPLE_HOUR } from "@/lib/worked-example"
import { buttonVariants } from "@/components/ui/button"
import { useForecastHistory } from "@/hooks/use-api"
import {
  describeError,
  formatHours,
  formatMw,
  formatSignedMw,
  formatUkDateTime,
  formatUkDateTimeWithYear,
} from "@/lib/format"
import { cn } from "@/lib/utils"

const PARAMS = { start_time: WORKED_EXAMPLE_HOUR }

/** The worked example, loaded live from the API with its default buying time, so the
 * guide never repeats numbers by hand (real data only). */
export function WorkedExample() {
  const history = useForecastHistory(PARAMS)

  if (history.error && !history.data) {
    return (
      <ErrorState
        error={history.error}
        onRetry={() => void history.refetch()}
      />
    )
  }
  if (!history.data) {
    return <ChartSkeleton className="h-48" label="Loading the worked example" />
  }

  const data = history.data
  const usable = data.versions.filter(
    (v) => v.status === "selected" || v.status === "superseded"
  ).length
  const tooLate = data.versions.length - usable

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex list-decimal flex-col gap-2 pl-5">
        <li>
          The delivery hour is{" "}
          <strong>{formatUkDateTimeWithYear(data.start_time)} UK</strong>.
        </li>
        <li>
          With the standard buying time, the decision is made at{" "}
          <strong>{formatUkDateTime(data.cutoff_time)} UK</strong>.
        </li>
        <li>
          Elexon published <strong>{data.versions.length}</strong> forecasts for
          this hour: <strong>{usable}</strong> before the buying time and{" "}
          <strong>{tooLate}</strong> after it (never used).
        </li>
        <li>
          The newest usable one was published at{" "}
          <strong>
            {data.selected_publish_time
              ? `${formatUkDateTime(data.selected_publish_time)} UK`
              : "– (none in time)"}
          </strong>
          {data.selected_lead_time_h != null
            ? `, ${formatHours(data.selected_lead_time_h)} before delivery`
            : ""}
          . It said <strong>{formatMw(data.selected_forecast_mw)}</strong>.
        </li>
        <li>
          The wind actually generated was{" "}
          <strong>{formatMw(data.actual_mw)}</strong>, so the forecast was{" "}
          <strong>{formatSignedMw(data.selected_error_mw)}</strong> off (
          {describeError(data.selected_error_mw)}).
        </li>
      </ol>
      <Link
        href={`/?hour=${encodeURIComponent(WORKED_EXAMPLE_HOUR)}#publication-history`}
        className={cn(buttonVariants({ size: "sm" }), "self-start")}
      >
        Open this hour on the dashboard
        <ArrowRightIcon data-icon="inline-end" aria-hidden />
      </Link>
      <p className="text-muted-foreground">
        Live from the analysis service (data version {data.data_version}).
      </p>
    </div>
  )
}
