import {
  ArrowDownIcon,
  ArrowUpIcon,
  CircleCheckIcon,
  EqualIcon,
  MoveVerticalIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { ErrorState } from "@/components/common/data-states"
import { choiceLabel } from "@/components/home/buy-time-chips"
import { Skeleton } from "@/components/ui/skeleton"
import type { Schemas } from "@/lib/api/client"
import {
  EMPTY,
  errorDirection,
  formatClock12,
  formatMw,
  formatNumber,
  formatSignedNumber,
} from "@/lib/format"
import { cn } from "@/lib/utils"

type Summary = Schemas["SummaryResponse"]
type QueryEcho = Schemas["QueryEcho"]
type Metrics = Schemas["MetricSummary"]

/** "the day before at 10am UK" or "6 hours before", from the query the API applied. */
export function describeBuying(query: QueryEcho): string {
  if (query.policy === "lead_time" && query.lead_time_h != null) {
    return choiceLabel({ policy: "lead_time", lead: query.lead_time_h })
  }
  if (query.gate_time != null && query.gate_days_before != null) {
    const day =
      query.gate_days_before === 1
        ? "the day before"
        : `${query.gate_days_before} days before`
    return `${day} at ${formatClock12(query.gate_time)} UK`
  }
  return "at your buying time"
}

const LEANING = {
  over: {
    title: "Guessed too high",
    detail: "On average the prediction was higher than what really happened.",
    sentence: "On average it guessed too high.",
    Icon: ArrowUpIcon,
  },
  under: {
    title: "Guessed too low",
    detail: "On average the prediction was lower than what really happened.",
    sentence: "On average it guessed too low.",
    Icon: ArrowDownIcon,
  },
  exact: {
    title: "About right",
    detail: "On average the prediction was neither too high nor too low.",
    sentence: "On average it was about right.",
    Icon: EqualIcon,
  },
} as const

/** The short answer in one or two sentences, built only from API values. */
export function answerSentence(summary: Summary): string {
  const { mae_mw: mae, bias_mw: bias } = summary.metrics
  if (mae == null) {
    return "No hour could be checked for this buying time, so there is no answer."
  }
  const first = `If you bought ${describeBuying(summary.query)}, the prediction was usually off by about ${formatMw(mae)}.`
  return bias == null
    ? first
    : `${first} ${LEANING[errorDirection(bias)].sentence}`
}

function missingText(m: Metrics): string {
  const parts: string[] = []
  if (m.n_missing_forecast > 0) {
    parts.push(
      `${formatNumber(m.n_missing_forecast)} ${m.n_missing_forecast === 1 ? "hour" : "hours"} had no prediction in time`
    )
  }
  if (m.n_missing_actual > 0) {
    parts.push(
      `${formatNumber(m.n_missing_actual)} ${m.n_missing_actual === 1 ? "hour" : "hours"} had no real value`
    )
  }
  if (parts.length === 0) {
    return "Every hour had a prediction and a real value."
  }
  return `${parts.join(" and ")}, so they are left out.`
}

export function AnswerCards({
  summary,
  isLoading,
  updating = false,
  error,
  onRetry,
}: {
  summary: Summary | undefined
  isLoading: boolean
  /** Newer data is loading while the previous answer stays on screen. */
  updating?: boolean
  error: unknown
  onRetry: () => void
}) {
  if (error && !summary) {
    return (
      <div className="rounded-3xl bg-card p-5 shadow-soft">
        <ErrorState error={error} onRetry={onRetry} />
      </div>
    )
  }
  if (isLoading || !summary) return <AnswerSkeleton />

  const m = summary.metrics
  const leaning = m.bias_mw == null ? null : LEANING[errorDirection(m.bias_mw)]
  const complete = m.n_matched === m.n_expected

  return (
    <section
      aria-labelledby="answer-title"
      aria-busy={updating}
      className={cn(
        "flex flex-col gap-3 transition-opacity",
        updating && "opacity-60"
      )}
    >
      <div className="rounded-3xl bg-card p-5 shadow-soft ring-1 ring-foreground/5 sm:p-6">
        <h2
          id="answer-title"
          className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
        >
          The short answer
        </h2>
        <p className="mt-2 text-lg leading-snug font-medium text-balance sm:text-2xl">
          {answerSentence(summary)}
        </p>
      </div>
      <dl
        className="grid gap-3 sm:grid-cols-3"
        aria-label="The answer in numbers"
      >
        <Card
          label="Usually off by"
          icon={<MoveVerticalIcon aria-hidden />}
          value={m.mae_mw == null ? EMPTY : formatNumber(m.mae_mw)}
          unit={m.mae_mw == null ? undefined : "MW"}
          detail={
            m.mean_actual_mw == null
              ? "No hours to compare."
              : `For comparison, the real wind averaged ${formatMw(m.mean_actual_mw)}.`
          }
        />
        <Card
          label={leaning?.title ?? "Too high or too low?"}
          icon={leaning ? <leaning.Icon aria-hidden /> : null}
          value={formatSignedNumber(m.bias_mw)}
          unit={m.bias_mw == null ? undefined : "MW"}
          detail={leaning?.detail ?? "No hours to compare."}
        />
        <Card
          label="Hours checked"
          icon={
            complete ? (
              <CircleCheckIcon aria-hidden />
            ) : (
              <TriangleAlertIcon aria-hidden />
            )
          }
          warn={!complete}
          value={`${formatNumber(m.n_matched)} of ${formatNumber(m.n_expected)}`}
          detail={missingText(m)}
        />
      </dl>
    </section>
  )
}

function Card({
  label,
  icon,
  value,
  unit,
  detail,
  warn = false,
}: {
  label: string
  icon: React.ReactNode
  value: string
  unit?: string
  detail: string
  /** Missing data: orange ring and badge (D20), with a warning icon, not colour alone. */
  warn?: boolean
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-3xl bg-card p-5 shadow-soft ring-1 ring-foreground/5",
        warn && "ring-2 ring-highlight"
      )}
    >
      <dt className="flex items-center justify-between gap-2 text-sm font-medium">
        {label}
        {icon ? (
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full bg-muted [&_svg]:size-4",
              warn && "bg-highlight text-highlight-foreground"
            )}
          >
            {icon}
          </span>
        ) : null}
      </dt>
      <dd className="mt-4 flex items-baseline gap-1.5">
        <span className="text-4xl font-semibold tracking-tight tabular-nums">
          {value}
        </span>
        {unit ? (
          <span className="text-base text-muted-foreground">{unit}</span>
        ) : null}
      </dd>
      <dd className="mt-1.5 text-sm text-muted-foreground">{detail}</dd>
    </div>
  )
}

function AnswerSkeleton() {
  return (
    <div
      className="flex flex-col gap-3"
      role="status"
      aria-label="Loading the answer"
    >
      <Skeleton className="h-28 w-full rounded-3xl" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-40 rounded-3xl" />
        ))}
      </div>
    </div>
  )
}
