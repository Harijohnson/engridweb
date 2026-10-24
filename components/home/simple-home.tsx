"use client"

import { ArrowRightIcon } from "lucide-react"
import Link from "next/link"

import { AppHeader } from "@/components/common/app-header"
import { AnswerCards } from "@/components/home/answer-cards"
import { BuyTimeChips } from "@/components/home/buy-time-chips"
import { SimpleChart } from "@/components/home/simple-chart"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useMeta, useSummary, useTimeseries } from "@/hooks/use-api"
import {
  serializeDashboard,
  useAnalyticsParams,
  useDashboardParams,
} from "@/hooks/use-dashboard-params"
import { formatIsoDayRange } from "@/lib/format"

/** Newer data is loading while the previous data stays on screen. */
function isUpdating(query: { isFetching: boolean; data?: unknown }): boolean {
  return query.isFetching && query.data !== undefined
}

/**
 * The simple home page (PLAN.md D30–D34): one answer, three numbers and one chart in
 * plain words. Everything else lives on /details, which shares the same URL state.
 */
export function SimpleHome() {
  const [state, setState] = useDashboardParams()
  const params = useAnalyticsParams(state)

  const meta = useMeta()
  const summary = useSummary(params)
  const timeseries = useTimeseries(params)

  // The dates the API says it used; before that, the window it offers.
  const dates = summary.data?.query ?? meta.data?.evaluation_window
  const customDates = state.from != null || state.to != null

  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader current="home" />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:py-10">
        <header className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-4xl">
            How good was the wind prediction?
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground sm:text-lg">
            {dates ? (
              <p>
                Great Britain ·{" "}
                {formatIsoDayRange(dates.date_from, dates.date_to)} · the
                prediction against what really happened
              </p>
            ) : (
              <Skeleton className="h-6 w-80 max-w-full" />
            )}
            {customDates ? (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setState({ from: null, to: null, win: null })}
              >
                Show the whole month
              </Button>
            ) : null}
          </div>
        </header>

        <BuyTimeChips
          policies={meta.data?.policies}
          state={state}
          onChange={(update) => setState(update)}
        />

        <AnswerCards
          summary={summary.data}
          isLoading={summary.isPending}
          updating={isUpdating(summary)}
          error={summary.error}
          onRetry={() => void summary.refetch()}
        />

        <SimpleChart
          data={timeseries.data}
          isLoading={timeseries.isPending}
          updating={isUpdating(timeseries)}
          error={timeseries.error}
          onRetry={() => void timeseries.refetch()}
          windowStart={state.win}
          onWindowChange={(win) => setState({ win })}
        />

        <Link
          href={serializeDashboard("/details", state)}
          className="group flex items-center justify-between gap-4 rounded-3xl bg-card p-5 shadow-soft ring-1 ring-foreground/5 transition-shadow hover:ring-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-6"
        >
          <span className="flex flex-col gap-0.5">
            <span className="text-base font-semibold">See the details</span>
            <span className="text-sm text-muted-foreground">
              Every hour, which prediction was used, and how the numbers are
              worked out.
            </span>
          </span>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-0.5">
            <ArrowRightIcon className="size-4" aria-hidden />
          </span>
        </Link>

        <footer className="flex flex-col gap-1 px-1 text-sm text-muted-foreground">
          <p>
            <strong className="font-medium text-foreground">
              MW (megawatts)
            </strong>{" "}
            is how much power the wind farms are making at that moment.
          </p>
          <p>
            This shows how good the prediction was. It does not say how much
            power to buy.
          </p>
          <p>
            Data: Elexon BMRS, the official record of Great Britain’s
            electricity. All times are UK time.
          </p>
        </footer>
      </main>
    </div>
  )
}
