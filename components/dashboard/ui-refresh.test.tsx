import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { ThemeProvider } from "next-themes"
import { afterEach, describe, expect, it, vi } from "vitest"

import { GuideBanner } from "@/components/common/guide-banner"
import { SectionShell } from "@/components/common/section-shell"
import { ThemeToggle } from "@/components/common/theme-toggle"
import { Dashboard } from "@/components/dashboard/dashboard"
import { ForecastVsActualChart } from "@/components/dashboard/forecast-vs-actual-chart"
import { IntervalTable, pageItems } from "@/components/dashboard/interval-table"
import { WorkedExample } from "@/components/guide/worked-example"
import type { Schemas } from "@/lib/api/client"
import * as fixtures from "@/test/fixtures"
import { server } from "@/test/msw-server"
import { renderWithProviders } from "@/test/render"

/** A three-day timeseries built from the fixture's single hour (test data only). */
function threeDays(): Schemas["TimeseriesResponse"] {
  const days = ["2026-01-14", "2026-01-15", "2026-01-16"]
  const [f] = fixtures.timeseries.forecast
  const [a] = fixtures.timeseries.actual
  return {
    ...fixtures.timeseries,
    forecast: days.map((d) => ({ ...f, start_time: `${d}T18:00:00Z` })),
    actual: days.map((d) => ({
      ...a,
      start_time: `${d}T18:00:00Z`,
      settlement_date: d,
    })),
  }
}

describe("Theme switch (D21)", () => {
  afterEach(() => document.documentElement.classList.remove("dark"))

  it("is visible and switches to dark mode", async () => {
    renderWithProviders(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ThemeToggle />
      </ThemeProvider>
    )
    const group = screen.getByRole("group", { name: "Colour theme" })
    await userEvent.click(
      within(group).getByRole("button", { name: "Dark theme" })
    )
    await waitFor(() =>
      expect(document.documentElement.classList.contains("dark")).toBe(true)
    )
  })
})

describe("Key numbers: plain-language view sentence", () => {
  it("describes the view from the query the API applied", async () => {
    renderWithProviders(<Dashboard />)
    expect(
      await screen.findByText(
        /newest forecast available at 10:00 UK the day before each delivery day/
      )
    ).toBeTruthy()
    expect(screen.getByText("1–31 Jan 2026")).toBeTruthy()
  })
})

describe("Filters", () => {
  it("names the policies in plain language", async () => {
    renderWithProviders(<Dashboard />)
    const group = await screen.findByRole("group", {
      name: "When do you buy?",
    })
    expect(
      within(group).getByRole("button", { name: "At a fixed time each day" })
    ).toBeTruthy()
    expect(
      within(group).getByRole("button", {
        name: "A set number of hours ahead",
      })
    ).toBeTruthy()
  })

  it("offers whole-month and weekly date presets from the API window", async () => {
    renderWithProviders(<Dashboard />)
    const group = await screen.findByRole("group", {
      name: /which delivery days/i,
    })
    for (const label of ["Whole month", "1–7 Jan", "29–31 Jan"]) {
      expect(within(group).getByRole("button", { name: label })).toBeTruthy()
    }
  })

  it("shows an active filter as a removable chip", async () => {
    const urls: string[] = []
    renderWithProviders(<Dashboard />, {
      searchParams: "?policy=lead_time&lead=30",
      onUrlUpdate: (event) => urls.push(event.queryString),
    })
    const remove = await screen.findAllByRole("button", {
      name: "Remove filter: Buying 30 h ahead",
    })
    await userEvent.click(remove[0])
    await waitFor(() => expect(urls.at(-1)).not.toContain("lead="))
  })
})

