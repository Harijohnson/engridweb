# Frontend (engrid): rules for every change

@AGENTS.md

Read the root [../CLAUDE.md](../CLAUDE.md) and [../PLAN.md](../PLAN.md) first. This app is the **presentation layer** of the wind-forecast monitor. Business logic lives in the Django API ([../engridapi/](../engridapi/)).

**Ask, don't assume.** If a UI behaviour, library, copy text or data shape is not settled in PLAN.md (§4 Decision Log, §5.6 API, §5.7 UX), ask the owner before building it. Anything that depends on an open decision (PLAN.md §4.0) must not be built until it is `RESOLVED`.

## Stack (verified from package.json and config, 2026-10-24)

| Thing | Fact |
| --- | --- |
| Framework | **Next.js 16.4.2**, App Router, React **19.3**, React Server Components on |
| Language | TypeScript, `strict: true`, path alias `@/*` → project root |
| Styling | **Tailwind CSS v4**, CSS-first config in `app/globals.css` (`@theme inline`). There is **no** `tailwind.config.*` |
| Components | **shadcn** style `base-lyra`, built on **`@base-ui/react`, not Radix**. Icons: `lucide-react` |
| Class merging | `cn` from the `cn` package (shadcn's clsx + tailwind-merge replacement), re-exported by `@/lib/utils` |
| Theme | `next-themes` via `components/theme-provider.tsx` (class strategy; `d` toggles dark mode) |
| Package manager | **bun** (`bun.lock`). Do not use npm, yarn or pnpm; do not commit another lockfile |
| Formatting | Prettier: no semicolons, double quotes, `trailingComma: es5`, width 80, tailwind plugin (sorts classes in `cn`/`cva`) |
| Linting | ESLint flat config: `eslint-config-next` core-web-vitals + typescript |
| Runtime | Node ≥ 22 required (the `cn` package's engines field), Next requires ≥ 20.9 |
| Hosting | **Vercel** (Root Directory `engrid`; Bun detected from `bun.lock`). **No Docker** (PLAN.md D19) |

## Approved libraries (PLAN.md D8, D9, D12)

| Purpose | Library |
| --- | --- |
| Server state / fetching | `@tanstack/react-query` |
| URL state | `nuqs` |
| API types + client | `openapi-typescript` (dev, generates `lib/api/schema.d.ts`) + `openapi-fetch` |
| Charts | shadcn `chart` component (Recharts) |
| Tables | shadcn `table` + `@tanstack/react-table` |
| Date picker | shadcn `calendar` + `popover` |
| Tests | `vitest`, `@testing-library/react` (+ its peer `@testing-library/dom`), `@testing-library/user-event`, `msw`, `jsdom` (Vitest's DOM); `@playwright/test` for one smoke test |

Anything else needs the owner's OK first.

## Commands

```bash
bun install                 # install (CI: bun install --frozen-lockfile)
bun dev                     # dev server (expects the Django API at API_ORIGIN)
bun run lint                # eslint
bun run typecheck           # tsc --noEmit
bun run format              # prettier --write
bun run build               # production build (must pass before merge)
bunx shadcn@latest add <c>  # add a shadcn component (never hand-copy from the website)
```

Also: `bun run test` (Vitest, runs under `TZ=Asia/Kolkata`), `bun run test:e2e` (Playwright smoke test; needs the Django API with data on :8000), `bun run api:types` (regenerate `lib/api/schema.d.ts` from `../engridapi/schema.yml`; CI fails if it is stale) and `bun run format:check`.

## Next.js 16: read the bundled docs, not memory

This Next.js version differs from older training data. **Before using any Next API, read the matching guide in `node_modules/next/dist/docs/01-app/`.** Facts already verified there:

- `params` and `searchParams` are **Promises**. `await` them in Server Components, or `use()` them in Client Component pages.
- `fetch` is **not cached by default**. Cache only on purpose (`"use cache"` directive; see `03-api-reference/01-directives/use-cache.md`), never by accident.
- `NEXT_PUBLIC_*` env vars are **inlined at build time**. Server-only values (like `API_ORIGIN`) must **not** be `NEXT_PUBLIC_`.
- `rewrites()` in `next.config.ts` can proxy to an **external** URL (see `03-api-reference/05-config/01-next-config-js/rewrites.md`). That is how `/api/*` reaches the backend.
- Request interception is `proxy` (see `01-getting-started/16-proxy.md`). Check the docs before reaching for "middleware".

## How the frontend reaches the API (PLAN.md D8)

```text
browser ──► https://<vercel-app>/api/v1/...  (same origin, no CORS)
              └─ next.config.ts rewrites /api/:path* ──► ${API_ORIGIN}/api/:path*  (Django on PythonAnywhere)
```

- `API_ORIGIN` (for example `https://<username>.pythonanywhere.com`) is a **server-side** env var set in Vercel (Production + Preview) and in local `.env.local` (for example `http://127.0.0.1:8000`).
- `next.config.ts` is evaluated at **build time**, so **changing `API_ORIGIN` requires a redeploy**.
- Fail the build with a clear message if `API_ORIGIN` is missing. Never fall back silently to a hard-coded URL.
- The browser never talks to PythonAnywhere directly, and **never to Elexon**.

## Architecture rules

### Folder conventions (target, PLAN.md §5.2)

```text
app/                    routes only: layout, page, loading, error, not-found, providers
components/ui/          shadcn primitives. Generated: change via the CLI or theme tokens, not ad-hoc edits
components/dashboard/   one file per dashboard section (filters-bar, kpi-cards, forecast-vs-actual-chart,
                        publication-history, accuracy-breakdown, interval-table, data-status-badge)
components/common/      shared states (empty-state, error-state, section-shell)
hooks/                  URL-state hook + one query hook per endpoint
lib/api/                typed client, generated OpenAPI types, query keys. The ONLY place that talks to the API
lib/format.ts           number, percent and date formatting (Europe/London)
```

- **Files:** kebab-case (`kpi-cards.tsx`). **Components:** PascalCase named exports. One main component per file.
- Import app code via `@/…`. Import `cn` from `@/lib/utils` in app code (shadcn's generated `components/ui/*` import `cn` directly; leave them as generated).

### Server vs Client Components

- Default to **Server Components**. Add `"use client"` only at the **leaf** that needs state, effects, event handlers or browser APIs (charts, slider, table interactions).
- Never pass functions or class instances from Server to Client Components. Pass serialisable props only.
- Providers (Theme, QueryClient, nuqs adapter) live in one client `app/providers.tsx` and are used in `app/layout.tsx`.

### Data fetching (TanStack Query)

- Components **never call `fetch` directly**. Use `lib/api` (openapi-fetch client) and the per-endpoint hooks in `hooks/`.
- API types are **generated from the backend OpenAPI schema**. Never hand-write a type that duplicates an API response, and never use `any`. Regenerate the types whenever the backend schema changes; a stale schema is a bug.
- Query keys come from a single factory in `lib/api` (for example `["summary", params]`) so caching and invalidation stay consistent.
- Keep showing the previous data while a parameter changes (`placeholderData: keepPreviousData`), so the view doesn't flash to a skeleton on every slider move. Debounce slider-driven URL updates.
- The backend has **one worker** on PythonAnywhere. Don't fire redundant requests: share queries, set a sensible `staleTime` (the data is historical), and avoid request waterfalls.

### State

- **Filter state lives in the URL** via **nuqs**: date range, policy, gate / lead time, selected hour, table sort and page. Views are then shareable and the back button works.
- Local, ephemeral UI state (hover, open popover) stays in the component. **No global state library** unless the owner approves one.
- Derive, don't duplicate: if a value can be computed from props or the URL, don't store it in state.

## Domain rules for the UI (see root CLAUDE.md and PLAN.md §3)

- **Display only.** Never recompute forecast selection, errors or metrics in TypeScript. Show what the API returns; only format it.
- **Two decision policies (D1, resolved):** a **daily gate** (headline view, user-adjustable time and days-before, default D-1 10:00 UK) and a **lead time** slider 0–48 h (default 24 h). The dashboard opens on the daily gate. Never hard-code these defaults: read them from `/api/v1/meta`, and send only explicitly chosen values so the backend applies its own.
- From **44 h** lead time some hours have no eligible forecast. Show the coverage gap; never hide it.
- **Units on everything:** `MW` for power, `h` for lead time. Signed errors always show the sign (`+1,381 MW`) and say what it means ("over-forecast" / "under-forecast").
- **Time zone (D11): always `Europe/London`, labelled "UK time (GMT)".** Format every date with `Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", ... })` from `lib/format.ts`. **Never** rely on the browser's local zone: the owner's machine is IST (UTC+05:30), which would silently shift every time.
- **Never fake data.** No placeholder numbers that look real. Skeletons while loading; clearly labelled empty states otherwise.
- **Missing data is visible:** show coverage (for example "744 / 744 hours matched") and warn when it is partial. Do not draw a line across gaps; leave the gap.
- **Draw the forecast at its true (hourly) resolution.** Do not smooth or interpolate it into half-hours. Metrics compare each hourly forecast with the half-hour that starts at the same time (D2); say so in the methodology text.
- The forecast publication history labels each version **selected**, **superseded**, **after cutoff** or **after delivery start**, and shows the cutoff. **No look-ahead series or metric anywhere** (D18).
- Keep the limitations note visible: the tool measures forecast accuracy; it does **not** calculate procurement volumes (no demand data).

## UI and styling

- Use shadcn primitives first; compose them in `components/dashboard/`. Base UI composes with a **`render` prop**, not Radix's `asChild`. Check the generated component's props before using it.
- Tailwind utilities only; conditional classes via `cn()`. No inline `style` except for values computed at runtime (for example chart sizes).
- **Colours come from CSS variables** in `app/globals.css`. No hex or rgb literals in components.
- The current `--chart-1..5` tokens are **grayscale**. Before building charts, define distinct, colour-blind-safe forecast and actual colours for light **and** dark mode (Phase 5), then use them consistently in every chart, legend and table badge.
- Every data section has 4 states: **loading** (skeleton the same size as the content), **error** (plain-language message + retry), **empty**, **partial coverage** (warning with counts).
- Responsive from **360 px** wide upward; no horizontal page scroll (the table may scroll inside its container).

## Accessibility

- Every control is keyboard-operable with a visible focus ring; inputs have labels.
- Charts get a text alternative (title + short summary) and the same data must be reachable in the table.
- Do not use colour as the only signal: pair it with a sign, an icon or text (for example over/under-forecast).
- Contrast meets WCAG AA in light and dark mode.

## TypeScript

- No `any`, no `@ts-ignore`. `as` casts only at a validated boundary, with a comment saying why.
- Use discriminated unions for states (`{ status: "loading" } | { status: "error"; error } | …`) and exhaustive `switch` with a `never` check.
- Treat numbers from the API as possibly `null` (metrics are `null` when `n = 0`) and render "–" with an explanation.

## Performance

- Keep client bundles small: `"use client"` only at leaves; lazy-load heavy chart components if bundle analysis shows a need.
- Memoise expensive data transforms for charts (`useMemo` with stable keys). Don't recreate chart data on every render.
- Do not optimise speculatively. Measure first (Lighthouse or React Profiler) and note findings in PLAN.md.

## Testing (D12: Vitest + React Testing Library + MSW; one Playwright smoke test)

- Test behaviour, not implementation: what the user sees and can do.
- Must-have tests: number and sign formatting, the UK-time formatting helper (run it under a non-UK `TZ` and assert UK output), each of the four data states, table sorting, publication-history status labels.
- Mock the API at the network layer (MSW) using fixtures typed with the generated OpenAPI types.
- Playwright smoke test: load the dashboard, switch policy, move the slider, open publication history, sort the table.

## Environment variables

- Commit only `.env.example`. `.gitignore` currently ignores `.env*`, so add `!.env.example` (Phase 0).
- `API_ORIGIN`: server-side backend origin used by rewrites. Local `.env.local`; Vercel project settings.
- Secrets never go in `NEXT_PUBLIC_*`. Document every variable in `.env.example` with a comment.

## Definition of Done (every frontend change)

- [ ] `bun run lint`, `bun run typecheck`, tests and `bun run build` are green
- [ ] Loading, error, empty and partial states handled for any new data view
- [ ] Works in light and dark mode, at 360 px and desktop widths, by keyboard
- [ ] Times rendered in Europe/London and labelled; units and signs shown
- [ ] No business logic added to the frontend; no hard-coded data; API types regenerated if the schema changed
- [ ] PLAN.md checkboxes updated; Conventional Commit message

## Never

- Never call Elexon or PythonAnywhere directly from the browser. Only same-origin `/api/*`.
- Never add a dependency that is not in the approved list above without asking.
- Never edit `AGENTS.md` (it is regenerated by `next dev`).
- Never commit `.env*` (except `.env.example`), `.next/` or `node_modules/`.
- Never add Docker files unless the owner resolves D19 that way.
