"use client"

import {
  AlertTriangleIcon,
  CalendarIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
} from "lucide-react"
import { useState } from "react"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { isPolicy, type DashboardState } from "@/hooks/use-dashboard-params"
import type { Schemas } from "@/lib/api/client"
import type { PolicyKind } from "@/lib/api/query-keys"
import {
  formatIsoDay,
  formatIsoDayRange,
  formatNumber,
  isoDaysBetween,
} from "@/lib/format"
import { cn, pressedGreen } from "@/lib/utils"

type Meta = Schemas["MetaResponse"]

/** 24-hour UK wall-clock times in 15-minute steps (a native time input would follow
 * the browser locale, e.g. "10:00 AM" in an Indian locale). */
const GATE_TIMES = Array.from({ length: 96 }, (_, i) => {
  const hh = String(Math.floor(i / 4)).padStart(2, "0")
  const mm = String((i % 4) * 15).padStart(2, "0")
  return `${hh}:${mm}`
})
type SetState = (patch: Partial<DashboardState> | null) => unknown
type OnChange = (patch: Partial<DashboardState>) => void

/** Plain-language names for the two decision policies (PLAN.md D22). */
export const POLICY_LABEL: Record<PolicyKind, string> = {
  daily_gate: "At a fixed time each day",
  lead_time: "A set number of hours ahead",
}

/** "YYYY-MM-DD" <-> a local-midnight Date for the calendar widget. These are calendar
 * dates (UK delivery days), not instants, so local getters on both sides are exact. */
