// Solazzo home — all visual sections (Marquee → SettlementPlaque).
// Each section is dumb / presentational; state lives in the page.tsx composer.

"use client";

import type { ReactNode } from "react";
import { BaroqueFrame } from "../gallery/page";
import { CornerBrackets, Rule, STAGE_NAMES, TOKENS, ageStr, roman } from "./atoms";
import { PortraitPlaceholder, VacantPortrait } from "./portrait-placeholder";

// ─────────────────────────────────────────────────────────────────────────────
// Marquee — masthead
// ─────────────────────────────────────────────────────────────────────────────
export function Marquee() {
  return (
    <div className="text-center pt-5 pb-4 sm:pt-8 sm:pb-7">
      <div
        className="font-mono uppercase mb-3.5 sm:mb-4 text-muted/80"
        style={{ fontSize: 10, letterSpacing: "0.42em" }}
      >
        Painted from Conviction
      </div>
      <Rule color={`${TOKENS.goldDim}aa`}>MMXXVI</Rule>
      <h1
        className="font-display font-bold text-foreground uppercase mt-[18px] sm:mt-[26px] mb-2 sm:mb-2.5"
        style={{
          fontSize: "clamp(44px, 8vw, 96px)",
          lineHeight: 0.95,
          letterSpacing: "0.08em",
        }}
      >
        SOLAZZO
      </h1>
      <div
        className="font-display uppercase text-foreground/70 mb-3.5 sm:mb-5"
        style={{
          fontSize: "clamp(13px, 1.4vw, 16px)",
          letterSpacing: "0.32em",
        }}
      >
        One Thousand Portraits · One Thousand Convictions · One Thousand Dollar SOL
      </div>
      <Rule color={`${TOKENS.goldDim}aa`} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StageBanner — collection's current stage + live price
// ─────────────────────────────────────────────────────────────────────────────
export function StageBanner({
  stage,
  price,
  priceSourceLabel = "SOL · Pyth oracle",
}: {
  stage: number;
  price: number | null;
  priceSourceLabel?: string;
}) {
  return (
    <div
      className="relative mt-3.5 sm:mt-6 border border-gold-dim/30 bg-gradient-to-b from-surface-raised to-surface"
      style={{ padding: "16px 14px" }}
    >
      <CornerBrackets inset={6} color={TOKENS.goldDim} size={12} />
      <div className="grid items-center gap-3.5 sm:gap-7 sm:[grid-template-columns:auto_1fr_auto] sm:p-2">
        <div>
          <div
            className="font-mono uppercase text-muted/80 mb-1"
            style={{ fontSize: 9.5, letterSpacing: "0.3em" }}
          >
            The collection is in
          </div>
          <div className="flex items-baseline gap-3">
            <span
              className="font-display font-bold text-foreground"
              style={{ fontSize: "clamp(22px, 2.3vw, 30px)", letterSpacing: "0.04em" }}
            >
              Stage {roman(stage)}
            </span>
            <span
              className="font-display italic text-gold"
              style={{ fontSize: "clamp(14px, 1.4vw, 18px)" }}
            >
              {STAGE_NAMES[stage]}
            </span>
          </div>
        </div>

        <div className="flex items-stretch gap-1 min-w-0 flex-wrap sm:flex-nowrap">
          {[1, 2, 3, 4, 5].map((s) => {
            const isCurrent = s === stage;
            const isPast = s < stage;
            return (
              <div
                key={s}
                className={`flex-1 relative px-1.5 py-2 ${isPast ? "bg-gold/[0.08]" : isCurrent ? "bg-gold/[0.08]" : ""}`}
                style={{
                  minWidth: 38,
                  borderTop: isCurrent
                    ? `2px solid ${TOKENS.gold}`
                    : `1px solid ${isPast ? `${TOKENS.goldDim}88` : `${TOKENS.muted}33`}`,
                  opacity: s > stage ? 0.4 : 1,
                }}
              >
                <div
                  className="font-display font-semibold"
                  style={{
                    fontSize: 11,
                    color: isCurrent ? TOKENS.goldBright : isPast ? TOKENS.goldDim : TOKENS.muted,
                    letterSpacing: "0.12em",
                  }}
                >
                  {roman(s)}
                </div>
                <div
                  className="font-mono uppercase text-muted/60 mt-[3px]"
                  style={{ fontSize: 8, letterSpacing: "0.16em" }}
                >
                  {s === 1 ? "<200" : `${(s - 1) * 200}+`}
                </div>
              </div>
            );
          })}
        </div>

        <div className="sm:text-right">
          <div
            className="font-mono uppercase text-muted/80 mb-1"
            style={{ fontSize: 9.5, letterSpacing: "0.3em" }}
          >
            {priceSourceLabel}
          </div>
          <div className="flex items-baseline gap-1.5 sm:justify-end">
            <span className="text-gold font-display" style={{ fontSize: "clamp(20px, 2vw, 26px)" }}>◎</span>
            <span
              className="font-display font-bold text-foreground"
              style={{ fontSize: "clamp(26px, 2.6vw, 34px)" }}
            >
              {price !== null ? `$${Math.round(price)}` : "—"}
            </span>
            <span className="text-muted/70 font-display" style={{ fontSize: 11 }}>USD</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Triptych — the 4-panel "How it works" engraving (Lock · Replace · Evolve · Resolve)
// ─────────────────────────────────────────────────────────────────────────────
export function Triptych() {
  const panels = [
    {
      n: "I", t: "Lock",
      head: "Lock in SOL.",
      body: "Claim one (or more) of the 1,000 frames by locking SOL. Get your portrait painted and hung on the wall.",
    },
    {
      n: "II", t: "Replace",
      head: "Conviction is contestable.",
      body: "Anyone may replace you by locking more. You forfeit position — never capital. Your principal stays parked until resolution.",
    },
    {
      n: "III", t: "Evolve",
      head: "The painting earns.",
      body: "As SOL rises in $200 bands, every portrait advances Stage I → V. Higher locks reveal richer ornament within each stage.",
    },
    {
      n: "IV", t: "Resolve",
      head: "SOL hits $1,000.",
      body: "At settlement — SOL @ $1,000 or 16 March 2030, whichever comes first — every holder withdraws their locked SOL in full. Conviction rewarded.",
    },
  ];
  return (
    <div className="mt-5 sm:mt-9">
      <Rule color={`${TOKENS.goldDim}88`}>How the wall works</Rule>
      <div className="mt-[18px] sm:mt-6 grid gap-3.5 sm:gap-[18px] grid-cols-1 sm:grid-cols-4">
        {panels.map((p) => (
          <div
            key={p.n}
            className="relative bg-gradient-to-b from-surface-raised/80 to-surface/60 border border-gold-dim/20"
            style={{ padding: "20px 18px 18px" }}
          >
            <CornerBrackets inset={5} color={`${TOKENS.goldDim}88`} size={10} />
            <div
              className="font-display italic font-semibold text-gold mb-2"
              style={{ fontSize: 40, lineHeight: 0.9 }}
            >
              {p.n}
            </div>
            <div
              className="font-mono uppercase text-muted/80 mb-2.5"
              style={{ fontSize: 9.5, letterSpacing: "0.32em" }}
            >
              {p.t}
            </div>
            <div
              className="font-display font-semibold text-foreground mb-2.5"
              style={{ fontSize: 19, lineHeight: 1.25, letterSpacing: "0.005em", textWrap: "pretty" }}
            >
              {p.head}
            </div>
            <div
              className="font-body text-foreground/70"
              style={{ fontSize: 13, lineHeight: 1.55, textWrap: "pretty" }}
            >
              {p.body}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vitals — 4-plinth stats strip (Hung · Floor · Vault · Stage)
// ─────────────────────────────────────────────────────────────────────────────
export function Vitals({
  hung,
  floor,
  total,
  stage,
}: {
  hung: number | null;
  floor: number | null;
  total: number | null;
  stage: number;
}) {
  const items = [
    {
      k: "hung",
      label: "Hung",
      sub: "portraits on the wall",
      val: hung !== null ? `${hung} / 1,000` : "—",
      accent: TOKENS.fg,
    },
    {
      k: "floor",
      label: "Floor",
      sub: "lowest conviction",
      val: floor !== null ? `◎ ${floor.toFixed(2)}` : "—",
      accent: TOKENS.gold,
    },
    {
      k: "total",
      label: "Vault",
      sub: "total SOL locked",
      val: total !== null ? `◎ ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—",
      accent: TOKENS.fg,
    },
    {
      k: "stage",
      label: "Stage",
      sub: STAGE_NAMES[stage],
      val: roman(stage),
      accent: `${TOKENS.burgundy}ee`,
    },
  ];
  return (
    <div className="mt-[18px] sm:mt-7">
      <div className="grid grid-cols-2 sm:grid-cols-4 border border-gold-dim/20 bg-gradient-to-b from-surface-raised to-surface">
        {items.map((it, i) => (
          <div
            key={it.k}
            className="p-3.5 sm:p-5"
            style={{
              borderRight:
                i % 2 === 0 ? `1px solid ${TOKENS.goldDim}22` : "none",
              borderBottom: i < 2 ? `1px solid ${TOKENS.goldDim}22` : "none",
            }}
          >
            <div
              className="font-mono uppercase text-muted/80 mb-1.5 sm:mb-2"
              style={{ fontSize: 9.5, letterSpacing: "0.32em" }}
            >
              {it.label}
            </div>
            <div
              className="font-display font-bold leading-none"
              style={{
                fontSize: "clamp(22px, 2.5vw, 36px)",
                color: it.accent,
                letterSpacing: "-0.01em",
              }}
            >
              {it.val}
            </div>
            <div
              className="font-display italic text-muted/80 mt-1.5 sm:mt-2"
              style={{ fontSize: 12 }}
            >
              {it.sub}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OracleDial — the price slider, theatricalized + settlement banner at $1k
// ─────────────────────────────────────────────────────────────────────────────
export function OracleDial({
  price,
  onChange,
  livePrice,
}: {
  price: number;
  onChange: (n: number) => void;
  livePrice: number | null;
}) {
  const pct = Math.min(100, (price / 1200) * 100);
  const settled = price >= 1000;
  const stage = (() => {
    if (price < 200) return 1;
    if (price < 400) return 2;
    if (price < 600) return 3;
    if (price < 800) return 4;
    return 5;
  })();
  const showReset =
    livePrice !== null && Math.abs(price - livePrice) > 5;

  return (
    <div
      className={`mt-5 sm:mt-8 p-4 sm:p-7 transition-all duration-700 border-l-4 ${
        settled
          ? "bg-gradient-to-b from-gold/10 to-transparent border border-gold/60 shadow-[0_0_60px_rgba(201,168,76,0.18)]"
          : "bg-gradient-to-b from-surface-raised/70 to-transparent border border-gold-dim/20"
      }`}
      style={{ borderLeftColor: settled ? TOKENS.goldBright : TOKENS.gold }}
    >
      <div className="flex justify-between items-baseline mb-3.5 gap-3 flex-wrap">
        <div>
          <div
            className="font-mono uppercase text-muted/80"
            style={{ fontSize: 9.5, letterSpacing: "0.32em" }}
          >
            Oracle — project the wall
          </div>
          <div
            className="font-display italic text-foreground/70 mt-1"
            style={{ fontSize: "clamp(14px, 1.4vw, 16px)" }}
          >
            Drag to see what the collection looks like at any SOL price.
          </div>
        </div>
        <div className="text-right flex items-baseline gap-2">
          {showReset && livePrice !== null && (
            <button
              onClick={() => onChange(Math.round(livePrice))}
              className="text-[10px] text-muted/40 font-body border border-gold-dim/20 px-2 py-0.5 hover:text-gold hover:border-gold/50 transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}
          <div>
            <span
              className="font-display font-bold text-foreground block leading-none"
              style={{ fontSize: "clamp(22px, 2.4vw, 30px)" }}
            >
              ${price}
            </span>
            <div className="font-display italic text-gold mt-0.5" style={{ fontSize: 12 }}>
              Stage {roman(stage)} · {STAGE_NAMES[stage]}
            </div>
          </div>
        </div>
      </div>

      <div className="relative mt-4">
        <input
          type="range"
          min={0}
          max={1200}
          value={price}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="w-full appearance-none outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold-bright [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gold-dim [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(226,201,126,0.5)] [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-gold-bright [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-gold-dim"
          style={{
            height: 2,
            background: `linear-gradient(90deg, ${TOKENS.gold} 0%, ${TOKENS.gold} ${pct}%, ${TOKENS.goldDim}55 ${pct}%, ${TOKENS.goldDim}55 100%)`,
          }}
        />
        {[0, 200, 400, 600, 800, 1000, 1200].map((p) => (
          <div
            key={p}
            className="absolute pointer-events-none"
            style={{
              top: -3,
              left: `${(p / 1200) * 100}%`,
              transform: "translateX(-50%)",
              width: 1,
              height: 10,
              background: p === 1000 ? TOKENS.gold : `${TOKENS.goldDim}99`,
            }}
          />
        ))}
        <div className="relative mt-2 h-[18px]">
          {[
            { p: 0, l: "$0" },
            { p: 200, l: "$200 · II" },
            { p: 400, l: "$400 · III" },
            { p: 600, l: "$600 · IV" },
            { p: 800, l: "$800 · V" },
            { p: 1000, l: "$1k · Settle" },
            { p: 1200, l: "$1.2k" },
          ].map(({ p, l }, i, arr) => (
            <span
              key={p}
              className="absolute font-mono whitespace-nowrap"
              style={{
                left: `${(p / 1200) * 100}%`,
                transform:
                  i === 0
                    ? undefined
                    : i === arr.length - 1
                    ? "translateX(-100%)"
                    : "translateX(-50%)",
                fontSize: 8.5,
                letterSpacing: "0.16em",
                color: p === 1000 ? TOKENS.gold : `${TOKENS.muted}99`,
              }}
            >
              {l}
            </span>
          ))}
        </div>
      </div>

      {settled && (
        <div className="mt-5 pt-5 border-t border-gold/30 animate-fade-in">
          <div
            className="font-display italic font-bold text-gold-bright mb-3"
            style={{ fontSize: "clamp(22px, 2.4vw, 30px)", lineHeight: 1.1 }}
          >
            Settlement reached — you made it.
          </div>
          <div
            className="font-body text-foreground/80 max-w-3xl"
            style={{ fontSize: "clamp(13px, 1vw, 15px)", lineHeight: 1.65, textWrap: "pretty" }}
          >
            SOL crossed the $1,000 threshold. All locked SOL is now immediately
            claimable for withdrawal. Your portraits remain permanently in the
            collection at their final stage. Conviction rewarded.
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChallengeHero — adapts based on whether the wall is full
//   • not full → "Be painted into Solazzo." (Create+Hang flow)
//   • full    → "The wall is full. Take the weakest position..." (Replace flow)
// ─────────────────────────────────────────────────────────────────────────────
type LowestEntry = {
  slot: number;
  stage: number;
  conviction: number;
  owner: string;
  portraitUrl?: string;
};

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div>
      <div
        className="font-mono uppercase text-muted/80 mb-1"
        style={{ fontSize: 9, letterSpacing: "0.28em" }}
      >
        {label}
      </div>
      <div
        className="font-display font-bold"
        style={{ fontSize: 18, color: accent }}
      >
        {value}
      </div>
    </div>
  );
}

export function ChallengeHero({
  hung,
  total = 1000,
  lowest,
  feeSol,
  onCreate,
  onReplace,
  onInspect,
  onSeeWall,
}: {
  hung: number;
  total?: number;
  lowest: LowestEntry | null;
  feeSol: number;
  onCreate: () => void;
  onReplace: () => void;
  onInspect: () => void;
  onSeeWall: () => void;
}) {
  const full = hung >= total;
  const remaining = total - hung;

  if (!full) {
    return (
      <div className="mt-[26px] sm:mt-10">
        <Rule color={`${TOKENS.gold}aa`}>
          {remaining.toLocaleString()} Frames Open · Claim Yours
        </Rule>
        <div
          className="relative mt-[18px] sm:mt-6 border border-gold/40 bg-gradient-to-br from-surface-raised via-surface to-background p-4 sm:p-7"
          style={{ boxShadow: "0 0 70px rgba(201,168,76,0.10)" }}
        >
          <CornerBrackets inset={6} color={`${TOKENS.gold}aa`} size={14} />
          <div className="grid items-center gap-[18px] sm:gap-8 grid-cols-1 sm:[grid-template-columns:minmax(0,1fr)_1.4fr]">
            {/* Empty frame teaser */}
            <div className="relative">
              <BaroqueFrame>
                <div className="aspect-square">
                  <VacantPortrait slot={hung + 1} />
                </div>
              </BaroqueFrame>
              <div className="absolute inset-0 flex items-end justify-center p-4 sm:p-6 pointer-events-none">
                <div
                  className="font-mono uppercase bg-black/70 border border-gold/30 text-gold/80"
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.3em",
                    padding: "5px 10px",
                  }}
                >
                  Your portrait, here
                </div>
              </div>
            </div>

            {/* Body */}
            <div>
              <div
                className="font-mono uppercase text-gold/80 mb-2.5"
                style={{ fontSize: 10, letterSpacing: "0.34em" }}
              >
                Open Frames · {remaining.toLocaleString()} of {total.toLocaleString()}
              </div>
              <div
                className="font-display italic font-semibold text-foreground mb-3.5"
                style={{
                  fontSize: "clamp(30px, 3.5vw, 44px)",
                  lineHeight: 1.04,
                  letterSpacing: "-0.01em",
                  textWrap: "balance",
                }}
              >
                Be painted into Solazzo.
              </div>
              <div
                className="font-body text-foreground/70 mb-[18px]"
                style={{
                  fontSize: "clamp(13px, 1.1vw, 14px)",
                  lineHeight: 1.6,
                  maxWidth: 560,
                  textWrap: "pretty",
                }}
              >
                Lock SOL, claim a frame, and your face is painted in the Solazzo
                style — Baroque oil, on the wall, evolving as SOL climbs. There are{" "}
                <span className="text-gold">{remaining.toLocaleString()} frames</span> still open.
              </div>
              <div className="grid grid-cols-2 sm:[grid-template-columns:auto_auto_auto_1fr] gap-3 sm:gap-5 items-center mb-[22px] pt-4 border-t border-gold-dim/20">
                <Stat label="Frames open" value={remaining.toLocaleString()} accent={TOKENS.fg} />
                <Stat
                  label="Floor lock"
                  value={lowest ? `◎ ${lowest.conviction.toFixed(2)}` : "—"}
                  accent={TOKENS.gold}
                />
                <Stat label="Fee" value={`◎ ${feeSol.toFixed(2)}`} accent={TOKENS.fg} />
                <div />
              </div>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={onCreate}
                  className="btn-gold font-display tracking-[0.22em] uppercase cursor-pointer"
                  style={{ fontSize: 13, padding: "14px 28px", minHeight: 48 }}
                >
                  Create &amp; Hang &nbsp;→
                </button>
                <button
                  onClick={onSeeWall}
                  className="font-display italic text-foreground/80 hover:text-gold underline underline-offset-[6px] decoration-gold-dim/60 cursor-pointer"
                  style={{
                    fontSize: 13,
                    letterSpacing: "0.16em",
                    padding: "14px 18px",
                    minHeight: 48,
                    background: "transparent",
                    border: "none",
                  }}
                >
                  See the wall first
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Full state — Lotto del Momento ────────────────────────────────────
  if (!lowest) return null;
  const minToReplace = lowest.conviction + 0.1;

  return (
    <div className="mt-[26px] sm:mt-10">
      <Rule color={`${TOKENS.burgundy}aa`}>Lotto del Momento · Open for Challenge</Rule>
      <div
        className="relative mt-[18px] sm:mt-6 border p-4 sm:p-7"
        style={{
          background: `linear-gradient(135deg, ${TOKENS.burgundyDeep} 0%, ${TOKENS.surface} 55%, ${TOKENS.bg} 100%)`,
          borderColor: `${TOKENS.burgundy}88`,
          boxShadow: "0 0 60px rgba(107,43,58,0.18)",
        }}
      >
        <CornerBrackets inset={6} color={`${TOKENS.gold}aa`} size={14} />
        <div className="grid items-center gap-[18px] sm:gap-8 grid-cols-1 sm:[grid-template-columns:minmax(0,1fr)_1.4fr]">
          <div>
            <BaroqueFrame>
              <div className="aspect-square">
                {lowest.portraitUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={lowest.portraitUrl}
                    alt={`Lowest slot · #${lowest.slot}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <PortraitPlaceholder slot={lowest.slot} stage={lowest.stage} />
                )}
              </div>
            </BaroqueFrame>
          </div>
          <div>
            <div
              className="font-mono uppercase text-gold/80 mb-2.5"
              style={{ fontSize: 10, letterSpacing: "0.34em" }}
            >
              Lowest conviction · Lot {roman(lowest.slot)}
            </div>
            <div
              className="font-display italic font-semibold text-foreground mb-3.5"
              style={{
                fontSize: "clamp(30px, 3.4vw, 42px)",
                lineHeight: 1.05,
                textWrap: "balance",
              }}
            >
              The wall is full. Take the weakest position — for ◎ {minToReplace.toFixed(2)} or more.
            </div>
            <div
              className="font-body text-foreground/60 mb-[18px]"
              style={{
                fontSize: "clamp(13px, 1.1vw, 14px)",
                lineHeight: 1.6,
                maxWidth: 540,
                textWrap: "pretty",
              }}
            >
              Slot {roman(lowest.slot)} currently rests with{" "}
              <span className="text-gold">{lowest.owner}</span> at{" "}
              <span className="text-foreground">◎ {lowest.conviction.toFixed(2)} SOL</span>.
              Lock more than this and the wall is yours; the replaced holder&rsquo;s principal stays parked until resolution.
            </div>
            <div className="grid grid-cols-2 sm:[grid-template-columns:auto_auto_auto_1fr] gap-3 sm:gap-[18px] items-center mb-[22px] pt-4 border-t border-gold-dim/20">
              <Stat label="Current lock" value={`◎ ${lowest.conviction.toFixed(2)}`} accent={TOKENS.fg} />
              <Stat label="Min. to replace" value={`◎ ${minToReplace.toFixed(2)}`} accent={TOKENS.gold} />
              <Stat label="Fee" value={`◎ ${feeSol.toFixed(2)}`} accent={TOKENS.fg} />
              <div />
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={onReplace}
                className="btn-gold font-display tracking-[0.22em] uppercase cursor-pointer"
                style={{ fontSize: 13, padding: "14px 28px", minHeight: 48 }}
              >
                Replace this Lot &nbsp;→
              </button>
              <button
                onClick={onInspect}
                className="btn-ghost font-display tracking-[0.22em] uppercase cursor-pointer"
                style={{ fontSize: 13, padding: "14px 24px", minHeight: 48 }}
              >
                Inspect Lot
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CuratorIndex — sort bar above the wall
// ─────────────────────────────────────────────────────────────────────────────
export type SortOption = "highest" | "lowest" | "slot" | "recency";
const SORT_OPTS: { k: SortOption; l: string }[] = [
  { k: "highest", l: "Highest Conviction" },
  { k: "lowest", l: "Lowest Conviction" },
  { k: "slot", l: "Slot No." },
  { k: "recency", l: "Most Recent" },
];

export function CuratorIndex({
  sort,
  setSort,
  count,
  total,
}: {
  sort: SortOption;
  setSort: (s: SortOption) => void;
  count: number;
  total: number;
}) {
  return (
    <div className="mt-[26px] sm:mt-10 mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-wrap">
      <div
        className="font-mono uppercase text-muted/80 mr-1"
        style={{ fontSize: 10, letterSpacing: "0.32em" }}
      >
        Hung by
      </div>
      <div className="flex flex-wrap">
        {SORT_OPTS.map((o, i) => (
          <button
            key={o.k}
            onClick={() => setSort(o.k)}
            className={`font-display italic min-h-[36px] cursor-pointer transition-colors px-4 py-2 ${
              sort === o.k
                ? "text-gold bg-gold/[0.06] border border-gold"
                : "text-muted/80 hover:text-gold hover:border-gold/40 border border-gold-dim/20"
            }`}
            style={{
              fontSize: 13,
              borderLeftWidth: i === 0 ? 1 : 0,
            }}
          >
            {o.l}
          </button>
        ))}
      </div>
      <div className="flex-1" />
      <div
        className="font-mono uppercase text-muted/60"
        style={{ fontSize: 10, letterSpacing: "0.22em" }}
      >
        Showing {count.toLocaleString()} of {total.toLocaleString()}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Nameplate + VacantPlate — brass strip under each frame
// ─────────────────────────────────────────────────────────────────────────────
export function Nameplate({
  slot,
  conviction,
  age,
}: {
  slot: number;
  conviction: number;
  age: string;
}) {
  return (
    <div
      className="mt-2.5 px-2 py-1.5 sm:px-3 sm:py-2 flex items-center justify-between gap-2"
      style={{
        background:
          "linear-gradient(180deg, rgba(201,168,76,0.10) 0%, rgba(201,168,76,0.04) 100%)",
        borderTop: `1px solid ${TOKENS.goldDim}55`,
        borderBottom: `1px solid ${TOKENS.goldDim}33`,
      }}
    >
      <div
        className="font-mono uppercase text-muted/80"
        style={{ fontSize: 9, letterSpacing: "0.22em" }}
      >
        <span className="text-foreground">Nº{String(slot).padStart(3, "0")}</span>
        <span className="mx-1.5 text-gold-dim/70">·</span>
        {age}
      </div>
      <div
        className="font-display font-semibold text-gold-bright leading-none"
        style={{ fontSize: 15 }}
      >
        ◎ {conviction.toFixed(2)}
      </div>
    </div>
  );
}

export function VacantPlate({ slot }: { slot: number }) {
  return (
    <div
      className="mt-2.5 px-2 py-1.5 sm:px-3 sm:py-2 flex items-center justify-between gap-2"
      style={{
        borderTop: `1px dashed ${TOKENS.goldDim}55`,
        borderBottom: `1px dashed ${TOKENS.goldDim}33`,
      }}
    >
      <span
        className="font-mono uppercase text-foreground/55"
        style={{ fontSize: 9, letterSpacing: "0.22em" }}
      >
        Nº{String(slot).padStart(3, "0")}
      </span>
      <span
        className="font-mono uppercase text-muted/70"
        style={{ fontSize: 9, letterSpacing: "0.22em" }}
      >
        Open to claim
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GalleryCard — single frame (claimed or vacant)
// ─────────────────────────────────────────────────────────────────────────────
export type WallEntry =
  | {
      kind: "claimed";
      slot: number;
      stage: number;
      conviction: number;
      ageHrs: number;
      portraitUrl: string;
      onClick?: () => void;
      animationDelay?: number;
    }
  | { kind: "vacant"; slot: number; onClick?: () => void; animationDelay?: number };

export function GalleryCard({ entry }: { entry: WallEntry }) {
  if (entry.kind === "vacant") {
    return (
      <div
        className="gallery-panel cursor-pointer group"
        style={{ animationDelay: `${entry.animationDelay ?? 0}ms` }}
        onClick={entry.onClick}
      >
        <div className="transition-transform duration-300 group-hover:scale-[1.02]">
          <BaroqueFrame>
            <div className="aspect-square">
              <VacantPortrait slot={entry.slot} />
            </div>
          </BaroqueFrame>
        </div>
        <VacantPlate slot={entry.slot} />
      </div>
    );
  }
  return (
    <div
      className="gallery-panel cursor-pointer group"
      style={{ animationDelay: `${entry.animationDelay ?? 0}ms` }}
      onClick={entry.onClick}
    >
      <div className="transition-transform duration-300 group-hover:scale-[1.02]">
        <BaroqueFrame>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entry.portraitUrl}
            alt={`Slot #${entry.slot}`}
            className="w-full aspect-square object-cover"
          />
        </BaroqueFrame>
      </div>
      <Nameplate
        slot={entry.slot}
        conviction={entry.conviction}
        age={ageStr(entry.ageHrs)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SettlementPlaque — footer CTA. Manet in oleo · Sol Invictus. Ad Mille.
// ─────────────────────────────────────────────────────────────────────────────
export function SettlementPlaque({
  onEnterStudio,
  onReadWhitepaper,
}: {
  onEnterStudio: () => void;
  onReadWhitepaper?: () => void;
}) {
  return (
    <div
      className="relative mt-11 sm:mt-16 p-8 sm:p-14 text-center border border-gold-dim/20 bg-gradient-to-b from-surface to-background"
      style={{ borderTop: `2px solid ${TOKENS.gold}88` }}
    >
      <CornerBrackets inset={10} color={`${TOKENS.gold}66`} size={16} />
      <div
        className="font-mono uppercase text-gold/80 mb-3.5 sm:mb-[18px]"
        style={{ fontSize: 10, letterSpacing: "0.42em" }}
      >
        Manet in oleo
      </div>
      <div
        className="font-display italic font-semibold text-foreground mb-4 sm:mb-[22px] mx-auto"
        style={{
          fontSize: "clamp(36px, 4.5vw, 56px)",
          lineHeight: 1.04,
          letterSpacing: "-0.012em",
          textWrap: "balance",
          maxWidth: 760,
        }}
      >
        Sol Invictus. Ad Mille.
      </div>
      <div
        className="font-body text-foreground/55 mx-auto mb-6 sm:mb-8"
        style={{
          fontSize: "clamp(13px, 1vw, 15px)",
          lineHeight: 1.6,
          maxWidth: 540,
          textWrap: "pretty",
        }}
      >
        One thousand frames. One settlement. Principal returns at SOL @ $1,000 or 16 March 2030 — whichever arrives first.
      </div>
      <div className="flex gap-3.5 flex-wrap justify-center">
        <button
          onClick={onEnterStudio}
          className="btn-gold font-display uppercase tracking-[0.24em] cursor-pointer"
          style={{ fontSize: 13, padding: "16px 32px", minHeight: 52 }}
        >
          Enter the Studio &nbsp;→
        </button>
        {onReadWhitepaper && (
          <button
            onClick={onReadWhitepaper}
            className="btn-ghost font-display uppercase tracking-[0.22em] cursor-pointer"
            style={{ fontSize: 13, padding: "16px 26px", minHeight: 52 }}
          >
            Read the Whitepaper
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PageShell — page-level wrapper to keep page.tsx slim
// ─────────────────────────────────────────────────────────────────────────────
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen px-4 sm:px-9 pb-9">
      <div className="max-w-[1200px] mx-auto">{children}</div>
    </main>
  );
}
