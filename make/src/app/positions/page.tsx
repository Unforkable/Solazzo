"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useConnection } from "@solana/wallet-adapter-react";
import {
  fetchWalletPositions,
  type WalletPosition,
} from "@/lib/onchain/client";
import { SOL_DECIMALS } from "@/lib/onchain/constants";
import { loadClaimMeta, loadPortraits } from "@/lib/storage";

// ── Pyth SOL/USD feed (Hermes REST API) ──────────────────────────────

const PYTH_SOL_USD_FEED =
  "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";

const SETTLE_THRESHOLD = 1000;
const SETTLE_DEADLINE = new Date("2030-03-16T00:00:00Z");

interface PythPrice {
  price: number;
  confidence: number;
  updatedAt: Date;
}

async function fetchPythPrice(): Promise<PythPrice> {
  const url = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${PYTH_SOL_USD_FEED}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Pyth price fetch failed");
  const data = await res.json();
  const parsed = data.parsed?.[0]?.price;
  if (!parsed) throw new Error("No price data");
  const price = Number(parsed.price) * Math.pow(10, parsed.expo);
  const conf = Number(parsed.conf) * Math.pow(10, parsed.expo);
  const publishTime = data.parsed[0].price.publish_time;
  return {
    price,
    confidence: conf,
    updatedAt: new Date(publishTime * 1000),
  };
}

// ── Gallery portrait resolution ──────────────────────────────────────

interface GalleryEntry {
  id: string;
  portraits: string[];
  wallet?: string;
  slot?: number;
}

// ── Stage names (shared with home page) ──────────────────────────────

const STAGE_THRESHOLDS = [200, 400, 600, 800];

function priceToStage(price: number): number {
  for (let i = 0; i < STAGE_THRESHOLDS.length; i++) {
    if (price < STAGE_THRESHOLDS[i]) return i + 1;
  }
  return 5;
}

// ── Baroque frame ────────────────────────────────────────────────────

function BaroqueFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-full"
      style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.5))" }}
    >
      <div className="p-[2px] bg-gradient-to-b from-[#8B7441] via-[#5C4A28] to-[#3A2E18]">
        <div className="p-[3px] bg-gradient-to-b from-[#C9A84C] via-[#A07B3A] to-[#7A5C2E]">
          <div className="p-[2px] bg-[#1a1408]">
            <div className="p-[3px] bg-gradient-to-b from-[#7A5C2E] via-[#A07B3A] to-[#C9A84C]">
              <div className="p-[2px] bg-gradient-to-b from-[#3A2E18] via-[#5C4A28] to-[#8B7441]">
                <div
                  className="bg-[#0d0a04]"
                  style={{
                    boxShadow: "inset 0 2px 8px rgba(0,0,0,0.7)",
                  }}
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

// ── Main page component ──────────────────────────────────────────────

