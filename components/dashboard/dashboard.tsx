"use client"

import { useMemo } from "react"

import { ErrorState } from "@/components/common/data-states"
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
  useAnalyticsParams,
  useDashboardParams,
} from "@/hooks/use-dashboard-params"
import type { HistoryParams } from "@/lib/api/query-keys"

// One page = one UK day of delivery hours (in January).
const INTERVAL_PAGE_SIZE = 24

export function Dashboard() {
  const [state, setState] = useDashboardParams()
  const params = useAnalyticsParams(state)
  const view = state.view ?? "lead_time"
  const ordering = state.sort ?? "start_time"

  const meta = useMeta()
  const summary = useSummary(params)
  const timeseries = useTimeseries(params)
  const intervals = useIntervals({
    ...params,
    ordering,
    page: state.page ?? 1,
    page_size: INTERVAL_PAGE_SIZE,
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
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6">
      <DashboardHeader meta={meta.data} />
      {meta.error && !meta.data ? (
        <ErrorState error={meta.error} onRetry={() => void meta.refetch()} />
      ) : null}
      <FiltersBar meta={meta.data} state={state} setState={setState} />
      <KpiCards
        summary={summary.data}
        isLoading={summary.isPending}
        error={summary.error}
        onRetry={() => void summary.refetch()}
      />
      <ForecastVsActualChart
        data={timeseries.data}
        isLoading={timeseries.isPending}
        error={timeseries.error}
        onRetry={() => void timeseries.refetch()}
        selectedHour={state.hour}
        onSelectHour={selectHour}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <PublicationHistory
          hour={state.hour}
          data={history.data}
          isLoading={history.isPending}
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
          error={breakdownQuery.error}
          onRetry={() => void breakdownQuery.refetch()}
          activeLeadTimeH={activeLeadTimeH}
        />
      </div>
      <IntervalTable
        data={intervals.data}
        isLoading={intervals.isPending}
        error={intervals.error}
        onRetry={() => void intervals.refetch()}
        ordering={ordering}
        onOrderingChange={(next) =>
          setState({ sort: next === "start_time" ? null : next, page: null })
        }
        onPageChange={(page) => setState({ page: page === 1 ? null : page })}
        selectedHour={state.hour}
        onSelectHour={selectHour}
      />
      <Methodology meta={meta.data} />
    </main>
  )
}
