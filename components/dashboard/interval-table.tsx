"use client"

import {
  createColumnHelper,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type CellData,
  type RowData,
  type SortingState,
  type TableFeatures,
} from "@tanstack/react-table"
import {
  AlertTriangleIcon,
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { useMemo, useState } from "react"

import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "@/components/common/data-states"
import {
  SectionShell,
  type SectionSource,
} from "@/components/common/section-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Schemas } from "@/lib/api/client"
import { isIntervalOrdering, PAGE_SIZES } from "@/hooks/use-dashboard-params"
import type { IntervalOrdering } from "@/lib/api/query-keys"
import {
  describeError,
  formatHours,
  formatMw,
  formatNumber,
  formatSignedMw,
  formatUkDateTime,
  ukZoneLabel,
} from "@/lib/format"
import { cn } from "@/lib/utils"

type Interval = Schemas["Interval"]
type IntervalPage = Schemas["IntervalPage"]
type IntervalStatus = Schemas["IntervalStatusEnum"]

export const INTERVAL_STATUS_LABEL: Record<IntervalStatus, string> = {
  matched: "Matched",
  missing_forecast: "No forecast",
  missing_actual: "No actual",
  missing_both: "No forecast or actual",
}

declare module "@tanstack/react-table" {
  // Column meta used here: extra classes for the header and body cells, and whether
  // the column is technical. The generic parameters must repeat table-core's
  // declaration for the merge.
  /* eslint-disable @typescript-eslint/no-unused-vars */
  interface ColumnMeta<
    in out TFeatures extends TableFeatures,
    in out TData extends RowData,
    TValue extends CellData = CellData,
  > {
    className?: string
    /** Hidden until "Technical columns" is switched on. */
    technical?: boolean
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
}

const features = tableFeatures({ rowSortingFeature })
const helper = createColumnHelper<typeof features, Interval>()

const numeric = "text-right font-mono tabular-nums"

const columns = helper.columns([
  helper.accessor("start_time", {
    header: "Hour (UK)",
    cell: (info) => formatUkDateTime(info.getValue()),
    sortDescFirst: false,
  }),
  helper.accessor("forecast_mw", {
    header: "Forecast",
    cell: (info) => formatMw(info.getValue()),
    meta: { className: numeric },
  }),
  helper.accessor("actual_mw", {
    header: "Actual",
    cell: (info) => formatMw(info.getValue()),
    meta: { className: numeric },
  }),
  helper.accessor("error_mw", {
    header: "How far off",
    cell: (info) => {
      const value = info.getValue()
      return (
        <span className="flex flex-col items-end leading-tight">
          <span>{formatSignedMw(value)}</span>
          {value == null ? null : (
            <span className="font-sans text-[11px] text-muted-foreground">
              {describeError(value)}
            </span>
          )}
        </span>
      )
    },
    meta: { className: numeric },
  }),
  helper.accessor("status", {
    header: "Status",
    cell: (info) => <IntervalStatusBadge status={info.getValue()} />,
    enableSorting: false,
  }),
  helper.accessor("abs_error_mw", {
    header: "|Error|",
    cell: (info) => formatMw(info.getValue()),
    meta: { className: numeric, technical: true },
  }),
  helper.accessor("publish_time", {
    header: "Published",
    cell: (info) => formatUkDateTime(info.getValue()),
    meta: { technical: true },
  }),
  helper.accessor("lead_time_h", {
    header: "Hours ahead",
    cell: (info) => formatHours(info.getValue()),
    meta: { className: numeric, technical: true },
  }),
  helper.accessor("cutoff_time", {
    header: "Buying time (cutoff)",
    cell: (info) => formatUkDateTime(info.getValue()),
    enableSorting: false,
    meta: { technical: true },
  }),
])
const simpleColumns = columns.filter((c) => !c.meta?.technical)

const EMPTY_ROWS: Interval[] = []

/** Matched hours get a quiet badge; anything missing is an orange attention badge with
 * an icon (D20: never colour alone). */
export function IntervalStatusBadge({ status }: { status: IntervalStatus }) {
  const matched = status === "matched"
  return (
    <Badge
      variant={matched ? "secondary" : "outline"}
      className={cn(
        !matched && "border-highlight bg-highlight text-highlight-foreground"
      )}
    >
      {matched ? <CheckIcon aria-hidden /> : <AlertTriangleIcon aria-hidden />}
      {INTERVAL_STATUS_LABEL[status]}
    </Badge>
  )
}

function toSorting(ordering: IntervalOrdering): SortingState {
  return [{ id: ordering.replace(/^-/, ""), desc: ordering.startsWith("-") }]
}

export function toOrdering(sorting: SortingState): IntervalOrdering | null {
  const first = sorting[0]
  if (!first) return null
  const ordering = `${first.desc ? "-" : ""}${first.id}`
  return isIntervalOrdering(ordering) ? ordering : null
}

/** Page numbers to show: first, last, and the current page with its neighbours;
 * "gap" marks skipped pages. */
export function pageItems(current: number, total: number): (number | "gap")[] {
  const pages = [
    ...new Set([1, total, current - 1, current, current + 1]),
  ].filter((p) => p >= 1 && p <= total)
  pages.sort((a, b) => a - b)
  const items: (number | "gap")[] = []
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) items.push("gap")
    items.push(p)
  })
  return items
}

