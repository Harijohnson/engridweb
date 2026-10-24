import { CircleHelpIcon } from "lucide-react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatUkTime } from "@/lib/format"
import { cn } from "@/lib/utils"

export type SectionHelp = {
  /** One or two plain sentences. */
  text: string
  /** Anchor on the /guide page, without the "#". */
  guideAnchor: string
}

/** Where the numbers in a section came from: the API's data version and when the
 * browser received them. */
export type SectionSource = {
  dataVersion: number
  fetchedAt: number
}

export function SectionShell({
  id,
  title,
  description,
  action,
  help,
  updating = false,
  source,
  className,
  children,
}: {
  id: string
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  help?: SectionHelp
  /** Newer data is loading while the previous data is still shown. */
  updating?: boolean
  source?: SectionSource | null
  className?: string
  children: React.ReactNode
}) {
  const titleId = `${id}-title`
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      aria-busy={updating || undefined}
      className={cn("min-w-0 scroll-mt-28", className)}
    >
      <Card className="relative h-full">
        {updating ? <UpdatingBar /> : null}
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <h2 id={titleId}>{title}</h2>
            {help ? <HelpTip title={title} help={help} /> : null}
            {updating ? (
              <span className="text-xs font-normal text-muted-foreground">
                Updating…
              </span>
            ) : null}
          </CardTitle>
          {description ? (
            <CardDescription>{description}</CardDescription>
          ) : null}
          {action ? <CardAction>{action}</CardAction> : null}
        </CardHeader>
        <CardContent
          className={cn("min-w-0 transition-opacity", updating && "opacity-60")}
        >
          {children}
        </CardContent>
        {source ? (
          <CardFooter className="bg-transparent pt-2.5 pb-(--card-spacing) text-[11px] text-muted-foreground">
            Source: Elexon BMRS (WINDFOR, FUELHH) · data version{" "}
            {source.dataVersion} · fetched {formatUkTime(source.fetchedAt)} UK
          </CardFooter>
        ) : null}
      </Card>
    </section>
  )
}

/** Thin indeterminate bar along the top of a section while it refetches. */
function UpdatingBar() {
  return (
    <div
      className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-primary/15"
      aria-hidden
    >
      <div className="animate-progress h-full w-2/5 bg-primary" />
    </div>
  )
}

function HelpTip({ title, help }: { title: string; help: SectionHelp }) {
  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex size-5 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label={`What is “${title}”?`}
      >
        <CircleHelpIcon className="size-4" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 text-xs">
        <p>{help.text}</p>
        <Link
          href={`/guide#${help.guideAnchor}`}
          className={cn(
            buttonVariants({ variant: "link", size: "xs" }),
            "h-auto self-start px-0"
          )}
        >
          Read more in the guide
        </Link>
      </PopoverContent>
    </Popover>
  )
}
