// Abstract SVG placeholders — used only for VACANT slots in the wall and the
// "Sit for your portrait" empty-frame teaser in the Create+Hang hero.
// Real claimed portraits use entry.portraits[stage-1] (the AI-generated oils).

import { roman } from "./atoms";

// Chiaroscuro vignette + abstract bust + monospace explainer. Stage param is
// retained for parity with the design system; vacant slots always render
// without a stage, so it defaults to neutral.
export function PortraitPlaceholder({
  slot,
  stage = 1,
  hue = 26,
  label,
}: {
  slot: number;
  stage?: number;
  hue?: number;
  label?: string;
}) {
  const id = `p${slot}`;
  const stageLight = [0.55, 0.62, 0.7, 0.85, 0.6][stage - 1] ?? 0.7;
  const stageShadow = [0.94, 0.92, 0.88, 0.82, 0.9][stage - 1] ?? 0.9;
  const stageGlyph =
    stage === 5 ? "V" : stage === 4 ? "IV" : "I".repeat(Math.min(stage, 3));
  return (
    <svg viewBox="0 0 200 200" className="block w-full h-full">
      <defs>
        <radialGradient id={`${id}-vig`} cx="38%" cy="32%" r="80%">
          <stop offset="0%" stopColor={`hsl(${hue}, 35%, ${stageLight * 28}%)`} />
          <stop offset="55%" stopColor={`hsl(${hue}, 30%, 10%)`} />
          <stop offset="100%" stopColor={`hsl(${hue}, 35%, ${(1 - stageShadow) * 8}%)`} />
        </radialGradient>
        <pattern id={`${id}-stripes`} width="3" height="200" patternUnits="userSpaceOnUse">
          <rect width="3" height="200" fill={`hsla(${hue}, 25%, 18%, 0.18)`} />
          <rect x="1" width="1" height="200" fill={`hsla(${hue}, 30%, 8%, 0.25)`} />
        </pattern>
        <linearGradient id={`${id}-bust`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`hsl(${hue}, 22%, ${22 + stage * 3}%)`} />
          <stop offset="100%" stopColor={`hsl(${hue}, 18%, 7%)`} />
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#${id}-vig)`} />
      <rect width="200" height="200" fill={`url(#${id}-stripes)`} opacity="0.4" />
      {/* abstract bust silhouette */}
      <path
        d="M 60 200 L 60 165 Q 60 145, 80 138 Q 92 134, 100 130 Q 108 134, 120 138 Q 140 145, 140 165 L 140 200 Z"
        fill={`url(#${id}-bust)`}
        opacity="0.85"
      />
      <circle cx="100" cy="108" r="22" fill={`url(#${id}-bust)`} opacity="0.92" />
      {/* highlight rim */}
      <path
        d="M 78 95 Q 84 88, 96 87"
        stroke={`hsla(${hue + 8}, 60%, 70%, 0.4)`}
        strokeWidth="1.2"
        fill="none"
      />
      <path
        d="M 60 168 Q 70 152, 88 144"
        stroke={`hsla(${hue + 8}, 50%, 60%, 0.18)`}
        strokeWidth="1"
        fill="none"
      />
      <text
        x="100"
        y="186"
        textAnchor="middle"
        fontFamily="ui-monospace, Menlo, monospace"
        fontSize="6.2"
        fill="rgba(232,224,212,0.55)"
        letterSpacing="0.18em"
      >
        {label ?? `PORTRAIT · ST.${stageGlyph}`}
      </text>
    </svg>
  );
}

export function VacantPortrait({ slot }: { slot: number }) {
  return (
    <svg viewBox="0 0 200 200" className="block w-full h-full">
      <defs>
        <pattern
          id={`v${slot}-hatch`}
          patternUnits="userSpaceOnUse"
          width="6"
          height="6"
          patternTransform="rotate(45)"
        >
          <rect width="6" height="6" fill="#0d0a04" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(201,168,76,0.08)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="200" height="200" fill={`url(#v${slot}-hatch)`} />
      <text
        x="100"
        y="98"
        textAnchor="middle"
        fontFamily="var(--font-display), serif"
        fontStyle="italic"
        fontSize="14"
        fill="rgba(201,168,76,0.55)"
        letterSpacing="0.18em"
      >
        VACANT
      </text>
      <text
        x="100"
        y="116"
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize="6.5"
        fill="rgba(232,224,212,0.32)"
        letterSpacing="0.22em"
      >
        OPEN TO CLAIM · LOT {roman(slot)}
      </text>
    </svg>
  );
}