export function IntervalTable({
  data,
  isLoading,
  updating = false,
  source,
  error,
  onRetry,
  ordering,
  onOrderingChange,
  onPageChange,
  pageSize,
  onPageSizeChange,
  selectedHour,
  onSelectHour,
}: {
  data: IntervalPage | undefined
  isLoading: boolean
  updating?: boolean
  source?: SectionSource | null
  error: unknown
  onRetry: () => void
  ordering: IntervalOrdering
  onOrderingChange: (ordering: IntervalOrdering | null) => void
  onPageChange: (page: number) => void
  pageSize: number
  onPageSizeChange: (size: number) => void
  selectedHour: string | null
  onSelectHour: (isoHour: string) => void
}) {
  const [technical, setTechnical] = useState(false)
  const sorting = useMemo(() => toSorting(ordering), [ordering])
  const table = useTable({
    features,
    columns: technical ? columns : simpleColumns,
    data: data?.results ?? EMPTY_ROWS,
    state: { sorting },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater
      onOrderingChange(toOrdering(next))
    },
    manualSorting: true,
    enableMultiSort: false,
    enableSortingRemoval: false,
  })

  return (
    <SectionShell
      id="intervals"
      title="Hour-by-hour table"
      help={{
        text: "One row per delivery hour: the forecast you could have bought on, what was actually generated, and how far off it was (forecast − actual). Sort by “How far off” to find the biggest misses.",
        guideAnchor: "reading-the-table",
      }}
      updating={updating}
      source={source}
      description={`Click a row to see every forecast published for that hour.${data?.results[0] ? ` ${ukZoneLabel(data.results[0].start_time)}.` : ""}`}
      action={
        <div className="flex items-center gap-2">
          <Switch
            id="technical-columns"
            size="sm"
            checked={technical}
            onCheckedChange={setTechnical}
          />
          <Label htmlFor="technical-columns" className="text-xs font-normal">
            Technical columns
          </Label>
        </div>
      }
    >
      {error && !data ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : isLoading || !data ? (
        <TableSkeleton
          rows={Math.min(pageSize, 12)}
          columns={technical ? columns.length : simpleColumns.length}
          label="Loading intervals"
        />
      ) : data.count === 0 ? (
        <EmptyState title="No delivery hours in this range" />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="max-h-[70vh] overflow-auto border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_var(--border)]">
                {table.getHeaderGroups().map((group) => (
                  <TableRow key={group.id}>
                    {group.headers.map((header) => {
                      const sorted = header.column.getIsSorted()
                      return (
                        <TableHead
                          key={header.id}
                          className={cn(
                            header.column.columnDef.meta?.className,
                            sorted && "text-foreground"
                          )}
                          aria-sort={
                            sorted === "asc"
                              ? "ascending"
                              : sorted === "desc"
                                ? "descending"
                                : undefined
                          }
                        >
                          {header.column.getCanSort() ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              <table.FlexRender header={header} />
                              {sorted === "asc" ? (
                                <ArrowUpIcon
                                  className="size-3 text-primary"
                                  aria-hidden
                                />
                              ) : sorted === "desc" ? (
                                <ArrowDownIcon
                                  className="size-3 text-primary"
                                  aria-hidden
                                />
                              ) : (
                                <ArrowUpDownIcon
                                  className="size-3 opacity-40"
                                  aria-hidden
                                />
                              )}
                            </button>
                          ) : (
                            <table.FlexRender header={header} />
                          )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => {
                  const selected = row.original.start_time === selectedHour
                  return (
                    <TableRow
                      key={row.id}
                      data-state={selected ? "selected" : undefined}
                      className="cursor-pointer data-[state=selected]:shadow-[inset_3px_0_0_var(--highlight)]"
                      tabIndex={0}
                      aria-selected={selected}
                      onClick={() => onSelectHour(row.original.start_time)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          onSelectHour(row.original.start_time)
                        }
                      }}
                    >
                      {row.getAllCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cell.column.columnDef.meta?.className}
                        >
                          <table.FlexRender cell={cell} />
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <Pagination
            data={data}
            pageSize={pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      )}
    </SectionShell>
  )
}

const PAGE_SIZE_LABEL: Record<(typeof PAGE_SIZES)[number], string> = {
  24: "24 (1 day)",
  48: "48 (2 days)",
  168: "168 (1 week)",
}
const PAGE_SIZE_TEXT = new Map(
  PAGE_SIZES.map((size) => [String(size), PAGE_SIZE_LABEL[size]])
)

function Pagination({
  data,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  data: IntervalPage
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}) {
  const firstRow = (data.page - 1) * data.page_size + 1
  const lastRow = Math.min(data.page * data.page_size, data.count)
  const last = data.num_pages
  return (
    <nav
      className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"
      aria-label="Hour-by-hour table pages"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-muted-foreground" aria-live="polite">
          Showing {formatNumber(firstRow)}–{formatNumber(lastRow)} of{" "}
          {formatNumber(data.count)} hours
        </span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground" id="page-size-label">
            Rows per page
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger
              size="sm"
              className="w-32"
              aria-labelledby="page-size-label"
            >
              <SelectValue>
                {(value: string) => PAGE_SIZE_TEXT.get(value) ?? value}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {PAGE_SIZE_LABEL[size]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <ul className="flex flex-wrap items-center gap-1">
        <li>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="First page"
            disabled={data.page <= 1}
            onClick={() => onPageChange(1)}
          >
            <ChevronFirstIcon aria-hidden />
          </Button>
        </li>
        <li>
          <Button
            variant="outline"
            size="sm"
            disabled={data.previous == null}
            onClick={() => data.previous != null && onPageChange(data.previous)}
          >
            <ChevronLeftIcon data-icon="inline-start" aria-hidden />
            <span className="sr-only sm:not-sr-only">Previous</span>
          </Button>
        </li>
        {pageItems(data.page, last).map((item, i) =>
          item === "gap" ? (
            <li
              key={`gap-${i}`}
              aria-hidden
              className="px-1 text-muted-foreground"
            >
              …
            </li>
          ) : (
            <li key={item}>
              <Button
                variant={item === data.page ? "default" : "ghost"}
                size="icon-sm"
                aria-label={`Page ${item}`}
                aria-current={item === data.page ? "page" : undefined}
                onClick={() => item !== data.page && onPageChange(item)}
                className="font-mono tabular-nums"
              >
                {item}
              </Button>
            </li>
          )
        )}
        <li>
          <Button
            variant="outline"
            size="sm"
            disabled={data.next == null}
            onClick={() => data.next != null && onPageChange(data.next)}
          >
            <span className="sr-only sm:not-sr-only">Next</span>
            <ChevronRightIcon data-icon="inline-end" aria-hidden />
          </Button>
        </li>
        <li>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Last page"
            disabled={data.page >= last}
            onClick={() => onPageChange(last)}
          >
            <ChevronLastIcon aria-hidden />
          </Button>
        </li>
      </ul>
    </nav>
  )
}
