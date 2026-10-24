import { ArrowDownIcon, ArrowUpIcon, EqualIcon } from "lucide-react"

import {
  CoverageWarning,
  ErrorState,
  KpiSkeleton,
} from "@/components/common/data-states"
import {
  SectionShell,
  type SectionSource,
} from "@/components/common/section-shell"
import { ViewSummary } from "@/components/dashboard/view-summary"
import type { Schemas } from "@/lib/api/client"
import {
  describeError,
  errorDirection,
  EMPTY,
  formatMw,
  formatNumber,
  formatPercent,
  formatSignedNumber,
} from "@/lib/format"
import { cn } from "@/lib/utils"

type Summary = Schemas["SummaryResponse"]

function Tile({
  label,
  hint,
  value,
  unit,
  detail,
  featured = false,
}: {
  label: string
  /** The technical name, shown small next to the plain label. */
  hint?: string
  value: string
  unit?: string
  detail?: React.ReactNode
  /** The headline number gets a faint green tint. */
  featured?: boolean
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-2xl bg-card p-3.5 ring-1 ring-foreground/10",
        featured && "bg-primary/5 ring-primary/30"
      )}
    >
      <dt className="flex items-baseline gap-1.5">
        <span className="font-medium text-foreground">{label}</span>
        {hint ? (
          <span className="text-[11px] text-muted-foreground">{hint}</span>
        ) : null}
      </dt>
      <dd className="flex items-baseline gap-1">
        <span className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </span>
        {unit && value !== EMPTY ? (
          <span className="text-muted-foreground">{unit}</span>
        ) : null}
      </dd>
      {detail ? (
        <dd className="text-xs text-muted-foreground">{detail}</dd>
      ) : null}
    </div>
  )
}

const NO_PAIRS = "No matched hours, so no metric."

function BiasDetail({ bias }: { bias: number | null }) {
  if (bias == null) return <>{NO_PAIRS}</>
  const direction = errorDirection(bias)
  const Icon =
    direction === "over"
      ? ArrowUpIcon
      : direction === "under"
        ? ArrowDownIcon
        : EqualIcon
  return (
    <span className="inline-flex items-center gap-1 text-foreground">
      <Icon className="size-3.5" aria-hidden />
      On average {describeError(bias)}
    </span>
  )
}

const HELP = {
  text: "How good the forecasts you could have bought on were, for the dates and buying time you picked. Error = forecast − actual, so a + bias means the forecast was too high.",
  guideAnchor: "key-numbers",
}

export function KpiCards({
  summary,
  isLoading,
  updating = false,
  source,
  error,
  onRetry,
}: {
  summary: Summary | undefined
  isLoading: boolean
  updating?: boolean
  source?: SectionSource | null
  error: unknown
  onRetry: () => void
}) {
  return (
    <SectionShell
      id="overview"
      title="Key numbers"
      help={HELP}
      updating={updating}
      source={source}
      bare
      description={
        summary ? (
          <ViewSummary query={summary.query} metrics={summary.metrics} />
        ) : (
          "How good was the forecast you could have bought on?"
        )
      }
    >
      <KpiBody
        summary={summary}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
      />
    </SectionShell>
  )
}

function KpiBody({
  summary,
  isLoading,
  error,
  onRetry,
}: {
  summary: Summary | undefined
  isLoading: boolean
  error: unknown
  onRetry: () => void
}) {
  if (error && !summary) return <ErrorState error={error} onRetry={onRetry} />
  if (isLoading || !summary) {
    return <KpiSkeleton label="Loading accuracy metrics" />
  }

  const m = summary.metrics
  const mw = (value: number | null) =>
    value == null ? EMPTY : formatNumber(value)

  return (
    <div className="flex flex-col gap-2.5">
      <CoverageWarning
        expected={m.n_expected}
        missingForecast={m.n_missing_forecast}
        missingActual={m.n_missing_actual}
      />
      <dl
        className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6"
        aria-label="Accuracy numbers"
      >
        <Tile
          featured
          label="Typical miss"
          hint="MAE"
          value={mw(m.mae_mw)}
          unit="MW"
          detail={
            m.mae_mw == null
              ? NO_PAIRS
              : "Average gap from what the wind really generated"
          }
        />
        <Tile
          label="Leaning"
          hint="Bias"
          value={formatSignedNumber(m.bias_mw)}
          unit="MW"
          detail={<BiasDetail bias={m.bias_mw} />}
        />
        <Tile
          label="Big-miss score"
          hint="RMSE"
          value={mw(m.rmse_mw)}
          unit="MW"
          detail={
            m.rmse_mw == null
              ? NO_PAIRS
              : "Like the typical miss, but big errors count more"
          }
        />
        <Tile
          label="9 in 10 within"
          hint="P90"
          value={mw(m.p90_abs_error_mw)}
          unit="MW"
          detail={
            m.p90_abs_error_mw == null
              ? NO_PAIRS
              : `Half within ${formatMw(m.median_abs_error_mw)} · worst ${formatMw(m.max_abs_error_mw)}`
          }
        />
        <Tile
          label="Average wind"
          value={mw(m.mean_actual_mw)}
          unit="MW"
          detail={
            m.mean_actual_mw == null
              ? NO_PAIRS
              : `Forecast averaged ${formatMw(m.mean_forecast_mw)}`
          }
        />
        <Tile
          label="Hours compared"
          hint="Coverage"
          value={formatPercent(m.coverage_pct)}
          detail={`${formatNumber(m.n_matched)} / ${formatNumber(m.n_expected)} hours matched`}
        />
      </dl>
    </div>
  )
}
