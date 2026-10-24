import type { paths } from "@/lib/api/schema"

type QueryOf<P extends keyof paths> = paths[P] extends {
  get: { parameters: { query?: infer Q } }
}
  ? NonNullable<Q>
  : never

export type AnalyticsParams = QueryOf<"/api/v1/summary">
export type IntervalParams = QueryOf<"/api/v1/intervals">
export type BreakdownParams = QueryOf<"/api/v1/accuracy/breakdown">
export type LeadTimeCurveParams = QueryOf<"/api/v1/accuracy/by-lead-time">
export type HistoryParams = QueryOf<"/api/v1/forecasts/history">
export type IntervalOrdering = NonNullable<IntervalParams["ordering"]>
export type GroupBy = BreakdownParams["group_by"]
export type PolicyKind = NonNullable<AnalyticsParams["policy"]>

/** Single factory so caching and invalidation stay consistent across hooks. */
export const queryKeys = {
  meta: () => ["meta"] as const,
  summary: (params: AnalyticsParams) => ["summary", params] as const,
  timeseries: (params: AnalyticsParams) => ["timeseries", params] as const,
  intervals: (params: IntervalParams) => ["intervals", params] as const,
  breakdown: (params: BreakdownParams) => ["breakdown", params] as const,
  leadTimeCurve: (params: LeadTimeCurveParams) =>
    ["lead-time-curve", params] as const,
  history: (params: HistoryParams) => ["history", params] as const,
}
