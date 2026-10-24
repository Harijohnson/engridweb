import { Skeleton } from "@/components/ui/skeleton"

/** Page-level placeholder in the simple home page's own shape: header bar, title,
 * buying-time chips, the answer, three cards and the chart. */
export default function HomeLoading() {
  return (
    <div role="status" aria-label="Loading" className="min-h-dvh bg-canvas">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-4 py-2.5">
        <Skeleton className="size-8" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="ml-auto h-7 w-48" />
      </div>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:py-10">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-full max-w-lg" />
          <Skeleton className="h-6 w-full max-w-md" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-32 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-28 w-full rounded-3xl" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-3xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-3xl" />
      </main>
    </div>
  )
}
