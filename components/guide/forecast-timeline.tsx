/**
 * How one forecast is chosen, drawn as a timeline. An ILLUSTRATION with no values on
 * it: positions are schematic, so nothing here can be mistaken for Elexon data.
 */
const PUBLISHES = [
  { x: 60, status: "superseded" },
  { x: 130, status: "superseded" },
  { x: 200, status: "superseded" },
  { x: 270, status: "selected" },
  { x: 370, status: "late" },
  { x: 440, status: "late" },
  { x: 560, status: "after" },
] as const

const CUTOFF_X = 320
const DELIVERY_X = 500

export function ForecastTimeline() {
  return (
    <figure className="flex flex-col gap-2">
      <div className="overflow-x-auto border bg-card p-3">
        <svg
          viewBox="0 0 640 190"
          className="h-auto w-full min-w-[520px]"
          role="img"
          aria-labelledby="timeline-title timeline-desc"
        >
          <title id="timeline-title">How one forecast is chosen</title>
          <desc id="timeline-desc">
            Forecasts for one delivery hour are published at several times.
            Those published before your buying time are usable; the newest of
            them is selected. Forecasts published after the buying time, or
            after the hour has started, are never used.
          </desc>

          {/* Usable zone (before the buying time) */}
          <rect
            x={20}
            y={30}
            width={CUTOFF_X - 20}
            height={100}
            className="fill-primary/8"
          />
          <text
            x={28}
            y={48}
            className="fill-foreground text-[12px] font-medium"
          >
            Usable: published before your buying time
          </text>
          <text
            x={CUTOFF_X + 8}
            y={48}
            className="fill-muted-foreground text-[12px]"
          >
            Too late: never used
          </text>

          {/* Time axis */}
          <line
            x1={20}
            y1={100}
            x2={620}
            y2={100}
            className="stroke-muted-foreground"
            strokeWidth={1.5}
          />
          <path d="M620 100 l-8 -5 v10 z" className="fill-muted-foreground" />
          <text
            x={612}
            y={122}
            textAnchor="end"
            className="fill-muted-foreground text-[11px]"
          >
            time
          </text>

          {/* Buying time (cutoff) */}
          <line
            x1={CUTOFF_X}
            y1={30}
            x2={CUTOFF_X}
            y2={150}
            className="stroke-highlight"
            strokeWidth={3}
          />
          <text
            x={CUTOFF_X}
            y={168}
            textAnchor="middle"
            className="fill-foreground text-[12px] font-semibold"
          >
            Your buying time
          </text>

          {/* Delivery hour */}
          <line
            x1={DELIVERY_X}
            y1={30}
            x2={DELIVERY_X}
            y2={150}
            className="stroke-foreground"
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
          <text
            x={DELIVERY_X}
            y={168}
            textAnchor="middle"
            className="fill-foreground text-[12px]"
          >
            Delivery hour starts
          </text>

          {/* Publishes */}
          {PUBLISHES.map((p) =>
            p.status === "selected" ? (
              <g key={p.x}>
                <circle cx={p.x} cy={100} r={9} className="fill-primary" />
                <path
                  d={`M${p.x - 4} 100 l3 3 l6 -6`}
                  fill="none"
                  className="stroke-primary-foreground"
                  strokeWidth={2}
                />
                <text
                  x={p.x}
                  y={80}
                  textAnchor="middle"
                  className="fill-foreground text-[12px] font-semibold"
                >
                  Selected
                </text>
              </g>
            ) : p.status === "superseded" ? (
              <circle
                key={p.x}
                cx={p.x}
                cy={100}
                r={6}
                className="fill-muted-foreground"
              />
            ) : (
              <g key={p.x}>
                <circle
                  cx={p.x}
                  cy={100}
                  r={6}
                  className="fill-card stroke-muted-foreground"
                  strokeWidth={1.5}
                />
                <path
                  d={`M${p.x - 3} 97 l6 6 M${p.x + 3} 97 l-6 6`}
                  className="stroke-muted-foreground"
                  strokeWidth={1.5}
                />
              </g>
            )
          )}
        </svg>
      </div>
      <figcaption className="text-muted-foreground">
        Illustration, not data. Grey dots: older usable forecasts (superseded).
        Green tick: the newest usable one, which is the one we compare with
        reality. Crossed circles: published too late.
      </figcaption>
    </figure>
  )
}
