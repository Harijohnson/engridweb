import { InfoIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { Schemas } from "@/lib/api/client"

type Meta = Schemas["MetaResponse"]

export function Methodology({ meta }: { meta: Meta | undefined }) {
  return (
    <section
      id="methodology"
      aria-labelledby="methodology-title"
      className="flex scroll-mt-4 flex-col gap-3 border bg-card p-4"
    >
      <h2 id="methodology-title" className="text-sm font-medium">
        How this works
      </h2>
      <div className="grid gap-4 text-muted-foreground md:grid-cols-3">
        <div className="flex flex-col gap-1">
          <h3 className="font-medium text-foreground">1. Decision cutoff</h3>
          <p>
            <strong className="font-medium text-foreground">Daily gate</strong>:
            a fixed deadline, for example the day before delivery at 10:00 UK
            time.{" "}
            <strong className="font-medium text-foreground">Lead time</strong>:
            the forecast must be at least H hours old when the hour starts.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="font-medium text-foreground">2. No look-ahead</h3>
          <p>
            For every delivery hour, the selected forecast is the newest version
            published at or before the cutoff. Later versions are shown in the
            publication history but never used. Hours without an eligible
            version are counted as missing, not filled in.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="font-medium text-foreground">3. Accuracy</h3>
          <p>
            {meta?.matching.description ??
              "Each hourly forecast is compared with the actual half-hour starting at the same time."}{" "}
            Error = forecast − actual. MAE, RMSE and bias use matched hours
            only.
          </p>
        </div>
      </div>
      <p className="text-muted-foreground">
        {meta?.timezone_note ??
          "All times are shown in UK time (Europe/London)."}{" "}
        Sources:{" "}
        {meta
          ? meta.data_sources.map((source, i) => (
              <span key={source.dataset}>
                {i > 0 ? ", " : ""}
                <a
                  href={source.url}
                  className="underline underline-offset-2 hover:text-foreground"
                  rel="noreferrer"
                  target="_blank"
                >
                  {source.dataset}
                </a>{" "}
                ({source.name})
              </span>
            ))
          : "Elexon BMRS WINDFOR and FUELHH"}
        .
      </p>
      <Alert>
        <InfoIcon aria-hidden />
        <AlertTitle>What this tool does not do</AlertTitle>
        <AlertDescription>
          This tool measures wind forecast accuracy. It does not calculate
          procurement volumes: demand data is not part of the supplied datasets.
        </AlertDescription>
      </Alert>
    </section>
  )
}
