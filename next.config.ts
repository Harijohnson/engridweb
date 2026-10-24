import type { NextConfig } from "next"

/**
 * The browser only ever calls same-origin /api/*; this rewrite proxies it to the Django
 * backend (D8), so no CORS is needed. API_ORIGIN is server-side (not NEXT_PUBLIC_) and is
 * read when this file is evaluated at build time: changing it requires a redeploy.
 */
function apiOrigin(): string {
  const value = process.env.API_ORIGIN?.trim()
  if (!value) {
    throw new Error(
      "API_ORIGIN is not set. Set it to the Django backend origin, e.g. " +
        "http://127.0.0.1:8000 in .env.local or https://<username>.pythonanywhere.com on Vercel."
    )
  }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`API_ORIGIN must be an absolute URL, got "${value}".`)
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error(
      `API_ORIGIN must be an origin only (no path), got "${value}".`
    )
  }
  return url.origin
}

const origin = apiOrigin()

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${origin}/api/:path*` }]
  },
}

export default nextConfig
