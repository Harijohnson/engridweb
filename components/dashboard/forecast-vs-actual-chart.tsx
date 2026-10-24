"use client"

import {
  ChartLineIcon,
  ChartColumnIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CrosshairIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartSkeleton,
  EmptyState,
  ErrorState,
} from "@/components/common/data-states"
import {
  SectionShell,
  type SectionSource,
} from "@/components/common/section-shell"
import {
  ChartTooltipCard,
  type TooltipRow,
} from "@/components/dashboard/chart-tooltip-card"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  CHART_VIEWS,
  CHART_ZOOMS,
  type ChartView,
  type ChartZoom,
} from "@/hooks/use-dashboard-params"
import type { Schemas } from "@/lib/api/client"
import {
  describeError,
  formatHours,
  formatIsoDayRange,
  formatMw,
  formatNumber,
  formatSignedMw,
  formatUkDateTime,
  formatUkDay,
  formatUkDayMonth,
  formatUkTime,
  isoInstant,
  ukIsoDay,
  ukZoneLabel,
} from "@/lib/format"
import { cn, pressedGreen } from "@/lib/utils"

type Timeseries = Schemas["TimeseriesResponse"]
type ForecastPoint = Schemas["ForecastPoint"]

const HOUR_MS = 60 * 60 * 1000

type Series = "forecast" | "actual"

const chartConfig = {
  forecast: { label: "Forecast", color: "var(--chart-1)" },
  actual: { label: "Actual", color: "var(--chart-2)" },
  error: { label: "How far off", color: "var(--chart-muted)" },
} satisfies ChartConfig

const ZOOM_LABEL: Record<ChartZoom, string> = {
  day: "1 day",
  week: "1 week",
  month: "All days",
}
const ZOOM_DAYS: Record<ChartZoom, number> = {
  day: 1,
  week: 7,
  month: Number.POSITIVE_INFINITY,
}

const VIEW_LABEL: Record<ChartView, string> = {
  lines: "Forecast vs actual",
  error: "How far off",
}

type ActualRow = { t: number; day: string; actual: number | null }
type ForecastRow = {
  t: number
  day: string
  forecast: number | null
  error: number | null
}

/** Chart rows from the API response. Display-only: values are passed through, and the
 * error is the API's own error_mw. */
export function buildRows(data: Timeseries) {
  const actual: ActualRow[] = data.actual.map((p) => ({
    t: Date.parse(p.start_time),
    day: ukIsoDay(p.start_time),
    actual: p.actual_mw,
  }))
  const forecast: ForecastRow[] = data.forecast.map((p) => ({
    t: Date.parse(p.start_time),
    day: ukIsoDay(p.start_time),
    forecast: p.forecast_mw,
    error: p.error_mw,
  }))
  const byHour = new Map<number, ForecastPoint>(
    data.forecast.map((p) => [Date.parse(p.start_time), p])
  )
  const actualAt = new Map(actual.map((row) => [row.t, row.actual]))
  // UK delivery days in the data, in order (the zoom steps through these).
  const days = [...new Set(actual.map((r) => r.day))]
  return { actual, forecast, byHour, actualAt, days }
}

export type Rows = ReturnType<typeof buildRows>

export function floorToHour(ms: number): number {
  return ms - (ms % HOUR_MS)
}

/** Axis ticks from the visible data: UK midnights for multi-day views, every 3 hours
 * for a single day. */
export function ticksFor(forecast: ForecastRow[], dayCount: number): number[] {
  if (dayCount > 1) {
    const midnights = forecast.filter((r) => formatUkTime(r.t) === "00:00")
    const step = Math.ceil(midnights.length / 12)
    return midnights.filter((_, i) => i % step === 0).map((r) => r.t)
  }
  return forecast
    .filter((r) => Number(formatUkTime(r.t).slice(0, 2)) % 3 === 0)
    .map((r) => r.t)
}

