/**
 * TEST FIXTURES, not analysis data. Typed with the generated OpenAPI types so they can
 * never drift from the API contract. Values are small and round on purpose, except
 * the publication history, which mirrors the PLAN.md §2.4 worked example.
 */
import type { Schemas } from "@/lib/api/client"

type Metrics = Schemas["MetricSummary"]

export const query: Schemas["QueryEcho"] = {
  date_from: "2026-01-01",
  date_to: "2026-01-31",
  timezone: "Europe/London",
  policy: "daily_gate",
  gate_time: "10:00",
  gate_days_before: 1,
  lead_time_h: null,
}

export function metrics(overrides: Partial<Metrics> = {}): Metrics {
  return {
    n_expected: 744,
    n_matched: 744,
    n_missing_forecast: 0,
    n_missing_actual: 0,
    coverage_pct: 100,
    mae_mw: 2000,
    rmse_mw: 2500,
    bias_mw: 1500,
    median_abs_error_mw: 1700,
    p90_abs_error_mw: 4000,
    max_abs_error_mw: 7000,
    mean_forecast_mw: 13000,
    mean_actual_mw: 11500,
    ...overrides,
  }
}

export const emptyMetrics: Metrics = metrics({
  n_matched: 0,
  n_missing_forecast: 744,
  coverage_pct: 0,
  mae_mw: null,
  rmse_mw: null,
  bias_mw: null,
  median_abs_error_mw: null,
  p90_abs_error_mw: null,
  max_abs_error_mw: null,
  mean_forecast_mw: null,
  mean_actual_mw: null,
})

export const summary: Schemas["SummaryResponse"] = {
  query,
  data_version: 1,
  matching_method: "same_start_time",
  metrics: metrics(),
}

export const meta: Schemas["MetaResponse"] = {
  data_version: 1,
  evaluation_window: {
    date_from: "2026-01-01",
    date_to: "2026-01-31",
    timezone: "Europe/London",
  },
  policies: {
    default: "daily_gate",
    available: ["daily_gate", "lead_time"],
    daily_gate: {
      gate_time_default: "10:00",
      gate_days_before_default: 1,
      gate_days_before_min: 1,
      gate_days_before_max: 3,
    },
    lead_time: {
      lead_time_h_default: 24,
      lead_time_h_min: 0,
      lead_time_h_max: 48,
    },
  },
  matching: {
    method: "same_start_time",
    description:
      "Each hourly forecast is compared with the half-hour starting at the same time.",
  },
  coverage: {
    forecast: {
      expected: 744,
      present: 744,
      missing: 0,
      rows: 18080,
      distinct_publishes: 264,
      versions_per_hour_min: 15,
      versions_per_hour_max: 23,
      versions_per_hour_mean: 19.33,
    },
    actual: { expected: 1488, present: 1488, missing: 0 },
  },
  ingestion: [
    {
      dataset: "WINDFOR",
      source: "snapshot",
      run_id: 1,
      status: "succeeded",
      started_at: "2026-10-24T07:00:00Z",
      finished_at: "2026-10-24T07:00:05Z",
      rows_received: 21024,
      rows_created: 21024,
      rows_rejected: 0,
    },
  ],
  timezone_note: "All timestamps in the API are UTC.",
  data_sources: [
    {
      dataset: "WINDFOR",
      name: "Wind generation forecast",
      url: "https://bmrs.elexon.co.uk/",
      description: "fixture",
    },
  ],
  limitations: ["fixture"],
}

export const timeseries: Schemas["TimeseriesResponse"] = {
  query,
  data_version: 1,
  forecast: [
    {
      start_time: "2026-01-15T18:00:00Z",
      cutoff_time: "2026-01-14T10:00:00Z",
      publish_time: "2026-01-14T09:30:00Z",
      forecast_mw: 9000,
      lead_time_h: 32.5,
      actual_mw: 8000,
      error_mw: 1000,
      status: "matched",
    },
  ],
  actual: [
    {
      start_time: "2026-01-15T18:00:00Z",
      actual_mw: 8000,
      settlement_date: "2026-01-15",
      settlement_period: 37,
    },
    {
      start_time: "2026-01-15T18:30:00Z",
      actual_mw: 7900,
      settlement_date: "2026-01-15",
      settlement_period: 38,
    },
  ],
}

export const intervalPage: Schemas["IntervalPage"] = {
  query,
  data_version: 1,
  ordering: "start_time",
  count: 2,
  page: 1,
  page_size: 24,
  num_pages: 1,
  next: null,
  previous: null,
  results: [
    {
      start_time: "2026-01-15T18:00:00Z",
      forecast_mw: 9000,
      actual_mw: 8000,
      error_mw: 1000,
      abs_error_mw: 1000,
      publish_time: "2026-01-14T09:30:00Z",
      lead_time_h: 32.5,
      cutoff_time: "2026-01-14T10:00:00Z",
      status: "matched",
    },
    {
      start_time: "2026-01-15T19:00:00Z",
      forecast_mw: null,
      actual_mw: 7800,
      error_mw: null,
      abs_error_mw: null,
      publish_time: null,
      lead_time_h: null,
      cutoff_time: "2026-01-14T10:00:00Z",
      status: "missing_forecast",
    },
  ],
}

export const history: Schemas["HistoryResponse"] = {
  query: {
    start_time: "2026-01-15T18:00:00Z",
    policy: "daily_gate",
    gate_time: "10:00",
    gate_days_before: 1,
    lead_time_h: null,
  },
  data_version: 1,
  start_time: "2026-01-15T18:00:00Z",
  cutoff_time: "2026-01-14T10:00:00Z",
  actual_mw: 7672,
  selected_publish_time: "2026-01-14T09:30:00Z",
  selected_forecast_mw: 9053,
  selected_error_mw: 1381,
  selected_lead_time_h: 32.5,
  versions: [
    {
      publish_time: "2026-01-13T02:30:00Z",
      forecast_mw: 10619,
      lead_time_h: 63.5,
      status: "superseded",
    },
    {
      publish_time: "2026-01-14T09:30:00Z",
      forecast_mw: 9053,
      lead_time_h: 32.5,
      status: "selected",
    },
    {
      publish_time: "2026-01-14T11:30:00Z",
      forecast_mw: 9151,
      lead_time_h: 30.5,
      status: "after_cutoff",
    },
    {
      publish_time: "2026-01-15T18:30:00Z",
      forecast_mw: 8362,
      lead_time_h: -0.5,
      status: "after_delivery_start",
    },
  ],
}

export const curve: Schemas["LeadTimeCurveResponse"] = {
  query: {
    date_from: "2026-01-01",
    date_to: "2026-01-31",
    timezone: "Europe/London",
    min_h: 0,
    max_h: 48,
  },
  data_version: 1,
  points: [0, 24, 48].map((h) => ({
    lead_time_h: h,
    metrics: metrics({ n_missing_forecast: h === 48 ? 155 : 0 }),
  })),
}

export const breakdown: Schemas["BreakdownResponse"] = {
  query,
  data_version: 1,
  group_by: "hour_of_day",
  groups: [{ key: "0", metrics: metrics() }],
}
