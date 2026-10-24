import {
  BarChart3Icon,
  CheckCircle2Icon,
  ChevronDownIcon,
  HistoryIcon,
  InfoIcon,
  LineChartIcon,
  ListIcon,
  SlidersHorizontalIcon,
  TableIcon,
} from "lucide-react"
import Link from "next/link"

import { ForecastTimeline } from "@/components/guide/forecast-timeline"
import { WorkedExample } from "@/components/guide/worked-example"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

/*
 * The user guide (PLAN.md D26). Plain language for a buyer, not a data scientist.
 * Every number about the data comes live from the API (the worked example); the text
 * itself contains no Elexon values.
 */

const CONTENTS = [
  { id: "what-it-answers", label: "What this tool answers" },
  { id: "how-a-forecast-is-chosen", label: "How a forecast is chosen" },
  { id: "glossary", label: "Key terms" },
  { id: "before-you-trust", label: "Before you trust a number" },
  { id: "reading-the-dashboard", label: "Reading the dashboard" },
  { id: "worked-example", label: "Worked example" },
  { id: "limitations", label: "What it cannot tell you" },
  { id: "faq", label: "Questions" },
]

const GLOSSARY: { term: string; also?: string; meaning: string }[] = [
  {
    term: "Forecast",
    also: "WINDFOR",
    meaning:
      "Elexon's prediction of GB wind generation for each hour, in MW. It is republished many times as delivery gets closer.",
  },
  {
    term: "Actual",
    also: "FUELHH, wind",
    meaning:
      "The wind power really generated, reported for every half-hour, in MW.",
  },
  {
    term: "Published",
    meaning: "When a forecast version was released by Elexon.",
  },
  {
    term: "Buying time",
    also: "decision cutoff",
    meaning:
      "The moment you must decide. Only forecasts published at or before it are allowed.",
  },
  {
    term: "At a fixed time each day",
    also: "daily gate",
    meaning:
      "One buying time per delivery day, for example 10:00 UK the day before. The standard view.",
  },
  {
    term: "A set number of hours ahead",
    also: "lead time",
    meaning:
      "Each hour has its own buying time, H hours before it starts. Useful to see how accuracy improves closer to delivery.",
  },
  {
    term: "How far off",
    also: "error",
    meaning:
      "Forecast minus actual. + means the forecast was too high (over-forecast), − means too low (under-forecast).",
  },
  {
    term: "Typical miss",
    also: "MAE",
    meaning:
      "The average size of the error, ignoring its direction. The easiest single number for “how accurate”.",
  },
  {
    term: "Big-miss score",
    also: "RMSE",
    meaning:
      "Like the typical miss, but large errors count more. If it is much bigger than the typical miss, there were some big misses.",
  },
  {
    term: "Leaning",
    also: "bias",
    meaning:
      "The average error with its sign. + means the forecast tended to be too high, − too low.",
  },
  {
    term: "Hours compared",
    also: "coverage",
    meaning:
      "How many hours had both a usable forecast and an actual value. Only those hours are in the numbers.",
  },
]

const CHECKLIST: { title: string; body: React.ReactNode }[] = [
  {
    title: "The data badge says “Complete data”",
    body: "Under the dashboard title. If it turns orange (“Some data missing”), some forecasts or actuals were not loaded.",
  },
  {
    title: "“Hours compared” covers your dates",
    body: "The key numbers show “matched / expected hours”. If not all hours are matched, a warning says how many are missing and why.",
  },
  {
    title: "No “Partial coverage” warning, or you understand it",
    body: "Missing hours are left out, never filled in. A number based on fewer hours is less reliable.",
  },
  {
    title: "Buying very far ahead leaves gaps",
    body: "Forecasts only reach so far into the future. Around two days ahead some hours have no forecast published early enough; the dashboard tells you how many.",
  },
  {
    title: "Enough days selected",
    body: "A single day has only 24 hours to compare. Use a week or the whole month for a fair picture.",
  },
  {
    title: "Read the sign of the leaning (bias)",
    body: "+ means the forecast was too high on average, − too low. The dashboard also says it in words.",
  },
  {
    title: "Times are UK time",
    body: "Every time on screen is UK time (Europe/London), whatever your computer’s time zone.",
  },
  {
    title: "Data version and fetched time",
    body: "Each section ends with the data version and when it was loaded. They should match across sections; if the data changes while you look, the dashboard asks you to refresh.",
  },
]