describe("Chart zoom (D25)", () => {
  function renderChart(onZoomChange = vi.fn(), onWindowChange = vi.fn()) {
    renderWithProviders(
      <ForecastVsActualChart
        data={threeDays()}
        isLoading={false}
        error={null}
        onRetry={() => {}}
        selectedHour={null}
        onSelectHour={() => {}}
        zoom="day"
        onZoomChange={onZoomChange}
        windowStart={null}
        onWindowChange={onWindowChange}
        view="lines"
        onViewChange={() => {}}
      />
    )
    return { onZoomChange, onWindowChange }
  }

  it("shows one day at a time and steps to the next", async () => {
    const { onWindowChange } = renderChart()
    expect(screen.getByText("Wed 14 Jan")).toBeTruthy()
    expect(
      (
        screen.getByRole("button", {
          name: "Previous day",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true)
    await userEvent.click(screen.getByRole("button", { name: "Next day" }))
    expect(onWindowChange).toHaveBeenCalledWith("2026-01-15")
  })

  it("switches zoom", async () => {
    const { onZoomChange } = renderChart()
    await userEvent.click(screen.getByRole("button", { name: "All days" }))
    expect(onZoomChange).toHaveBeenCalledWith("month")
  })

  it("lets each line be hidden from its legend button", async () => {
    renderChart()
    const forecast = screen.getByRole("button", {
      name: /forecast \(hourly\)/i,
    })
    expect(forecast.getAttribute("aria-pressed")).toBe("true")
    await userEvent.click(forecast)
    expect(forecast.getAttribute("aria-pressed")).toBe("false")
  })
})

describe("Hour-by-hour table", () => {
  function renderTable(onPageChange = vi.fn()) {
    renderWithProviders(
      <IntervalTable
        data={{
          ...fixtures.intervalPage,
          count: 744,
          page: 5,
          num_pages: 31,
          previous: 4,
          next: 6,
        }}
        isLoading={false}
        error={null}
        onRetry={() => {}}
        ordering="start_time"
        onOrderingChange={() => {}}
        onPageChange={onPageChange}
        pageSize={24}
        onPageSizeChange={() => {}}
        selectedHour={null}
        onSelectHour={() => {}}
      />
    )
    return onPageChange
  }

  it("says which rows are shown and numbers the pages", async () => {
    const onPageChange = renderTable()
    expect(screen.getByText("Showing 97–120 of 744 hours")).toBeTruthy()
    expect(
      screen
        .getByRole("button", { name: "Page 5" })
        .getAttribute("aria-current")
    ).toBe("page")
    await userEvent.click(screen.getByRole("button", { name: "Last page" }))
    expect(onPageChange).toHaveBeenCalledWith(31)
    await userEvent.click(screen.getByRole("button", { name: "Page 6" }))
    expect(onPageChange).toHaveBeenCalledWith(6)
  })

  it("hides technical columns until asked", async () => {
    renderTable()
    expect(
      screen.queryByRole("columnheader", { name: /published/i })
    ).toBeNull()
    await userEvent.click(
      screen.getByRole("switch", { name: /technical columns/i })
    )
    expect(
      screen.getByRole("columnheader", { name: /published/i })
    ).toBeTruthy()
  })

  it("pageItems keeps first, last and neighbours with gaps", () => {
    expect(pageItems(5, 31)).toEqual([1, "gap", 4, 5, 6, "gap", 31])
    expect(pageItems(1, 3)).toEqual([1, 2, 3])
    expect(pageItems(1, 1)).toEqual([1])
  })
})

describe("Loading, updating and source (U4)", () => {
  it("marks a section busy and says it is updating", () => {
    renderWithProviders(
      <SectionShell
        id="x"
        title="Section"
        updating
        source={{
          dataVersion: 7,
          fetchedAt: Date.parse("2026-01-15T14:02:00Z"),
        }}
      >
        <p>content</p>
      </SectionShell>
    )
    const region = screen.getByRole("region", { name: /section/i })
    expect(region.getAttribute("aria-busy")).toBe("true")
    expect(screen.getByText("Updating…")).toBeTruthy()
    // Fetched time in UK time even though the tests run in IST.
    expect(screen.getByText(/data version 7 · fetched 14:02 UK/)).toBeTruthy()
  })

  it("warns when sections come from different data versions", async () => {
    server.use(
      http.get("*/api/v1/summary", () =>
        HttpResponse.json({ ...fixtures.summary, data_version: 2 })
      )
    )
    renderWithProviders(<Dashboard />)
    expect(
      await screen.findByText(/data was updated while this page was open/i)
    ).toBeTruthy()
  })

  it("Refresh re-reads every section past the browser cache (D23)", async () => {
    // Spy on the client's outgoing Request (MSW rebuilds requests and drops `cache`).
    const caches: string[] = []
    const realFetch = globalThis.fetch
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        if (input instanceof Request && input.url.includes("/api/v1/summary")) {
          caches.push(input.cache)
        }
        return realFetch(input, init)
      })
    renderWithProviders(<Dashboard />)
    const refresh = await screen.findByRole("button", { name: "Refresh" })
    await waitFor(() =>
      expect((refresh as HTMLButtonElement).disabled).toBe(false)
    )
    await userEvent.click(refresh)
    await waitFor(() => expect(caches).toContain("no-cache"))
    expect(caches[0]).toBe("default")
    spy.mockRestore()
  })
})

describe("User guide", () => {
  it("loads the worked example live from the API", async () => {
    renderWithProviders(<WorkedExample />)
    expect(await screen.findByText("+1,381 MW")).toBeTruthy()
    expect(
      screen.getByRole("link", { name: /open this hour on the dashboard/i })
    ).toBeTruthy()
  })

  it("new-visitor banner can be dismissed and stays dismissed", async () => {
    window.localStorage.clear()
    const { unmount } = renderWithProviders(<GuideBanner />)
    await userEvent.click(
      await screen.findByRole("button", { name: "Dismiss" })
    )
    expect(screen.queryByText(/new here/i)).toBeNull()
    unmount()
    renderWithProviders(<GuideBanner />)
    expect(screen.queryByText(/new here/i)).toBeNull()
    expect(window.localStorage.getItem("engrid.guide-banner-dismissed")).toBe(
      "1"
    )
  })
})
