import { InfoIcon } from "lucide-react"
import Link from "next/link"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { Schemas } from "@/lib/api/client"

type Meta = Schemas["MetaResponse"]

export function Methodology({ meta }: { meta: Meta | undefined }) {
  return (
    <section
      id="methodology"
      aria-labelledby="methodology-title"
      className="flex scroll-mt-28 flex-col gap-3 border bg-card p-4"
    >
      <h2 id="methodology-title" className="text-sm font-medium">
        How this works and its limits
      </h2>
      <div className="grid gap-4 text-muted-foreground md:grid-cols-3">
        <div className="flex flex-col gap-1">
          <h3 className="font-medium text-foreground">1. Your buying time</h3>
          <p>
            <strong className="font-medium text-foreground">
              At a fixed time each day
            </strong>{" "}
            (a daily gate): for example 10:00 UK the day before delivery.{" "}
            <strong className="font-medium text-foreground">
              A set number of hours ahead
            </strong>{" "}
            (a lead time): the forecast must be published at least H hours
            before the hour starts.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="font-medium text-foreground">2. No hindsight</h3>
          <p>
            For every delivery hour, the forecast used is the newest one
            published at or before the buying time. Later versions are shown in
            the publication history but never used. Hours with no forecast in
            time are counted as missing, not filled in.
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
      <p className="text-muted-foreground">
        More detail, a glossary and a worked example are in the{" "}
        <Link
          href="/guide"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          user guide
        </Link>
        .
      </p>
    </section>
  )
}
