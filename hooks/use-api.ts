"use client"

import {
  keepPreviousData,
  skipToken,
  useQuery,
  type QueryFunctionContext,
  type QueryKey,
} from "@tanstack/react-query"

import { api, unwrap } from "@/lib/api/client"
import {
  queryKeys,
  type AnalyticsParams,
  type BreakdownParams,
  type HistoryParams,
  type IntervalParams,
  type LeadTimeCurveParams,
} from "@/lib/api/query-keys"

/*
 * One hook per endpoint. Previous data stays on screen while parameters change
 * (keepPreviousData), so a slider move never flashes the view back to a skeleton.
 * Data is historical: staleTime is set in the QueryClient defaults (providers.tsx).
 */

/**
 * Request options shared by every hook. After Refresh (invalidateQueries) the query is
 * marked invalidated, and its refetch bypasses the browser's HTTP cache (the API sends
 * max-age) so it really reaches the server; the ETag keeps an unchanged answer a 304.
 */
function requestInit({
  client,
  queryKey,
  signal,
}: QueryFunctionContext<QueryKey>): {
  signal: AbortSignal
  cache: RequestCache
} {
  const invalidated = client.getQueryState(queryKey)?.isInvalidated ?? false
  return { signal, cache: invalidated ? "no-cache" : "default" }
}

export function useMeta() {
  return useQuery({
    queryKey: queryKeys.meta(),
    queryFn: (ctx) => unwrap(api.GET("/api/v1/meta", requestInit(ctx))),
  })
}

export function useSummary(params: AnalyticsParams) {
  return useQuery({
    queryKey: queryKeys.summary(params),
    queryFn: (ctx) =>
      unwrap(
        api.GET("/api/v1/summary", {
          params: { query: params },
          ...requestInit(ctx),
        })
      ),
    placeholderData: keepPreviousData,
  })
}

export function useTimeseries(params: AnalyticsParams) {
  return useQuery({
    queryKey: queryKeys.timeseries(params),
    queryFn: (ctx) =>
      unwrap(
        api.GET("/api/v1/timeseries", {
          params: { query: params },
          ...requestInit(ctx),
        })
      ),
    placeholderData: keepPreviousData,
  })
}

export function useIntervals(params: IntervalParams) {
  return useQuery({
    queryKey: queryKeys.intervals(params),
    queryFn: (ctx) =>
      unwrap(
        api.GET("/api/v1/intervals", {
          params: { query: params },
          ...requestInit(ctx),
        })
      ),
    placeholderData: keepPreviousData,
  })
}

export function useBreakdown(params: BreakdownParams, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.breakdown(params),
    queryFn: (ctx) =>
      unwrap(
        api.GET("/api/v1/accuracy/breakdown", {
          params: { query: params },
          ...requestInit(ctx),
        })
      ),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useLeadTimeCurve(
  params: LeadTimeCurveParams,
  enabled: boolean
) {
  return useQuery({
    queryKey: queryKeys.leadTimeCurve(params),
    queryFn: (ctx) =>
      unwrap(
        api.GET("/api/v1/accuracy/by-lead-time", {
          params: { query: params },
          ...requestInit(ctx),
        })
      ),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useForecastHistory(params: HistoryParams | null) {
  return useQuery({
    queryKey: queryKeys.history(params ?? { start_time: "" }),
    queryFn: params
      ? (ctx) =>
          unwrap(
            api.GET("/api/v1/forecasts/history", {
              params: { query: params },
              ...requestInit(ctx),
            })
          )
      : skipToken,
    placeholderData: keepPreviousData,
  })
}
