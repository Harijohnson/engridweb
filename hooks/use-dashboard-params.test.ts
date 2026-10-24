import { describe, expect, it } from "vitest"

import { analyticsParams } from "@/hooks/use-dashboard-params"

const none = {
  from: null,
  to: null,
  policy: null,
  gate: null,
  days: null,
  lead: null,
}

describe("analyticsParams", () => {
  it("sends nothing when nothing is chosen, so the server defaults apply", () => {
    expect(analyticsParams(none)).toEqual({})
  })

  it("sends only lead-time params under the lead-time policy", () => {
    expect(
      analyticsParams({
        ...none,
        policy: "lead_time",
        lead: 12,
        gate: "09:00",
        days: 2,
      })
    ).toEqual({ policy: "lead_time", lead_time_h: 12 })
  })

  it("sends only gate params under the daily gate", () => {
    expect(
      analyticsParams({
        ...none,
        policy: "daily_gate",
        gate: "09:00",
        days: 2,
        lead: 12,
      })
    ).toEqual({ policy: "daily_gate", gate_time: "09:00", gate_days_before: 2 })
  })

  it("infers the policy from a lone lead time", () => {
    expect(analyticsParams({ ...none, lead: 6 })).toEqual({
      policy: "lead_time",
      lead_time_h: 6,
    })
  })

  it("passes the date range through", () => {
    expect(
      analyticsParams({ ...none, from: "2026-01-10", to: "2026-01-12" })
    ).toEqual({
      date_from: "2026-01-10",
      date_to: "2026-01-12",
    })
  })
})
