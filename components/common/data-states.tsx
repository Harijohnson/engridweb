import { AlertTriangleIcon, InboxIcon, RotateCcwIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError } from "@/lib/api/client"
import { cn } from "@/lib/utils"

/** Plain-language message for an API failure (never a stack trace). */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return "The analysis service could not be reached. Check your connection and try again."
    }
    if (error.status === 422) {
      return `These filter settings are not valid: ${error.problem?.detail ?? error.message}`
    }
    if (error.status === 429) {
      return "Too many requests in a short time. Wait a moment and try again."
    }
    if (error.status === 503) {
      return "The analysis service is starting up or has no data loaded yet."
    }
    return `The analysis service returned an error (${error.status}).`
  }
  return "Something went wrong while loading this data."
}

export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown
  onRetry?: () => void
  className?: string
}) {
  const requestId = error instanceof ApiError ? error.problem?.request_id : null
  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangleIcon aria-hidden />
      <AlertTitle>Could not load this section</AlertTitle>
      <AlertDescription>
        <p>{errorMessage(error)}</p>
        {requestId ? (
          <p className="font-mono text-[11px] opacity-80">
            Request id: {requestId}
          </p>
        ) : null}
        {onRetry ? (
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={onRetry}
          >
            <RotateCcwIcon data-icon="inline-start" aria-hidden />
            Try again
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}

export function EmptyState({
  title,
  children,
  className,
}: {
  title: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-center text-muted-foreground",
        className
      )}
    >
      <InboxIcon className="size-5" aria-hidden />
      <p className="font-medium text-foreground">{title}</p>
      {children ? <div className="max-w-md text-xs">{children}</div> : null}
    </div>
  )
}

/**
 * Partial coverage is never hidden (R3, R4): say how many hours were excluded and why.
 */
export function CoverageWarning({
  expected,
  missingForecast,
  missingActual,
  className,
}: {
  expected: number
  missingForecast: number
  missingActual: number
  className?: string
}) {
  if (missingForecast === 0 && missingActual === 0) return null
  return (
    <Alert className={className}>
      <AlertTriangleIcon aria-hidden />
      <AlertTitle>Partial coverage</AlertTitle>
      <AlertDescription>
        {missingForecast > 0 ? (
          <p>
            {missingForecast} of {expected} delivery hours have no forecast
            published before the cutoff. They are excluded from the metrics, not
            filled in.
          </p>
        ) : null}
        {missingActual > 0 ? (
          <p>
            {missingActual} of {expected} delivery hours have no actual
            generation and are excluded from the metrics.
          </p>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}

/** Chart-shaped placeholder: y-axis labels, gridlines and a faint line, at the size of
 * the real chart so nothing jumps when the data arrives. It is a shape, not data. */
export function ChartSkeleton({
  className,
  label = "Loading chart",
}: {
  className?: string
  label?: string
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn("flex h-72 w-full gap-2", className)}
    >
      <div className="flex w-10 shrink-0 flex-col justify-between py-1">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-2 w-8" />
        ))}
      </div>
      <div className="relative flex-1 border-b border-l">
        <div className="absolute inset-0 flex flex-col justify-between py-1">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="border-t border-dashed" />
          ))}
        </div>
        <svg
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full animate-pulse text-foreground/15"
          aria-hidden
        >
          <path
            d="M0 28 C10 20 18 34 28 24 S45 10 55 18 S72 30 82 16 S95 12 100 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  )
}

/** Six placeholders the size of the key-number cards. */
export function KpiSkeleton({ label }: { label: string }) {
  return (
    <div
      className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6"
      role="status"
      aria-label={label}
    >
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="flex h-23 flex-col gap-2 rounded-2xl bg-card p-3.5 ring-1 ring-foreground/10"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3 w-full max-w-32" />
        </div>
      ))}
    </div>
  )
}

/** Table-shaped placeholder: a header row and `rows` body rows of `columns` cells. */
export function TableSkeleton({
  rows,
  columns,
  label,
}: {
  rows: number
  columns: number
  label: string
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className="flex flex-col overflow-hidden rounded-xl border"
    >
      {Array.from({ length: rows + 1 }, (_, r) => (
        <div
          key={r}
          className={cn(
            "flex h-9 items-center gap-4 border-b px-2 last:border-0",
            r === 0 && "bg-muted/50"
          )}
        >
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton
              key={c}
              className={cn("h-3 flex-1", r === 0 ? "max-w-20" : "max-w-28")}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
