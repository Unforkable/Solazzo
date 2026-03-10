"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type Archetype = "OG" | "Whale" | "Grinder";

interface LeaderboardEntry {
  rank: number;
  wallet: string;
  points: number;
  solLocked: number;
  hoursHeld: number;
  archetype: Archetype;
  active: boolean; // currently holds a slot
}

const ARCHETYPE_COLORS: Record<Archetype, string> = {
  OG: "#c9a84c",
  Whale: "#6a9fd8",
  Grinder: "#7ab87a",
};

const ARCHETYPE_DESCRIPTIONS: Record<Archetype, string> = {
  OG: "Locked early. Held long. Their score reflects historical courage.",
  Whale: "High conviction through capital. Respected, but legible.",
  Grinder: "Modest SOL, never displaced. Slow and steady. The tortoise.",
};

// Deterministic mock data — seeded from wallet address
function generateMockData(): LeaderboardEntry[] {
  const entries: Omit<LeaderboardEntry, "rank">[] = [
    { wallet: "7xKX...4mPq", points: 43200, solLocked: 2, hoursHeld: 21600, archetype: "OG", active: true },
    { wallet: "Dv3R...kW9n", points: 36000, solLocked: 50, hoursHeld: 720, archetype: "Whale", active: true },
    { wallet: "9pLm...TrE2", points: 28800, solLocked: 1.5, hoursHeld: 19200, archetype: "Grinder", active: true },
    { wallet: "Bq4F...Yz8j", points: 25200, solLocked: 35, hoursHeld: 720, archetype: "Whale", active: true },
    { wallet: "3nHv...Rs6x", points: 21600, solLocked: 3, hoursHeld: 7200, archetype: "OG", active: true },
    { wallet: "Ek7J...Wm4p", points: 18000, solLocked: 1, hoursHeld: 18000, archetype: "Grinder", active: true },
    { wallet: "Qw2N...Hd9s", points: 15000, solLocked: 25, hoursHeld: 600, archetype: "Whale", active: true },
    { wallet: "Lp8Y...Ax3v", points: 12960, solLocked: 1.8, hoursHeld: 7200, archetype: "Grinder", active: true },
    { wallet: "Fg5K...Mn2c", points: 10800, solLocked: 5, hoursHeld: 2160, archetype: "OG", active: false },
    { wallet: "Rj3T...Cb7w", points: 9600, solLocked: 20, hoursHeld: 480, archetype: "Whale", active: true },
    { wallet: "Ux6P...Nq1e", points: 8640, solLocked: 1.2, hoursHeld: 7200, archetype: "Grinder", active: true },
    { wallet: "Hn4W...Sf8k", points: 7200, solLocked: 10, hoursHeld: 720, archetype: "Whale", active: true },
    { wallet: "Ov9L...Gd2r", points: 6480, solLocked: 0.9, hoursHeld: 7200, archetype: "Grinder", active: true },
    { wallet: "Zy1M...Xp5t", points: 5400, solLocked: 2.5, hoursHeld: 2160, archetype: "OG", active: false },
    { wallet: "Cw8G...Bk3j", points: 4800, solLocked: 8, hoursHeld: 600, archetype: "Whale", active: true },
    { wallet: "Aj6D...Tv9n", points: 4320, solLocked: 0.6, hoursHeld: 7200, archetype: "Grinder", active: true },
    { wallet: "Mk2R...Jp4s", points: 3600, solLocked: 5, hoursHeld: 720, archetype: "OG", active: true },
    { wallet: "Ws7N...Fe1q", points: 2880, solLocked: 0.4, hoursHeld: 7200, archetype: "Grinder", active: true },
    { wallet: "Pt3H...Lc6w", points: 2400, solLocked: 10, hoursHeld: 240, archetype: "Whale", active: false },
    { wallet: "Gn5X...Rd8m", points: 1440, solLocked: 2, hoursHeld: 720, archetype: "OG", active: true },
  ];

  return entries
    .sort((a, b) => b.points - a.points)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

function formatPoints(pts: number): string {
  if (pts >= 1000) return `${(pts / 1000).toFixed(1)}k`;
  return String(pts);
}

function formatDuration(hours: number): string {
  const days = Math.floor(hours / 24);
  if (days >= 30) {
    const months = Math.floor(days / 30);
    const remainDays = days % 30;
    return remainDays > 0 ? `${months}mo ${remainDays}d` : `${months}mo`;
  }
  return `${days}d`;
}

type FilterType = "all" | Archetype;

export default function LeaderboardPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const data = useMemo(() => generateMockData(), []);

  const filtered = filter === "all" ? data : data.filter((e) => e.archetype === filter);

  const stats = useMemo(() => {
    const totalPoints = data.reduce((s, e) => s + e.points, 0);
    const totalSol = data.reduce((s, e) => s + e.solLocked, 0);
    const activeCount = data.filter((e) => e.active).length;
    return { totalPoints, totalSol, activeCount, totalWallets: data.length };
  }, [data]);

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-16 pt-20 sm:pt-24">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground">
            Conviction Leaderboard
          </h1>
          <p className="text-base text-foreground/50 font-body mt-2 max-w-lg leading-relaxed">
            Ranked by Solazzo Points &mdash; the time-weighted measure of who believed earliest, longest, and most.
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="bg-surface-raised/50 border border-gold-dim/20 p-3 sm:p-4">
            <p className="text-xs text-muted/50 font-body uppercase tracking-wider">Total Points</p>
            <p className="text-lg sm:text-xl font-display font-bold text-foreground mt-1">
              {formatPoints(stats.totalPoints)}
            </p>
          </div>
          <div className="bg-surface-raised/50 border border-gold-dim/20 p-3 sm:p-4">
            <p className="text-xs text-muted/50 font-body uppercase tracking-wider">SOL Locked</p>
            <p className="text-lg sm:text-xl font-display font-bold text-foreground mt-1">
              {stats.totalSol.toFixed(1)}
            </p>
          </div>
          <div className="bg-surface-raised/50 border border-gold-dim/20 p-3 sm:p-4">
            <p className="text-xs text-muted/50 font-body uppercase tracking-wider">Active Slots</p>
            <p className="text-lg sm:text-xl font-display font-bold text-foreground mt-1">
              {stats.activeCount}
            </p>
          </div>
          <div className="bg-surface-raised/50 border border-gold-dim/20 p-3 sm:p-4">
            <p className="text-xs text-muted/50 font-body uppercase tracking-wider">Wallets</p>
            <p className="text-lg sm:text-xl font-display font-bold text-foreground mt-1">
              {stats.totalWallets}
            </p>
          </div>
        </div>

        {/* How points work */}
        <div className="bg-surface-raised/30 border border-gold-dim/15 p-4 sm:p-6 mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-gold font-body mb-3">
            How Solazzo Points work
          </p>
          <p className="text-sm text-foreground/60 font-body leading-relaxed mb-4">
            <span className="text-foreground font-medium">Points = SOL Locked &times; Hours Held.</span>{" "}
            They accrue continuously while you hold a slot. Points are permanent
            &mdash; displacement stops accrual but never erases your history.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {(["OG", "Whale", "Grinder"] as Archetype[]).map((arch) => (
              <div key={arch} className="text-center">
                <span
                  className="inline-block text-xs font-display font-bold px-2.5 py-1 border"
                  style={{ color: ARCHETYPE_COLORS[arch], borderColor: `${ARCHETYPE_COLORS[arch]}40` }}
                >
                  {arch}
                </span>
                <p className="text-[11px] text-foreground/40 font-body mt-1.5 leading-snug">
                  {ARCHETYPE_DESCRIPTIONS[arch]}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          {(["all", "OG", "Whale", "Grinder"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-body px-3 py-1.5 border transition-colors cursor-pointer ${
                filter === f
                  ? "border-gold text-gold bg-gold/10"
                  : "border-gold-dim/20 text-foreground/40 hover:text-foreground/70 hover:border-gold-dim/40"
              }`}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>

        {/* Leaderboard table */}
        <div className="border border-gold-dim/20">
          {/* Header row - desktop */}
          <div className="hidden sm:grid grid-cols-[3rem_1fr_6rem_5rem_5rem_5rem] gap-2 px-4 py-2.5 border-b border-gold-dim/20 bg-surface-raised/30">
            <span className="text-[10px] text-muted/40 font-body uppercase tracking-wider">#</span>
            <span className="text-[10px] text-muted/40 font-body uppercase tracking-wider">Wallet</span>
            <span className="text-[10px] text-muted/40 font-body uppercase tracking-wider text-right">Points</span>
            <span className="text-[10px] text-muted/40 font-body uppercase tracking-wider text-right">SOL</span>
            <span className="text-[10px] text-muted/40 font-body uppercase tracking-wider text-right">Held</span>
            <span className="text-[10px] text-muted/40 font-body uppercase tracking-wider text-right">Type</span>
          </div>

          {filtered.map((entry) => (
            <div
              key={entry.wallet}
              className={`border-b border-gold-dim/10 last:border-b-0 transition-colors hover:bg-gold/5 ${
                entry.rank <= 3 ? "bg-gold/[0.03]" : ""
              }`}
            >
              {/* Desktop row */}
              <div className="hidden sm:grid grid-cols-[3rem_1fr_6rem_5rem_5rem_5rem] gap-2 px-4 py-3 items-center">
                <span className={`text-sm font-display font-bold ${
                  entry.rank === 1 ? "text-gold" : entry.rank <= 3 ? "text-foreground/80" : "text-muted/40"
                }`}>
                  {entry.rank}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-foreground/80">{entry.wallet}</span>
                  {!entry.active && (
                    <span className="text-[9px] text-muted/40 font-body border border-muted/20 px-1.5 py-0.5">
                      displaced
                    </span>
                  )}
                </div>
                <span className={`text-sm font-display font-bold text-right ${
                  entry.rank === 1 ? "text-gold" : "text-foreground"
                }`}>
                  {formatPoints(entry.points)}
                </span>
                <span className="text-sm font-body text-foreground/60 text-right">
                  {entry.solLocked}
                </span>
                <span className="text-sm font-body text-foreground/40 text-right">
                  {formatDuration(entry.hoursHeld)}
                </span>
                <span className="text-right">
                  <span
                    className="text-[10px] font-display font-bold px-2 py-0.5 border"
                    style={{ color: ARCHETYPE_COLORS[entry.archetype], borderColor: `${ARCHETYPE_COLORS[entry.archetype]}40` }}
                  >
                    {entry.archetype}
                  </span>
                </span>
              </div>

              {/* Mobile row */}
              <div className="sm:hidden px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-display font-bold w-6 ${
                      entry.rank === 1 ? "text-gold" : entry.rank <= 3 ? "text-foreground/80" : "text-muted/40"
                    }`}>
                      {entry.rank}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-foreground/80">{entry.wallet}</span>
                        <span
                          className="text-[9px] font-display font-bold px-1.5 py-0.5 border"
                          style={{ color: ARCHETYPE_COLORS[entry.archetype], borderColor: `${ARCHETYPE_COLORS[entry.archetype]}40` }}
                        >
                          {entry.archetype}
                        </span>
                      </div>
                      <p className="text-[11px] text-foreground/40 font-body mt-0.5">
                        {entry.solLocked} SOL &middot; {formatDuration(entry.hoursHeld)}
                        {!entry.active && " · displaced"}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-display font-bold ${
                    entry.rank === 1 ? "text-gold" : "text-foreground"
                  }`}>
                    {formatPoints(entry.points)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted/40 font-body">No entries for this filter.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-3">
          <p className="text-xs text-foreground/30 font-body">
            Points accrue in real time. Leaderboard updates every 10 minutes.
          </p>
          <Link
            href="/"
            className="inline-block text-sm text-foreground/40 hover:text-gold transition-colors font-body"
          >
            Create your portraits &rarr;
          </Link>
        </div>
      </div>
    </main>
  );
}
