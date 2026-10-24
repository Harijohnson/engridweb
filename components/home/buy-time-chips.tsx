"use client"

import { Skeleton } from "@/components/ui/skeleton"
import type { DashboardState } from "@/hooks/use-dashboard-params"
import type { Schemas } from "@/lib/api/client"
import { formatClock12 } from "@/lib/format"
import { cn } from "@/lib/utils"

type Policies = Schemas["MetaResponse"]["policies"]
type BuyTimeState = Pick<DashboardState, "policy" | "gate" | "days" | "lead">

/** Hours ahead offered next to the standard daily buying time (PLAN.md D31). */
export const LEAD_CHIPS = [6, 24, 48] as const

type Choice =
  | { policy: "daily_gate"; gate: string; days: number }
  | { policy: "lead_time"; lead: number }

/** What the URL asks for, with unset values filled from the API's own defaults
 * (served by /api/v1/meta), so the matching chip can light up at once. */
export function currentChoice(state: BuyTimeState, policies: Policies): Choice {
  const policy =
    state.policy ??
    (state.lead != null
      ? "lead_time"
      : state.gate || state.days != null
        ? "daily_gate"
        : policies.default)
  if (policy === "lead_time") {
    return {
      policy,
      lead: state.lead ?? policies.lead_time.lead_time_h_default,
    }
  }
  return {
    policy: "daily_gate",
    gate: state.gate ?? policies.daily_gate.gate_time_default,
    days: state.days ?? policies.daily_gate.gate_days_before_default,
  }
}

/** "Day before, 10am UK", "6 hours before", "1 day before". */
export function choiceLabel(choice: Choice): string {
  if (choice.policy === "daily_gate") {
    const day = choice.days === 1 ? "Day before" : `${choice.days} days before`
    return `${day}, ${formatClock12(choice.gate)} UK`
  }
  const h = choice.lead
  if (h > 0 && h % 24 === 0) {
    return h === 24 ? "1 day before" : `${h / 24} days before`
  }
  return h === 1 ? "1 hour before" : `${h} hours before`
}

function sameChoice(a: Choice, b: Choice): boolean {
  if (a.policy === "daily_gate" && b.policy === "daily_gate") {
    return a.gate === b.gate && a.days === b.days
  }
  if (a.policy === "lead_time" && b.policy === "lead_time") {
    return a.lead === b.lead
  }
  return false
}

type Chip = { choice: Choice; update: BuyTimeState | null }

function chipsFor(policies: Policies, current: Choice): Chip[] {
  const { lead_time_h_min: min, lead_time_h_max: max } = policies.lead_time
  const chips: Chip[] = [
    {
      choice: {
        policy: "daily_gate",
        gate: policies.daily_gate.gate_time_default,
        days: policies.daily_gate.gate_days_before_default,
      },
      // Leave the gate unset so the backend applies its own default.
      update: {
        policy: policies.default === "daily_gate" ? null : "daily_gate",
        gate: null,
        days: null,
        lead: null,
      },
    },
    ...LEAD_CHIPS.filter((h) => h >= min && h <= max).map((h): Chip => ({
      choice: { policy: "lead_time", lead: h },
      update: { policy: "lead_time", lead: h, gate: null, days: null },
    })),
  ]
  // A setting made on the Details page stays visible as its own chip.
  if (!chips.some((chip) => sameChoice(chip.choice, current))) {
    chips.push({ choice: current, update: null })
  }
  return chips
}

export function BuyTimeChips({
  policies,
  state,
  onChange,
}: {
  policies: Policies | undefined
  state: BuyTimeState
  onChange: (update: BuyTimeState) => void
}) {
  return (
    <section aria-labelledby="buy-time-title" className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-0.5">
        <h2 id="buy-time-title" className="text-base font-semibold">
          When do you buy?
        </h2>
        <p className="text-sm text-muted-foreground">
          How early you buy the power, before it is used. Only predictions made
          by then count.
        </p>
      </div>
      {policies ? (
        <Chips policies={policies} state={state} onChange={onChange} />
      ) : (
        <div
          className="flex flex-wrap gap-2"
          role="status"
          aria-label="Loading buying times"
        >
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-32 rounded-full" />
          ))}
        </div>
      )}
    </section>
  )
}

function Chips({
  policies,
  state,
  onChange,
}: {
  policies: Policies
  state: BuyTimeState
  onChange: (update: BuyTimeState) => void
}) {
  const current = currentChoice(state, policies)
  return (
    <div
      role="group"
      aria-labelledby="buy-time-title"
      className="flex flex-wrap gap-2"
    >
      {chipsFor(policies, current).map(({ choice, update }) => {
        const selected = sameChoice(choice, current)
        const label = choiceLabel(choice)
        return (
          <button
            key={label}
            type="button"
            aria-pressed={selected}
            onClick={() => {
              if (!selected && update) onChange(update)
            }}
            className={cn(
              "inline-flex h-10 items-center rounded-full bg-card px-4 text-sm font-medium shadow-soft ring-1 ring-foreground/10 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              selected &&
                "bg-primary text-primary-foreground ring-primary hover:bg-primary/90"
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
