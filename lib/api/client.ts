import createClient from "openapi-fetch"

import type { components, paths } from "@/lib/api/schema"

/**
 * The ONLY place that talks to the API. Requests go to same-origin /api/*, which
 * next.config.ts rewrites to the Django backend (D8). No CORS, no direct backend calls.
 */
export const api = createClient<paths>({
  // Same origin. Spelled out because fetch outside a browser (tests) needs an
  // absolute URL; in the browser this equals a relative "/api/...".
  baseUrl: globalThis.location?.origin ?? "",
  // Look fetch up per call (not once at import) so request mocking in tests applies.
  fetch: (request) => globalThis.fetch(request),
})

export type Schemas = components["schemas"]
export type Problem = Schemas["Problem"]

/** An RFC 9457 problem response, or a network failure (status 0). */
export class ApiError extends Error {
  readonly status: number
  readonly problem: Problem | null

  constructor(status: number, problem: Problem | null, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.problem = problem
  }
}

function isProblem(value: unknown): value is Problem {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    "detail" in value
  )
}

/** Unwrap an openapi-fetch result: return data or throw an ApiError. */
export async function unwrap<T>(
  request: Promise<{ data?: T; error?: unknown; response: Response }>
): Promise<T> {
  let result: { data?: T; error?: unknown; response: Response }
  try {
    result = await request
  } catch (cause) {
    throw new ApiError(
      0,
      null,
      cause instanceof Error ? cause.message : "Network error"
    )
  }
  const { data, error, response } = result
  if (data !== undefined && response.ok) return data
  const problem = isProblem(error) ? error : null
  throw new ApiError(
    response.status,
    problem,
    problem?.detail ?? `Request failed with status ${response.status}`
  )
}
