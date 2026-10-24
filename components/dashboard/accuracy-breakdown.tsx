"use client"

import { TableIcon, LineChartIcon } from "lucide-react"
import { useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import { ChartSkeleton, ErrorState } from "@/components/common/data-states"
import {
  SectionShell,
  type SectionSource,
} from "@/components/common/section-shell"
import { ChartTooltipCard } from "@/components/dashboard/chart-tooltip-card"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BREAKDOWN_VIEWS,
  isBreakdownView,
  type BreakdownView,
} from "@/hooks/use-dashboard-params"
import type { Schemas } from "@/lib/api/client"
import {
  formatHourOfDay,
  formatIsoDay,
  formatMw,
  formatNumber,
  formatPercent,
  formatSignedMw,
} from "@/lib/format"

type Metrics = Schemas["MetricSummary"]
type Curve = Schemas["LeadTimeCurveResponse"]
type Breakdown = Schemas["BreakdownResponse"]

// MAE, RMSE and bias each keep one hue in every accuracy chart (validated set).
const metricConfig = {
  mae: { label: "MAE", color: "var(--chart-3)" },
  rmse: { label: "RMSE", color: "var(--chart-4)" },
  bias: { label: "Bias", color: "var(--chart-5)" },
} satisfies ChartConfig

type Row = {
  x: number | string
  label: string
  mae: number | null
  rmse: number | null
  bias: number | null
  metrics: Metrics
}

function toRow(x: number | string, label: string, metrics: Metrics): Row {
  return {
    x,
    label,
    mae: metrics.mae_mw,
    rmse: metrics.rmse_mw,
    bias: metrics.bias_mw,
    metrics,
  }
}

function metricRows(row: Row) {
  const m = row.metrics
  return [
    { label: "MAE", value: formatMw(m.mae_mw), swatch: "var(--color-mae)" },
    { label: "RMSE", value: formatMw(m.rmse_mw), swatch: "var(--color-rmse)" },
    {
      label: "Bias",
      value: formatSignedMw(m.bias_mw),
      swatch: "var(--color-bias)",
    },
    {
      label: "Matched hours",
      value: `${formatNumber(m.n_matched)} / ${formatNumber(m.n_expected)}`,
      muted: true,
    },
    ...(m.n_missing_forecast > 0
      ? [
          {
            label: "No forecast",
            value: `${m.n_missing_forecast} h`,
            muted: true,
          },
        ]
      : []),
  ]
}

const VIEW_LABEL: Record<BreakdownView, string> = {
  lead_time: "By hours ahead",
  hour_of_day: "By hour of day",
  day: "By day",
}

