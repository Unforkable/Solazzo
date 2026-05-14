import Link from "next/link";
import type { Metadata } from "next";
import { getThousandSnapshot } from "@/lib/the-thousand";
import { TheThousandPreview } from "@/components/TheThousandPreview";
import { ProofStrip } from "@/components/ProofStrip";

export const metadata: Metadata = {
  title: "SOLAZZO — The 1,000",
  description:
    "1,000 portraits. Each one backed by locked SOL. Yours evolves as Solana climbs.",
};

/*
 * ================================================================
 * HOMEPAGE — The 1,000.
 *
 * Naming rules:
 *   - "The 1,000" is a proper noun. Never attach a verb to it.
 *   - All action verbs ("claim", "lock", "create") live in CTA labels.
 *
 * CTA hierarchy:
 *   PRIMARY (hero):        "Claim your portrait" — low-friction entry
 *   SECONDARY (post-grid): "Lock SOL" — commitment, next to proof strip
 *
 * Long-form mechanics / FAQ live at /about.
 * Live grid lives at make.solazzo.fun/gallery.
 * Snapshot (live or fallback) is fetched server-side; see src/lib/the-thousand.ts.
 * ================================================================
 */

export default async function Home() {
  const snapshot = await getThousandSnapshot();

  return (
    <main className="max-w-[640px] mx-auto px-6 py-20 sm:py-32">
      {/* ---------------------------------------------------------- */}
      {/* HERO — single dominant CTA                                 */}
      {/* ---------------------------------------------------------- */}
      <div className="mb-24 sm:mb-32">
        <p className="text-xs uppercase tracking-[0.25em] text-muted/60 mb-4">
          Solazzo
        </p>
        <h1 className="font-serif-display text-3xl sm:text-4xl font-normal leading-snug text-foreground mb-8">
          The 1,000.
        </h1>
        <p className="text-base text-muted leading-relaxed">
          1,000 portraits. Each one backed by locked SOL. Yours evolves as
          Solana climbs.
        </p>

        <a href="https://make.solazzo.fun" className="cta-primary mt-8">
          Claim your portrait &rarr;
        </a>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted/60">
          <span>Built on Solana</span>
          <span aria-hidden="true" className="text-muted/20">&middot;</span>
          <span>1,000 places</span>
          <span aria-hidden="true" className="text-muted/20">&middot;</span>
          <span>Locked SOL returned in full</span>
        </div>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* HOW IT WORKS                                               */}
      {/* ---------------------------------------------------------- */}
      <div className="scroll-reveal mb-20 border border-muted/15 p-6 sm:p-8">
        <p className="text-xs uppercase tracking-widest text-muted/60 mb-5">
          How it works
        </p>
        <ol className="text-sm text-foreground/70 leading-relaxed space-y-3 list-none pl-0">
          <li className="flex gap-3">
            <span className="text-foreground/30 font-medium shrink-0">01</span>
            <span>
              <strong className="text-foreground">Lock SOL</strong> to claim one
              of 1,000 places. No mint price &mdash; capital is committed, not
              spent.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-foreground/30 font-medium shrink-0">02</span>
            <span>
              <strong className="text-foreground">Get your portrait</strong>{" "}
              &mdash; an AI-generated Baroque oil painting of your face,
              evolving across five stages as SOL climbs toward $1,000.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-foreground/30 font-medium shrink-0">03</span>
            <span>
              <strong className="text-foreground">Defend or be displaced</strong>{" "}
              &mdash; anyone can take your place by locking more. The displaced
              holder gets their principal back in full.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-foreground/30 font-medium shrink-0">04</span>
            <span>
              <strong className="text-foreground">Settlement</strong> &mdash;
              when SOL hits $1,000 (or Mar 2030), all locked SOL is returned to
              whoever holds the place.
            </span>
          </li>
        </ol>
        <p className="mt-6 text-xs text-muted/60">
          <Link
            href="/about"
            className="hover:text-foreground transition-colors underline underline-offset-2"
          >
            Read the full whitepaper &rarr;
          </Link>
        </p>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* THE 1,000 — gallery preview (name is a noun, no verbs)     */}
      {/* ---------------------------------------------------------- */}
      <section id="thousand" className="scroll-reveal mb-16">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-serif-display text-lg font-medium text-foreground">
            The 1,000
          </h2>
          <a
            href="https://make.solazzo.fun/gallery"
            className="text-xs uppercase tracking-widest text-muted/60 hover:text-foreground transition-colors"
          >
            All 1,000 &rarr;
          </a>
        </div>
        <p className="text-sm text-muted leading-relaxed mb-8">
          Each place is claimed by locking SOL &mdash; and held only while no
          one locks more. Portraits evolve through five stages as SOL climbs.
        </p>

        <TheThousandPreview snapshot={snapshot} />
      </section>

      {/* ---------------------------------------------------------- */}
      {/* PROOF STRIP + SECONDARY CTA (Lock SOL)                     */}
      {/* Visually subordinate to hero CTA — outlined, not solid.    */}
      {/* ---------------------------------------------------------- */}
      <section className="scroll-reveal mb-20">
        <ProofStrip snapshot={snapshot} />

        <div className="text-center">
          <p className="font-serif-display text-base text-foreground/80 mb-4">
            A place in The 1,000.
          </p>
          <a href="https://make.solazzo.fun" className="cta-secondary">
            Lock SOL &rarr;
          </a>
          <p className="mt-3 text-xs text-muted/50">
            Locked principal returned in full at displacement or settlement.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* FOOTER                                                     */}
      {/* ---------------------------------------------------------- */}
      <footer className="border-t border-muted/20 mt-20 pt-10 pb-4">
        <div className="text-xs text-muted/50 space-y-2 text-center">
          <div className="flex items-center justify-center gap-x-4 gap-y-1 flex-wrap">
            <Link
              href="/about"
              className="footer-link hover:text-muted transition-colors"
            >
              Whitepaper
            </Link>
            <span aria-hidden="true" className="text-muted/20">&middot;</span>
            <a
              href="https://make.solazzo.fun"
              className="footer-link hover:text-muted transition-colors"
            >
              Studio
            </a>
            <span aria-hidden="true" className="text-muted/20">&middot;</span>
            <a
              href="https://make.solazzo.fun/gallery"
              className="footer-link hover:text-muted transition-colors"
            >
              The 1,000
            </a>
          </div>
          <p>Built on Solana</p>
        </div>
      </footer>
    </main>
  );
}
