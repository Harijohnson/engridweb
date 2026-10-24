import { expect, test } from "@playwright/test"

test("dashboard smoke: load, switch policy, slide, inspect an hour, sort", async ({
  page,
}) => {
  await page.goto("/")

  // Loads real data through the /api rewrite; coverage is complete for January.
  await expect(page.getByText(/744\/744 forecast hours/)).toBeVisible()
  await expect(page.getByText("744 / 744 hours matched")).toBeVisible()

  // Switch to the lead-time policy and move the slider with the keyboard.
  const policy = page.getByRole("group", { name: "Decision cutoff" })
  await policy.getByRole("button", { name: "Lead time" }).click()
  await expect(page).toHaveURL(/policy=lead_time/)
  const slider = page.getByRole("slider")
  await slider.focus()
  await slider.press("End") // 48 h: some hours have no forecast that old
  await expect(page).toHaveURL(/lead=48/)
  await expect(page.getByText("Partial coverage")).toBeVisible()
  await expect(
    page.getByText(/155 of 744 delivery hours have no forecast/)
  ).toBeVisible()

  // Back to the daily gate, then open the worked example's publication history.
  await policy.getByRole("button", { name: "Daily gate" }).click()
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

  // Sort the interval table by absolute error.
  const table = page.locator("#intervals")
  await table.getByRole("button", { name: /\|Error\|/ }).click()
  await expect(page).toHaveURL(/sort=-?abs_error_mw/)
  await expect(
    table.getByRole("columnheader", { name: /\|Error\|/ })
  ).toHaveAttribute("aria-sort", /ascending|descending/)
})
