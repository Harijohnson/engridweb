"use client"

import { CheckIcon, ClockAlertIcon, HistoryIcon, XIcon } from "lucide-react"
import { useEffect, useMemo, useRef } from "react"
import {
  CartesianGrid,
  ReferenceLine,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartSkeleton,
  EmptyState,
  ErrorState,
} from "@/components/common/data-states"
import { SectionShell } from "@/components/common/section-shell"
import { ChartTooltipCard } from "@/components/dashboard/chart-tooltip-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"
import type { Schemas } from "@/lib/api/client"
import {
  describeError,
  formatHours,
  formatMw,
  formatNumber,
  formatSignedMw,
  formatUkDateTime,
  formatUkDateTimeWithYear,
  formatUkDayMonth,
  formatUkTime,
  ukZoneLabel,
} from "@/lib/format"

type History = Schemas["HistoryResponse"]
type VersionStatus = Schemas["VersionStatusEnum"]

/** The worked example from PLAN.md §2.4, offered as a shortcut (it is not data). */
export const WORKED_EXAMPLE_HOUR = "2026-01-15T18:00:00Z"

export const STATUS_LABEL: Record<VersionStatus, string> = {
  selected: "Selected",
  superseded: "Superseded",
  after_cutoff: "After cutoff",
  after_delivery_start: "After delivery start",
}

const STATUS_HELP: Record<VersionStatus, string> = {
  selected: "Latest version published at or before the cutoff: the one used.",
  superseded:
    "Published before the cutoff, but a newer eligible version exists.",
  after_cutoff: "Published after the cutoff: too late for the decision.",
  after_delivery_start:
    "Published after the hour started: never a decision input.",
}

const STATUS_ORDER: VersionStatus[] = [
  "selected",
  "superseded",
  "after_cutoff",
  "after_delivery_start",
]

// Only the selected version wears the forecast colour; every other version is neutral
// and told apart by marker shape and the text label, never by colour alone.
const chartConfig = {
  selected: { label: STATUS_LABEL.selected, color: "var(--chart-1)" },
  superseded: { label: STATUS_LABEL.superseded, color: "var(--chart-muted)" },
  after_cutoff: {
    label: STATUS_LABEL.after_cutoff,
    color: "var(--chart-muted)",
  },
  after_delivery_start: {
    label: STATUS_LABEL.after_delivery_start,
    color: "var(--chart-muted)",
  },
} satisfies ChartConfig

const SHAPES: Record<
  VersionStatus,
  "circle" | "diamond" | "cross" | "triangle"
> = {
  selected: "circle",
  superseded: "circle",
  after_cutoff: "triangle",
  after_delivery_start: "cross",
}

function StatusIcon({ status }: { status: VersionStatus }) {
  switch (status) {
    case "selected":
      return <CheckIcon aria-hidden />
    case "superseded":
      return <HistoryIcon aria-hidden />
    case "after_cutoff":
      return <ClockAlertIcon aria-hidden />
    case "after_delivery_start":
      return <XIcon aria-hidden />
    default: {
      const unreachable: never = status
      return unreachable
    }
  }
}

export function StatusBadge({ status }: { status: VersionStatus }) {
  return (
    <Badge
      variant={status === "selected" ? "default" : "outline"}
      title={STATUS_HELP[status]}
    >
      <StatusIcon status={status} />
      {STATUS_LABEL[status]}
    </Badge>
  )
}

export function PublicationHistory({
  hour,
  data,
  isLoading,
  error,
  onRetry,
  onPickExample,
}: {
  hour: string | null
  data: History | undefined
  isLoading: boolean
  error: unknown
  onRetry: () => void
  onPickExample: () => void
}) {
  const series = useMemo(() => {
    if (!data) return null
    return STATUS_ORDER.map((status) => ({
      status,
      points: data.versions
        .filter((v) => v.status === status)
        .map((v) => ({ ...v, t: Date.parse(v.publish_time) })),
    })).filter((s) => s.points.length > 0)
  }, [data])

  const title = hour
    ? `Publication history · ${formatUkDateTimeWithYear(hour)}`
    : "Publication history"

  return (
    <SectionShell
      id="publication-history"
      title={title}
      description={`Every forecast version for one delivery hour, and why only one was usable.${hour ? ` ${ukZoneLabel(hour)}.` : ""}`}
    >
      {!hour ? (
        <EmptyState title="Pick a delivery hour">
          <p>
            Click a point on the forecast chart or a row in the interval table.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={onPickExample}
          >
            Show the worked example (15 Jan, 18:00)
          </Button>
        </EmptyState>
      ) : error && !data ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : isLoading || !data || !series ? (
        <ChartSkeleton className="h-64" />
      ) : data.versions.length === 0 ? (
        <EmptyState title="No forecast versions for this hour" />
      ) : (
        <HistoryBody data={data} series={series} />
      )}
    </SectionShell>
  )
}

