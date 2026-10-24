import type { Metadata } from "next"
import { Suspense } from "react"

import DetailsLoading from "@/app/details/loading"
import { Dashboard } from "@/components/dashboard/dashboard"

export const metadata: Metadata = {
  title: "Details · EnGrid wind forecast monitor",
  description:
    "Every hour of January 2026: which wind forecast was available at the buying time, how accurate it was, and how it was chosen.",
}

export default function DetailsPage() {
  // The dashboard reads its filters from the URL (nuqs / useSearchParams), which
  // needs a Suspense boundary for static rendering.
  return (
    <Suspense fallback={<DetailsLoading />}>
      <Dashboard />
    </Suspense>
  )
}
