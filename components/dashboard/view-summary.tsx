import type { Schemas } from "@/lib/api/client"
import { formatIsoDayRange, formatNumber } from "@/lib/format"

type QueryEcho = Schemas["QueryEcho"]
type Metrics = Schemas["MetricSummary"]

/** "at 10:00 UK the day before" for a daily gate (PLAN.md D22 wording). */
export function describeGate(gateTime: string, daysBefore: number): string {
  const day = daysBefore === 1 ? "the day before" : `${daysBefore} days before`
  return `at ${gateTime} UK ${day}`
}

/** One plain sentence describing what is on screen, built from the query the API
 * says it applied (its echo), never from what the browser asked for. */
export function ViewSummary({
  query,
  metrics,
}: {
  query: QueryEcho
  metrics: Metrics
}) {
  const buying =
    query.policy === "lead_time" && query.lead_time_h != null
      ? `the newest forecast published at least ${query.lead_time_h} h before each delivery hour`
      : query.gate_time != null && query.gate_days_before != null
        ? `the newest forecast available ${describeGate(query.gate_time, query.gate_days_before)} each delivery day`
        : "the newest forecast available at the decision time"

  return (
    <>
      Showing {buying}, for{" "}
      <strong className="font-medium text-foreground">
        {formatIsoDayRange(query.date_from, query.date_to)}
      </strong>
      .{" "}
      <span className="whitespace-nowrap">
        {formatNumber(metrics.n_matched)} of {formatNumber(metrics.n_expected)}{" "}
        hours matched.
      </span>
    </>
  )
}
