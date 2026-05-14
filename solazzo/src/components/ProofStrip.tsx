import type { ThousandSnapshot } from "@/lib/the-thousand";

export function ProofStrip({ snapshot }: { snapshot: ThousandSnapshot }) {
  const { totalClaimed, totalSeats, totalSolLocked, source } = snapshot;

  const claimedDisplay =
    totalClaimed === null ? "—" : totalClaimed.toLocaleString("en-US");
  const lockedDisplay =
    totalSolLocked === null
      ? "—"
      : `${totalSolLocked.toLocaleString("en-US", {
          maximumFractionDigits: 2,
        })}`;

  return (
    <dl className="grid grid-cols-2 gap-px bg-muted/15 border border-muted/15 mb-6">
      <Stat
        label="Places claimed"
        value={claimedDisplay}
        suffix={`/ ${totalSeats.toLocaleString("en-US")}`}
      />
      <Stat
        label="SOL locked"
        value={lockedDisplay}
        suffix={lockedDisplay === "—" ? undefined : "SOL"}
      />
      {source === "fallback" && (
        <p className="col-span-2 bg-background px-4 py-2 text-[10px] uppercase tracking-widest text-muted/40 text-center">
          Live counts syncing
        </p>
      )}
    </dl>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="bg-background px-4 py-4 sm:py-5">
      <dt className="text-[10px] uppercase tracking-widest text-muted/50 mb-2">
        {label}
      </dt>
      <dd className="font-serif-display text-2xl text-foreground/90 leading-none">
        {value}
        {suffix && (
          <span className="text-muted/40 text-sm ml-1.5">{suffix}</span>
        )}
      </dd>
    </div>
  );
}
