import { defineConfig, devices } from "@playwright/test"

const BACKEND = "http://127.0.0.1:8000"
const FRONTEND = "http://127.0.0.1:3000"

/**
 * One smoke test against the real stack: Django (seeded from the committed snapshot)
 * behind the Next.js /api rewrite. Both servers are reused if already running.
 * The browser runs in IST to prove every time is shown in UK time.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: FRONTEND,
    timezoneId: "Asia/Kolkata",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "uv run python manage.py runserver 127.0.0.1:8000 --noreload",
      cwd: "../engridapi",
      url: `${BACKEND}/ready`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "bun run start -- -p 3000",
      url: FRONTEND,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { API_ORIGIN: BACKEND },
    },
  ],
})
