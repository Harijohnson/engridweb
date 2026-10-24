import { ArrowLeftIcon, BookOpenIcon, LayoutDashboardIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { RefreshButton } from "@/components/common/refresh-button"
import { ThemeToggle } from "@/components/common/theme-toggle"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type HeaderLink = { href: string; label: string }

/** Sticky top bar shared by the home page, the details page and the guide. */
export function AppHeader({
  nav,
  current,
  homeHref = "/",
}: {
  /** Section jump links shown under the bar (the details page passes them). */
  nav?: HeaderLink[]
  current: "home" | "details" | "guide"
  /** Back to the simple view with the same filters (D30). */
  homeHref?: string
}) {
  const home = current === "home"
  return (
    <header
      className={cn(
        "sticky top-0 z-40 backdrop-blur-sm",
        home ? "bg-canvas/90" : "border-b bg-background/90"
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full items-center gap-2 px-4 py-2.5",
          home ? "max-w-5xl" : "max-w-7xl"
        )}
      >
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-current={home ? "page" : undefined}
        >
          <Image
            src="/android-chrome-192x192.png"
            alt=""
            width={32}
            height={32}
            priority
            className="size-8 shrink-0"
          />
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">EnGrid</span>
            <span className="hidden text-[11px] text-muted-foreground sm:block">
              Wind forecast monitor
            </span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {current === "details" ? (
            <Link
              href={homeHref}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <ArrowLeftIcon data-icon="inline-start" aria-hidden />
              <span className="sr-only sm:not-sr-only">Simple view</span>
            </Link>
          ) : null}
          {home ? null : <RefreshButton />}
          {current === "guide" ? (
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <LayoutDashboardIcon data-icon="inline-start" aria-hidden />
              Dashboard
            </Link>
          ) : (
            <Link
              href="/guide"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                home && "rounded-full"
              )}
            >
              <BookOpenIcon data-icon="inline-start" aria-hidden />
              {home ? "How it works" : "Guide"}
            </Link>
          )}
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
