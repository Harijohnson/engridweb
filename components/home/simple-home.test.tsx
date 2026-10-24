import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"

import { describeBuying } from "@/components/home/answer-cards"
import { SimpleHome } from "@/components/home/simple-home"
import type { Schemas } from "@/lib/api/client"
import * as fixtures from "@/test/fixtures"
import { server } from "@/test/msw-server"
import { renderWithProviders } from "@/test/render"

function summaryWith(
  metrics: Partial<Schemas["MetricSummary"]>
): Schemas["SummaryResponse"] {
  return { ...fixtures.summary, metrics: fixtures.metrics(metrics) }
}

function mockSummary(body: Schemas["SummaryResponse"]) {
  server.use(http.get("*/api/v1/summary", () => HttpResponse.json(body)))
}

async function cards() {
  return screen.findByLabelText("The answer in numbers")
}

describe("Simple home page (D30–D34)", () => {
  it("answers in one plain sentence built from the API's values", async () => {
    renderWithProviders(<SimpleHome />)
    expect(
      await screen.findByText(
        "If you bought the day before at 10am UK, the prediction was usually off by about 2,000 MW. On average it guessed too high."
      )
    ).toBeTruthy()
  })

  it("shows three cards: typical miss with scale, leaning, hours checked", async () => {
    renderWithProviders(<SimpleHome />)
    const list = await cards()
    expect(within(list).getByText("Usually off by")).toBeTruthy()
    expect(within(list).getByText("2,000")).toBeTruthy()
    expect(
      within(list).getByText(
        "For comparison, the real wind averaged 11,500 MW."
      )
    ).toBeTruthy()
    expect(within(list).getByText("Guessed too high")).toBeTruthy()
    expect(within(list).getByText("+1,500")).toBeTruthy()
    expect(within(list).getByText("744 of 744")).toBeTruthy()
    expect(
      within(list).getByText("Every hour had a prediction and a real value.")
    ).toBeTruthy()
  })

  it("says 'too low' with a true minus sign for an under-forecast", async () => {
    mockSummary(summaryWith({ bias_mw: -1500 }))
    renderWithProviders(<SimpleHome />)
    const list = await cards()
    expect(within(list).getByText("Guessed too low")).toBeTruthy()
    expect(within(list).getByText("−1,500")).toBeTruthy()
  })

  it("counts missing hours instead of hiding them", async () => {
    mockSummary(
      summaryWith({ n_matched: 589, n_missing_forecast: 155, coverage_pct: 79 })
    )
    renderWithProviders(<SimpleHome />)
    const list = await cards()
    expect(within(list).getByText("589 of 744")).toBeTruthy()
    expect(
      within(list).getByText(
        "155 hours had no prediction in time, so they are left out."
      )
    ).toBeTruthy()
  })

  it("shows a dash, not 0, when no hour could be compared", async () => {
    mockSummary({ ...fixtures.summary, metrics: fixtures.emptyMetrics })
    renderWithProviders(<SimpleHome />)
    expect(
      await screen.findByText(
        "No hour could be checked for this buying time, so there is no answer."
      )
    ).toBeTruthy()
    const list = await cards()
    expect(within(list).getAllByText("–")).toHaveLength(2)
    expect(within(list).getByText("0 of 744")).toBeTruthy()
  })

  it("shows a retryable error when the API fails", async () => {
    server.use(
      http.get("*/api/v1/summary", () =>
        HttpResponse.json({ detail: "boom" }, { status: 500 })
      )
    )
    renderWithProviders(<SimpleHome />)
    expect(await screen.findByText("Could not load this section")).toBeTruthy()
    expect(screen.getAllByRole("button", { name: "Try again" })).toBeTruthy()
  })
})

describe("Buying-time chips (D31)", () => {
  it("offers the API's default daily time and three lead times", async () => {
    renderWithProviders(<SimpleHome />)
    const group = await screen.findByRole("group", { name: "When do you buy?" })
    const labels = within(group)
      .getAllByRole("button")
      .map((b) => b.textContent)
    expect(labels).toEqual([
      "Day before, 10am UK",
      "6 hours before",
      "1 day before",
      "2 days before",
    ])
    expect(
      within(group)
        .getByRole("button", { name: "Day before, 10am UK" })
        .getAttribute("aria-pressed")
    ).toBe("true")
  })

  it("writes the chosen buying time to the URL", async () => {
    const urls: string[] = []
    renderWithProviders(<SimpleHome />, {
      onUrlUpdate: (event) => urls.push(event.queryString),
    })
    const group = await screen.findByRole("group", { name: "When do you buy?" })
    await userEvent.click(
      within(group).getByRole("button", { name: "2 days before" })
    )
    await waitFor(() => expect(urls.at(-1)).toBe("?policy=lead_time&lead=48"))
  })

  it("shows a setting made on the Details page as its own selected chip", async () => {
    renderWithProviders(<SimpleHome />, {
      searchParams: "?policy=lead_time&lead=13",
    })
    const group = await screen.findByRole("group", { name: "When do you buy?" })
    expect(
      within(group)
        .getByRole("button", { name: "13 hours before" })
        .getAttribute("aria-pressed")
    ).toBe("true")
  })

  it("hides chips beyond the API's maximum lead time", async () => {
    server.use(
      http.get("*/api/v1/meta", () =>
        HttpResponse.json({
          ...fixtures.meta,
          policies: {
            ...fixtures.meta.policies,
            lead_time: {
              ...fixtures.meta.policies.lead_time,
              lead_time_h_max: 24,
            },
          },
        })
      )
    )
    renderWithProviders(<SimpleHome />)
    const group = await screen.findByRole("group", { name: "When do you buy?" })
    expect(
      within(group).getByRole("button", { name: "1 day before" })
    ).toBeTruthy()
    expect(
      within(group).queryByRole("button", { name: "2 days before" })
    ).toBeNull()
  })

  it("keeps the view when opening the Details page", async () => {
    renderWithProviders(<SimpleHome />, {
      searchParams: "?policy=lead_time&lead=48",
    })
    const link = await screen.findByRole("link", { name: /See the details/ })
    expect(link.getAttribute("href")).toBe("/details?policy=lead_time&lead=48")
  })
})

describe("describeBuying", () => {
  it("phrases both policies in plain words", () => {
    expect(describeBuying(fixtures.query)).toBe("the day before at 10am UK")
    expect(
      describeBuying({
        ...fixtures.query,
        policy: "lead_time",
        gate_time: null,
        gate_days_before: null,
        lead_time_h: 6,
      })
    ).toBe("6 hours before")
  })
})