export function ForecastVsActualChart({
  data,
  isLoading,
  updating = false,
  source,
  error,
  onRetry,
  selectedHour,
  onSelectHour,
  zoom,
  onZoomChange,
  windowStart,
  onWindowChange,
  view,
  onViewChange,
}: {
  data: Timeseries | undefined
  isLoading: boolean
  updating?: boolean
  source?: SectionSource | null
  error: unknown
  onRetry: () => void
  selectedHour: string | null
  onSelectHour: (isoHour: string) => void
  zoom: ChartZoom
  onZoomChange: (zoom: ChartZoom) => void
  /** First UK day of the zoomed view ("YYYY-MM-DD"); null = the first day. */
  windowStart: string | null
  onWindowChange: (day: string | null) => void
  view: ChartView
  onViewChange: (view: ChartView) => void
}) {
  const rows = useMemo(() => (data ? buildRows(data) : null), [data])
  const first = data?.forecast[0]?.start_time

  return (
    <SectionShell
      id="forecast-vs-actual"
      title="Forecast vs actual wind generation"
      help={{
        text: "Green: the forecast you could have bought on (one value per hour). Black or white: the wind actually generated (every half-hour). Click the chart to inspect one hour.",
        guideAnchor: "reading-the-chart",
      }}
      updating={updating}
      source={source}
      description={`The forecast available at your buying time, against what was really generated.${first ? ` ${ukZoneLabel(first)}.` : ""}`}
      action={
        <ToggleGroup
          aria-label="Chart view"
          variant="outline"
          size="sm"
          spacing={0}
          value={[view]}
          onValueChange={(value) => {
            const next = CHART_VIEWS.find((v) => v === value[0])
            if (next && next !== view) onViewChange(next)
          }}
        >
          {CHART_VIEWS.map((v) => (
            <ToggleGroupItem key={v} value={v} className={pressedGreen}>
              {v === "lines" ? (
                <ChartLineIcon data-icon="inline-start" aria-hidden />
              ) : (
                <ChartColumnIcon data-icon="inline-start" aria-hidden />
              )}
              <span className="sr-only sm:not-sr-only">{VIEW_LABEL[v]}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      }
    >
      {error && !data ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : isLoading || !rows ? (
        <ChartSkeleton className="h-96" />
      ) : rows.actual.length === 0 ? (
        <EmptyState title="No data for these dates" />
      ) : (
        <ChartBody
          rows={rows}
          view={view}
          zoom={zoom}
          onZoomChange={onZoomChange}
          windowStart={windowStart}
          onWindowChange={onWindowChange}
          selectedHour={selectedHour}
          onSelectHour={onSelectHour}
        />
      )}
    </SectionShell>
  )
}

function ChartBody({
  rows,
  view,
  zoom,
  onZoomChange,
  windowStart,
  onWindowChange,
  selectedHour,
  onSelectHour,
}: {
  rows: Rows
  view: ChartView
  zoom: ChartZoom
  onZoomChange: (zoom: ChartZoom) => void
  windowStart: string | null
  onWindowChange: (day: string | null) => void
  selectedHour: string | null
  onSelectHour: (isoHour: string) => void
}) {
  const [hidden, setHidden] = useState<ReadonlySet<Series>>(new Set())
  const [details, setDetails] = useState(false)

  const { days } = rows
  const span = Math.min(ZOOM_DAYS[zoom], days.length)
  // Start of the window: the requested day, clamped so a full window fits.
  const requested = windowStart ? days.indexOf(windowStart) : 0
  const startIdx = Math.max(0, Math.min(requested, days.length - span))

  const visible = useMemo(() => {
    const visibleDays = rows.days.slice(startIdx, startIdx + span)
    const inView = new Set(visibleDays)
    const forecast = rows.forecast.filter((r) => inView.has(r.day))
    return {
      days: visibleDays,
      actual: rows.actual.filter((r) => inView.has(r.day)),
      forecast,
      ticks: ticksFor(forecast, inView.size),
    }
  }, [rows, startIdx, span])
  const visibleDays = visible.days
  const firstDay = visibleDays[0]
  const lastDay = visibleDays[visibleDays.length - 1]

  const selectedMs = selectedHour ? Date.parse(selectedHour) : null
  const selectedDay = selectedHour ? ukIsoDay(selectedHour) : null
  const selectedOutside =
    selectedDay != null &&
    days.includes(selectedDay) &&
    !visibleDays.includes(selectedDay)

  const goTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, days.length - span))
    onWindowChange(clamped === 0 ? null : days[clamped])
  }
  const rangeLabel =
    span === 1
      ? formatUkDay(rows.actual.find((r) => r.day === firstDay)?.t ?? 0)
      : formatIsoDayRange(firstDay, lastDay)

  const pick = (label: unknown) => {
    const t = Number(label)
    if (Number.isFinite(t)) onSelectHour(isoInstant(floorToHour(t)))
  }

  return (
    <div className="flex flex-col gap-3">
      {days.length > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ToggleGroup
            aria-label="Zoom"
            variant="outline"
            size="sm"
            spacing={0}
            value={[zoom]}
            onValueChange={(value) => {
              const next = CHART_ZOOMS.find((z) => z === value[0])
              if (next && next !== zoom) onZoomChange(next)
            }}
          >
            {CHART_ZOOMS.map((z) => (
              <ToggleGroupItem key={z} value={z} className={pressedGreen}>
                {ZOOM_LABEL[z]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {span < days.length ? (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={zoom === "day" ? "Previous day" : "Previous week"}
                disabled={startIdx === 0}
                onClick={() => goTo(startIdx - span)}
              >
                <ChevronLeftIcon aria-hidden />
              </Button>
              <span
                className="min-w-36 text-center font-medium"
                aria-live="polite"
              >
                {rangeLabel}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={zoom === "day" ? "Next day" : "Next week"}
                disabled={startIdx + span >= days.length}
                onClick={() => goTo(startIdx + span)}
              >
                <ChevronRightIcon aria-hidden />
              </Button>
            </div>
          ) : (
            <span className="font-medium">{rangeLabel}</span>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {view === "lines" ? (
          <SeriesToggles hidden={hidden} onChange={setHidden} />
        ) : (
          <p className="text-muted-foreground">
            Bars above 0: the forecast was too high (over-forecast). Below 0:
            too low (under-forecast).
          </p>
        )}
        <div className="flex items-center gap-2">
          <Switch
            id="tooltip-details"
            size="sm"
            checked={details}
            onCheckedChange={setDetails}
          />
          <Label htmlFor="tooltip-details" className="text-xs font-normal">
            More detail on hover
          </Label>
        </div>
      </div>

      <figure className="flex flex-col gap-2">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-80 w-full"
          role="img"
          aria-label={
            view === "lines"
              ? `Line chart of the hourly forecast and the half-hourly actual wind generation in MW, ${rangeLabel}, ${visible.forecast.length} hours. The same values are listed in the hour-by-hour table below.`
              : `Bar chart of the forecast error (forecast minus actual) in MW for each hour, ${rangeLabel}. The same values are listed in the hour-by-hour table below.`
          }
        >
          {view === "lines" ? (
            <LineChart
              data={visible.actual}
              margin={{ top: 12, right: 8, bottom: 0, left: 4 }}
              onClick={(state) => pick(state?.activeLabel)}
              className="cursor-crosshair"
            >
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <TimeAxis ticks={visible.ticks} multiDay={span > 1} />
              <YAxis
                tickFormatter={(v: number) => formatNumber(v)}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <SelectedMarker selectedMs={selectedMs} />
              <ChartTooltip
                cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
                content={({ active, label }) =>
                  active && label != null ? (
                    <HourTooltip
                      rows={rows}
                      t={Number(label)}
                      details={details}
                    />
                  ) : null
                }
              />
              {hidden.has("actual") ? null : (
                <Line
                  dataKey="actual"
                  name="actual"
                  type="linear"
                  stroke="var(--color-actual)"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                  isAnimationActive={false}
                  connectNulls={false}
                />
              )}
              {hidden.has("forecast") ? null : (
                <Line
                  data={visible.forecast}
                  dataKey="forecast"
                  name="forecast"
                  type="linear"
                  stroke="var(--color-forecast)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                />
              )}
            </LineChart>
          ) : (
            <BarChart
              data={visible.forecast}
              margin={{ top: 12, right: 8, bottom: 0, left: 4 }}
              onClick={(state) => pick(state?.activeLabel)}
              className="cursor-crosshair"
              barCategoryGap={span > 7 ? 0 : 1}
            >
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis
                dataKey="t"
                ticks={visible.ticks}
                tickFormatter={(t: number) =>
                  span > 1 ? formatUkDayMonth(t) : formatUkTime(t)
                }
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                minTickGap={12}
              />
              <YAxis
                tickFormatter={(v: number) =>
                  v > 0 ? `+${formatNumber(v)}` : formatNumber(v)
                }
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <ReferenceLine
                y={0}
                stroke="var(--foreground)"
                strokeOpacity={0.4}
              />
              <ChartTooltip
                cursor={{ fill: "var(--muted)", fillOpacity: 0.6 }}
                content={({ active, label }) =>
                  active && label != null ? (
                    <HourTooltip
                      rows={rows}
                      t={Number(label)}
                      details={details}
                    />
                  ) : null
                }
              />
              <Bar dataKey="error" isAnimationActive={false}>
                {visible.forecast.map((r) => (
                  <Cell
                    key={r.t}
                    fill={
                      r.t === selectedMs
                        ? "var(--highlight)"
                        : "var(--color-error)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ChartContainer>

        {span < days.length ? (
          <Overview
            rows={rows}
            from={firstDay}
            to={lastDay}
            onPickDay={(day) => goTo(days.indexOf(day))}
          />
        ) : null}

        <figcaption className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
          <span>
            Click the chart to inspect an hour. Gaps are left as gaps: an hour
            with no forecast in time is not drawn and not filled in.
          </span>
          {selectedHour ? (
            <span className="flex flex-wrap items-center gap-2 text-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="h-3 w-0.5 bg-highlight" />
                Selected: {formatUkDateTime(selectedHour)} UK
              </span>
              {selectedOutside && selectedDay ? (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => goTo(days.indexOf(selectedDay))}
                >
                  Show it on the chart
                </Button>
              ) : null}
              <a
                href="#publication-history"
                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
              >
                <CrosshairIcon className="size-3.5" aria-hidden />
                Inspect this hour
              </a>
            </span>
          ) : null}
        </figcaption>
      </figure>
    </div>
  )
}

export function TimeAxis({
  ticks,
  multiDay,
}: {
  ticks: number[]
  multiDay: boolean
}) {
  return (
    <XAxis
      dataKey="t"
      type="number"
      scale="time"
      domain={["dataMin", "dataMax"]}
      ticks={ticks}
      tickFormatter={(t: number) =>
        multiDay ? formatUkDayMonth(t) : formatUkTime(t)
      }
      tickLine={false}
      axisLine={{ stroke: "var(--border)" }}
      minTickGap={12}
    />
  )
}

/** Orange marker for the selected hour (D20); labelled, so not colour alone. */
function SelectedMarker({ selectedMs }: { selectedMs: number | null }) {
  if (selectedMs == null) return null
  return (
    <ReferenceLine
      x={selectedMs}
      stroke="var(--highlight)"
      strokeWidth={2}
      label={{
        value: "Selected",
        position: "insideTopRight",
        className: "fill-foreground text-[10px] font-medium",
      }}
    />
  )
}

/** Legend that doubles as show/hide switches for the two lines. */
function SeriesToggles({
  hidden,
  onChange,
}: {
  hidden: ReadonlySet<Series>
  onChange: (next: ReadonlySet<Series>) => void
}) {
  const items: { key: Series; label: string; swatch: string }[] = [
    { key: "forecast", label: "Forecast (hourly)", swatch: "bg-forecast" },
    { key: "actual", label: "Actual (half-hourly)", swatch: "bg-actual" },
  ]
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Lines on the chart">
      {items.map((item) => {
        const shown = !hidden.has(item.key)
        return (
          <li key={item.key}>
            <button
              type="button"
              aria-pressed={shown}
              onClick={() => {
                const next = new Set(hidden)
                if (shown) next.add(item.key)
                else next.delete(item.key)
                onChange(next)
              }}
              className={cn(
                "inline-flex h-7 items-center gap-2 border px-2.5 text-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                !shown && "text-muted-foreground line-through"
              )}
              title={shown ? `Hide ${item.label}` : `Show ${item.label}`}
            >
              <span
                aria-hidden
                className={cn("h-0.5 w-4", item.swatch, !shown && "opacity-30")}
              />
              {item.label}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** Tooltip for one instant: plain values by default, the selection details on demand. */
function HourTooltip({
  rows,
  t,
  details,
}: {
  rows: Rows
  t: number
  details: boolean
}) {
  const hour = floorToHour(t)
  const point = rows.byHour.get(hour)
  const isHourStart = t === hour
  const actualMw = rows.actualAt.get(t) ?? null
  const items: TooltipRow[] = [
    {
      label: "Forecast",
      value:
        point?.forecast_mw == null
          ? "None in time"
          : formatMw(point.forecast_mw),
      swatch: "var(--color-forecast)",
    },
    {
      label: isHourStart ? "Actual" : "Actual (this half-hour)",
      value: formatMw(actualMw),
      swatch: "var(--color-actual)",
    },
  ]
  if (point && isHourStart && point.error_mw != null) {
    items.push({
      label: "How far off",
      value: `${formatSignedMw(point.error_mw)} ${describeError(point.error_mw)}`,
    })
  }
  if (details && point) {
    items.push(
      {
        label: "Published",
        value: formatUkDateTime(point.publish_time),
        muted: true,
      },
      {
        label: "Hours ahead",
        value: formatHours(point.lead_time_h),
        muted: true,
      },
      {
        label: "Buying time (cutoff)",
        value: formatUkDateTime(point.cutoff_time),
        muted: true,
      }
    )
  }
  return (
    <ChartTooltipCard
      title={`${formatUkDateTime(t)} UK`}
      rows={items}
      footer={
        isHourStart
          ? undefined
          : "The error compares each hourly forecast with the half-hour starting at the same time."
      }
    />
  )
}

/** Whole-range strip under the zoomed chart; the window in view is shaded orange.
 * Clicking a day moves the window there. Keyboard users have the arrow buttons. */
function Overview({
  rows,
  from,
  to,
  onPickDay,
}: {
  rows: Rows
  from: string
  to: string
  onPickDay: (day: string) => void
}) {
  const start = rows.actual.find((r) => r.day === from)?.t
  const end = rows.actual.filter((r) => r.day === to).at(-1)?.t
  return (
    <div className="flex flex-col gap-1" aria-hidden>
      <span className="text-[11px] text-muted-foreground">
        Whole range · click to jump
      </span>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-12 w-full cursor-pointer border"
      >
        <LineChart
          data={rows.actual}
          margin={{ top: 2, right: 0, bottom: 2, left: 0 }}
          onClick={(state) => {
            const t = Number(state?.activeLabel)
            if (Number.isFinite(t)) onPickDay(ukIsoDay(t))
          }}
        >
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            hide
          />
          <YAxis hide domain={["auto", "auto"]} />
          {start != null && end != null ? (
            <ReferenceArea
              x1={start}
              x2={end}
              fill="var(--highlight)"
              fillOpacity={0.25}
              stroke="var(--highlight)"
            />
          ) : null}
          <Line
            dataKey="actual"
            type="linear"
            stroke="var(--muted-foreground)"
            strokeWidth={1}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
    </div>
  )
}
