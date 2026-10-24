"use client"

import { useIsFetching, useQueryClient } from "@tanstack/react-query"
import { RefreshCwIcon, TriangleAlertIcon } from "lucide-react"
import { useMemo } from "react"

import { AppHeader, type HeaderLink } from "@/components/common/app-header"
import { ErrorState } from "@/components/common/data-states"
import type { SectionSource } from "@/components/common/section-shell"
import { AccuracyBreakdown } from "@/components/dashboard/accuracy-breakdown"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { FiltersBar } from "@/components/dashboard/filters-bar"
import { ForecastVsActualChart } from "@/components/dashboard/forecast-vs-actual-chart"
import { IntervalTable } from "@/components/dashboard/interval-table"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { Methodology } from "@/components/dashboard/methodology"
import {
  PublicationHistory,
  WORKED_EXAMPLE_HOUR,
} from "@/components/dashboard/publication-history"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  useBreakdown,
  useForecastHistory,
  useIntervals,
  useLeadTimeCurve,
  useMeta,
  useSummary,
  useTimeseries,
} from "@/hooks/use-api"
import {
  DEFAULT_CHART_ZOOM,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZES,
  useAnalyticsParams,
  useDashboardParams,
} from "@/hooks/use-dashboard-params"
import type { HistoryParams } from "@/lib/api/query-keys"

const SECTIONS: HeaderLink[] = [
  { href: "#overview", label: "Key numbers" },
  { href: "#forecast-vs-actual", label: "Chart" },
  { href: "#publication-history", label: "Inspect an hour" },
  { href: "#accuracy", label: "Accuracy" },
  { href: "#intervals", label: "Hour-by-hour table" },
  { href: "#methodology", label: "How it works" },
]

/** The parts of a query result a section needs to show its state honestly. */
type QueryLike = {
  data?: { data_version: number }
  dataUpdatedAt: number
  isFetching: boolean
}

function sourceOf(query: QueryLike): SectionSource | null {
  return query.data
    ? { dataVersion: query.data.data_version, fetchedAt: query.dataUpdatedAt }
    : null
}

/** Newer data is loading while the previous data stays on screen. */
function isUpdating(query: QueryLike): boolean {
  return query.isFetching && query.data !== undefined
}

