import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <main
      className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6"
      role="status"
      aria-label="Loading dashboard"
    >
      <Skeleton className="h-16 w-full max-w-2xl" />
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-22" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </main>
  )
}