const SECTIONS_GUIDE: {
  id?: string
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  title: string
  shows: string
  lookFor: string
}[] = [
  {
    icon: SlidersHorizontalIcon,
    title: "Filters",
    shows:
      "Which delivery days, and when you buy: at a fixed time each day, or a set number of hours ahead. Active filters appear as orange chips you can remove.",
    lookFor:
      "Start with the whole month and the standard buying time, then change one thing at a time.",
  },
  {
    id: "key-numbers",
    icon: BarChart3Icon,
    title: "Key numbers",
    shows:
      "Average forecast and actual, the typical miss, the big-miss score, the leaning and how many hours were compared. The sentence above them states exactly what is shown.",
    lookFor:
      "The typical miss tells you how far off to expect the forecast to be; the leaning tells you whether it tends to be too high or too low.",
  },
  {
    id: "reading-the-chart",
    icon: LineChartIcon,
    title: "Forecast vs actual chart",
    shows:
      "Green: the forecast you could buy on (hourly). Black (white in dark mode): what was generated (half-hourly). It opens on one week; use 1 day / 1 week / All days and the arrows to move. “How far off” switches to bars of the error for each hour.",
    lookFor:
      "Long stretches where green sits above the actual line are over-forecasts. Click any point to inspect that hour.",
  },
  {
    id: "how-a-forecast-is-chosen-panel",
    icon: HistoryIcon,
    title: "Inspect an hour (publication history)",
    shows:
      "Every forecast published for one hour, marked Selected, Superseded, After cutoff or After delivery start, with your buying time as an orange line.",
    lookFor:
      "Proof that only forecasts available in time were used, and how much later forecasts would have changed.",
  },
  {
    id: "reading-accuracy",
    icon: ListIcon,
    title: "Accuracy breakdown",
    shows:
      "By hours ahead: how the error shrinks as you buy closer to delivery. By hour of day and by day: when the forecast did well or badly.",
    lookFor:
      "How much accuracy you gain by buying later, and which hours or days are hardest to forecast.",
  },
  {
    id: "reading-the-table",
    icon: TableIcon,
    title: "Hour-by-hour table",
    shows:
      "One row per delivery hour with the forecast, the actual, how far off it was and a status. Switch on “Technical columns” for publish time, hours ahead and buying time.",
    lookFor:
      "Sort by “How far off” to find the biggest misses. Orange status badges mark hours with missing data.",
  },
]

const FAQ: { q: string; a: string }[] = [
  {
    q: "Why not use the latest forecast for each hour?",
    a: "Because you could not have had it when you had to buy. Using a forecast published after the buying time would make the forecast look better than it really was (hindsight).",
  },
  {
    q: "Why is an hour missing from the chart?",
    a: "No forecast was published before its buying time (or the actual is missing). Missing hours are left as gaps and counted, never filled in.",
  },
  {
    q: "What does Refresh do?",
    a: "It loads every section again from the analysis service. It does not fetch new data from Elexon: the tool works on the stored January 2026 data.",
  },
  {
    q: "The forecast is hourly but the actual is half-hourly. How are they compared?",
    a: "Each hourly forecast is compared with the half-hour that starts at the same time (for example the 18:00 forecast with 18:00–18:30). The chart still shows every half-hour of actual generation.",
  },
  {
    q: "Can I share what I am looking at?",
    a: "Yes. Every filter, the zoom and the selected hour are in the page address, so copying the link shares the exact view.",
  },
  {
    q: "How do I switch to dark mode?",
    a: "Use the sun / moon / screen buttons at the top right (System follows your computer). The D key also switches it.",
  },
]

