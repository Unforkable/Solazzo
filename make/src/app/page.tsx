// make.solazzo.fun — Home / The Wall
//
// This replaces the old root page (the studio) which has been moved to
// /studio. The Wall is the first thing every visitor sees.
//
// Structure:
//   Marquee → StageBanner → Triptych → WithdrawBanner (if claimable)
//   → Vitals → OracleDial → ChallengeHero (Create-Hang or Replace)
//   → CuratorIndex → TheWall (grid of claimed + vacant frames)
//   → SettlementPlaque
//
// State follows the same shape as the old /gallery page so nothing on-chain
// changes — same fetchSlotBook / fetchProtocolConfig / fetchLowestSlotInfo /
// Pyth call, same DisplacementModal / WithdrawBanner / CollectionLightbox.

"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useConnection } from "@solana/wallet-adapter-react";
import type { PublicKey } from "@solana/web3.js";
import {
  CollectionLightbox,
  DisplacementModal,
  WithdrawBanner,
} from "./gallery/page";
import type { GalleryEntry } from "@/lib/gallery-store";
import {
  fetchLowestSlotInfo,
  fetchProtocolConfig,
  fetchSlotBook,
  type LowestSlotInfo,
  type ProtocolConfigAccount,
  type SlotBookAccount,
} from "@/lib/onchain/client";
import { SOL_DECIMALS } from "@/lib/onchain/constants";

import {
  ChallengeHero,
  CuratorIndex,
  GalleryCard,
  Marquee,
  OracleDial,
  PageShell,
  SettlementPlaque,
  StageBanner,
  Triptych,
  Vitals,
  type SortOption,
  type WallEntry,
} from "./_home/sections";
import { priceToStage } from "./_home/atoms";

// Pyth SOL/USD feed (same id used in /gallery)
const PYTH_SOL_USD_FEED =
  "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";

function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / SOL_DECIMALS;
}