export function AccuracyBreakdown({
  view,
  onViewChange,
  curve,
  breakdown,
  isLoading,
  updating = false,
  source,
  error,
  onRetry,
  activeLeadTimeH,
}: {
  view: BreakdownView
  onViewChange: (view: BreakdownView) => void
  curve: Curve | undefined
  breakdown: Breakdown | undefined
  isLoading: boolean
  updating?: boolean
  source?: SectionSource | null
  error: unknown
  onRetry: () => void
  activeLeadTimeH: number | null
}) {
  const [asTable, setAsTable] = useState(false)
  const rows = useMemo<Row[] | null>(() => {
    if (view === "lead_time") {
      return curve
        ? curve.points.map((p) =>
            toRow(p.lead_time_h, `${p.lead_time_h} h`, p.metrics)
          )
        : null
    }
    if (!breakdown) return null
    return breakdown.groups.map((g) =>
      toRow(
        g.key,
        view === "hour_of_day" ? formatHourOfDay(g.key) : formatIsoDay(g.key),
        g.metrics
      )
    )
  }, [view, curve, breakdown])

  const data = view === "lead_time" ? curve : breakdown

  return (
    <SectionShell
      id="accuracy"
      title="Accuracy breakdown"
      help={{
        text: "By hours ahead: how much the error shrinks when you buy closer to delivery. By hour of day / by day: when the forecast you bought on was most and least accurate.",
        guideAnchor: "reading-accuracy",
      }}
      updating={updating}
      source={source}
      description={
        view === "lead_time"
          ? "How the error changes with how many hours ahead you buy. Uses the selected dates."
          : "Error of the forecast you bought on, grouped by UK hour of day or UK delivery day."
      }
      action={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAsTable((v) => !v)}
          aria-pressed={asTable}
        >
          {asTable ? (
            <LineChartIcon data-icon="inline-start" aria-hidden />
          ) : (
            <TableIcon data-icon="inline-start" aria-hidden />
          )}
          {asTable ? "Chart" : "Table"}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <Tabs
          value={view}
          onValueChange={(v) => {
            if (isBreakdownView(v)) onViewChange(v)
          }}
        >
          <TabsList>
            {BREAKDOWN_VIEWS.map((v) => (
              <TabsTrigger key={v} value={v}>
                {VIEW_LABEL[v]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {error && !data ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : isLoading || !rows ? (
          <ChartSkeleton className="h-64" />
        ) : asTable ? (
          <MetricsTable
            rows={rows}
            firstColumn={VIEW_LABEL[view].replace("By ", "")}
          />
        ) : view === "lead_time" ? (
          <LeadTimeChart rows={rows} activeLeadTimeH={activeLeadTimeH} />
        ) : (
          <GroupChart rows={rows} />
        )}
      </div>
    </SectionShell>
  )
}

function LeadTimeChart({
  rows,
  activeLeadTimeH,
}: {
  rows: Row[]
  activeLeadTimeH: number | null
}) {
  // Where coverage starts to drop comes from the data (n_missing_forecast), not a constant.
  const gapStart = rows.find((r) => r.metrics.n_missing_forecast > 0)
  const last = rows[rows.length - 1]
  return (
    <figure className="flex flex-col gap-2">
      <ChartContainer
        config={metricConfig}
        className="aspect-auto h-64 w-full"
        role="img"
        aria-label="Line chart of MAE, RMSE and bias in MW against required lead time in hours. Use the Table button for the values."
      >
        <LineChart
          data={rows}
          margin={{ top: 16, right: 12, bottom: 0, left: 4 }}
        >
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="x"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(h: number) => `${h} h`}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            ticks={rows.map((r) => Number(r.x)).filter((h) => h % 6 === 0)}
          />
          <YAxis
            tickFormatter={(v: number) => formatNumber(v)}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <ReferenceLine y={0} stroke="var(--border)" />
          {gapStart ? (
            <ReferenceArea
              x1={Number(gapStart.x)}
              x2={Number(last.x)}
              fill="var(--muted-foreground)"
              fillOpacity={0.08}
            />
          ) : null}
          {activeLeadTimeH != null ? (
            <ReferenceLine
              x={activeLeadTimeH}
              stroke="var(--highlight)"
              strokeWidth={2}
              label={{
                value: "Your setting",
                position: "insideTopLeft",
                className: "fill-foreground text-[10px]",
              }}
            />
          ) : null}
          <ChartTooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              // Recharts types the payload loosely; rows are our own data.
              const row = payload?.[0]?.payload as Row | undefined
              if (!active || !row) return null
              return (
                <ChartTooltipCard
                  title={`Buying ${row.label} ahead`}
                  rows={metricRows(row)}
                />
              )
            }}
          />
          <ChartLegend content={<ChartLegendContent />} verticalAlign="top" />
          {(["mae", "rmse", "bias"] as const).map((key) => (
            <Line
              key={key}
              dataKey={key}
              type="linear"
              stroke={`var(--color-${key})`}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
      <figcaption className="text-muted-foreground">
        Buying closer to delivery allows newer forecasts, so the error usually
        falls as the hours ahead shrink. Bias above zero means over-forecasting.
        {gapStart
          ? ` Shaded: from ${gapStart.x} h some delivery hours have no forecast old enough (${last.metrics.n_missing_forecast} of ${last.metrics.n_expected} at ${last.x} h); they are excluded, not filled in.`
          : ""}
      </figcaption>
    </figure>
  )
}

function GroupChart({ rows }: { rows: Row[] }) {
  return (
    <ChartContainer
      config={metricConfig}
      className="aspect-auto h-64 w-full"
      role="img"
      aria-label="Bar chart of MAE and bias in MW per group. Use the Table button for the values."
    >
      <BarChart
        data={rows}
        margin={{ top: 16, right: 12, bottom: 0, left: 4 }}
        barGap={2}
      >
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          minTickGap={8}
          tickFormatter={(label: string) => label.replace(/ 2026$/, "")}
        />
        <YAxis
          tickFormatter={(v: number) => formatNumber(v)}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <ReferenceLine y={0} stroke="var(--border)" />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", fillOpacity: 0.6 }}
          content={({ active, payload }) => {
            // Recharts types the payload loosely; rows are our own data.
            const row = payload?.[0]?.payload as Row | undefined
            if (!active || !row) return null
            return <ChartTooltipCard title={row.label} rows={metricRows(row)} />
          }}
        />
        <ChartLegend content={<ChartLegendContent />} verticalAlign="top" />
        <Bar dataKey="mae" fill="var(--color-mae)" isAnimationActive={false} />
        <Bar
          dataKey="bias"
          fill="var(--color-bias)"
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  )
}

function MetricsTable({
  rows,
  firstColumn,
}: {
  rows: Row[]
  firstColumn: string
}) {
  return (
    <div className="max-h-72 overflow-auto border">
      <table className="w-full text-xs">
        <caption className="sr-only">
          Accuracy metrics per {firstColumn}
        </caption>
        <thead className="sticky top-0 bg-card">
          <tr className="border-b text-left text-muted-foreground">
            <th scope="col" className="px-2 py-1.5 font-medium capitalize">
              {firstColumn}
            </th>
            <th scope="col" className="px-2 py-1.5 text-right font-medium">
              MAE
            </th>
            <th scope="col" className="px-2 py-1.5 text-right font-medium">
              RMSE
            </th>
            <th scope="col" className="px-2 py-1.5 text-right font-medium">
              Bias
            </th>
            <th scope="col" className="px-2 py-1.5 text-right font-medium">
              Coverage
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row.x)} className="border-b last:border-0">
              <th scope="row" className="px-2 py-1 text-left font-normal">
                {row.label}
              </th>
              <td className="px-2 py-1 text-right font-mono tabular-nums">
                {formatMw(row.mae)}
              </td>
              <td className="px-2 py-1 text-right font-mono tabular-nums">
                {formatMw(row.rmse)}
              </td>
              <td className="px-2 py-1 text-right font-mono tabular-nums">
                {formatSignedMw(row.bias)}
              </td>
              <td className="px-2 py-1 text-right font-mono tabular-nums">
                {formatPercent(row.metrics.coverage_pct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
