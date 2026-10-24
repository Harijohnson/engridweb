import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { Dashboard } from "@/components/dashboard/dashboard"
import { IntervalTable } from "@/components/dashboard/interval-table"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { PublicationHistory } from "@/components/dashboard/publication-history"
import { ApiError } from "@/lib/api/client"
import * as fixtures from "@/test/fixtures"
import { server } from "@/test/msw-server"
import { renderWithProviders } from "@/test/render"

describe("KpiCards: the four data states", () => {
  it("loading: shows a skeleton, not numbers", () => {
    renderWithProviders(
      <KpiCards summary={undefined} isLoading error={null} onRetry={() => {}} />
    )
    expect(
      screen.getByRole("status", { name: /loading accuracy metrics/i })
    ).toBeTruthy()
    expect(screen.queryByText("MAE")).toBeNull()
  })

  it("error: plain message and a working retry", async () => {
    const onRetry = vi.fn()
    renderWithProviders(
      <KpiCards
        summary={undefined}
        isLoading={false}
        error={new ApiError(500, null, "boom")}
        onRetry={onRetry}
      />
    )
    expect(screen.getByText(/returned an error \(500\)/)).toBeTruthy()
    await userEvent.click(screen.getByRole("button", { name: /try again/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("data: main score and coverage up front, other numbers on demand", async () => {
    renderWithProviders(
      <KpiCards
        summary={fixtures.summary}
        isLoading={false}
        error={null}
        onRetry={() => {}}
      />
    )
    expect(screen.getByText("744 / 744 hours matched")).toBeTruthy()
    expect(screen.queryByText("+1,500")).toBeNull()
    await userEvent.click(
      screen.getByRole("button", { name: /show other numbers/i })
    )
    expect(screen.getByText("+1,500")).toBeTruthy()
    expect(screen.getByText(/on average over-forecast/i)).toBeTruthy()
  })

  it("empty (n = 0): dashes and an explanation, never zeros", async () => {
    renderWithProviders(
      <KpiCards
        summary={{ ...fixtures.summary, metrics: fixtures.emptyMetrics }}
        isLoading={false}
        error={null}
        onRetry={() => {}}
      />
    )
    await userEvent.click(
      screen.getByRole("button", { name: /show other numbers/i })
    )
    expect(screen.getAllByText("–").length).toBeGreaterThanOrEqual(5)
    expect(screen.getAllByText(/no matched hours/i).length).toBeGreaterThan(0)
    expect(screen.queryByText("0 MW")).toBeNull()
  })

  it("partial coverage: warns with counts", () => {
    renderWithProviders(
      <KpiCards
        summary={{
          ...fixtures.summary,
          metrics: fixtures.metrics({
            n_matched: 589,
            n_missing_forecast: 155,
          }),
        }}
        isLoading={false}
        error={null}
        onRetry={() => {}}
      />
    )
    expect(screen.getByText("Partial coverage")).toBeTruthy()
    expect(
      screen.getByText(/155 of 744 delivery hours have no forecast/)
    ).toBeTruthy()
  })
})

describe("PublicationHistory", () => {
  it("labels every version and shows the cutoff and error", () => {
    renderWithProviders(
      <PublicationHistory
        hour="2026-01-15T18:00:00Z"
        data={fixtures.history}
        isLoading={false}
        error={null}
        onRetry={() => {}}
        onPickExample={() => {}}
      />
    )
    const table = screen.getByRole("table")
    for (const label of [
      "Superseded",
      "Selected",
      "After cutoff",
      "After delivery start",
    ]) {
      expect(within(table).getByText(label)).toBeTruthy()
    }
    expect(screen.getByText("+1,381 MW")).toBeTruthy()
    expect(screen.getByText("over-forecast")).toBeTruthy()
    expect(screen.getByText("14 Jan, 10:00")).toBeTruthy()
  })

  it("empty: offers the worked example", async () => {
    const onPickExample = vi.fn()
    renderWithProviders(
      <PublicationHistory
        hour={null}
        data={undefined}
        isLoading={false}
        error={null}
        onRetry={() => {}}
        onPickExample={onPickExample}
      />
    )
    await userEvent.click(
      screen.getByRole("button", { name: /worked example/i })
    )
    expect(onPickExample).toHaveBeenCalledOnce()
  })
})

describe("IntervalTable", () => {
  function renderTable(
    onOrderingChange = vi.fn(),
    ordering: "start_time" | "-forecast_mw" = "start_time"
  ) {
    renderWithProviders(
      <IntervalTable
        data={fixtures.intervalPage}
        isLoading={false}
        error={null}
        onRetry={() => {}}
        ordering={ordering}
        onOrderingChange={onOrderingChange}
        onPageChange={() => {}}
        pageSize={24}
        onPageSizeChange={() => {}}
        selectedHour={null}
        onSelectHour={() => {}}
      />
    )
    return onOrderingChange
  }

  it("sorts on the server through the ordering param", async () => {
    const onOrderingChange = renderTable()
    await userEvent.click(screen.getByRole("button", { name: /^forecast/i }))
    expect(onOrderingChange).toHaveBeenCalledWith(
      expect.stringMatching(/^-?forecast_mw$/)
    )
  })

  it("marks the sorted column for assistive tech", () => {
    renderTable(vi.fn(), "-forecast_mw")
    const header = screen.getByRole("columnheader", { name: /^forecast/i })
    expect(header.getAttribute("aria-sort")).toBe("descending")
  })

  it("shows signs, dashes and status labels", () => {
    renderTable()
    expect(screen.getByText("+1,000 MW")).toBeTruthy()
    expect(screen.getByText("No forecast")).toBeTruthy()
    expect(screen.getByText("Matched")).toBeTruthy()
  })
})

describe("Dashboard (through MSW)", () => {
  it("loads every section from the API", async () => {
    renderWithProviders(<Dashboard />)
    expect(await screen.findByText("744 / 744 hours matched")).toBeTruthy()
    expect(
      await screen.findByRole("heading", { name: "Hour-by-hour table" })
    ).toBeTruthy()
    expect(await screen.findByText(/744\/744 forecast hours/)).toBeTruthy()
  })

  it("selecting a table row opens its publication history", async () => {
    const urls: string[] = []
    renderWithProviders(<Dashboard />, {
      onUrlUpdate: (event) => urls.push(event.queryString),
    })
    const row = await screen.findByText("15 Jan, 18:00")
    await userEvent.click(row)
    await waitFor(() =>
      expect(urls.at(-1)).toContain("hour=2026-01-15T18:00:00Z")
    )
    expect(
      await screen.findByText(/Publication history · 15 Jan 2026, 18:00/)
    ).toBeTruthy()
  })

  it("shows a retryable error when the API fails", async () => {
    server.use(
      http.get("*/api/v1/summary", () =>
        HttpResponse.json(
          {
            type: "x",
            title: "Error",
            status: 503,
            detail: "down",
            instance: null,
            request_id: "abc12345",
          },
          { status: 503 }
        )
      )
    )
    renderWithProviders(<Dashboard />)
    expect(await screen.findByText(/starting up or has no data/i)).toBeTruthy()
    expect(screen.getByText(/request id: abc12345/i)).toBeTruthy()
  })
})
