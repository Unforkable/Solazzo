/**
 * The 1,000 — snapshot for the homepage gallery preview.
 *
 * Tries `GET {GALLERY_API}/api/gallery` from RSC at request time and
 * falls back to a static stage-sampler if the live source is empty or
 * unreachable. Cross-origin fetch is server-side only, so there is no
 * CORS surface.
 *
 * Live contract (see make/src/app/api/gallery/route.ts):
 *   200 OK → { collections: GalleryEntry[] }
 *   GalleryEntry: {
 *     id: string,
 *     portraits: string[],     // 5 public URLs, index = stage - 1
 *     publishedAt: number,     // epoch ms
 *     slot?: number,           // 0..999
 *     conviction?: number,     // SOL locked (already in SOL units, not lamports)
 *     wallet?: string,
 *     claimTxSig?: string,
 *   }
 */

const GALLERY_API = "https://make.solazzo.fun/api/gallery";
const FETCH_TIMEOUT_MS = 1500;
const REVALIDATE_SECONDS = 60;
const TILE_COUNT = 5;
const TOTAL_SEATS = 1000;

type GalleryEntry = {
  id: string;
  portraits: string[];
  publishedAt: number;
  slot?: number;
  conviction?: number;
  wallet?: string;
  claimTxSig?: string;
};

export type ThousandTile =
  | {
      kind: "portrait";
      src: string;
      alt: string;
      label: string;
      sublabel?: string;
    }
  | { kind: "claim-cta"; href: string };

export type ThousandSnapshot = {
  tiles: ThousandTile[];
  totalSeats: number;
  totalClaimed: number | null;
  totalSolLocked: number | null;
  source: "live" | "fallback";
};

export async function getThousandSnapshot(): Promise<ThousandSnapshot> {
  try {
    const res = await fetch(GALLERY_API, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`gallery api ${res.status}`);

    const data = (await res.json()) as { collections?: GalleryEntry[] };
    const collections = data.collections ?? [];
    if (collections.length === 0) return STATIC_FALLBACK;

    // TODO(the-thousand-stage-aware): tiles currently surface portraits[0] (Stage I).
    //   Once we wire the Pyth SOL/USD feed into this page, pick
    //   portraits[currentStage - 1] so the preview matches the live stage.
    const recent = [...collections]
      .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0))
      .slice(0, TILE_COUNT);

    const tiles: ThousandTile[] = recent.map((c) => ({
      kind: "portrait" as const,
      src: c.portraits?.[0] ?? "/stages/stage-1.png",
      alt:
        c.slot !== undefined
          ? `Place #${String(c.slot).padStart(3, "0")}`
          : `Portrait ${c.id}`,
      label:
        c.slot !== undefined
          ? `#${String(c.slot).padStart(3, "0")}`
          : c.id.slice(0, 6),
      sublabel:
        typeof c.conviction === "number"
          ? `${formatSol(c.conviction)} SOL`
          : undefined,
    }));
    tiles.push({ kind: "claim-cta", href: "https://make.solazzo.fun" });

    const totalSolLocked = collections.reduce(
      (sum, c) => sum + (typeof c.conviction === "number" ? c.conviction : 0),
      0
    );

    return {
      tiles,
      totalSeats: TOTAL_SEATS,
      totalClaimed: collections.length,
      totalSolLocked: roundTo(totalSolLocked, 2),
      source: "live",
    };
  } catch (err) {
    console.warn("[the-thousand] live snapshot failed, using fallback:", err);
    return STATIC_FALLBACK;
  }
}

const STATIC_FALLBACK: ThousandSnapshot = {
  tiles: [
    {
      kind: "portrait",
      src: "/stages/stage-1.png",
      alt: "Stage I — Humble Believer",
      label: "Stage I",
      sublabel: "< $200",
    },
    {
      kind: "portrait",
      src: "/stages/stage-2.png",
      alt: "Stage II — Rising Confidence",
      label: "Stage II",
      sublabel: "$200–$399",
    },
    {
      kind: "portrait",
      src: "/stages/stage-3.png",
      alt: "Stage III — Established Wealth",
      label: "Stage III",
      sublabel: "$400–$599",
    },
    {
      kind: "portrait",
      src: "/stages/stage-4.png",
      alt: "Stage IV — Maximum Excess",
      label: "Stage IV",
      sublabel: "$600–$799",
    },
    {
      kind: "portrait",
      src: "/stages/stage-5.png",
      alt: "Stage V — Reflective Maturity",
      label: "Stage V",
      sublabel: "$800–$1,000",
    },
    { kind: "claim-cta", href: "https://make.solazzo.fun" },
  ],
  totalSeats: TOTAL_SEATS,
  totalClaimed: null,
  totalSolLocked: null,
  source: "fallback",
};

function formatSol(n: number): string {
  if (n >= 100) return n.toFixed(0);
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

function roundTo(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
