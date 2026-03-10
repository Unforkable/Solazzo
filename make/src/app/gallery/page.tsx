"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { GalleryEntry, GalleryTraitRoll } from "@/lib/gallery-store";
import {
  useComingSoon,
  ComingSoonToast,
} from "@/components/coming-soon-toast";

const STAGE_NAMES: Record<number, string> = {
  1: "Humble Believer",
  2: "Rising Confidence",
  3: "Established Wealth",
  4: "Maximum Excess",
  5: "Reflective Maturity",
};

const STAGE_THRESHOLDS = [200, 400, 600, 800];

function priceToStage(price: number): number {
  for (let i = 0; i < STAGE_THRESHOLDS.length; i++) {
    if (price < STAGE_THRESHOLDS[i]) return i + 1;
  }
  return 5;
}

const RARITY_COLORS: Record<string, string> = {
  Common: "#8a7f72",
  Uncommon: "#7ab87a",
  Rare: "#6a9fd8",
  Legendary: "#c9a84c",
};

type SortOption = "highest" | "lowest" | "slot";

function BaroqueFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full" style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.5))" }}>
      <div className="p-[3px] bg-gradient-to-b from-[#8B7441] via-[#5C4A28] to-[#3A2E18]">
        <div className="p-[4px] sm:p-[6px] bg-gradient-to-b from-[#C9A84C] via-[#A07B3A] to-[#7A5C2E]">
          <div className="p-[3px] sm:p-[4px] bg-[#1a1408]">
            <div className="p-[4px] sm:p-[6px] bg-gradient-to-b from-[#7A5C2E] via-[#A07B3A] to-[#C9A84C]">
              <div className="p-[2px] sm:p-[3px] bg-gradient-to-b from-[#3A2E18] via-[#5C4A28] to-[#8B7441]">
                <div
                  className="bg-[#0d0a04]"
                  style={{ boxShadow: "inset 0 2px 8px rgba(0,0,0,0.7)" }}
                >
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function CollectionLightbox({
  entry,
  onClose,
  currentStage,
  onChallenge,
}: {
  entry: GalleryEntry & { slot: number };
  onClose: () => void;
  currentStage: number;
  onChallenge: () => void;
}) {
  const currentConviction = entry.conviction ?? 0;
  const minBid = currentConviction > 0
    ? Math.round(Math.max(currentConviction * 1.01, currentConviction + 0.1) * 10) / 10
    : 0.1;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" />
      <div className="relative min-h-full flex items-start sm:items-center justify-center p-4 pt-6 sm:p-8">
        <div
          className="relative w-full max-w-6xl animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <span className="text-lg font-display font-bold text-foreground">
                Slot #{entry.slot}
              </span>
              {currentConviction > 0 && (
                <span className="text-sm font-body text-gold">
                  ◎ {currentConviction.toFixed(1)} locked
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-muted hover:text-gold transition-colors cursor-pointer text-sm font-body min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              Close
            </button>
          </div>

          {/* Portraits grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {entry.portraits.map((url, i) => {
              const stage = i + 1;
              const traits = entry.traits?.[i];
              const visible = traits
                ? Object.values(traits.rolls).filter((r: GalleryTraitRoll) => !r.isNothing)
                : [];

              return (
                <div key={stage} className={stage === currentStage ? "ring-1 ring-gold/40 ring-offset-2 ring-offset-black" : "opacity-50"}>
                  <BaroqueFrame>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Stage ${stage}`}
                      className="w-full aspect-square object-cover"
                    />
                  </BaroqueFrame>
                  <div className="mt-2 text-center">
                    <p className={`text-xs font-display font-semibold ${stage === currentStage ? "text-gold" : "text-foreground/80"}`}>
                      {stage}. {STAGE_NAMES[stage]}
                      {stage === currentStage && " (current)"}
                    </p>
                    {visible.length > 0 && (
                      <div className="mt-1 space-y-px">
                        {visible.map((r: GalleryTraitRoll) => (
                          <p
                            key={r.category}
                            className="text-[10px] leading-tight"
                            style={{ color: RARITY_COLORS[r.rarity] ?? "#8a7f72" }}
                          >
                            {r.itemName}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Challenge / Takeover section */}
          <div className="mt-6 border-t border-gold-dim/20 pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs text-foreground/40 font-body uppercase tracking-wider mb-1">
                Challenge this slot
              </p>
              <p className="text-sm text-foreground/60 font-body">
                Lock <span className="text-gold font-medium">◎ {minBid.toFixed(1)}</span> or more to take over this position.
                The current holder gets their full SOL back.
              </p>
            </div>
            <button
              onClick={onChallenge}
              className="btn-ghost font-display tracking-wide flex-shrink-0 gap-2"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
              </svg>
              Outbid — ◎ {minBid.toFixed(1)}+
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GalleryPage() {
  return (
    <Suspense>
      <GalleryContent />
    </Suspense>
  );
}

function GalleryContent() {
  const [collections, setCollections] = useState<GalleryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<(GalleryEntry & { slot: number }) | null>(null);
  const [sliderPrice, setSliderPrice] = useState(127);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [sort, setSort] = useState<SortOption>("highest");
  const currentStage = priceToStage(sliderPrice);
  const searchParams = useSearchParams();
  const toast = useComingSoon();
  const newId = searchParams.get("new");
  const highlightedRef = useRef<HTMLDivElement>(null);
  const didAutoOpen = useRef(false);

  useEffect(() => {
    fetch("/api/gallery")
      .then((res) => res.json())
      .then((data) => {
        const items = data.collections ?? [];
        setCollections(items);
      })
      .catch(() => setError("Failed to load gallery."))
      .finally(() => setLoading(false));

    fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd")
      .then((res) => res.json())
      .then((data) => {
        const price = data?.solana?.usd;
        if (typeof price === "number") {
          setSolPrice(price);
          setSliderPrice(price);
        }
      })
      .catch(() => {});
  }, []);

  // Enrich entries with derived slot numbers (oldest = slot 1)
  const entries = useMemo(() => {
    const byTime = [...collections].sort((a, b) => a.publishedAt - b.publishedAt);
    return byTime.map((entry, i) => ({
      ...entry,
      slot: entry.slot ?? i + 1,
    }));
  }, [collections]);

  // Auto-open lightbox for newly published collection
  useEffect(() => {
    if (newId && !didAutoOpen.current && entries.length > 0) {
      const match = entries.find((c) => c.id === newId);
      if (match) {
        setSelected(match);
        didAutoOpen.current = true;
      }
    }
  }, [newId, entries]);

  // Scroll to highlighted entry
  useEffect(() => {
    if (newId && highlightedRef.current) {
      setTimeout(() => highlightedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 600);
    }
  }, [newId, loading]);

  // Stats
  const stats = useMemo(() => {
    const convictions = entries
      .map((e) => e.conviction ?? 0)
      .filter((c) => c > 0);
    return {
      floor: convictions.length > 0 ? Math.min(...convictions) : null,
      total: convictions.reduce((a, b) => a + b, 0),
    };
  }, [entries]);

  // Sorted entries
  const sorted = useMemo(() => {
    const items = [...entries];
    switch (sort) {
      case "highest":
        return items.sort((a, b) => (b.conviction ?? 0) - (a.conviction ?? 0) || a.slot - b.slot);
      case "lowest":
        return items.sort((a, b) => (a.conviction ?? 0) - (b.conviction ?? 0) || a.slot - b.slot);
      case "slot":
        return items.sort((a, b) => a.slot - b.slot);
      default:
        return items;
    }
  }, [entries, sort]);

  const sortOptions: { key: SortOption; label: string }[] = [
    { key: "highest", label: "Highest Conviction" },
    { key: "lowest", label: "Lowest Conviction" },
    { key: "slot", label: "Slot #" },
  ];

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="text-sm text-muted hover:text-gold transition-colors font-body mb-4 inline-block"
          >
            &larr; Portrait Studio
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-wide text-foreground">
                THE GALLERY
              </h1>
              {!loading && (
                <div className="mt-2">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-sm font-body text-foreground/70">
                      {entries.length} <span className="text-muted/40">/ 1,000 claimed</span>
                    </span>
                    {solPrice !== null && (
                      <span className="text-xs text-muted/30 font-body">
                        SOL ${solPrice.toFixed(0)}
                      </span>
                    )}
                  </div>
                  <div className="h-1 w-48 sm:w-64 bg-surface-raised rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-gold-dim to-gold rounded-full transition-all duration-700"
                      style={{ width: `${Math.max((entries.length / 1000) * 100, 0.5)}%` }}
                    />
                  </div>
                </div>
              )}
              {loading && (
                <p className="text-muted/40 text-sm mt-1 font-body">Loading...</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        {!loading && entries.length > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
            <div className="bg-surface-raised/50 border border-gold-dim/20 p-3 sm:p-5 text-center">
              <p className="text-muted/50 text-[10px] sm:text-xs font-body uppercase tracking-wider mb-1">
                Floor Conviction
              </p>
              <p className="text-lg sm:text-2xl font-display font-bold text-foreground">
                {stats.floor != null ? (
                  <>
                    <span className="text-gold">◎</span> {stats.floor.toFixed(1)}
                  </>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div className="bg-surface-raised/50 border border-gold-dim/20 p-3 sm:p-5 text-center">
              <p className="text-muted/50 text-[10px] sm:text-xs font-body uppercase tracking-wider mb-1">
                Total Conviction Locked
              </p>
              <p className="text-lg sm:text-2xl font-display font-bold text-foreground">
                {stats.total > 0 ? (
                  <>
                    <span className="text-gold">◎</span>{" "}
                    {stats.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div className="bg-surface-raised/50 border border-gold-dim/20 p-3 sm:p-5 text-center">
              <p className="text-muted/50 text-[10px] sm:text-xs font-body uppercase tracking-wider mb-1">
                Slots Available
              </p>
              <p className="text-lg sm:text-2xl font-display font-bold text-foreground">
                {(1000 - entries.length).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Price slider */}
        {!loading && entries.length > 0 && (
          <div className="mb-8 bg-surface-raised/50 border border-gold-dim/20 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0 mb-3">
              <p className="text-xs text-muted/50 font-body uppercase tracking-wider">
                What if SOL hits...
              </p>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-lg sm:text-xl font-display font-bold text-foreground">
                  ${sliderPrice.toFixed(0)}
                </span>
                <span className="text-xs sm:text-sm text-gold font-display">
                  {STAGE_NAMES[currentStage]}
                </span>
                {solPrice !== null && Math.abs(sliderPrice - solPrice) > 5 && (
                  <button
                    onClick={() => setSliderPrice(solPrice)}
                    className="text-[10px] text-muted/40 font-body border border-gold-dim/20 px-2 py-0.5 hover:text-gold hover:border-gold/50 transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={1200}
              step={1}
              value={sliderPrice}
              onChange={(e) => setSliderPrice(Number(e.target.value))}
              className="w-full h-1.5 appearance-none bg-gold-dim/30 cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(201,168,76,0.4)] [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-gold [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
            />
            <div className="relative mt-1.5 h-4">
              {[
                { price: 0, label: "$0" },
                { price: 200, label: "$200" },
                { price: 400, label: "$400" },
                { price: 600, label: "$600" },
                { price: 800, label: "$800" },
                { price: 1200, label: "$1.2k" },
              ].map(({ price, label }, i, arr) => (
                <span
                  key={price}
                  className="absolute text-[10px] text-muted/40 font-body"
                  style={{
                    left: `${(price / 1200) * 100}%`,
                    transform:
                      i === 0
                        ? "none"
                        : i === arr.length - 1
                          ? "translateX(-100%)"
                          : "translateX(-50%)",
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Sort controls */}
        {!loading && entries.length > 0 && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <span className="text-xs text-muted/30 font-body mr-1">Sort</span>
            {sortOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSort(opt.key)}
                className={`text-xs font-body px-3 py-1.5 border transition-colors cursor-pointer min-h-[36px] ${
                  sort === opt.key
                    ? "border-gold text-gold bg-gold/10"
                    : "border-gold-dim/20 text-muted/60 hover:text-gold hover:border-gold/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && entries.length === 0 && (
          <div className="text-center py-20 sm:py-28 max-w-md mx-auto">
            <p className="text-xl sm:text-2xl font-display font-bold text-foreground/80 mb-3">
              1,000 empty frames.
            </p>
            <p className="text-muted/50 text-sm font-body leading-relaxed mb-6">
              The gallery is waiting. Every slot that gets claimed is one fewer
              slot that&rsquo;s available. No one has moved yet &mdash; which
              means every position is open.
            </p>
            <Link
              href="/"
              className="btn-gold font-display tracking-wide"
            >
              Claim your slot &rarr;
            </Link>
          </div>
        )}

        {error && (
          <p className="text-red-400 text-sm text-center py-24 font-body">{error}</p>
        )}

        {/* Grid */}
        {sorted.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
            {sorted.map((entry, idx) => {
              const coverUrl = entry.portraits[currentStage - 1] ?? entry.portraits[0];
              const legendaryCount = entry.traits
                ? entry.traits.reduce(
                    (sum, t) =>
                      sum +
                      Object.values(t.rolls).filter(
                        (r: GalleryTraitRoll) => r.rarity === "Legendary" && !r.isNothing,
                      ).length,
                    0,
                  )
                : 0;

              return (
                <div
                  key={entry.id}
                  ref={entry.id === newId ? highlightedRef : undefined}
                  className={`gallery-panel cursor-pointer group ${entry.id === newId ? "ring-1 ring-gold/50 ring-offset-2 ring-offset-black" : ""}`}
                  style={{ animationDelay: `${idx * 80}ms` }}
                  onClick={() => setSelected(entry)}
                >
                  <div className="relative transition-transform duration-300 group-hover:scale-[1.02]">
                    <BaroqueFrame>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverUrl}
                        alt={`Slot #${entry.slot}`}
                        className="w-full aspect-square object-cover"
                      />
                    </BaroqueFrame>
                    <span className="absolute top-3 left-3 bg-black/70 text-foreground/80 text-[10px] font-display font-semibold px-2 py-0.5 backdrop-blur-sm">
                      #{entry.slot}
                    </span>
                  </div>
                  <div className="mt-2 px-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted/40 font-body">
                        {timeAgo(entry.publishedAt)}
                      </span>
                      {entry.conviction != null && entry.conviction > 0 ? (
                        <span className="text-[11px] text-gold font-body">
                          ◎ {entry.conviction.toFixed(1)}
                        </span>
                      ) : legendaryCount > 0 ? (
                        <span className="text-[11px] text-gold/60 font-body">
                          {legendaryCount} legendary
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selected && (
        <CollectionLightbox
          entry={selected}
          onClose={() => setSelected(null)}
          currentStage={currentStage}
          onChallenge={() => toast.show("Wallet connection required. Coming soon.")}
        />
      )}

      <ComingSoonToast visible={toast.visible} message={toast.message} />
    </main>
  );
}
