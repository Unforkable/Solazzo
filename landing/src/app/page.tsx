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
          AI-generated oil portrait in the Baroque tradition. Any of them can be
          displaced at any time by someone willing to lock more. The displaced
          party receives a full refund. No capital is lost. Only position.
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
          Whitepaper v1 &mdash; A Conviction-Based NFT Identity Protocol on Solana
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
        </ol>
      </nav>

      {/* ---------------------------------------------------------- */}
      {/* 1. ABSTRACT                                                */}
      {/* ---------------------------------------------------------- */}
      <Section id="abstract" number={1} title="Abstract">
        <P>
          This protocol introduces a new NFT primitive in which ownership is
          earned and maintained through locked capital rather than purchased
          through a fixed mint price. Participants acquire and defend one of
          1,000 NFT slots by locking SOL into a smart contract. At any moment,
          the owner of a slot is the participant who has committed the highest
          amount of SOL to that slot.
        </P>
        <P>
          Locked capital remains fully refundable. Upon displacement or protocol
          settlement, participants receive exactly the amount of SOL originally
          locked. The protocol deploys locked capital into liquid staking
          infrastructure, capturing staking yield while preserving principal
          guarantees. All staking rewards accrue to the protocol treasury.
        </P>
        <P>
          Each NFT slot is represented by a personalized, AI-generated oil
          portrait derived from the current owner&rsquo;s headshot. The portrait
          evolves across five predefined stages tied to SOL price milestones,
          forming a narrative arc from humble belief through excess to reflective
          realization.
        </P>
        <P>
          The protocol unifies economic conviction, social signaling, and
          narrative progression into a single system. Ownership is dynamic.
          Identity is personalized. Wealth is expressed visually but ultimately
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
          This protocol formalizes that condition.
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
          The protocol consists of 1,000 NFT slots deployed on Solana. Each slot
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
          Ownership of a slot is established by locking SOL into the protocol
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
          exclusively to the protocol treasury.
        </P>
        <P>
          Protocol revenue is therefore a function of total locked SOL, staking
          yield, and time. Sustainability derives from aggregate conviction
          rather than mint proceeds.
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
          The protocol defines a terminal milestone at SOL reaching $1,000, as
          determined by a specified oracle feed.
        </P>
        <P>
          Upon confirmation, the protocol enters a settled state. New locks and
          displacements are disabled. Each current owner may withdraw their
          locked SOL principal. A final liquidity rebalance ensures sufficient
          funds for withdrawals. Staking rewards accumulated up to this point
          remain in the protocol treasury.
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
          Each NFT slot is visually represented by a personalized oil portrait
          derived from the current owner&rsquo;s headshot. Portrait generation is
          asynchronous and occurs off-chain.
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
        <P>
          <strong className="text-foreground">Stage I</strong>, below $200 SOL,
          presents the subject as a humble believer. Clothing is restrained.
          Ornamentation is minimal. The expression conveys quiet conviction
          rather than dominance.
        </P>
        <P>
          <strong className="text-foreground">Stage II</strong>, between $200 and
          $399 SOL, introduces subtle signals of improvement. Fabrics refine.
          Accessories appear. Posture becomes more upright. Confidence emerges.
        </P>
        <P>
          <strong className="text-foreground">Stage III</strong>, between $400 and
          $599 SOL, represents established wealth. Jewelry becomes explicit.
          Lighting intensifies. The subject appears accomplished and assured.
        </P>
        <P>
          <strong className="text-foreground">Stage IV</strong>, between $600 and
          $799 SOL, embodies maximal expression. Diamond grills, layered chains,
          and culturally recognizable accessories appear in their most theatrical
          form. Lighting becomes dramatic and flash-like. The portrait embraces
          spectacle and visible abundance.
        </P>
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
          While stage progression is determined by global SOL price, the amount
          of SOL locked by an individual owner determines the aesthetic ceiling
          within each stage.
        </P>
        <P>
          Higher lock amounts unlock richer textures, rarer accessories, more
          intricate details, and premium ornamentation tiers. Two participants at
          the same stage may display different levels of refinement based on
          their locked capital.
        </P>
        <P>
          Price determines narrative position. Locked capital determines
          stylistic refinement.
        </P>
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* 10. CULTURAL POSITIONING                                   */}
      {/* ---------------------------------------------------------- */}
      <Section id="culture" number={10} title="Cultural Positioning">
        <P>
          The visual language draws from Renaissance and Baroque oil painting
          traditions&mdash;chiaroscuro lighting, textured brushwork, dark
          backgrounds, and psychologically charged expressions. These techniques
          historically depicted figures of importance, nobility, and myth.
        </P>
        <P>
          The protocol juxtaposes this classical aesthetic with contemporary
          crypto iconography and degen symbolism. Diamond-set grills, iced-out
          watches, ecosystem-referential eyewear, and other modern signifiers are
          integrated proportionally within classical composition.
        </P>
        <P>
          The result is controlled irony rather than parody. The portraits are
          timeless yet contemporary. They reflect the duality of crypto
          participation: solemn belief intertwined with speculative spectacle.
        </P>
        <P>
          By allowing participants to generate portraits derived from their own
          likeness, the protocol increases the likelihood that holders will adopt
          the NFT as their public identity. The oil painting format anchors the
          system in a visual tradition with historical durability rather than
          trend-based cartoon aesthetics.
        </P>
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* 11. CONCLUSION                                             */}
      {/* ---------------------------------------------------------- */}
      <Section id="conclusion" number={11} title="Conclusion">
        <P>
          This protocol introduces a conviction-based NFT primitive in which
          ownership is dynamic, principal is protected, yield sustains the
          system, and identity evolves with market conditions.
        </P>
        <P>
          The NFT is not a static collectible. It is a live staking position
          rendered as an evolving portrait. Conviction is quantified economically
          and expressed visually. The system encodes exposure, escalation, and
          reflection into deterministic rules.
        </P>
        <P>
          Ownership is temporary. Conviction is continuous. Wealth is narrative
          rather than endpoint.
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

function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul className="text-sm text-foreground/70 leading-relaxed mb-4 ml-4 space-y-1 list-disc list-outside">
      {children}
    </ul>
  );
}
