import { Suspense } from "react"

import HomeLoading from "@/app/loading"
import { SimpleHome } from "@/components/home/simple-home"

export default function Page() {
  // The page reads its filters from the URL (nuqs / useSearchParams), which needs a
  // Suspense boundary for static rendering.
  return (
    <Suspense fallback={<HomeLoading />}>
      <SimpleHome />
    </Suspense>
  )
}