export function Dashboard() {
  const [state, setState] = useDashboardParams()
  const params = useAnalyticsParams(state)
  const view = state.view ?? "lead_time"
  const ordering = state.sort ?? "start_time"
  const pageSize = state.size ?? DEFAULT_PAGE_SIZE

  const meta = useMeta()
  const summary = useSummary(params)
  const timeseries = useTimeseries(params)
  const intervals = useIntervals({
    ...params,
    ordering,
    page: state.page ?? 1,
    page_size: pageSize,
  })
  const curve = useLeadTimeCurve(
    { date_from: params.date_from, date_to: params.date_to },
    view === "lead_time"
  )
  const breakdown = useBreakdown(
    { ...params, group_by: view === "day" ? "day" : "hour_of_day" },
    view !== "lead_time"
  )
  const historyParams = useMemo<HistoryParams | null>(() => {
    if (!state.hour) return null
    // History is for one hour: same policy, no date range.
    const { policy, gate_time, gate_days_before, lead_time_h } = params
    return {
      start_time: state.hour,
      policy,
      gate_time,
      gate_days_before,
      lead_time_h,
    }
  }, [state.hour, params])
  const history = useForecastHistory(historyParams)

  // The API echoes the normalised query, so the "current" lead time is what the
  // server actually used (null under the daily gate).
  const activeLeadTimeH = summary.data?.query.lead_time_h ?? null
  const breakdownQuery = view === "lead_time" ? curve : breakdown

  const selectHour = (hour: string) => {
    setState({ hour })
    document
      .getElementById("publication-history")
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }

  return (
    <>
      <AppHeader current="dashboard" nav={SECTIONS} />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4">
        <DashboardHeader meta={meta.data} />
        {meta.error && !meta.data ? (
          <ErrorState error={meta.error} onRetry={() => void meta.refetch()} />
        ) : null}
        <DataVersionCheck
          versions={[
            meta.data?.data_version,
            summary.data?.data_version,
            timeseries.data?.data_version,
            intervals.data?.data_version,
            breakdownQuery.data?.data_version,
            state.hour ? history.data?.data_version : undefined,
          ]}
        />
        <FiltersBar
          meta={meta.data}
          state={state}
          setState={setState}
          missingForecastHours={
            summary.data?.metrics.n_missing_forecast ?? null
          }
        />
        <KpiCards
          summary={summary.data}
          isLoading={summary.isPending}
          updating={isUpdating(summary)}
          source={sourceOf(summary)}
          error={summary.error}
          onRetry={() => void summary.refetch()}
        />
        <ForecastVsActualChart
          data={timeseries.data}
          isLoading={timeseries.isPending}
          updating={isUpdating(timeseries)}
          source={sourceOf(timeseries)}
          error={timeseries.error}
          onRetry={() => void timeseries.refetch()}
          selectedHour={state.hour}
          onSelectHour={selectHour}
          zoom={state.zoom ?? DEFAULT_CHART_ZOOM}
          onZoomChange={(zoom) =>
            setState({
              zoom: zoom === DEFAULT_CHART_ZOOM ? null : zoom,
              win: null,
            })
          }
          windowStart={state.win}
          onWindowChange={(win) => setState({ win })}
          view={state.chart ?? "lines"}
          onViewChange={(chart) =>
            setState({ chart: chart === "lines" ? null : chart })
          }
        />
        <div className="grid gap-3 lg:grid-cols-2">
          <PublicationHistory
            hour={state.hour}
            data={history.data}
            isLoading={history.isPending}
            updating={isUpdating(history)}
            source={sourceOf(history)}
            error={history.error}
            onRetry={() => void history.refetch()}
            onPickExample={() => selectHour(WORKED_EXAMPLE_HOUR)}
          />
          <AccuracyBreakdown
            view={view}
            onViewChange={(next) =>
              setState({ view: next === "lead_time" ? null : next })
            }
            curve={curve.data}
            breakdown={breakdown.data}
            isLoading={breakdownQuery.isPending}
            updating={isUpdating(breakdownQuery)}
            source={sourceOf(breakdownQuery)}
            error={breakdownQuery.error}
            onRetry={() => void breakdownQuery.refetch()}
            activeLeadTimeH={activeLeadTimeH}
          />
        </div>
        <IntervalTable
          data={intervals.data}
          isLoading={intervals.isPending}
          updating={isUpdating(intervals)}
          source={sourceOf(intervals)}
          error={intervals.error}
          onRetry={() => void intervals.refetch()}
          ordering={ordering}
          onOrderingChange={(next) =>
            setState({ sort: next === "start_time" ? null : next, page: null })
          }
          onPageChange={(page) => setState({ page: page === 1 ? null : page })}
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            const next = PAGE_SIZES.find((s) => s === size)
            if (next == null) return
            setState({
              size: next === DEFAULT_PAGE_SIZE ? null : next,
              page: null,
            })
          }}
          selectedHour={state.hour}
          onSelectHour={selectHour}
        />
        <Methodology meta={meta.data} />
      </main>
    </>
  )
}

/**
 * Every section must describe the same data. If the data was reloaded while the page
 * was open, sections can briefly come from different data versions: say so and offer a
 * refresh, rather than showing numbers that do not belong together.
 */
function DataVersionCheck({ versions }: { versions: (number | undefined)[] }) {
  const client = useQueryClient()
  const fetching = useIsFetching() > 0
  const distinct = new Set(versions.filter((v) => v !== undefined))
  if (fetching || distinct.size <= 1) return null
  return (
    <Alert className="border-highlight">
      <TriangleAlertIcon aria-hidden />
      <AlertTitle>The data was updated while this page was open</AlertTitle>
      <AlertDescription>
        <p>
          Some sections show the old data and some the new. Refresh to see
          numbers that belong together.
        </p>
        <Button
          size="sm"
          className="mt-2"
          onClick={() => void client.invalidateQueries()}
        >
          <RefreshCwIcon data-icon="inline-start" aria-hidden />
          Refresh all sections
        </Button>
      </AlertDescription>
    </Alert>
  )
}
