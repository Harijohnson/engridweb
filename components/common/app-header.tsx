import { BookOpenIcon, LayoutDashboardIcon, WindIcon } from "lucide-react"
import Link from "next/link"

import { RefreshButton } from "@/components/common/refresh-button"
import { ThemeToggle } from "@/components/common/theme-toggle"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type HeaderLink = { href: string; label: string }

/** Sticky top bar shared by the dashboard and the guide. */
export function AppHeader({
  nav,
  current,
}: {
  /** Section jump links shown under the bar (the dashboard passes them). */
  nav?: HeaderLink[]
  current: "dashboard" | "guide"
}) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 py-2.5">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-current={current === "dashboard" ? "page" : undefined}
        >
          <span className="flex size-8 shrink-0 items-center justify-center bg-primary text-primary-foreground">
            <WindIcon className="size-4.5" aria-hidden />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">EnGrid</span>
            <span className="hidden text-[11px] text-muted-foreground sm:block">
              Wind forecast monitor
            </span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <RefreshButton />
          <Link
            href={current === "guide" ? "/" : "/guide"}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            {current === "guide" ? (
              <LayoutDashboardIcon data-icon="inline-start" aria-hidden />
            ) : (
              <BookOpenIcon data-icon="inline-start" aria-hidden />
            )}
            {current === "guide" ? "Dashboard" : "Guide"}
          </Link>
          <ThemeToggle />
        </div>
      </div>
      {nav ? (
        <nav
          aria-label="Dashboard sections"
          className="mx-auto w-full max-w-7xl px-4"
        >
          <ul className="-mb-px flex gap-1 overflow-x-auto pb-1.5 text-xs">
            {nav.map((link) => (
              <li key={link.href} className="shrink-0">
                <a
                  href={link.href}
                  className="inline-flex h-7 items-center rounded-full px-3 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  )
}
