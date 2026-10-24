import { Suspense } from "react"

import { Dashboard } from "@/components/dashboard/dashboard"
import DashboardLoading from "@/app/loading"

export default function Page() {
  // The dashboard reads its filters from the URL (nuqs / useSearchParams), which
  // needs a Suspense boundary for static rendering.
  return (
    <Suspense fallback={<DashboardLoading />}>
      <Dashboard />
    </Suspense>
  )
}
