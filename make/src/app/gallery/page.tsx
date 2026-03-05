"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { GalleryEntry, GalleryTraitRoll } from "@/lib/gallery-store";

const STAGE_NAMES: Record<number, string> = {
  1: "Humble Believer",
  2: "Rising Confidence",
  3: "Visible Success",
  4: "Full Excess",
  5: "Quiet Reflection",
};

const RARITY_COLORS: Record<string, string> = {
  Common: "#8a7f72",
  Uncommon: "#7ab87a",
  Rare: "#6a9fd8",
  Legendary: "#c9a84c",
};

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
}: {
  entry: GalleryEntry;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-6xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-muted hover:text-gold transition-colors cursor-pointer text-sm font-body min-h-[44px]"
        >
          Close
        </button>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {entry.portraits.map((url, i) => {
            const stage = i + 1;
            const traits = entry.traits?.[i];
            const visible = traits
              ? Object.values(traits.rolls).filter((r: GalleryTraitRoll) => !r.isNothing)
              : [];

            return (
              <div key={stage}>
                <BaroqueFrame>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Stage ${stage}`}
                    className="w-full aspect-square object-cover"
                  />
                </BaroqueFrame>
                <div className="mt-2 text-center">
                  <p className="text-xs font-display font-semibold text-foreground/80">
                    {stage}. {STAGE_NAMES[stage]}
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
      </div>
    </div>
  );
}

export default function GalleryPage() {
  const [collections, setCollections] = useState<GalleryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GalleryEntry | null>(null);

  useEffect(() => {
    fetch("/api/gallery")
      .then((res) => res.json())
      .then((data) => {
        setCollections(data.collections ?? []);
      })
      .catch(() => setError("Failed to load gallery."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen px-6 py-16 sm:py-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
          <div>
            <Link
              href="/"
              className="text-sm text-muted hover:text-gold transition-colors font-body mb-4 inline-block"
            >
              &larr; Portrait Studio
            </Link>
            <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-wide text-foreground">
              THE GALLERY
            </h1>
            <p className="text-muted text-sm mt-1 font-body">
              {loading
                ? "Loading..."
                : `${collections.length} collection${collections.length !== 1 ? "s" : ""} published`}
            </p>
          </div>
        </div>

        {/* Empty state */}
        {!loading && !error && collections.length === 0 && (
          <div className="text-center py-24">
            <p className="text-muted/60 font-body">
              No collections published yet. Be the first.
            </p>
            <Link href="/" className="text-gold text-sm font-body mt-4 inline-block hover:text-gold-bright transition-colors">
              Create your portraits &rarr;
            </Link>
          </div>
        )}

        {error && (
          <p className="text-red-400 text-sm text-center py-24 font-body">{error}</p>
        )}

        {/* Grid */}
        {collections.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
            {collections.map((entry, idx) => {
              // Use Stage 3 as cover (middle stage, most visually rich)
              const coverUrl = entry.portraits[2] ?? entry.portraits[0];
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
                  className="gallery-panel cursor-pointer group"
                  style={{ animationDelay: `${idx * 80}ms` }}
                  onClick={() => setSelected(entry)}
                >
                  <div className="transition-transform duration-300 group-hover:scale-[1.02]">
                    <BaroqueFrame>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverUrl}
                        alt="Solazzo portrait"
                        className="w-full aspect-square object-cover"
                      />
                    </BaroqueFrame>
                  </div>
                  <div className="mt-2 flex items-center justify-between px-1">
                    <span className="text-[11px] text-muted/40 font-body">
                      {timeAgo(entry.publishedAt)}
                    </span>
                    {legendaryCount > 0 && (
                      <span className="text-[11px] text-gold/60 font-body">
                        {legendaryCount} legendary
                      </span>
                    )}
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
        />
      )}
    </main>
  );
}
