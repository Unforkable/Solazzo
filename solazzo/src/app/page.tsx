import Image from "next/image";

export default function Home() {
  return (
    <main className="max-w-[640px] mx-auto px-6 py-16 sm:py-24">
      {/* ---------------------------------------------------------- */}
      {/* HOOK                                                       */}
      {/* ---------------------------------------------------------- */}
      <div className="mb-20 sm:mb-28">
        <p className="text-2xl sm:text-3xl font-normal leading-snug text-foreground mb-8">
          This NFT gives you your money back when someone takes it from you.
        </p>
        <p className="text-base text-muted leading-relaxed">
          1,000 people will lock SOL into a smart contract. Each will receive an
          AI-generated Baroque oil portrait derived from their own likeness. Any
          of them can be displaced at any time by someone willing to lock more.
          The displaced party receives a full refund. No capital is lost. Only
          position.
        </p>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* TITLE BLOCK                                                */}
      {/* ---------------------------------------------------------- */}
      <div className="border-t border-muted/20 pt-10 mb-16">
        <h1 className="text-lg font-medium tracking-wide text-foreground mb-1">
          SOLAZZO
        </h1>
        <p className="text-sm text-muted">
          Whitepaper v1 &mdash; A Conviction-Based NFT Collection on Solana
        </p>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* TABLE OF CONTENTS                                          */}
      {/* ---------------------------------------------------------- */}
      <nav className="mb-16 text-sm text-muted">
        <p className="text-xs uppercase tracking-widest text-muted/60 mb-4">Contents</p>
        <ol className="list-decimal list-inside space-y-1">
          <li><a href="#abstract" className="hover:text-foreground transition-colors">Abstract</a></li>
          <li><a href="#conviction" className="hover:text-foreground transition-colors">Conviction Under Uncertainty</a></li>
          <li><a href="#architecture" className="hover:text-foreground transition-colors">System Architecture</a></li>
          <li><a href="#lock-to-own" className="hover:text-foreground transition-colors">Lock-to-Own Mechanism</a></li>
          <li><a href="#yield" className="hover:text-foreground transition-colors">Capital Deployment and Yield Accrual</a></li>
          <li><a href="#settlement" className="hover:text-foreground transition-colors">Settlement Condition</a></li>
          <li><a href="#portraits" className="hover:text-foreground transition-colors">Personalized Portrait System</a></li>
          <li><a href="#stages" className="hover:text-foreground transition-colors">The Five-Stage Evolutionary Arc</a></li>
          <li><a href="#aesthetic-ceiling" className="hover:text-foreground transition-colors">Lock Amount as Aesthetic Ceiling</a></li>
          <li><a href="#culture" className="hover:text-foreground transition-colors">Cultural Positioning</a></li>
          <li><a href="#conclusion" className="hover:text-foreground transition-colors">Conclusion</a></li>
          <li><a href="#collaborators" className="hover:text-foreground transition-colors">Built For Collaborators</a></li>
        </ol>
      </nav>

      {/* ---------------------------------------------------------- */}
      {/* 1. ABSTRACT                                                */}
      {/* ---------------------------------------------------------- */}
      <Section id="abstract" number={1} title="Abstract">
        <P>
          Solazzo is a collection of 1,000 competitive NFT slots on Solana where
          ownership is earned through locked capital rather than purchased
          through a fixed mint price. Participants claim and defend slots by
          locking SOL into a smart contract. At any moment, the owner of a slot
          is the participant who has committed the highest amount of SOL to it.
        </P>
        <P>
          Locked capital remains fully refundable. Upon displacement or
          settlement, participants receive exactly the amount of SOL originally
          locked. The system deploys locked capital into liquid staking
          infrastructure, capturing staking yield while preserving principal
          guarantees. All staking rewards accrue to the Solazzo treasury.
        </P>
        <P>
          Each slot is represented by a personalized, AI-generated oil portrait
          derived from the current owner&rsquo;s headshot. The portrait evolves
          across five predefined stages tied to SOL price milestones, forming a
          narrative arc from humble belief through excess to reflective
          realization.
        </P>
        <P>
          Solazzo unifies economic conviction, social signaling, and narrative
          progression into a single system. Ownership is dynamic. Identity is
          personalized. Wealth is expressed visually but ultimately
          interrogated.
        </P>
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* 2. CONVICTION UNDER UNCERTAINTY                            */}
      {/* ---------------------------------------------------------- */}
      <Section id="conviction" number={2} title="Conviction Under Uncertainty">
        <P>
          Crypto markets are environments of radical uncertainty. Participation
          requires committing capital to an outcome that is probabilistic,
          reflexive, and narrative-driven. Conviction is therefore not a static
          opinion but an ongoing decision to remain exposed.
        </P>
        <P>
          Solazzo formalizes that condition.
        </P>
        <P>
          Ownership is not purchased once and held passively. It must be
          continuously defended. Capital is locked, not spent. Displacement is
          always possible. The cost of ownership is the opportunity cost of
          liquidity and the risk of being outbid.
        </P>
        <P>
          Conviction is measurable because it is denominated in locked SOL. It
          is contestable because another participant may commit more. It is
          visible because ownership is represented publicly as an evolving
          portrait.
        </P>
        <P>
          The staking mechanism expresses conviction economically. The portrait
          system expresses it psychologically. The settlement condition expresses
          its temporal limits.
        </P>
        <P>
          Rather than promising permanent dominance, the system models exposure,
          escalation, competition, and reflection. It encodes the lived emotional
          arc of speculative markets into deterministic rules.
        </P>
        <P>
          The NFT becomes a proof of stake in both senses: financial commitment
          and ideological commitment.
        </P>
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* 3. SYSTEM ARCHITECTURE                                     */}
      {/* ---------------------------------------------------------- */}
      <Section id="architecture" number={3} title="System Architecture">
        <P>
          Solazzo consists of 1,000 NFT slots deployed on Solana. Each slot
          represents a competitive staking position and an associated evolving
          portrait.
        </P>
        <P>
          Each slot maintains on-chain state including the current owner, the
          locked amount of SOL, timestamps, and a metadata reference. Ownership
          is assigned to the participant with the highest locked amount for that
          slot.
        </P>
        <P>The system integrates:</P>
        <Ul>
          <li>A lock-to-own competitive mechanism</li>
          <li>Liquid staking deployment and yield capture</li>
          <li>A SOL liquidity buffer to guarantee principal refunds</li>
          <li>Oracle-based price milestone detection</li>
          <li>Off-chain AI portrait generation</li>
          <li>Dynamic metadata rendering</li>
        </Ul>
        <P>
          These components operate cohesively rather than independently. Economic
          behavior determines identity. Market conditions determine visual
          evolution.
        </P>
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* 4. LOCK-TO-OWN MECHANISM                                   */}
      {/* ---------------------------------------------------------- */}
      <Section id="lock-to-own" number={4} title="Lock-to-Own Mechanism">
        <P>
          Ownership of a slot is established by locking SOL into the Solazzo
          contract. If a slot is unowned, any participant may claim it by locking
          a positive amount of SOL. If a slot is already owned, a new
          participant must lock an amount that exceeds the existing locked amount
          according to a minimum increment rule.
        </P>
        <P>
          The minimum increment rule prevents trivial displacement and excessive
          churn. By default, a new lock must exceed the prior lock by at least
          one percent or by a fixed minimum SOL increment, whichever is greater.
        </P>
        <P>
          When a displacement occurs, ownership transfers immediately. The
          previous owner receives exactly the amount of SOL originally locked. No
          penalties, proportional reductions, or slippage are applied to refunded
          principal.
        </P>
        <P>
          A small displacement fee may be applied to successful takeovers. This
          fee supports liquidity operations, covers execution costs, and
          discourages adversarial micro-bidding.
        </P>
        <P>
          The NFT metadata reverts to a neutral placeholder upon ownership
          transfer until the new owner finalizes their portrait.
        </P>
        <P>
          Ownership is therefore continuous and contestable. No participant
          forfeits capital; they forfeit position.
        </P>
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* 5. CAPITAL DEPLOYMENT AND YIELD ACCRUAL                    */}
      {/* ---------------------------------------------------------- */}
      <Section id="yield" number={5} title="Capital Deployment and Yield Accrual">
        <P>
          Locked SOL is deployed into liquid staking infrastructure in order to
          generate staking rewards. The majority of locked capital is converted
          into liquid staking tokens, while a configurable portion remains in a
          SOL liquidity buffer.
        </P>
        <P>
          The liquidity buffer ensures that displaced participants can be
          refunded instantly in SOL. When buffer levels fall below a defined
          threshold, batched swaps from liquid staking tokens back into SOL
          restore liquidity. Swaps are executed in aggregated batches to minimize
          slippage and transaction costs.
        </P>
        <P>
          Participants are guaranteed the return of exactly the amount of SOL
          they locked. Staking rewards generated during the lock period accrue
          exclusively to the Solazzo treasury.
        </P>
        <P>
          Revenue is therefore a function of total locked SOL, staking yield,
          and time. Sustainability derives from aggregate conviction rather than
          mint proceeds.
        </P>
        <P>
          Principal protection, yield segregation, and buffer solvency are core
          invariants of the system.
        </P>
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* 6. SETTLEMENT CONDITION                                    */}
      {/* ---------------------------------------------------------- */}
      <Section id="settlement" number={6} title="Settlement Condition">
        <P>
          Solazzo defines a terminal milestone at SOL reaching $1,000, as
          determined by a specified oracle feed.
        </P>
        <P>
          Upon confirmation, Solazzo enters a settled state. New locks and
          displacements are disabled. Each current owner may withdraw their
          locked SOL principal. A final liquidity rebalance ensures sufficient
          funds for withdrawals. Staking rewards accumulated up to this point
          remain in the Solazzo treasury.
        </P>
        <P>
          The settlement condition concludes the competitive phase. Capital is
          returned. Yield remains as the residue of time and belief.
        </P>
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* 7. PERSONALIZED PORTRAIT SYSTEM                            */}
      {/* ---------------------------------------------------------- */}
      <Section id="portraits" number={7} title="Personalized Portrait System">
        <P>
          Each Solazzo slot is visually represented by a personalized oil
          portrait derived from the current owner&rsquo;s headshot. Portrait
          generation is asynchronous and occurs off-chain.
        </P>
        <P>
          Upon acquiring a slot, the NFT displays a neutral placeholder. The
          owner may enter a portrait studio to generate a five-stage portrait
          set. Generation is permitted once per ownership cycle. If ownership is
          lost before finalization, the session becomes invalid.
        </P>
        <P>
          Headshot uploads are processed ephemerally and are not permanently
          stored. Only the finalized stylized outputs are retained. Portrait
          generation includes limited draft iterations per ownership cycle,
          followed by a single high-resolution finalization.
        </P>
        <P>
          The five portraits correspond to predefined narrative stages. All five
          are generated at finalization and stored in decentralized storage. The
          NFT dynamically displays the appropriate stage based on SOL price
          milestones.
        </P>
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* 8. THE FIVE-STAGE EVOLUTIONARY ARC                         */}
      {/* ---------------------------------------------------------- */}
      <Section id="stages" number={8} title="The Five-Stage Evolutionary Arc">
        <P>
          The portrait system encodes a structured psychological progression
          aligned with SOL price milestones. Each $200 increase in SOL advances
          the entire collection to the next stage.
        </P>

        <StageImage src="/stages/stage-1.png" alt="Stage I — The Humble Believer" />
        <P>
          <strong className="text-foreground">Stage I</strong>, below $200 SOL,
          presents the subject as a humble believer. Clothing is restrained.
          Ornamentation is minimal. The expression conveys quiet conviction
          rather than dominance.
        </P>

        <StageImage src="/stages/stage-2.png" alt="Stage II — Emerging Confidence" />
        <P>
          <strong className="text-foreground">Stage II</strong>, between $200 and
          $399 SOL, introduces subtle signals of improvement. Fabrics refine.
          Accessories appear. Posture becomes more upright. Confidence emerges.
        </P>

        <StageImage src="/stages/stage-3.png" alt="Stage III — Established Wealth" />
        <P>
          <strong className="text-foreground">Stage III</strong>, between $400 and
          $599 SOL, represents established wealth. Jewelry becomes explicit.
          Lighting intensifies. The subject appears accomplished and assured.
        </P>

        <StageImage src="/stages/stage-4.png" alt="Stage IV — Maximal Expression" />
        <P>
          <strong className="text-foreground">Stage IV</strong>, between $600 and
          $799 SOL, embodies maximal expression. Diamond grills, layered chains,
          and culturally recognizable accessories appear in their most theatrical
          form. Lighting becomes dramatic and flash-like. The portrait embraces
          spectacle and visible abundance.
        </P>

        <StageImage src="/stages/stage-5.png" alt="Stage V — Reflection" />
        <P>
          <strong className="text-foreground">Stage V</strong>, between $800 and
          $1,000 SOL, shifts the emotional register. The overt spectacle
          recedes. Ornamentation softens. The expression becomes contemplative.
          There is wisdom without sanctification, composure without triumph. The
          subject appears aware that accumulation does not resolve longing. Wealth
          has been experienced; excess has been performed; what remains is
          perspective.
        </P>

        <P>
          This final stage introduces maturity rather than infinite escalation.
          The arc mirrors market psychology: belief, growth, dominance, excess,
          and reflection.
        </P>
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* 9. LOCK AMOUNT AS AESTHETIC CEILING                        */}
      {/* ---------------------------------------------------------- */}
      <Section id="aesthetic-ceiling" number={9} title="Lock Amount as Aesthetic Ceiling">
        <P>
          Stage progression is determined by global SOL price and applies
          equally to every portrait in the collection. But within each stage,
          the amount of SOL locked by an individual owner determines the
          aesthetic ceiling of their specific portrait.
        </P>
        <P>
          This is not a cosmetic distinction. It is a design principle:
          conviction should be visible in the work itself. Two portraits
          rendered at Stage III may occupy the same narrative position &mdash;
          established wealth &mdash; while expressing it at different levels of
          refinement. A lower lock produces a portrait that is accomplished and
          assured. A higher lock produces one that is intricate, textured, and
          ornamented beyond the baseline.
        </P>
        <P>
          In practice, this means higher locked capital unlocks richer brushwork
          detail, rarer accessories, more complex layering of jewelry and
          fabric, and premium ornamentation tiers unavailable at lower amounts.
          At Stage IV, for example, a minimum lock renders diamond grills and
          chains in their standard theatrical form. A significantly higher lock
          adds iced-out watches, Solana-branded eyewear, and a more dramatic
          flash-lit composition with greater painterly complexity.
        </P>
        <P>
          Price determines narrative position. Locked capital determines
          stylistic refinement. The portrait is therefore a dual record: of
          where the market stands, and of how much the individual committed.
        </P>
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* 10. CULTURAL POSITIONING                                   */}
      {/* ---------------------------------------------------------- */}
      <Section id="culture" number={10} title="Cultural Positioning">
        <P>
          The decision to build Solazzo around Baroque and Renaissance oil
          portraiture was not aesthetic preference. It was conceptual precision.
        </P>
        <P>
          For centuries, the painted portrait was the primary technology of
          status. Commissioned by merchants, aristocrats, and rulers, these
          works performed a specific function: they made power legible,
          projected permanence, and transformed the transient accumulation of
          wealth into something that looked like it had always existed.
          Caravaggio, Rembrandt, Vel&aacute;zquez &mdash; the masters of this
          tradition were not simply skilled painters. They were the
          infrastructure through which elites constructed their public identity.
        </P>
        <P>
          Crypto participation involves a structurally similar impulse. Capital
          is committed to narratives that may or may not resolve. Identity
          becomes entangled with positions. Conviction is performed publicly,
          through wallets and social feeds, in ways that are simultaneously
          sincere and theatrical. The degen and the aristocrat are separated by
          four hundred years and a very different set of accessories, but they
          share the same underlying desire: to make belief visible, to have the
          external world reflect an internal commitment.
        </P>
        <P>
          Solazzo takes this seriously rather than laughing at it. The visual
          language &mdash; chiaroscuro lighting, dark backgrounds, cracked-canvas
          texture, psychologically charged expressions &mdash; is applied without
          irony to subjects wearing diamond grills, iced-out watches, and
          Solana-branded eyewear. The result is controlled irony rather than
          parody. The portraits are not making fun of crypto culture by dressing
          it in classical clothing. They are asking what it looks like when the
          oldest tradition of status portraiture encounters the newest. The
          answer, it turns out, is not absurd. It is strangely coherent.
        </P>
        <P>
          This coherence is what makes the format work as identity. A cartoon
          avatar signals community membership. A Baroque oil portrait derived
          from your own likeness signals something else &mdash; a claim to
          permanence, a willingness to be rendered seriously, a particular
          relationship to your own conviction. Holders who adopt their portrait
          as their PFP are not being ironic. They are using the oldest tool in
          the status repertoire, updated for the current moment.
        </P>
        <P>
          The style also provides durability. Trends in generative art move
          fast. The Baroque does not. A portrait painted in this tradition in
          2026 will not look dated in 2030 in the way a pixelated avatar or a
          procedurally generated cartoon might. The oil painting format anchors
          Solazzo in a visual tradition with historical depth rather than
          cycle-dependent aesthetics.
        </P>
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* 11. CONCLUSION                                             */}
      {/* ---------------------------------------------------------- */}
      <Section id="conclusion" number={11} title="Conclusion">
        <P>
          Solazzo introduces a conviction-based NFT collection in which
          ownership is dynamic, principal is protected, yield sustains the
          system, and identity evolves with market conditions.
        </P>
        <P>
          The NFT is not a static collectible. It is a live staking position
          rendered as an evolving portrait. Conviction is quantified
          economically and expressed visually. The system encodes exposure,
          escalation, and reflection into deterministic rules.
        </P>
        <P>
          <em>
            Ownership is temporary. Conviction is continuous. Wealth is
            narrative rather than endpoint.
          </em>
        </P>
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* 12. BUILT FOR COLLABORATORS                                */}
      {/* ---------------------------------------------------------- */}
      <Section id="collaborators" number={12} title="Built For Collaborators">
        <P>
          Solazzo is in active development. The implementation spans smart
          contract engineering, AI portrait generation, and frontend
          design &mdash; and the quality of each depends on the people who
          build it.
        </P>
        <P>
          If you are reading this document as a potential collaborator, this is
          what the project requires:
        </P>
        <P>
          <strong className="text-foreground">On the technical side:</strong> a
          Solana smart contract engineer fluent in Rust and Anchor to own the
          lock-to-own mechanism, liquid staking integration, and on-chain
          security; a full-stack engineer to build the wallet-connected
          frontend, portrait studio, and metadata engine; and an AI/ML engineer
          experienced with diffusion models, LoRA training, and face
          preservation techniques to develop the portrait generation pipeline.
        </P>
        <P>
          <strong className="text-foreground">On the creative side:</strong> an
          art director or painter with a genuine relationship to Baroque and
          Renaissance oil painting who can define the visual language
          systematically, curate the training dataset, and ensure that the
          aesthetic holds across five stages and thousands of unique portraits.
        </P>
        <P>
          The project brief, implementation plan, and reference images are
          available on request.
        </P>
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* FOOTER                                                     */}
      {/* ---------------------------------------------------------- */}
      <footer className="border-t border-muted/20 mt-16 pt-8 text-xs text-muted/50 space-y-2">
        <a
          href="https://solazzo.fun"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-muted transition-colors"
        >
          solazzo.fun
        </a>
        <p>Built on Solana</p>
      </footer>
    </main>
  );
}

/* ---------------------------------------------------------------- */
/* Reusable components — kept in the same file intentionally.       */
/* This is a document, not an app.                                  */
/* ---------------------------------------------------------------- */

function Section({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-14">
      <h2 className="text-xs uppercase tracking-widest text-muted/60 mb-1">
        {number}.
      </h2>
      <h3 className="text-base font-medium text-foreground mb-5">{title}</h3>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-foreground/70 leading-relaxed mb-4">{children}</p>;
}

function StageImage({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="my-8">
      <Image
        src={src}
        alt={alt}
        width={400}
        height={400}
        className="w-full max-w-[400px] mx-auto block"
      />
      <figcaption className="text-xs text-muted/50 text-center mt-3">
        {alt}
      </figcaption>
    </figure>
  );
}

function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul className="text-sm text-foreground/70 leading-relaxed mb-4 ml-4 space-y-1 list-disc list-outside">
      {children}
    </ul>
  );
}