function HistoryBody({
  data,
  series,
}: {
  data: History
  series: {
    status: VersionStatus
    points: (Schemas["HistoryVersion"] & { t: number })[]
  }[]
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLTableRowElement>(null)
  // Bring the selected version into view inside the list (not the whole page).
  useEffect(() => {
    const list = listRef.current
    const row = selectedRef.current
    if (list && row) {
      list.scrollTop =
        row.offsetTop - list.clientHeight / 2 + row.clientHeight / 2
    }
  }, [data])

  const startMs = Date.parse(data.start_time)
  const cutoffMs = Date.parse(data.cutoff_time)
  const policy = data.query
  const policyText =
    policy.policy === "daily_gate"
      ? `Daily gate: D-${policy.gate_days_before} at ${policy.gate_time} UK`
      : `Lead time: ${policy.lead_time_h} h before delivery`

  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Cutoff</dt>
          <dd>{formatUkDateTime(data.cutoff_time)}</dd>
          <dd className="text-muted-foreground">{policyText}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Selected forecast</dt>
          <dd>{formatMw(data.selected_forecast_mw)}</dd>
          <dd className="text-muted-foreground">
            {data.selected_publish_time
              ? `published ${formatUkDateTime(data.selected_publish_time)}`
              : "none published before the cutoff"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Actual (HH:00–HH:30)</dt>
          <dd>{formatMw(data.actual_mw)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Error</dt>
          <dd>{formatSignedMw(data.selected_error_mw)}</dd>
          <dd className="text-muted-foreground">
            {describeError(data.selected_error_mw)}
          </dd>
        </div>
      </dl>

      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-64 w-full"
        role="img"
        aria-label={`Scatter chart of ${data.versions.length} forecast versions by publish time, with the cutoff, the delivery start and the actual value marked. The same versions are listed below.`}
      >
        <ScatterChart margin={{ top: 16, right: 12, bottom: 0, left: 4 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin - 3600000", "dataMax + 3600000"]}
            tickFormatter={(t: number) =>
              `${formatUkDayMonth(t)} ${formatUkTime(t)}`
            }
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            minTickGap={24}
            name="Published"
          />
          <YAxis
            dataKey="forecast_mw"
            type="number"
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => formatNumber(v)}
            tickLine={false}
            axisLine={false}
            width={52}
            name="Forecast"
          />
          <ReferenceLine
            x={cutoffMs}
            stroke="var(--foreground)"
            strokeOpacity={0.6}
            label={{
              value: "Cutoff",
              position: "top",
              className: "fill-foreground text-[10px]",
            }}
          />
          <ReferenceLine
            x={startMs}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 3"
            label={{
              value: "Delivery",
              position: "top",
              className: "fill-muted-foreground text-[10px]",
            }}
          />
          {data.actual_mw != null ? (
            <ReferenceLine
              y={data.actual_mw}
              stroke="var(--chart-2)"
              strokeWidth={1.5}
              label={{
                value: `Actual ${formatNumber(data.actual_mw)} MW`,
                position: "insideBottomLeft",
                className: "fill-foreground text-[10px]",
              }}
            />
          ) : null}
          <ChartTooltip
            cursor={false}
            content={({ active, payload }) => {
              // Recharts types the payload loosely; these points are our own series data.
              const point = payload?.[0]?.payload as
                (Schemas["HistoryVersion"] & { t: number }) | undefined
              if (!active || !point) return null
              return (
                <ChartTooltipCard
                  title={`Published ${formatUkDateTime(point.publish_time)} (UK)`}
                  rows={[
                    { label: "Forecast", value: formatMw(point.forecast_mw) },
                    {
                      label: "Lead time",
                      value: formatHours(point.lead_time_h),
                    },
                    { label: "Status", value: STATUS_LABEL[point.status] },
                  ]}
                  footer={STATUS_HELP[point.status]}
                />
              )
            }}
          />
          <ChartLegend
            content={<ChartLegendContent />}
            verticalAlign="bottom"
          />
          {series.map((s) => (
            <Scatter
              key={s.status}
              name={s.status}
              data={s.points}
              fill={`var(--color-${s.status})`}
              shape={SHAPES[s.status]}
              isAnimationActive={false}
            />
          ))}
        </ScatterChart>
      </ChartContainer>

      <div ref={listRef} className="max-h-64 overflow-auto border">
        <table className="w-full text-xs">
          <caption className="sr-only">
            Forecast versions for this delivery hour, oldest first
          </caption>
          <thead className="sticky top-0 bg-card">
            <tr className="border-b text-left text-muted-foreground">
              <th scope="col" className="px-2 py-1.5 font-medium">
                Published (UK)
              </th>
              <th scope="col" className="px-2 py-1.5 text-right font-medium">
                Forecast
              </th>
              <th scope="col" className="px-2 py-1.5 text-right font-medium">
                Lead time
              </th>
              <th scope="col" className="px-2 py-1.5 font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {data.versions.map((v) => (
              <tr
                key={v.publish_time}
                ref={v.status === "selected" ? selectedRef : undefined}
                className={
                  v.status === "selected"
                    ? "bg-muted font-medium"
                    : "border-b last:border-0"
                }
              >
                <td className="px-2 py-1">
                  {formatUkDateTime(v.publish_time)}
                </td>
                <td className="px-2 py-1 text-right font-mono tabular-nums">
                  {formatMw(v.forecast_mw)}
                </td>
                <td className="px-2 py-1 text-right font-mono tabular-nums">
                  {formatHours(v.lead_time_h)}
                </td>
                <td className="px-2 py-1">
                  <StatusBadge status={v.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
