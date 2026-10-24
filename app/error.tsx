"use client"

import { AlertTriangleIcon, RotateCcwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-3 px-4 text-center">
      <AlertTriangleIcon className="size-6 text-destructive" aria-hidden />
      <h1 className="text-sm font-medium">
        The dashboard hit an unexpected error
      </h1>
      <p className="text-muted-foreground">
        Reload to try again. If it keeps happening, quote this reference:{" "}
        <span className="font-mono">{error.digest ?? "n/a"}</span>
      </p>
      <Button variant="outline" size="sm" onClick={reset}>
        <RotateCcwIcon data-icon="inline-start" aria-hidden />
        Try again
      </Button>
    </main>
  )
}
