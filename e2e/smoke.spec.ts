import { expect, test } from "@playwright/test"

test("home page: plain answer, buying-time chips, link to details", async ({
  page,
}) => {
  await page.goto("/")

  // Real data through the /api rewrite: every January hour is checked.
  await expect(page.getByText("The short answer")).toBeVisible()
  const numbers = page.getByLabel("The answer in numbers")
  await expect(numbers.getByText("744 of 744")).toBeVisible()

  // Buying two days ahead leaves hours with no prediction in time; they are counted.
  const chips = page.getByRole("group", { name: "When do you buy?" })
  await chips.getByRole("button", { name: "2 days before" }).click()
  await expect(page).toHaveURL(/policy=lead_time/)
  await expect(page).toHaveURL(/lead=48/)
  await expect(
    numbers.getByText(/155 hours had no prediction in time/)
  ).toBeVisible()

  // The chart moves a week at a time.
  await page.getByRole("button", { name: "Next week" }).click()
  await expect(page).toHaveURL(/win=2026-01-08/)

  // Details keeps the same view.
  await page.getByRole("link", { name: /See the details/ }).click()
  await expect(page).toHaveURL(/\/details\?.*lead=48/)
  await expect(page.getByText("Partial coverage")).toBeVisible()
})

test("details smoke: load, switch policy, slide, inspect an hour, sort", async ({
  page,
}) => {
  await page.goto("/details")

  // Loads real data through the /api rewrite; coverage is complete for January.
  await expect(page.getByText(/744\/744 forecast hours/)).toBeVisible()
  await expect(page.getByText("744 / 744 hours matched")).toBeVisible()

  // Switch to "hours ahead" (the lead-time policy) and move the slider by keyboard.
  const policy = page.getByRole("group", { name: "When do you buy?" })
  await policy
    .getByRole("button", { name: "A set number of hours ahead" })
    .click()
  await expect(page).toHaveURL(/policy=lead_time/)
  const slider = page.getByRole("slider")
  await slider.focus()
  await slider.press("End") // 48 h: some hours have no forecast that old
  await expect(page).toHaveURL(/lead=48/)
  await expect(page.getByText("Partial coverage")).toBeVisible()
  await expect(
    page.getByText(/155 of 744 delivery hours have no forecast/)
  ).toBeVisible()
  // The active filter shows as a removable chip.
  await expect(
    page.getByRole("button", { name: "Remove filter: Buying 48 h ahead" })
  ).toBeVisible()

  // Back to a fixed daily time, then open the worked example's publication history.
  await policy.getByRole("button", { name: "At a fixed time each day" }).click()
  await page.getByRole("button", { name: /worked example/i }).click()
  await expect(page).toHaveURL(
    /hour=2026-01-15T18%3A00%3A00Z|hour=2026-01-15T18:00:00Z/
  )
  const history = page.locator("#publication-history")
  // Shown in UK time even though the browser runs in IST.
  await expect(
    history.getByText("Publication history · 15 Jan 2026, 18:00")
  ).toBeVisible()
  await expect(history.getByText("+1,381 MW")).toBeVisible()
  await expect(history.getByRole("table").getByText("Selected")).toBeVisible()
  await expect(
    history.getByRole("table").getByText("After delivery start").first()
  ).toBeVisible()

  // Sort the hour-by-hour table by how far off the forecast was.
  const table = page.locator("#intervals")
  await table.getByRole("button", { name: /How far off/ }).click()
  await expect(page).toHaveURL(/sort=-?error_mw/)
  await expect(
    table.getByRole("columnheader", { name: /How far off/ })
  ).toHaveAttribute("aria-sort", /ascending|descending/)
  await expect(table.getByText(/Showing 1–24 of 744 hours/)).toBeVisible()

  // Dark mode is a visible switch (D21).
  await page.getByRole("button", { name: "Dark theme" }).click()
  await expect(page.locator("html")).toHaveClass(/dark/)
})

test("user guide: worked example loads live", async ({ page }) => {
  await page.goto("/guide")
  await expect(
    page.getByRole("heading", { name: "How the wind forecast monitor works" })
  ).toBeVisible()
  const example = page.locator("#worked-example")
  await expect(example.getByText("+1,381 MW")).toBeVisible()
  await example
    .getByRole("link", { name: /open this hour on the dashboard/i })
    .click()
  await expect(page).toHaveURL(/hour=2026-01-15T18/)
})
