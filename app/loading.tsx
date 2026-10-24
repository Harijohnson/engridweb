import {
  ChartSkeleton,
  KpiSkeleton,
  TableSkeleton,
} from "@/components/common/data-states"
import { Skeleton } from "@/components/ui/skeleton"

/** Page-level placeholder in the dashboard's own shape: header bar, intro, filters,
 * key numbers, chart and table. */
export default function DashboardLoading() {
  return (
    <div role="status" aria-label="Loading dashboard">
      <div className="border-b">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 py-2.5">
          <Skeleton className="size-8" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="ml-auto h-7 w-48" />
        </div>
      </div>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-full max-w-xl" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        <Skeleton className="h-32 w-full" />
        <KpiSkeleton label="Loading accuracy metrics" />
        <ChartSkeleton className="h-96" />
        <TableSkeleton rows={8} columns={5} label="Loading intervals" />
      </main>
    </div>
  )
}
