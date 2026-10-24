import { http, HttpResponse } from "msw"
import { setupServer } from "msw/node"

import * as fixtures from "./fixtures"

/** Default handlers: every endpoint answers with its fixture. Tests override per case. */
export const handlers = [
  http.get("*/api/v1/meta", () => HttpResponse.json(fixtures.meta)),
  http.get("*/api/v1/summary", () => HttpResponse.json(fixtures.summary)),
  http.get("*/api/v1/timeseries", () => HttpResponse.json(fixtures.timeseries)),
  http.get("*/api/v1/intervals", () =>
    HttpResponse.json(fixtures.intervalPage)
  ),
  http.get("*/api/v1/forecasts/history", () =>
    HttpResponse.json(fixtures.history)
  ),
  http.get("*/api/v1/accuracy/by-lead-time", () =>
    HttpResponse.json(fixtures.curve)
  ),
  http.get("*/api/v1/accuracy/breakdown", () =>
    HttpResponse.json(fixtures.breakdown)
  ),
]

export const server = setupServer(...handlers)
