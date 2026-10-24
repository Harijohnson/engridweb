/**
 * Presentation-only formatting. Every instant is shown in UK time (Europe/London, D11),
 * never in the browser's zone: the owner's machine is IST and would shift every time.
 * Numbers arrive from the API already computed; nothing here derives a metric.
 */

export const UK_TIME_ZONE = "Europe/London"
export const EMPTY = "–"

const mwFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 })
const pctFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 })
const hoursFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 })

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: UK_TIME_ZONE,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})
const dateTimeWithYearFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: UK_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})
const dayFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: UK_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
})
const dayMonthFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: UK_TIME_ZONE,
  day: "numeric",
  month: "short",
})
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: UK_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})
// en-CA formats dates as YYYY-MM-DD.
const ukIsoDayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: UK_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})
const zoneOffsetFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: UK_TIME_ZONE,
  timeZoneName: "shortOffset",
})

type Instant = string | number | Date

function toDate(value: Instant): Date {
  return value instanceof Date ? value : new Date(value)
}

/** 9,053 MW. Null (no value) renders as an en dash. */
export function formatMw(value: number | null | undefined): string {
  return value == null ? EMPTY : `${mwFormat.format(value)} MW`
}

/** Bare number with thousands separators, for axis ticks. */
export function formatNumber(value: number | null | undefined): string {
  return value == null ? EMPTY : mwFormat.format(value)
}

/** Signed number: +1,381 / −630 / 0. Uses a true minus sign. */
export function formatSignedNumber(value: number | null | undefined): string {
  if (value == null) return EMPTY
  const rounded = Math.round(value)
  if (rounded === 0) return "0"
  const sign = rounded > 0 ? "+" : "−"
  return `${sign}${mwFormat.format(Math.abs(rounded))}`
}

/** Signed MW: +1,381 MW / −630 MW / 0 MW. */
export function formatSignedMw(value: number | null | undefined): string {
  return value == null ? EMPTY : `${formatSignedNumber(value)} MW`
}

export type ErrorDirection = "over" | "under" | "exact"

/** error = forecast − actual: positive means the forecast was too high. */
export function errorDirection(value: number): ErrorDirection {
  const rounded = Math.round(value)
  if (rounded > 0) return "over"
  if (rounded < 0) return "under"
  return "exact"
}

export function describeError(value: number | null | undefined): string {
  if (value == null) return EMPTY
  switch (errorDirection(value)) {
    case "over":
      return "over-forecast"
    case "under":
      return "under-forecast"
    case "exact":
      return "exact"
  }
}

export function formatPercent(value: number | null | undefined): string {
  return value == null ? EMPTY : `${pctFormat.format(value)}%`
}

export function formatHours(value: number | null | undefined): string {
  return value == null ? EMPTY : `${hoursFormat.format(value)} h`
}

/** 15 Jan, 18:00 (UK time). */
export function formatUkDateTime(value: Instant | null | undefined): string {
  return value == null ? EMPTY : dateTimeFormat.format(toDate(value))
}

/** 15 Jan 2026, 18:00 (UK time). */
export function formatUkDateTimeWithYear(
  value: Instant | null | undefined
): string {
  return value == null ? EMPTY : dateTimeWithYearFormat.format(toDate(value))
}

/** Thu 15 Jan (UK date of the instant). */
export function formatUkDay(value: Instant): string {
  return dayFormat.format(toDate(value))
}

/** 15 Jan (UK date of the instant). */
export function formatUkDayMonth(value: Instant): string {
  return dayMonthFormat.format(toDate(value))
}

/** 18:00 (UK time). */
export function formatUkTime(value: Instant): string {
  return timeFormat.format(toDate(value))
}

/** A wall-clock "HH:MM" as a plain clock time: "10am", "10:30am", "12pm", "12am". */
export function formatClock12(clock: string): string {
  const [hours, minutes] = clock.split(":").map(Number)
  const suffix = hours < 12 ? "am" : "pm"
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return minutes === 0
    ? `${hour12}${suffix}`
    : `${hour12}:${String(minutes).padStart(2, "0")}${suffix}`
}

/** "UK time (GMT)" or "UK time (BST)", whichever applies at the instant shown. Derived
 * from the UTC offset, because browsers disagree on short zone names ("GMT" vs "GMT+0"). */
export function ukZoneLabel(value: Instant): string {
  const offset = zoneOffsetFormat
    .formatToParts(toDate(value))
    .find((part) => part.type === "timeZoneName")?.value
  const zone =
    offset === "GMT" || offset === "GMT+0"
      ? "GMT"
      : offset === "GMT+1"
        ? "BST"
        : (offset ?? UK_TIME_ZONE)
  return `UK time (${zone})`
}

/** A calendar date "YYYY-MM-DD" (a UK delivery date, not an instant), as "15 Jan 2026". */
export function formatIsoDay(isoDay: string): string {
  const [year, month, day] = isoDay.split("-").map(Number)
  // Format at noon UTC so no zone can move it to a neighbouring day.
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)))
}

/** The UK calendar date of an instant, as "YYYY-MM-DD" (2026-01-15). */
export function ukIsoDay(value: Instant): string {
  return ukIsoDayFormat.format(toDate(value))
}

/** A calendar date "YYYY-MM-DD" as "15 Jan" (no year). */
export function formatIsoDayShort(isoDay: string): string {
  return formatIsoDay(isoDay).replace(/ \d{4}$/, "")
}

/** "1–7 Jan 2026", "15 Jan 2026" or "29 Dec 2025 – 4 Jan 2026" for a UK date range. */
export function formatIsoDayRange(from: string, to: string): string {
  if (from === to) return formatIsoDay(from)
  const [fromYear, fromMonth] = from.split("-")
  const [toYear, toMonth] = to.split("-")
  if (fromYear === toYear && fromMonth === toMonth) {
    return `${Number(from.slice(8))}–${formatIsoDay(to)}`
  }
  if (fromYear === toYear) {
    return `${formatIsoDayShort(from)} – ${formatIsoDay(to)}`
  }
  return `${formatIsoDay(from)} – ${formatIsoDay(to)}`
}

/** Calendar days from "YYYY-MM-DD" to "YYYY-MM-DD", inclusive. Pure date arithmetic in
 * UTC, so no zone can skip or repeat a day. */
export function isoDaysBetween(from: string, to: string): string[] {
  const days: string[] = []
  const [y, m, d] = from.split("-").map(Number)
  const cursor = new Date(Date.UTC(y, m - 1, d))
  for (let i = 0; i < 400; i++) {
    const day = cursor.toISOString().slice(0, 10)
    if (day > to) break
    days.push(day)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return days
}

/** Hour-of-day key "0".."23" -> "00:00". */
export function formatHourOfDay(key: string): string {
  return `${key.padStart(2, "0")}:00`
}

/** An instant as the API's ISO-8601 UTC form: 2026-01-15T18:00:00Z. */
export function isoInstant(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z")
}