export function UserGuide() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-8 text-sm leading-relaxed">
      <header className="flex flex-col gap-3">
        <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
          User guide · a few minutes to read
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          How the wind forecast monitor works
        </h1>
        <p className="text-muted-foreground">
          What the dashboard shows, how to read it, and what to check before you
          rely on a number.
        </p>
        <nav aria-label="Guide contents" className="border bg-card p-4">
          <p className="mb-2 text-xs font-semibold">On this page</p>
          <ol className="grid list-decimal gap-1 pl-5 sm:grid-cols-2">
            {CONTENTS.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      <GuideSection id="what-it-answers" title="What this tool answers">
        <p>
          A UK electricity supplier buys power ahead of time, so it has to rely
          on a wind forecast. For <strong>January 2026</strong> this tool
          answers two questions:
        </p>
        <ol className="flex list-decimal flex-col gap-1 pl-5">
          <li>
            <strong>Which forecast was available when I had to buy?</strong> For
            every hour, the newest wind forecast published before your buying
            time.
          </li>
          <li>
            <strong>How accurate was it?</strong> That forecast compared with
            the wind power actually generated.
          </li>
        </ol>
        <p className="text-muted-foreground">
          Data: Elexon BMRS, the official GB balancing-market data. Forecasts
          come from the WINDFOR dataset, actual generation from FUELHH.
        </p>
      </GuideSection>

      <GuideSection
        id="how-a-forecast-is-chosen"
        title="How a forecast is chosen"
      >
        <p>
          Elexon publishes a new wind forecast several times a day, so each
          delivery hour has many versions. The tool picks one per hour:
        </p>
        <ForecastTimeline />
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>
            Only versions published{" "}
            <strong>at or before your buying time</strong> are allowed.
          </li>
          <li>
            Of those, the <strong>newest</strong> is used. Older ones are
            “superseded”.
          </li>
          <li>
            Anything published later is shown for reference but{" "}
            <strong>never used</strong>: that would be hindsight.
          </li>
        </ul>
      </GuideSection>

      <GuideSection id="glossary" title="Key terms">
        <dl className="grid gap-3 sm:grid-cols-2">
          {GLOSSARY.map((item) => (
            <div
              key={item.term}
              className="flex flex-col gap-0.5 border bg-card p-3"
            >
              <dt className="font-semibold">
                {item.term}
                {item.also ? (
                  <span className="ml-1.5 font-mono text-[11px] font-normal text-muted-foreground">
                    {item.also}
                  </span>
                ) : null}
              </dt>
              <dd className="text-muted-foreground">{item.meaning}</dd>
            </div>
          ))}
        </dl>
      </GuideSection>

      <GuideSection id="before-you-trust" title="Before you trust a number">
        <p>Check these on the dashboard first:</p>
        <ul className="flex flex-col gap-2">
          {CHECKLIST.map((item) => (
            <li key={item.title} className="flex gap-2.5">
              <CheckCircle2Icon
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden
              />
              <span>
                <strong className="font-semibold">{item.title}.</strong>{" "}
                <span className="text-muted-foreground">{item.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </GuideSection>

      <GuideSection id="reading-the-dashboard" title="Reading the dashboard">
        <div className="grid gap-3">
          {SECTIONS_GUIDE.map((s) => (
            <article
              key={s.title}
              id={s.id}
              className="flex scroll-mt-24 gap-3 border bg-card p-4"
            >
              <s.icon
                className="mt-0.5 size-5 shrink-0 text-primary"
                aria-hidden
              />
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold">{s.title}</h3>
                <p>
                  <span className="font-medium">What it shows: </span>
                  <span className="text-muted-foreground">{s.shows}</span>
                </p>
                <p>
                  <span className="font-medium">What to look for: </span>
                  <span className="text-muted-foreground">{s.lookFor}</span>
                </p>
              </div>
            </article>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="worked-example" title="Worked example">
        <p>
          One real delivery hour, step by step, with the standard buying time:
        </p>
        <WorkedExample />
      </GuideSection>

      <GuideSection id="limitations" title="What it cannot tell you">
        <Alert>
          <InfoIcon aria-hidden />
          <AlertTitle>No buying volumes</AlertTitle>
          <AlertDescription>
            This tool measures wind forecast accuracy. It does not say how much
            power to buy: demand data is not part of the supplied datasets.
          </AlertDescription>
        </Alert>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
          <li>Only January 2026 is analysed.</li>
          <li>
            Each hourly forecast is compared with the half-hour that starts at
            the same time; the second half-hour is shown but not scored.
          </li>
          <li>
            Hours without a usable forecast or actual are left out of the
            numbers, never estimated.
          </li>
        </ul>
      </GuideSection>

      <GuideSection id="faq" title="Questions">
        <div className="flex flex-col gap-2">
          {FAQ.map((item) => (
            <details key={item.q} className="group border bg-card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDownIcon
                  className="size-4 shrink-0 transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <p className="px-3 pb-3 text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </GuideSection>

      <footer className="border-t pt-6">
        <Link
          href="/"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          ← Back to the dashboard
        </Link>
      </footer>
    </main>
  )
}

function GuideSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-24 flex-col gap-3"
    >
      <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  )
}