export default function HomePage() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { connection } = useConnection();

  // ── Off-chain gallery metadata (portrait URLs etc) ────────────────────
  const [collections, setCollections] = useState<GalleryEntry[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [collectionsError, setCollectionsError] = useState<string | null>(null);

  // ── On-chain truth ────────────────────────────────────────────────────
  const [slotBook, setSlotBook] = useState<SlotBookAccount | null>(null);
  const [protocolConfig, setProtocolConfig] =
    useState<ProtocolConfigAccount | null>(null);
  const [lowest, setLowest] = useState<
    (LowestSlotInfo & { owner: PublicKey }) | null
  >(null);
  const [kpiError, setKpiError] = useState<string | null>(null);

  // ── Oracle / UI state ─────────────────────────────────────────────────
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [sliderPrice, setSliderPrice] = useState(127);
  const [sort, setSort] = useState<SortOption>("highest");
  const [selected, setSelected] = useState<(GalleryEntry & { slot: number }) | null>(null);
  const [showDisplace, setShowDisplace] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);

  const newId = searchParams.get("new");
  const highlightedRef = useRef<HTMLDivElement | null>(null);
  const wallRef = useRef<HTMLDivElement | null>(null);

  // ── Fetchers ──────────────────────────────────────────────────────────
  const fetchCollections = useCallback(() => {
    setCollectionsLoading(true);
    fetch("/api/gallery")
      .then((res) => res.json())
      .then((data) => setCollections(data.collections ?? []))
      .catch(() => setCollectionsError("Failed to load gallery."))
      .finally(() => setCollectionsLoading(false));
  }, []);

  const fetchChain = useCallback(() => {
    setKpiError(null);
    Promise.all([
      fetchSlotBook(connection),
      fetchProtocolConfig(connection),
      fetchLowestSlotInfo(connection).catch(() => null),
    ])
      .then(([sb, cfg, low]) => {
        setSlotBook(sb);
        setProtocolConfig(cfg);
        setLowest(low ?? null);
      })
      .catch(() => setKpiError("Failed to load on-chain data."));
  }, [connection]);

  // Initial load
  useEffect(() => {
    fetchCollections();
    fetchChain();
    fetch(
      `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${PYTH_SOL_USD_FEED}`,
    )
      .then((res) => res.json())
      .then((data) => {
        const parsed = data?.parsed?.[0]?.price;
        if (parsed) {
          const price = Number(parsed.price) * Math.pow(10, parsed.expo);
          if (price > 0) {
            setLivePrice(price);
            setSliderPrice(Math.round(price));
          }
        }
      })
      .catch(() => {});
  }, [fetchCollections, fetchChain]);

  // ── Derived ───────────────────────────────────────────────────────────
  const entries = useMemo(() => {
    // Oldest-first → slot 1, 2, 3... (matches the legacy enrichment rule)
    const byTime = [...collections].sort((a, b) => a.publishedAt - b.publishedAt);
    return byTime.map((entry, i) => ({
      ...entry,
      slot: entry.slot ?? i + 1,
    }));
  }, [collections]);

  const stats = useMemo(() => {
    if (!slotBook)
      return { floor: null, total: null, hung: null, slotsTotal: 1000 };
    let totalLamports = BigInt(0);
    let floorLamports: bigint | null = null;
    let hung = 0;
    for (let i = 0; i < slotBook.occupied.length; i++) {
      if (!slotBook.occupied[i]) continue;
      hung++;
      const lock = slotBook.locks[i];
      totalLamports += lock;
      if (floorLamports === null || lock < floorLamports) floorLamports = lock;
    }
    return {
      floor: floorLamports !== null ? lamportsToSol(floorLamports) : null,
      total: lamportsToSol(totalLamports),
      hung,
      slotsTotal: slotBook.occupied.length,
    };
  }, [slotBook]);

  // Lowest-slot portrait URL — look up by slot id in gallery entries
  const lowestPortraitUrl = useMemo(() => {
    if (!lowest) return undefined;
    const match = entries.find((e) => e.slot === lowest.slotId);
    if (!match) return undefined;
    return match.portraits[priceToStage(sliderPrice) - 1] ?? match.portraits[0];
  }, [lowest, entries, sliderPrice]);

  const lowestForHero = useMemo(() => {
    if (!lowest) return null;
    return {
      slot: lowest.slotId,
      stage: priceToStage(sliderPrice),
      conviction: lamportsToSol(lowest.lockedLamports),
      owner: `${lowest.owner.toBase58().slice(0, 4)}…${lowest.owner.toBase58().slice(-4)}`,
      portraitUrl: lowestPortraitUrl,
    };
  }, [lowest, lowestPortraitUrl, sliderPrice]);

  const feeSol = protocolConfig
    ? lamportsToSol(protocolConfig.displacementFeeLamports)
    : 0.01;

  // Build wall entries: interleave claimed + vacant slots from the slot book.
  // Up to 24 (mobile) / 32 (desktop) — full grid stays in /gallery deep view.
  const wallEntries = useMemo<WallEntry[]>(() => {
    if (!slotBook) {
      // Fallback: just the entries we have
      return entries.slice(0, 16).map((e) => ({
        kind: "claimed",
        slot: e.slot,
        stage: priceToStage(sliderPrice),
        conviction: e.conviction ?? 0,
        ageHrs: Math.max(
          1,
          Math.floor((Date.now() - e.publishedAt) / 3_600_000),
        ),
        portraitUrl: e.portraits[priceToStage(sliderPrice) - 1] ?? e.portraits[0],
        onClick: () => setSelected(e),
      }));
    }
    const entryBySlot = new Map(entries.map((e) => [e.slot, e]));
    const result: WallEntry[] = [];
    const stage = priceToStage(sliderPrice);
    for (let i = 0; i < slotBook.occupied.length && result.length < 32; i++) {
      const slotNo = i + 1;
      const occupied = slotBook.occupied[i];
      if (occupied) {
        const match = entryBySlot.get(slotNo);
        if (!match) continue;
        result.push({
          kind: "claimed",
          slot: slotNo,
          stage,
          conviction: lamportsToSol(slotBook.locks[i]),
          ageHrs: Math.max(
            1,
            Math.floor((Date.now() - match.publishedAt) / 3_600_000),
          ),
          portraitUrl:
            match.portraits[stage - 1] ?? match.portraits[0],
          onClick: () => setSelected(match),
        });
      } else if (result.length < 32) {
        result.push({
          kind: "vacant",
          slot: slotNo,
          onClick: () => router.push("/studio?start=capture"),
        });
      }
    }
    return result;
  }, [slotBook, entries, sliderPrice, router]);

  // Sort
  const sortedWall = useMemo(() => {
    const arr = [...wallEntries];
    switch (sort) {
      case "highest":
        return arr.sort((a, b) =>
          a.kind === "vacant"
            ? 1
            : b.kind === "vacant"
            ? -1
            : b.conviction - a.conviction,
        );
      case "lowest":
        return arr.sort((a, b) =>
          a.kind === "vacant"
            ? 1
            : b.kind === "vacant"
            ? -1
            : a.conviction - b.conviction,
        );
      case "slot":
        return arr.sort((a, b) => a.slot - b.slot);
      case "recency":
        return arr.sort((a, b) =>
          a.kind === "vacant"
            ? 1
            : b.kind === "vacant"
            ? -1
            : a.ageHrs - b.ageHrs,
        );
      default:
        return arr;
    }
  }, [wallEntries, sort]);

  // Auto-open lightbox for ?new=<id>
  if (newId && !autoOpened && entries.length > 0) {
    const match = entries.find((c) => c.id === newId);
    if (match) {
      setAutoOpened(true);
      setSelected(match);
    }
  }
  useEffect(() => {
    if (newId && highlightedRef.current) {
      const el = highlightedRef.current;
      setTimeout(() => {
        const top = el.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: "smooth" });
      }, 600);
    }
  }, [newId]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleCreate = useCallback(
    () => router.push("/studio?start=capture"),
    [router],
  );
  const handleReplace = useCallback(() => setShowDisplace(true), []);
  const handleInspect = useCallback(() => {
    // Open lightbox on the lowest slot if we have its gallery entry
    if (!lowest) return;
    const match = entries.find((e) => e.slot === lowest.slotId);
    if (match) setSelected(match);
  }, [lowest, entries]);
  const handleSeeWall = useCallback(() => {
    if (!wallRef.current) return;
    const top = wallRef.current.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);
  const handleEnterStudio = useCallback(
    () => router.push("/studio?start=capture"),
    [router],
  );

  const currentStage = priceToStage(sliderPrice);

  return (
    <PageShell>
      <Marquee />
      <StageBanner
        stage={livePrice !== null ? priceToStage(livePrice) : 1}
        price={livePrice}
      />
      <Triptych />
      <WithdrawBanner />
      <Vitals
        hung={stats.hung}
        floor={stats.floor}
        total={stats.total}
        stage={livePrice !== null ? priceToStage(livePrice) : 1}
      />
      <OracleDial
        price={sliderPrice}
        onChange={setSliderPrice}
        livePrice={livePrice}
      />
      <ChallengeHero
        hung={stats.hung ?? 0}
        total={stats.slotsTotal}
        lowest={lowestForHero}
        feeSol={feeSol}
        onCreate={handleCreate}
        onReplace={handleReplace}
        onInspect={handleInspect}
        onSeeWall={handleSeeWall}
      />
      <CuratorIndex
        sort={sort}
        setSort={setSort}
        count={wallEntries.length}
        total={stats.slotsTotal}
      />

      {/* Errors */}
      {(kpiError || collectionsError) && (
        <div className="flex items-center justify-between bg-red-900/20 border border-red-500/30 px-4 py-2 mb-4">
          <p className="text-xs text-red-400 font-body">
            {kpiError ?? collectionsError}
          </p>
          <button
            onClick={() => {
              if (kpiError) fetchChain();
              if (collectionsError) fetchCollections();
            }}
            className="text-xs text-gold hover:text-gold-bright transition-colors cursor-pointer font-body"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state — no claims yet at all */}
      {!collectionsLoading && entries.length === 0 && !collectionsError && (
        <div className="text-center py-16 sm:py-24 max-w-md mx-auto">
          <p className="text-xl sm:text-2xl font-display font-bold text-foreground/80 mb-3">
            1,000 empty frames.
          </p>
          <p className="text-muted/60 text-sm font-body leading-relaxed mb-6">
            The wall is waiting. Every slot that gets claimed is one fewer slot
            that&rsquo;s available.
          </p>
          <button
            onClick={handleCreate}
            className="btn-gold font-display tracking-wide cursor-pointer"
          >
            Claim your slot &rarr;
          </button>
        </div>
      )}

      {/* The Wall */}
      <div
        ref={wallRef}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-[18px] sm:gap-7"
      >
        {sortedWall.map((entry, idx) => {
          const isHighlight =
            entry.kind === "claimed" &&
            entries.find((e) => e.slot === entry.slot)?.id === newId;
          return (
            <div
              key={`${entry.kind}-${entry.slot}`}
              ref={isHighlight ? highlightedRef : undefined}
              className={
                isHighlight
                  ? "ring-1 ring-gold/50 ring-offset-2 ring-offset-black"
                  : ""
              }
            >
              <GalleryCard
                entry={{ ...entry, animationDelay: idx * 60 } as WallEntry}
              />
            </div>
          );
        })}
      </div>

      <SettlementPlaque onEnterStudio={handleEnterStudio} />

      {/* Lightbox */}
      {selected && (
        <CollectionLightbox
          entry={selected}
          onClose={() => setSelected(null)}
          currentStage={currentStage}
          onChallenge={() => {
            setSelected(null);
            setShowDisplace(true);
          }}
        />
      )}

      {/* Displacement modal */}
      {showDisplace && (
        <DisplacementModal
          onClose={() => setShowDisplace(false)}
          onSuccess={() => {
            setShowDisplace(false);
            fetchCollections();
            fetchChain();
          }}
        />
      )}
    </PageShell>
  );
}
