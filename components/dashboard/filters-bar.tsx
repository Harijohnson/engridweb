"use client"

import {
  AlertTriangleIcon,
  CalendarIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react"
import { useState } from "react"
import type { DateRange } from "react-day-picker"

import { describeGate } from "@/components/dashboard/view-summary"
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
import { pressedGreen } from "@/lib/utils"

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

type Chip = { key: string; label: string; clear: Partial<DashboardState> }

/** One removable chip per filter that differs from the API's defaults. */
function activeChips(meta: Meta, state: DashboardState): Chip[] {
  const chips: Chip[] = []
  const window = meta.evaluation_window
  if (state.from || state.to) {
    chips.push({
      key: "dates",
      label: `Days: ${formatIsoDayRange(state.from ?? window.date_from, state.to ?? window.date_to)}`,
      clear: { from: null, to: null, win: null },
    })
  }
  const policy = activePolicy(meta, state)
  if (policy === "lead_time") {
    const lead = state.lead ?? meta.policies.lead_time.lead_time_h_default
    chips.push({
      key: "lead",
      label: `Buying ${lead} h ahead`,
      clear: { policy: null, lead: null },
    })
  } else if (state.gate || state.days != null || policy !== meta.policies.default) {
    const gate = meta.policies.daily_gate
    chips.push({
      key: "gate",
      label: `Buying ${describeGate(state.gate ?? gate.gate_time_default, state.days ?? gate.gate_days_before_default)}`,
      clear: { policy: null, gate: null, days: null },
    })
  }
  return chips
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
        className="flex flex-col gap-3 border bg-card p-4"
        role="status"
        aria-label="Loading filters"
      >
        <Skeleton className="h-3 w-24" />
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-7 w-20" />
          ))}
        </div>
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-7 w-80 max-w-full" />
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
  const chips = activeChips(meta, state)
  const controls = (
    <FilterControls
      meta={meta}
      state={state}
      onChange={update}
      missingForecastHours={missingForecastHours}
    />
  )

  return (
    <div className="flex flex-col gap-2">
      {/* Phones: the controls live in a bottom sheet so the data stays in view. */}
      <div className="flex flex-wrap items-center gap-2 md:hidden">
        <Sheet>
          <SheetTrigger render={<Button size="sm" />}>
            <SlidersHorizontalIcon data-icon="inline-start" aria-hidden />
            Filters{chips.length ? ` (${chips.length})` : ""}
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[85vh] overflow-y-auto"
          >
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>
                Pick the days and when you buy. Changes apply straight away.
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-6">{controls}</div>
          </SheetContent>
        </Sheet>
        <ActiveChips chips={chips} onChange={update} onReset={() => setState(null)} />
      </div>

      <div
        className="hidden flex-col gap-4 border bg-card p-4 md:flex"
        role="group"
        aria-label="Analysis filters"
      >
        {controls}
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="text-muted-foreground">Active filters:</span>
          {chips.length === 0 ? (
            <span className="text-muted-foreground">
              none (the standard view)
            </span>
          ) : null}
          <ActiveChips
            chips={chips}
            onChange={update}
            onReset={() => setState(null)}
          />
        </div>
      </div>
    </div>
  )
}

function ActiveChips({
  chips,
  onChange,
  onReset,
}: {
  chips: Chip[]
  onChange: OnChange
  onReset: () => void
}) {
  if (chips.length === 0) return null
  return (
    <>
      <ul className="flex flex-wrap gap-1.5" aria-label="Active filters">
        {chips.map((chip) => (
          <li key={chip.key}>
            <span className="inline-flex h-7 items-center gap-1 border border-highlight bg-highlight/15 pr-0.5 pl-2.5 text-xs font-medium">
              {chip.label}
              <button
                type="button"
                className="inline-flex size-6 items-center justify-center hover:bg-highlight/25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label={`Remove filter: ${chip.label}`}
                onClick={() => onChange(chip.clear)}
              >
                <XIcon className="size-3.5" aria-hidden />
              </button>
            </span>
          </li>
        ))}
      </ul>
      <Button variant="ghost" size="sm" onClick={onReset}>
        <RotateCcwIcon data-icon="inline-start" aria-hidden />
        Reset all
      </Button>
    </>
  )
}

