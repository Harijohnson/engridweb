"use client"

import {
  createParser,
  parseAsInteger,
  parseAsNumberLiteral,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"
import { useMemo } from "react"

import type {
  AnalyticsParams,
  IntervalOrdering,
  PolicyKind,
} from "@/lib/api/query-keys"

/** A calendar date "YYYY-MM-DD", kept as a string so no time zone can shift it. */
const parseAsIsoDay = createParser({
  parse: (value) => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null),
  serialize: (value: string) => value,
})

/** UK wall-clock time "HH:MM". */
const parseAsClock = createParser({
  parse: (value) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : null),
  serialize: (value: string) => value,
})

/** A delivery-hour instant, ISO-8601 in UTC. */
const parseAsInstant = createParser({
  parse: (value) =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/.test(value) ? value : null,
  serialize: (value: string) => value,
})

export const POLICIES = [
  "daily_gate",
  "lead_time",
] as const satisfies readonly PolicyKind[]
export const BREAKDOWN_VIEWS = ["lead_time", "hour_of_day", "day"] as const
export type BreakdownView = (typeof BREAKDOWN_VIEWS)[number]

function isOneOf<T extends string>(
  options: readonly T[],
  value: unknown
): value is T {
  return (
    typeof value === "string" && (options as readonly string[]).includes(value)
  )
}

/** Chart zoom (D25): how many UK days the forecast-vs-actual chart shows at once. */
export const CHART_ZOOMS = ["day", "week", "month"] as const
export type ChartZoom = (typeof CHART_ZOOMS)[number]
export const DEFAULT_CHART_ZOOM: ChartZoom = "week"

/** Chart view: the two lines, or the error per hour as bars. */
export const CHART_VIEWS = ["lines", "error"] as const
export type ChartView = (typeof CHART_VIEWS)[number]

/** Interval table rows per page: one day, two days, one week of hours. */
export const PAGE_SIZES = [24, 48, 168] as const
export const DEFAULT_PAGE_SIZE = PAGE_SIZES[0]

export const isPolicy = (value: unknown): value is PolicyKind =>
  isOneOf(POLICIES, value)
export const isBreakdownView = (value: unknown): value is BreakdownView =>
  isOneOf(BREAKDOWN_VIEWS, value)

export const INTERVAL_ORDERINGS = [
  "start_time",
  "-start_time",
  "forecast_mw",
  "-forecast_mw",
  "actual_mw",
  "-actual_mw",
  "error_mw",
  "-error_mw",
  "abs_error_mw",
  "-abs_error_mw",
  "publish_time",
  "-publish_time",
  "lead_time_h",
  "-lead_time_h",
] as const satisfies readonly IntervalOrdering[]

export const isIntervalOrdering = (value: unknown): value is IntervalOrdering =>
  isOneOf(INTERVAL_ORDERINGS, value)

/**
 * Every filter lives in the URL (D8), so views are shareable and Back works.
 * Unset values stay null: the backend then applies its own defaults (served by
 * /api/v1/meta), so no default is duplicated here.
 */
const dashboardParsers = {
  from: parseAsIsoDay,
  to: parseAsIsoDay,
  policy: parseAsStringLiteral(POLICIES),
  gate: parseAsClock,
  days: parseAsInteger,
  lead: parseAsInteger,
  hour: parseAsInstant,
  sort: parseAsStringLiteral(INTERVAL_ORDERINGS),
  page: parseAsInteger,
  view: parseAsStringLiteral(BREAKDOWN_VIEWS),
  zoom: parseAsStringLiteral(CHART_ZOOMS),
  /** First UK delivery day shown by the zoomed chart. */
  win: parseAsIsoDay,
  chart: parseAsStringLiteral(CHART_VIEWS),
  size: parseAsNumberLiteral(PAGE_SIZES),
}

export function useDashboardParams() {
  return useQueryStates(dashboardParsers, { history: "replace" })
}

export type DashboardState = ReturnType<typeof useDashboardParams>[0]

/**
 * Translate URL state into API query params. Only explicitly chosen values are
 * sent, and only those that belong to the active policy, so the request is always
 * consistent (the API rejects gate params with lead_time and vice versa).
 */
type AnalyticsSlice = Pick<
  DashboardState,
  "from" | "to" | "policy" | "gate" | "days" | "lead"
>

export function analyticsParams(state: AnalyticsSlice): AnalyticsParams {
  const params: AnalyticsParams = {}
  if (state.from) params.date_from = state.from
  if (state.to) params.date_to = state.to
  const policy =
    state.policy ??
    (state.lead != null
      ? "lead_time"
      : state.gate || state.days != null
        ? "daily_gate"
        : null)
  if (policy === "lead_time") {
    params.policy = "lead_time"
    if (state.lead != null) params.lead_time_h = state.lead
  } else if (policy === "daily_gate") {
    params.policy = "daily_gate"
    if (state.gate) params.gate_time = state.gate
    if (state.days != null) params.gate_days_before = state.days
  }
  return params
}

export function useAnalyticsParams(state: AnalyticsSlice): AnalyticsParams {
  const { from, to, policy, gate, days, lead } = state
  return useMemo(
    () => analyticsParams({ from, to, policy, gate, days, lead }),
    [from, to, policy, gate, days, lead]
  )
}
