import { describe, expect, it } from "vitest"

import {
  describeError,
  formatClock12,
  formatHours,
  formatIsoDay,
  formatIsoDayRange,
  formatMw,
  formatPercent,
  formatSignedMw,
  formatUkDateTime,
  formatUkTime,
  isoDaysBetween,
  isoInstant,
  ukIsoDay,
  ukZoneLabel,
} from "@/lib/format"

describe("UK-time formatting", () => {
  it("runs in a non-UK zone, so the assertions below are meaningful", () => {
    // IST is UTC+05:30: getTimezoneOffset() is -330 minutes.
    expect(new Date("2026-01-15T18:00:00Z").getTimezoneOffset()).toBe(-330)
  })

  it("shows UK time, not the browser's local time", () => {
    expect(formatUkTime("2026-01-15T18:00:00Z")).toBe("18:00")
    expect(formatUkDateTime("2026-01-15T18:00:00Z")).toBe("15 Jan, 18:00")
  })

  it("applies BST in summer", () => {
    expect(formatUkTime("2026-07-01T18:00:00Z")).toBe("19:00")
  })

  it("labels the zone GMT or BST from the offset", () => {
    expect(ukZoneLabel("2026-01-15T18:00:00Z")).toBe("UK time (GMT)")
    expect(ukZoneLabel("2026-07-01T18:00:00Z")).toBe("UK time (BST)")
  })

  it("keeps calendar dates on their day in any zone", () => {
    expect(formatIsoDay("2026-01-01")).toBe("1 Jan 2026")
    expect(formatIsoDay("2026-01-31")).toBe("31 Jan 2026")
  })

  it("serialises instants in the API's UTC form", () => {
    expect(isoInstant(Date.UTC(2026, 0, 15, 18))).toBe("2026-01-15T18:00:00Z")
  })
})

describe("number formatting", () => {
  it("formats MW with separators and shows missing values as a dash", () => {
    expect(formatMw(9053)).toBe("9,053 MW")
    expect(formatMw(null)).toBe("–")
  })

  it("always shows the sign of an error, with a true minus", () => {
    expect(formatSignedMw(1381)).toBe("+1,381 MW")
    expect(formatSignedMw(-630)).toBe("−630 MW")
    expect(formatSignedMw(0.2)).toBe("0 MW")
    expect(formatSignedMw(null)).toBe("–")
  })

  it("says what the sign means (error = forecast − actual)", () => {
    expect(describeError(1381)).toBe("over-forecast")
    expect(describeError(-630)).toBe("under-forecast")
    expect(describeError(0)).toBe("exact")
  })

  it("formats percentages and hours", () => {
    expect(formatPercent(79.166)).toBe("79.2%")
    expect(formatHours(32.5)).toBe("32.5 h")
    expect(formatHours(-0.5)).toBe("-0.5 h")
  })
})

describe("UK calendar days (chart zoom, date presets)", () => {
  it("takes the UK date of an instant, not the browser's", () => {
    // 20:00 UTC on 15 Jan is already 16 Jan in IST, where these tests run.
    expect(ukIsoDay("2026-01-15T20:00:00Z")).toBe("2026-01-15")
    // 23:30 UTC on 1 Jul is 00:30 BST on 2 Jul.
    expect(ukIsoDay("2026-07-01T23:30:00Z")).toBe("2026-07-02")
  })

  it("lists every day of a range once, across month ends", () => {
    expect(isoDaysBetween("2026-01-30", "2026-02-02")).toEqual([
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
      "2026-02-02",
    ])
    expect(isoDaysBetween("2026-01-05", "2026-01-05")).toEqual(["2026-01-05"])
  })

  it("formats date ranges compactly", () => {
    expect(formatIsoDayRange("2026-01-01", "2026-01-31")).toBe("1–31 Jan 2026")
    expect(formatIsoDayRange("2026-01-15", "2026-01-15")).toBe("15 Jan 2026")
    expect(formatIsoDayRange("2026-01-29", "2026-02-04")).toBe(
      "29 Jan – 4 Feb 2026"
    )
  })
})

describe("formatClock12", () => {
  it("writes a wall-clock time the way people say it", () => {
    expect(formatClock12("10:00")).toBe("10am")
    expect(formatClock12("10:30")).toBe("10:30am")
    expect(formatClock12("12:00")).toBe("12pm")
    expect(formatClock12("00:00")).toBe("12am")
    expect(formatClock12("17:05")).toBe("5:05pm")
  })
})