export default function PositionsPage() {
  const { publicKey, connected } = useWallet();
  const { setVisible: openWalletModal } = useWalletModal();
  const { connection } = useConnection();

  // Positions state
  const [positions, setPositions] = useState<WalletPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gallery portraits (matched by wallet+slot)
  const [galleryPortraits, setGalleryPortraits] = useState<
    Map<number, string[]>
  >(new Map());

  // Local-only portraits from localStorage
  const [localPortraits, setLocalPortraits] = useState<string[] | null>(null);
  const [localSlotId, setLocalSlotId] = useState<number | null>(null);

  // Pyth price state
  const [pythPrice, setPythPrice] = useState<PythPrice | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Simulator
  const [simPrice, setSimPrice] = useState<number | null>(null);

  // ── Load positions ───────────────────────────────────────────────

  const loadPositions = useCallback(async () => {
    if (!publicKey || !connected) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchWalletPositions(connection, publicKey);
      setPositions(result);
    } catch {
      setError("Failed to load positions.");
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, connected]);

  // ── Load gallery portraits ───────────────────────────────────────

  const loadGalleryPortraits = useCallback(async () => {
    if (!publicKey) return;
    try {
      const res = await fetch("/api/gallery");
      if (!res.ok) return;
      const data = await res.json();
      const collections: GalleryEntry[] = data.collections ?? [];
      const wallet = publicKey.toBase58();
      const map = new Map<number, string[]>();
      for (const entry of collections) {
        if (
          entry.wallet === wallet &&
          typeof entry.slot === "number" &&
          Array.isArray(entry.portraits) &&
          entry.portraits.length > 0
        ) {
          map.set(entry.slot, entry.portraits);
        }
      }
      setGalleryPortraits(map);
    } catch {
      // Gallery fetch failure is non-critical
    }
  }, [publicKey]);

  // ── Load local-only portraits ────────────────────────────────────

  useEffect(() => {
    if (!publicKey) return;
    const meta = loadClaimMeta();
    if (meta && meta.wallet === publicKey.toBase58()) {
      setLocalSlotId(meta.slotId);
      if (meta.publishStatus === "local-only") {
        const saved = loadPortraits();
        setLocalPortraits(saved?.portraits ?? null);
      } else {
        setLocalPortraits(null);
      }
    } else {
      setLocalSlotId(null);
      setLocalPortraits(null);
    }
  }, [publicKey]);

  // ── Load Pyth price ──────────────────────────────────────────────

  const loadPrice = useCallback(async () => {
    setPriceLoading(true);
    setPriceError(null);
    try {
      const p = await fetchPythPrice();
      setPythPrice(p);
      if (simPrice === null) setSimPrice(Math.round(p.price));
    } catch {
      setPriceError("Failed to load price.");
    } finally {
      setPriceLoading(false);
    }
  }, [simPrice]);

  // Initial load
  useEffect(() => {
    void loadPositions();
    void loadGalleryPortraits();
    void loadPrice();
  }, [loadPositions, loadGalleryPortraits, loadPrice]);

  // Auto-refresh price every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPythPrice()
        .then((p) => setPythPrice(p))
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  // ── Derived values ───────────────────────────────────────────────

  const totalLocked = positions.reduce(
    (sum, p) => sum + p.lockedLamports,
    BigInt(0),
  );
  const totalSol = Number(totalLocked) / SOL_DECIMALS;
  const currentPrice = pythPrice?.price ?? 0;
  const effectiveSimPrice = simPrice ?? Math.round(currentPrice);
  const currentStage = priceToStage(effectiveSimPrice);

  const priceFreshness = pythPrice
    ? Math.round((Date.now() - pythPrice.updatedAt.getTime()) / 1000)
    : null;

  // ── Resolve portrait for a slot ──────────────────────────────────

  function resolvePortrait(slotId: number): {
    url: string | null;
    isLocal: boolean;
  } {
    // Published gallery image takes priority
    const gallery = galleryPortraits.get(slotId);
    if (gallery && gallery.length > 0) {
      const stageIdx = currentStage - 1;
      return { url: gallery[stageIdx] ?? gallery[0], isLocal: false };
    }
    // Local-only fallback
    if (localSlotId === slotId && localPortraits && localPortraits.length > 0) {
      const stageIdx = currentStage - 1;
      return {
        url: localPortraits[stageIdx] ?? localPortraits[0],
        isLocal: true,
      };
    }
    return { url: null, isLocal: false };
  }

  // ── Not connected ────────────────────────────────────────────────

  if (!connected || !publicKey) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-6">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
            My Positions
          </h1>
          <p className="text-sm text-foreground/50 font-body leading-relaxed">
            Connect your Solana wallet to view your slot positions, locked SOL,
            and portrait collection.
          </p>
          <button
            onClick={() => openWalletModal(true)}
            className="btn-gold font-display tracking-wide text-base py-3 px-8 cursor-pointer"
          >
            Connect Wallet
          </button>
          <div className="pt-4">
            <Link
              href="/"
              className="text-xs text-muted/50 hover:text-gold transition-colors font-body"
            >
              &larr; Back to Studio
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Connected ────────────────────────────────────────────────────

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-16">
      <div className="max-w-[960px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              My Positions
            </h1>
            <p className="text-xs text-muted/50 font-body mt-1">
              {publicKey.toBase58().slice(0, 4)}...
              {publicKey.toBase58().slice(-4)}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                void loadPositions();
                void loadGalleryPortraits();
              }}
              disabled={loading}
              className="btn-ghost font-display tracking-wide text-xs disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <Link
              href="/"
              className="btn-ghost font-display tracking-wide text-xs"
            >
              Studio
            </Link>
            <Link
              href="/gallery"
              className="btn-ghost font-display tracking-wide text-xs"
            >
              Gallery
            </Link>
          </div>
        </div>

        {/* ── Pyth Price Panel ────────────────────────────────────── */}
        <div className="bg-surface-raised border border-gold-dim/20 p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-display text-foreground/80 font-semibold text-xs uppercase tracking-wider">
              SOL / USD
            </p>
            <div className="flex items-center gap-3">
              {priceFreshness !== null && (
                <span
                  className={`text-[10px] font-body ${priceFreshness < 120 ? "text-green-400/70" : "text-yellow-400/70"}`}
                >
                  {priceFreshness < 60
                    ? `${priceFreshness}s ago`
                    : `${Math.round(priceFreshness / 60)}m ago`}
                </span>
              )}
              <span className="text-[10px] text-muted/40 font-body">
                Source: Pyth
              </span>
            </div>
          </div>

          {priceError ? (
            <div className="flex items-center justify-between">
              <p className="text-red-400 text-xs font-body">{priceError}</p>
              <button
                onClick={() => void loadPrice()}
                className="text-xs text-gold hover:text-gold-bright transition-colors cursor-pointer font-body"
              >
                Retry
              </button>
            </div>
          ) : priceLoading && !pythPrice ? (
            <p className="text-sm text-muted/50 font-body">
              Loading price...
            </p>
          ) : pythPrice ? (
            <div className="space-y-4">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-display font-bold text-foreground">
                  ${pythPrice.price.toFixed(2)}
                </span>
                <span className="text-xs text-muted/40 font-body">
                  &plusmn;${pythPrice.confidence.toFixed(2)}
                </span>
              </div>

              <p className="text-[11px] text-muted/40 font-body">
                Unlock condition: SOL reaches ${SETTLE_THRESHOLD} (with protocol rules){" "}
                <span className="text-foreground/40">or</span> timeout on{" "}
                {SETTLE_DEADLINE.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}{" "}
                UTC.
              </p>
            </div>
          ) : null}
        </div>

        {/* ── What-if Simulator ───────────────────────────────────── */}
        {pythPrice && (() => {
          const settled = effectiveSimPrice >= SETTLE_THRESHOLD;
          return (
            <div className={`border p-4 sm:p-6 transition-all duration-700 ${
              settled
                ? "bg-gold/10 border-gold/40 shadow-[0_0_30px_rgba(201,168,76,0.15)]"
                : "bg-surface-raised/50 border-gold-dim/20"
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0 mb-3">
                <div className="flex items-center gap-2">
                  <p className={`text-xs font-body uppercase tracking-wider transition-colors duration-500 ${
                    settled ? "text-gold" : "text-muted/50"
                  }`}>
                    {settled ? "Settlement reached" : "What if SOL hits..."}
                  </p>
                  <span className="text-[10px] text-yellow-400/60 font-body border border-yellow-400/20 px-2 py-0.5">
                    Non-authoritative
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className={`text-lg sm:text-xl font-display font-bold transition-colors duration-500 ${
                    settled ? "text-gold animate-shimmer" : "text-foreground"
                  }`}>
                    ${effectiveSimPrice}
                  </span>
                  <span className={`text-xs sm:text-sm font-display transition-colors duration-500 ${
                    settled ? "text-gold-bright" : "text-gold"
                  }`}>
                    {settled ? "Settled" : `Stage ${currentStage}/5`}
                  </span>
                  {Math.abs(effectiveSimPrice - Math.round(pythPrice.price)) > 5 && (
                    <button
                      onClick={() => setSimPrice(Math.round(pythPrice.price))}
                      className="text-[10px] text-muted/40 font-body border border-gold-dim/20 px-2 py-0.5 hover:text-gold hover:border-gold/50 transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Slider track with $1k marker */}
              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={1200}
                  step={1}
                  value={effectiveSimPrice}
                  onChange={(e) => setSimPrice(Number(e.target.value))}
                  className={`w-full h-1.5 appearance-none cursor-pointer outline-none transition-all duration-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer ${
                    settled
                      ? "bg-gold/30 [&::-webkit-slider-thumb]:bg-gold-bright [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(226,201,126,0.6)] [&::-moz-range-thumb]:bg-gold-bright"
                      : "bg-gold-dim/30 [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(201,168,76,0.4)] [&::-moz-range-thumb]:bg-gold"
                  }`}
                />
                {/* $1,000 milestone marker */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ left: `${(1000 / 1200) * 100}%` }}
                >
                  <div className={`w-px h-4 transition-colors duration-500 ${
                    settled ? "bg-gold" : "bg-gold-dim/50"
                  }`} />
                </div>
              </div>

              {/* Scale labels */}
              <div className="relative mt-1.5 h-4">
                {[
                  { price: 0, label: "$0" },
                  { price: 200, label: "$200" },
                  { price: 400, label: "$400" },
                  { price: 600, label: "$600" },
                  { price: 800, label: "$800" },
                  { price: 1000, label: "$1k" },
                  { price: 1200, label: "$1.2k" },
                ].map(({ price, label }, i, arr) => (
                  <span
                    key={price}
                    className={`absolute font-body transition-colors duration-500 ${
                      price === 1000
                        ? `text-[11px] font-medium ${settled ? "text-gold" : "text-gold-dim"}`
                        : "text-[10px] text-muted/40"
                    }`}
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

              {/* Position value summary */}
              {positions.length > 0 && (
                <div className="flex flex-wrap gap-6 text-sm font-body mt-3">
                  <p className="text-muted/70">
                    Total locked:{" "}
                    <span className="text-foreground/80">{totalSol} SOL</span>
                  </p>
                  <p className="text-muted/70">
                    Simulated value:{" "}
                    <span className="text-gold font-semibold">
                      $
                      {(totalSol * effectiveSimPrice).toLocaleString(
                        undefined,
                        { maximumFractionDigits: 2 },
                      )}
                    </span>
                  </p>
                </div>
              )}

              {/* Simulated claim CTA */}
              {positions.length > 0 && settled && (
                <div className="mt-4 pt-4 border-t border-gold/30 animate-fade-in">
                  <button
                    type="button"
                    className="w-full btn-gold font-display tracking-wide text-sm py-3 opacity-90 cursor-default"
                  >
                    Claim SOL (Simulation) &mdash; {totalSol.toFixed(1)} SOL
                  </button>
                  <p className="mt-2 text-[11px] text-yellow-300/70 font-body">
                    Simulation only. Real claim activates when the live protocol
                    settlement conditions are met on-chain.
                  </p>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Positions Summary ───────────────────────────────────── */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 p-4">
            <p className="text-sm text-red-400 font-body">{error}</p>
          </div>
        )}

        {loading && positions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-muted/50 font-body">
              Loading positions...
            </p>
          </div>
        ) : positions.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-lg text-muted/50 font-body">
              No positions yet
            </p>
            <p className="text-sm text-foreground/40 font-body max-w-md mx-auto">
              Claim a slot in the Portrait Studio to lock SOL and become part of
              the Solazzo collection.
            </p>
            <Link
              href="/"
              className="btn-gold font-display tracking-wide text-sm py-3 px-8 inline-block"
            >
              Go to Studio
            </Link>
          </div>
        ) : (
          <>
            {/* Totals bar */}
            <div className="flex flex-wrap gap-6 text-sm font-body">
              <p className="text-muted/70">
                Slots owned:{" "}
                <span className="text-foreground/80 font-semibold">
                  {positions.length}
                </span>
              </p>
              <p className="text-muted/70">
                Total locked:{" "}
                <span className="text-gold font-semibold">{totalSol} SOL</span>
              </p>
              {pythPrice && (
                <p className="text-muted/70">
                  Value:{" "}
                  <span className="text-foreground/80 font-semibold">
                    $
                    {(totalSol * pythPrice.price).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </p>
              )}
            </div>

            {/* Position cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {positions.map((pos) => {
                const sol = Number(pos.lockedLamports) / SOL_DECIMALS;
                const lockDate =
                  pos.lockStartedAt > BigInt(0)
                    ? new Date(Number(pos.lockStartedAt) * 1000)
                    : null;
                const portrait = resolvePortrait(pos.slotId);

                return (
                  <div
                    key={pos.slotId}
                    className="bg-surface-raised border border-gold-dim/20 overflow-hidden"
                  >
                    {/* Portrait thumbnail */}
                    <div className="aspect-square relative">
                      {portrait.url ? (
                        <div className="relative w-full h-full">
                          <BaroqueFrame>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={portrait.url}
                              alt={`Slot #${pos.slotId}`}
                              className="w-full aspect-square object-cover"
                            />
                          </BaroqueFrame>
                          {portrait.isLocal && (
                            <div className="absolute top-2 left-2 bg-yellow-900/80 border border-yellow-600/50 px-2 py-0.5 text-[10px] text-yellow-200 font-body">
                              Local Only
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-full">
                          <BaroqueFrame>
                            <div className="aspect-square flex items-center justify-center bg-surface/50">
                              <div className="text-center space-y-2">
                                <div className="text-3xl text-muted/20">
                                  &#9651;
                                </div>
                                <p className="text-[11px] text-muted/30 font-body">
                                  No portrait linked
                                </p>
                              </div>
                            </div>
                          </BaroqueFrame>
                        </div>
                      )}
                    </div>

                    {/* Position info */}
                    <div className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-display font-bold text-gold">
                          Slot #{pos.slotId}
                        </span>
                        <span className="text-xs text-foreground/70 font-body font-semibold">
                          {sol} SOL
                        </span>
                      </div>
                      {lockDate && (
                        <p className="text-[11px] text-muted/40 font-body">
                          Locked{" "}
                          {lockDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      )}
                      {pythPrice && (
                        <p className="text-[11px] text-muted/40 font-body">
                          Value: $
                          {(sol * pythPrice.price).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
