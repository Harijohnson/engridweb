"use client"

import { BookOpenIcon, XIcon } from "lucide-react"
import Link from "next/link"
import { useSyncExternalStore } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Per-viewer convenience only (D27): storage can be missing or blocked, so every
 * access is guarded and the page works without it. */
const STORAGE_KEY = "engrid.guide-banner-dismissed"
const listeners = new Set<() => void>()
// Also hide after dismissal when storage is blocked.
let hiddenThisVisit = false

function isDismissed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

function dismiss() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1")
  } catch {
    // Storage blocked: the banner still hides until the next visit.
  }
  hiddenThisVisit = true
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** "New here? Read the guide" banner for first-time visitors. */
export function GuideBanner() {
  const hidden = useSyncExternalStore(
    subscribe,
    () => hiddenThisVisit || isDismissed(),
    // On the server nothing is known yet: render nothing, then show it in the browser.
    () => true
  )
  if (hidden) return null

  return (
    <aside
      aria-label="Getting started"
      className="flex flex-col gap-2 rounded-2xl border border-primary/40 bg-primary/5 px-3.5 py-2 sm:flex-row sm:items-center"
    >
      <BookOpenIcon className="size-5 shrink-0 text-primary" aria-hidden />
      <p className="flex-1">
        <strong className="font-semibold">New here?</strong> The short user
        guide explains what the numbers mean and what to check before you trust
        them.
      </p>
      <div className="flex items-center gap-2">
        <Link
          href="/guide"
          className={cn(buttonVariants({ size: "sm" }))}
          onClick={dismiss}
        >
          Read the guide
        </Link>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Dismiss"
          onClick={dismiss}
        >
          <XIcon aria-hidden />
        </Button>
      </div>
    </aside>
  )
}
