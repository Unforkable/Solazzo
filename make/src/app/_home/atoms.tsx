// Solazzo home — shared atoms, helpers, ornaments.
// Private folder (leading underscore) so Next.js doesn't route it.

import type { ReactNode } from "react";

// ── Tokens ────────────────────────────────────────────────────────────────
// Mirrors the CSS variables declared in globals.css. Used directly when an
// SVG fill / dynamic gradient stop can't be expressed via Tailwind utilities.
export const TOKENS = {
  bg: "#0a0908",
  fg: "#e8e0d4",
  muted: "#7a7168",
  gold: "#c9a84c",
  goldDim: "#8b7441",
  goldBright: "#e2c97e",
  burgundy: "#6b2b3a",
  burgundyDeep: "#4a1d28",
  surface: "#151210",
  surfaceRaised: "#1c1916",
  canvas: "#0d0a04",
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────
export function roman(n: number): string {
  if (!n) return "";
  const m: [string, number][] = [
    ["M", 1000], ["CM", 900], ["D", 500], ["CD", 400], ["C", 100],
    ["XC", 90], ["L", 50], ["XL", 40], ["X", 10], ["IX", 9], ["V", 5],
    ["IV", 4], ["I", 1],
  ];
  let s = "";
  let v = n;
  for (const [r, val] of m) while (v >= val) { s += r; v -= val; }
  return s;
}

export function ageStr(hours: number): string {
  if (hours < 1) return "moments ago";
  if (hours < 24) return `${hours}h ago`;
  const d = Math.floor(hours / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export function ageFromTimestamp(timestamp: number): string {
  const hours = Math.floor((Date.now() - timestamp) / 3_600_000);
  return ageStr(hours);
}

export function priceToStage(price: number): 1 | 2 | 3 | 4 | 5 {
  if (price < 200) return 1;
  if (price < 400) return 2;
  if (price < 600) return 3;
  if (price < 800) return 4;
  return 5;
}

export const STAGE_NAMES: Record<number, string> = {
  1: "Humble Believer",
  2: "Rising Confidence",
  3: "Established Wealth",
  4: "Maximum Excess",
  5: "Reflective Maturity",
};

// ── Ornaments ─────────────────────────────────────────────────────────────
export function Rule({
  children,
  color = TOKENS.goldDim,
  dense = false,
}: {
  children?: ReactNode;
  color?: string;
  dense?: boolean;
}) {
  const grad = `linear-gradient(90deg, transparent, ${color} 30%, ${color} 70%, transparent)`;
  return (
    <div
      className="flex items-center font-display"
      style={{
        gap: dense ? 10 : 16,
        color,
        fontSize: 11,
        letterSpacing: "0.32em",
        textTransform: "uppercase",
      }}
    >
      <span className="flex-1 h-px" style={{ background: grad }} />
      {children && (
        <>
          <span style={{ width: 6, height: 6, transform: "rotate(45deg)", background: color }} />
          <span
            style={{ fontStyle: "italic", fontSize: 12, letterSpacing: "0.24em" }}
          >
            {children}
          </span>
          <span style={{ width: 6, height: 6, transform: "rotate(45deg)", background: color }} />
        </>
      )}
      <span className="flex-1 h-px" style={{ background: grad }} />
    </div>
  );
}

export function CornerBrackets({
  inset = 10,
  color = TOKENS.goldDim,
  size = 14,
  thick = 1,
}: {
  inset?: number;
  color?: string;
  size?: number;
  thick?: number;
}) {
  const corner = (key: string, style: React.CSSProperties) => (
    <div
      key={key}
      className="absolute pointer-events-none"
      style={{ width: size, height: size, ...style }}
    >
      <div className="absolute left-0 top-0" style={{ width: size, height: thick, background: color }} />
      <div className="absolute left-0 top-0" style={{ width: thick, height: size, background: color }} />
    </div>
  );
  return (
    <div className="absolute pointer-events-none" style={{ inset }}>
      {corner("tl", { left: 0, top: 0 })}
      {corner("tr", { right: 0, top: 0, transform: "scaleX(-1)" })}
      {corner("bl", { left: 0, bottom: 0, transform: "scaleY(-1)" })}
      {corner("br", { right: 0, bottom: 0, transform: "scale(-1,-1)" })}
    </div>
  );
}
