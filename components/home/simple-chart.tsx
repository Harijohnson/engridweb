"use client"

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { useMemo } from "react"
import { CartesianGrid, Line, LineChart, YAxis } from "recharts"

import {
  ChartSkeleton,
  EmptyState,
  ErrorState,
} from "@/components/common/data-states"
import {
  ChartTooltipCard,
  type TooltipRow,
} from "@/components/dashboard/chart-tooltip-card"
import {
  buildRows,
  floorToHour,
  ticksFor,
  TimeAxis,
  type Rows,
} from "@/components/dashboard/forecast-vs-actual-chart"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"
import type { Schemas } from "@/lib/api/client"
import {
  errorDirection,
  formatIsoDayRange,
  formatMw,
  formatNumber,
  formatSignedMw,
  formatUkDateTime,
  ukZoneLabel,
} from "@/lib/format"
import { cn } from "@/lib/utils"

type Timeseries = Schemas["TimeseriesResponse"]

/** The home chart always shows one week at a time (D30); Details has the other zooms. */
const WEEK = 7

const chartConfig = {
  forecast: { label: "Prediction", color: "var(--chart-1)" },
  actual: { label: "What really happened", color: "var(--chart-2)" },
} satisfies ChartConfig

export function SimpleChart({
  data,
  isLoading,
  updating = false,
  error,
  onRetry,
  windowStart,
  onWindowChange,
}: {
  data: Timeseries | undefined
  isLoading: boolean
  updating?: boolean
  error: unknown
  onRetry: () => void
  /** First UK day in view ("YYYY-MM-DD"); null = the first day. */
  windowStart: string | null
  onWindowChange: (day: string | null) => void
}) {
  const rows = useMemo(() => (data ? buildRows(data) : null), [data])

  return (
    <section
      aria-labelledby="simple-chart-title"
      aria-busy={updating}
      className={cn(
        "flex flex-col gap-4 rounded-3xl bg-card p-5 shadow-soft ring-1 ring-foreground/5 transition-opacity sm:p-6",
        updating && "opacity-60"
      )}
    >
      {error && !data ? (
        <>
          <ChartTitle />
          <ErrorState error={error} onRetry={onRetry} />
        </>
      ) : isLoading || !rows ? (
        <>
          <ChartTitle />
          <ChartSkeleton className="h-72" />
        </>
      ) : rows.actual.length === 0 ? (
        <>
          <ChartTitle />
          <EmptyState title="No data for these dates" />
        </>
      ) : (
        <ChartBody
          rows={rows}
          windowStart={windowStart}
          onWindowChange={onWindowChange}
        />
      )}
    </section>
  )
}

function ChartTitle({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="simple-chart-title" className="text-base font-semibold">
        Prediction vs what really happened
      </h2>
      {children}
    </div>
  )
}

function ChartBody({
  rows,
  windowStart,
  onWindowChange,
}: {
  rows: Rows
  windowStart: string | null
  onWindowChange: (day: string | null) => void
}) {
  const { days } = rows
  const span = Math.min(WEEK, days.length)
  // Start of the window: the requested day, clamped so a full week fits.
  const requested = windowStart ? days.indexOf(windowStart) : 0
  const startIdx = Math.max(0, Math.min(requested, days.length - span))

  const visible = useMemo(() => {
    const inView = new Set(rows.days.slice(startIdx, startIdx + span))
    const forecast = rows.forecast.filter((r) => inView.has(r.day))
    return {
      actual: rows.actual.filter((r) => inView.has(r.day)),
      forecast,
      ticks: ticksFor(forecast, inView.size),
    }
  }, [rows, startIdx, span])

  const firstDay = days[startIdx]
  const lastDay = days[startIdx + span - 1]
  const rangeLabel = formatIsoDayRange(firstDay, lastDay)
  const goTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, days.length - span))
    onWindowChange(clamped === 0 ? null : days[clamped])
  }
  const zone = rows.actual[0] ? ukZoneLabel(rows.actual[0].t) : "UK time"

  return (
    <>
      <ChartTitle>
        {span < days.length ? (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              className="rounded-full"
              aria-label="Previous week"
              disabled={startIdx === 0}
              onClick={() => goTo(startIdx - span)}
            >
              <ChevronLeftIcon aria-hidden />
            </Button>
            <span
              className="min-w-32 text-center text-sm font-medium"
              aria-live="polite"
            >
              {rangeLabel}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              className="rounded-full"
              aria-label="Next week"
              disabled={startIdx + span >= days.length}
              onClick={() => goTo(startIdx + span)}
            >
              <ChevronRightIcon aria-hidden />
            </Button>
          </div>
        ) : (
          <span className="text-sm font-medium">{rangeLabel}</span>
        )}
      </ChartTitle>

      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-label="Lines">
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-1 w-5 rounded-full bg-forecast" />
          Prediction
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-5 rounded-full bg-actual" />
          What really happened
        </li>
      </ul>

      <figure className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">Power (MW)</span>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-72 w-full"
          role="img"
          aria-label={`Line chart of the predicted and the real wind power in MW, ${rangeLabel}. The Details page lists every hour in a table.`}
        >
          <LineChart
            data={visible.actual}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <TimeAxis ticks={visible.ticks} multiDay={span > 1} />
            <YAxis
              tickFormatter={(v: number) => formatNumber(v)}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <ChartTooltip
              cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
              content={({ active, label }) =>
                active && label != null ? (
                  <PlainTooltip rows={rows} t={Number(label)} />
                ) : null
              }
            />
            <Line
              dataKey="actual"
              type="linear"
              stroke="var(--color-actual)"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              isAnimationActive={false}
              connectNulls={false}
            />
            <Line
              data={visible.forecast}
              dataKey="forecast"
              type="linear"
              stroke="var(--color-forecast)"
              strokeWidth={2.5}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
          </LineChart>
        </ChartContainer>
        <figcaption className="text-sm text-muted-foreground">
          Green above black: the prediction was too high. Green below black: too
          low. Gaps are missing data, never filled in. Times are {zone}.
        </figcaption>
      </figure>
    </>
  )
}

/** Hover card in plain words: the two values and how far apart they were. */
function PlainTooltip({ rows, t }: { rows: Rows; t: number }) {
  const hour = floorToHour(t)
  const point = rows.byHour.get(hour)
  const items: TooltipRow[] = [
    {
      label: "Prediction",
      value:
        point?.forecast_mw == null
          ? "None in time"
          : formatMw(point.forecast_mw),
      swatch: "var(--color-forecast)",
    },
    {
      label: "What really happened",
      value: formatMw(rows.actualAt.get(t) ?? null),
      swatch: "var(--color-actual)",
    },
  ]
  // The API's error compares the hourly prediction with the half-hour starting with it.
  if (t === hour && point?.error_mw != null) {
    const direction = errorDirection(point.error_mw)
    items.push({
      label: "Off by",
      value:
        direction === "exact"
          ? "0 MW"
          : `${formatSignedMw(point.error_mw)} (too ${direction === "over" ? "high" : "low"})`,
    })
  }
  return <ChartTooltipCard title={`${formatUkDateTime(t)} UK`} rows={items} />
}