function FilterControls({
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
  const policy = activePolicy(meta, state)
  return (
    <div className="flex flex-col gap-4">
      <DateControls meta={meta} state={state} onChange={onChange} />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold" id="policy-label">
            When do you buy?
          </span>
          <ToggleGroup
            aria-labelledby="policy-label"
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
        </div>
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
    </div>
  )
}

function DateControls({
  meta,
  state,
  onChange,
}: {
  meta: Meta
  state: DashboardState
  onChange: OnChange
}) {
  const windowFrom = meta.evaluation_window.date_from
  const windowTo = meta.evaluation_window.date_to
  const from = state.from ?? windowFrom
  const to = state.to ?? windowTo
  const presets = datePresets(windowFrom, windowTo)
  const active = presets.find((p) => p.from === from && p.to === to)

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold" id="range-label">
        Which delivery days? <span className="font-normal">(UK)</span>
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <ToggleGroup
          aria-labelledby="range-label"
          variant="outline"
          size="sm"
          spacing={1.5}
          className="flex-wrap"
          value={active ? [active.key] : []}
          onValueChange={(value) => {
            const preset = presets.find((p) => p.key === value[0])
            if (!preset) return
            onChange({
              from: preset.from === windowFrom ? null : preset.from,
              to: preset.to === windowTo ? null : preset.to,
            })
          }}
        >
          {presets.map((preset) => (
            <ToggleGroupItem
              key={preset.key}
              value={preset.key}
              className={pressedGreen}
            >
              {preset.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <CustomDates
          meta={meta}
          from={from}
          to={to}
          isCustom={!active}
          onChange={onChange}
        />
      </div>
    </div>
  )
}

function CustomDates({
  meta,
  from,
  to,
  isCustom,
  onChange,
}: {
  meta: Meta
  from: string
  to: string
  isCustom: boolean
  onChange: OnChange
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>()
  const windowFrom = meta.evaluation_window.date_from
  const windowTo = meta.evaluation_window.date_to

  const apply = (nextFrom: string, nextTo: string) => {
    onChange({
      from: nextFrom === windowFrom ? null : nextFrom,
      to: nextTo === windowTo ? null : nextTo,
    })
    setOpen(false)
  }

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
            variant={isCustom ? "default" : "outline"}
            size="sm"
            className="font-normal"
          />
        }
      >
        <CalendarIcon data-icon="inline-start" aria-hidden />
        {isCustom ? formatIsoDayRange(from, to) : "Custom dates…"}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-t p-2">
          <span className="text-muted-foreground">
            Pick a first and a last day.
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
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold" id="gate-label">
        Buying time
      </span>
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-labelledby="gate-label"
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
        <span>delivery.</span>
      </div>
      <p className="max-w-md text-muted-foreground">
        Uses the newest forecast published by then for every hour of the
        delivery day.
      </p>
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
  const span = bounds.lead_time_h_max - bounds.lead_time_h_min
  const ticks = Array.from(
    { length: 5 },
    (_, i) => bounds.lead_time_h_min + Math.round((span * i) / 4)
  )

  return (
    <div className="flex w-full max-w-md min-w-60 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold" id="lead-label">
          How far ahead?
        </span>
        <output
          className="text-xs"
          htmlFor="lead-slider"
          aria-live="polite"
        >
          Buy{" "}
          <strong className="font-mono text-sm tabular-nums">{shown} h</strong>{" "}
          before each hour
        </output>
      </div>
      <Slider
        id="lead-slider"
        aria-labelledby="lead-label"
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
      <div
        className="flex justify-between font-mono text-[11px] text-muted-foreground tabular-nums"
        aria-hidden
      >
        {ticks.map((t) => (
          <span key={t}>{t} h</span>
        ))}
      </div>
      {dragging == null && missingForecastHours ? (
        <p className="flex items-start gap-1.5 text-xs">
          <AlertTriangleIcon
            className="mt-0.5 size-3.5 shrink-0 text-highlight"
            aria-hidden
          />
          <span>
            This far ahead, {formatNumber(missingForecastHours)} hours have no
            forecast published early enough. They are left out, not filled in.
          </span>
        </p>
      ) : (
        <p className="text-muted-foreground">
          Uses the newest forecast published at least {shown} h before each
          delivery hour.
        </p>
      )}
    </div>
  )
}