function dayToDate(day: string): Date {
  const [y, m, d] = day.split("-").map(Number)
  return new Date(y, m - 1, d)
}
function dateToDay(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${mm}-${dd}`
}

const withoutYear = (label: string) => label.replace(/ \d{4}$/, "")

type DatePreset = { key: string; label: string; from: string; to: string }

/** "Whole month" plus 7-day blocks, derived from the evaluation window served by the
 * API (no dates are hard-coded). */
function datePresets(windowFrom: string, windowTo: string): DatePreset[] {
  const days = isoDaysBetween(windowFrom, windowTo)
  // A whole calendar month: starts on the 1st and the day after the end is a 1st.
  const [y, m, d] = windowTo.split("-").map(Number)
  const isCalendarMonth =
    windowFrom.endsWith("-01") &&
    windowFrom.slice(0, 7) === windowTo.slice(0, 7) &&
    new Date(Date.UTC(y, m - 1, d + 1)).getUTCDate() === 1
  const presets: DatePreset[] = [
    {
      key: "all",
      label: isCalendarMonth ? "Whole month" : "Whole period",
      from: windowFrom,
      to: windowTo,
    },
  ]
  for (let i = 0; i < days.length; i += 7) {
    const from = days[i]
    const to = days[Math.min(i + 6, days.length - 1)]
    presets.push({
      key: from,
      label: withoutYear(formatIsoDayRange(from, to)),
      from,
      to,
    })
  }
  return presets
}

function activePolicy(meta: Meta, state: DashboardState): PolicyKind {
  return (
    state.policy ?? (state.lead != null ? "lead_time" : meta.policies.default)
  )
}

/** True when any filter differs from the API's defaults (so Reset has work to do). */
function isFiltered(meta: Meta, state: DashboardState): boolean {
  return Boolean(
    state.from ||
    state.to ||
    state.gate ||
    state.days != null ||
    state.lead != null ||
    activePolicy(meta, state) !== meta.policies.default
  )
}

export function FiltersBar({
  meta,
  state,
  setState,
  missingForecastHours,
}: {
  meta: Meta | undefined
  state: DashboardState
  setState: SetState
  /** Hours with no forecast under the current settings (from the summary API). */
  missingForecastHours: number | null
}) {
  if (!meta) {
    return (
      <div
        className="flex flex-wrap items-center gap-2 rounded-2xl bg-card p-2.5 ring-1 ring-foreground/10"
        role="status"
        aria-label="Loading filters"
      >
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-7 w-72 max-w-full" />
        <Skeleton className="h-7 w-48 max-w-full" />
      </div>
    )
  }

  // Every change of filter resets the table page and keeps the selected hour. A new
  // date range also resets the chart's zoom window.
  const update: OnChange = (patch) =>
    setState({
      ...patch,
      page: null,
      ...("from" in patch || "to" in patch ? { win: null } : {}),
    })
  const filtered = isFiltered(meta, state)
  const reset = filtered ? (
    <Button variant="ghost" size="sm" onClick={() => setState(null)}>
      <RotateCcwIcon data-icon="inline-start" aria-hidden />
      Reset
    </Button>
  ) : null

  return (
    <div className="flex flex-col gap-2">
      {/* Phones: the controls live in a bottom sheet so the data stays in view. */}
      <div className="flex items-center gap-2 md:hidden">
        <Sheet>
          <SheetTrigger render={<Button size="sm" />}>
            <SlidersHorizontalIcon data-icon="inline-start" aria-hidden />
            Filters
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>
                Pick the days and when you buy. Changes apply straight away.
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-6">
              <FilterControls
                meta={meta}
                state={state}
                onChange={update}
                missingForecastHours={missingForecastHours}
                stacked
              />
            </div>
          </SheetContent>
        </Sheet>
        {reset}
      </div>

      <div
        className="hidden items-center gap-x-4 gap-y-2 rounded-2xl bg-card p-2.5 ring-1 ring-foreground/10 md:flex md:flex-wrap"
        role="group"
        aria-label="Analysis filters"
      >
        <FilterControls
          meta={meta}
          state={state}
          onChange={update}
          missingForecastHours={missingForecastHours}
        />
        {reset ? <div className="ml-auto">{reset}</div> : null}
      </div>
    </div>
  )
}

function FilterControls({
  meta,
  state,
  onChange,
  missingForecastHours,
  stacked = false,
}: {
  meta: Meta
  state: DashboardState
  onChange: OnChange
  missingForecastHours: number | null
  /** One control per row (the phone sheet) instead of a single wrapping row. */
  stacked?: boolean
}) {
  const policy = activePolicy(meta, state)
  return (
    <div
      className={cn(
        "flex gap-x-4 gap-y-3",
        stacked ? "flex-col items-start" : "flex-wrap items-center"
      )}
    >
      <DateControls meta={meta} state={state} onChange={onChange} />
      <ToggleGroup
        aria-label="When do you buy?"
        variant="outline"
        size="sm"
        spacing={0}
        className="flex-wrap"
        value={[policy]}
        onValueChange={(value) => {
          const next = value[0]
          if (!isPolicy(next) || next === policy) return
          // Switching policy drops the other policy's parameters (the API
          // rejects inconsistent combinations).
          onChange(
            next === "lead_time"
              ? { policy: next, gate: null, days: null }
              : { policy: next, lead: null }
          )
        }}
      >
        {(["daily_gate", "lead_time"] as const).map((p) => (
          <ToggleGroupItem key={p} value={p} className={pressedGreen}>
            {POLICY_LABEL[p]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {policy === "daily_gate" ? (
        <GateControls meta={meta} state={state} onChange={onChange} />
      ) : (
        <LeadTimeControl
          meta={meta}
          state={state}
          onChange={onChange}
          missingForecastHours={missingForecastHours}
        />
      )}
    </div>
  )
}

/** One button showing the chosen days; the presets and the calendar open from it. */
function DateControls({
  meta,
  state,
  onChange,
}: {
  meta: Meta
  state: DashboardState
  onChange: OnChange
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>()
  const windowFrom = meta.evaluation_window.date_from
  const windowTo = meta.evaluation_window.date_to
  const from = state.from ?? windowFrom
  const to = state.to ?? windowTo
  const presets = datePresets(windowFrom, windowTo)
  const active = presets.find((p) => p.from === from && p.to === to)

  const apply = (nextFrom: string, nextTo: string) => {
    onChange({
      from: nextFrom === windowFrom ? null : nextFrom,
      to: nextTo === windowTo ? null : nextTo,
    })
    setOpen(false)
  }

  const label = withoutYear(formatIsoDayRange(from, to))

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setDraft(undefined)
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="font-normal"
            aria-label={`Delivery days (UK): ${label}`}
          />
        }
      >
        <CalendarIcon data-icon="inline-start" aria-hidden />
        {label}
      </PopoverTrigger>
      <PopoverContent className="w-auto gap-0 p-0" align="start">
        <div
          className="flex max-w-72 flex-wrap gap-1.5 p-3"
          role="group"
          aria-label="Quick date ranges"
        >
          {presets.map((preset) => (
            <Button
              key={preset.key}
              size="xs"
              variant={preset === active ? "default" : "outline"}
              aria-pressed={preset === active}
              onClick={() => apply(preset.from, preset.to)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <Calendar
          mode="range"
          defaultMonth={dayToDate(from)}
          startMonth={dayToDate(windowFrom)}
          endMonth={dayToDate(windowTo)}
          disabled={[
            { before: dayToDate(windowFrom) },
            { after: dayToDate(windowTo) },
          ]}
          selected={draft ?? { from: dayToDate(from), to: dayToDate(to) }}
          onSelect={(range) => {
            setDraft(range)
            if (range?.from && range.to) {
              apply(dateToDay(range.from), dateToDay(range.to))
            }
          }}
          weekStartsOn={1}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t p-2.5">
          <span className="text-muted-foreground">
            Or pick a first and a last day (UK).
          </span>
          {draft?.from && !draft.to ? (
            <Button
              size="xs"
              onClick={() => {
                const day = draft.from ? dateToDay(draft.from) : from
                apply(day, day)
              }}
            >
              Just {draft.from ? formatIsoDay(dateToDay(draft.from)) : ""}
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function GateControls({
  meta,
  state,
  onChange,
}: {
  meta: Meta
  state: DashboardState
  onChange: OnChange
}) {
  const gate = meta.policies.daily_gate
  const gateTime = state.gate ?? gate.gate_time_default
  const daysBefore = state.days ?? gate.gate_days_before_default
  const dayOptions = Array.from(
    { length: gate.gate_days_before_max - gate.gate_days_before_min + 1 },
    (_, i) => gate.gate_days_before_min + i
  )
  const dayLabel = (d: number) =>
    d === 1 ? "the day before" : `${d} days before`

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Buying time"
    >
      <span>Buy at</span>
      <Select
        value={gateTime}
        onValueChange={(value) => {
          if (typeof value !== "string") return
          onChange({
            policy: "daily_gate",
            gate: value === gate.gate_time_default ? null : value,
          })
        }}
      >
        <SelectTrigger
          size="sm"
          className="w-24 font-mono"
          aria-label="Buying time (UK)"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {GATE_TIMES.map((time) => (
            <SelectItem key={time} value={time} className="font-mono">
              {time}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span>UK time,</span>
      <Select
        value={String(daysBefore)}
        onValueChange={(value) => {
          const days = Number(value)
          onChange({
            policy: "daily_gate",
            days: days === gate.gate_days_before_default ? null : days,
          })
        }}
      >
        <SelectTrigger
          size="sm"
          className="w-36"
          aria-label="Days before delivery"
        >
          <SelectValue>
            {(value: string) => dayLabel(Number(value))}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {dayOptions.map((d) => (
            <SelectItem key={d} value={String(d)}>
              {dayLabel(d)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span>delivery</span>
    </div>
  )
}

function LeadTimeControl({
  meta,
  state,
  onChange,
  missingForecastHours,
}: {
  meta: Meta
  state: DashboardState
  onChange: OnChange
  missingForecastHours: number | null
}) {
  const bounds = meta.policies.lead_time
  const committed = state.lead ?? bounds.lead_time_h_default
  // Local value while dragging; the URL (and so the API request) only changes when
  // the user lets go, so a drag does not fire a request per step.
  const [dragging, setDragging] = useState<number | null>(null)
  const shown = dragging ?? committed

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <div className="flex items-center gap-2">
        <span id="lead-label">Buy</span>
        <Slider
          id="lead-slider"
          aria-labelledby="lead-label"
          className="w-40"
          min={bounds.lead_time_h_min}
          max={bounds.lead_time_h_max}
          step={1}
          value={[shown]}
          onValueChange={(value) => {
            const next = Array.isArray(value) ? value[0] : value
            setDragging(next)
          }}
          onValueCommitted={(value) => {
            const next = Array.isArray(value) ? value[0] : value
            setDragging(null)
            onChange({ policy: "lead_time", lead: next })
          }}
        />
        <output
          htmlFor="lead-slider"
          aria-live="polite"
          className="whitespace-nowrap"
        >
          <strong className="font-mono text-sm tabular-nums">{shown} h</strong>{" "}
          ahead
        </output>
      </div>
      {dragging == null && missingForecastHours ? (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-highlight/15 px-2.5 py-0.5 text-xs"
          title="No forecast was published early enough for these hours. They are left out, not filled in."
        >
          <AlertTriangleIcon
            className="size-3.5 shrink-0 text-highlight"
            aria-hidden
          />
          {formatNumber(missingForecastHours)} hours have no forecast
        </span>
      ) : null}
    </div>
  )
}
