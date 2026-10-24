import { cn } from "@/lib/utils"

export type TooltipRow = {
  label: string
  value: string
  /** CSS colour of the series swatch; text always stays in text colours. */
  swatch?: string
  muted?: boolean
}

/** Consistent tooltip body for every chart: a title line plus label/value rows. */
export function ChartTooltipCard({
  title,
  rows,
  footer,
}: {
  title: string
  rows: TooltipRow[]
  footer?: string
}) {
  return (
    <div className="grid min-w-48 gap-1.5 border bg-popover px-2.5 py-2 text-xs text-popover-foreground shadow-md">
      <p className="font-medium">{title}</p>
      <dl className="grid gap-1">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4"
          >
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              {row.swatch ? (
                <span
                  aria-hidden
                  className="size-2.5 shrink-0"
                  style={{ backgroundColor: row.swatch }}
                />
              ) : null}
              {row.label}
            </dt>
            <dd
              className={cn(
                "font-mono tabular-nums",
                row.muted ? "text-muted-foreground" : "text-foreground"
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      {footer ? <p className="text-muted-foreground">{footer}</p> : null}
    </div>
  )
}
