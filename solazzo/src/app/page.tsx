import Image from "next/image";

export default function Home() {
  return (
    <main className="max-w-[640px] mx-auto px-6 py-16 sm:py-24">
      {/* ---------------------------------------------------------- */}
      {/* HOOK                                                       */}
      {/* ---------------------------------------------------------- */}
      <div className="mb-20 sm:mb-28">
        <p className="text-2xl sm:text-3xl font-normal leading-snug text-foreground mb-8">
          Solana is trading under $100. This collection settles when it
          hits $1,000.
        </p>
        <p className="text-base text-muted leading-relaxed">
          Lock SOL into one of 1,000 slots. Receive an AI-generated Baroque oil
          portrait of your own face &mdash; one that evolves through five stages
          as the price of SOL climbs toward a thousand dollars. Your capital is
          never spent. It stays locked until someone outbids you or the
          settlement condition is met. Either way, you get every SOL back. The
          only thing you can lose is your position.
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
          Whitepaper v1 &mdash; Conviction-Based Identity on Solana
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
          <li><a href="#faq" className="hover:text-foreground transition-colors">Frequently Asked Questions</a></li>
        </ol>
      </nav>

      {/* ---------------------------------------------------------- */}
      {/* 1. ABSTRACT                                                */}
      {/* ---------------------------------------------------------- */}
      <Section id="abstract" number={1} title="Abstract">
        <P>
          Solazzo takes its name from the Italian word <em>sollazzo</em> &mdash;
          delight, amusement &mdash; fused with SOL, the native token of
          Solana. The name captures the spirit of the collection: a place where
          conviction meets spectacle, where financial commitment becomes
          personal identity, and where the oldest traditions of portraiture
          collide with the newest forms of digital ownership.
        </P>
        <P>
          Solazzo is built on a single premise: that Solana will reach $1,000.
        </P>
        <P>
          The collection consists of exactly 1,000 NFT slots on Solana &mdash; a
          number chosen deliberately, not arbitrarily. One thousand is scarce
          enough to be meaningful, large enough to form a community, and
          resonant with the price target that governs the entire system. Each
          slot is claimed not through a mint price but through locked capital.
          You don&rsquo;t buy a Solazzo &mdash; you commit to one by locking SOL
          into a smart contract. The participant who has locked the most SOL to a
          given slot owns it. Anyone may challenge for ownership at any time by
          committing a greater amount. The displaced owner receives a full and
          immediate refund of their principal. No capital is lost. Only position.
        </P>
        <P>
          This structure means that participation is not a purchase but a
          continuous act of conviction. You are not buying an NFT at a fixed
          price and hoping it appreciates. You are locking capital into a system
          that treats $1,000 SOL as a terminal milestone &mdash; and you remain
          exposed until that milestone is reached or until someone displaces you
          by committing more. At today&rsquo;s prices, that is roughly an
          11&times; bet. It is, by design, an unreasonable position to hold. The
          collection exists for the people who hold it anyway.
        </P>
        <P>
          Locked SOL is deployed into liquid staking infrastructure, generating
          yield that accrues to the Solazzo treasury. Principal is never spent
          or consumed &mdash; it is returned in full upon displacement or
          settlement. Each slot is visually represented by a
          personalized, AI-generated oil portrait derived from the
          owner&rsquo;s own likeness. The portrait evolves across five stages
          tied to SOL price milestones, forming a narrative arc from humble
          belief through excess to reflective maturity. The visual language is
          rooted in the Baroque and Renaissance oil painting
          tradition &mdash; chiaroscuro lighting, dark backgrounds, textured
          brushwork &mdash; but the symbols of power are contemporary. Subjects
          wear diamond grills, iced-out watches, and Solana-branded eyewear. The
          result is controlled irony rather than parody: portraits that feel both
          timeless and unmistakably of this moment.
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
          Solazzo formalizes that condition &mdash; and ties it to a specific,
          falsifiable thesis.
        </P>
        <P>
          The thesis is that Solana will reach $1,000. Whether that takes one
          year or ten, whether it happens through gradual adoption or a parabolic
          cycle, the collection is structured around this single future state.
          Everything that happens before settlement &mdash; the locking, the
          displacement, the portrait evolution &mdash; occurs in the space
          between belief and realization. Participants are not expressing a vague
          optimism about crypto. They are making a quantified bet that most
          people, looking at current prices, would consider irrational.
        </P>
        <P>
          That is precisely the point. Conviction is only interesting when it is
          costly, when it requires holding a position that the prevailing
          consensus considers wrong. Solazzo does not reward passive holding.
          Ownership must be continuously defended. Capital is locked, not spent.
          Displacement is always possible. The cost of ownership is the
          opportunity cost of liquidity and the risk of being outbid.
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
          Solazzo defines a terminal milestone: SOL reaching $1,000, as
          determined by a specified oracle feed.
        </P>
        <P>
          This is not an arbitrary number. It is a psychological and economic
          threshold &mdash; roughly an order of magnitude above current
          prices &mdash; that represents a conviction about Solana&rsquo;s
          long-term position in the broader financial system. The entire
          collection is structured as a wager that this milestone will eventually
          be reached. Every portrait, every displacement, every SOL locked into
          the contract exists in the interval between now and that moment.
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
          Each Solazzo NFT slot is visually represented by a personalized oil
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
          <strong className="text-foreground">Stage I &mdash; Humble Believer</strong>{" "}
          <span className="text-muted/50">Below $200 SOL</span>
        </P>
        <P>
          The subject is presented as a humble believer. Clothing is restrained.
          Ornamentation is minimal. The expression conveys quiet conviction
          rather than dominance.
        </P>

        <StageImage src="/stages/stage-2.png" alt="Stage II — Rising Confidence" />
        <P>
          <strong className="text-foreground">Stage II &mdash; Rising Confidence</strong>{" "}
          <span className="text-muted/50">$200&ndash;$399 SOL</span>
        </P>
        <P>
          Subtle signals of improvement emerge. Fabrics refine. Accessories
          appear. Posture becomes more upright. Confidence emerges.
        </P>

        <StageImage src="/stages/stage-3.png" alt="Stage III — Established Wealth" />
        <P>
          <strong className="text-foreground">Stage III &mdash; Established Wealth</strong>{" "}
          <span className="text-muted/50">$400&ndash;$599 SOL</span>
        </P>
        <P>
          Established wealth is represented. Jewelry becomes explicit. Lighting
          intensifies. The subject appears accomplished and assured.
        </P>

        <StageImage src="/stages/stage-4.png" alt="Stage IV — Maximum Excess" />
        <P>
          <strong className="text-foreground">Stage IV &mdash; Maximum Excess</strong>{" "}
          <span className="text-muted/50">$600&ndash;$799 SOL</span>
        </P>
        <P>
          Maximal expression is embodied. Diamond grills, layered chains, and
          culturally recognizable accessories appear in their most theatrical
          form. Lighting becomes dramatic and flash-like. The portrait embraces
          spectacle and visible abundance.
        </P>

        <StageImage src="/stages/stage-5.png" alt="Stage V — Reflective Maturity" />
        <P>
          <strong className="text-foreground">Stage V &mdash; Reflective Maturity</strong>{" "}
          <span className="text-muted/50">$800&ndash;$1,000 SOL</span>
        </P>
        <P>
          The emotional register shifts. The overt spectacle recedes.
          Ornamentation softens. The expression becomes contemplative. There is
          wisdom without sanctification, composure without triumph. The subject
          appears aware that accumulation does not resolve longing. Wealth has
          been experienced; excess has been performed; what remains is
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
          The visual language of Solazzo draws from Renaissance and Baroque oil
          painting traditions &mdash; chiaroscuro lighting, textured brushwork,
          dark backgrounds, and psychologically charged expressions. These
          techniques historically depicted figures of importance, nobility, and
          myth.
        </P>
        <P>
          Solazzo juxtaposes this classical aesthetic with contemporary crypto
          iconography and degen symbolism. Diamond-set grills, iced-out watches,
          ecosystem-referential eyewear, and other modern signifiers are
          integrated proportionally within classical composition.
        </P>
        <P>
          The result is controlled irony rather than parody. The portraits are
          timeless yet contemporary. They reflect the duality of crypto
          participation: solemn belief intertwined with speculative spectacle.
        </P>
        <P>
          By allowing participants to generate portraits derived from their own
          likeness, Solazzo increases the likelihood that holders will adopt the
          NFT as their public identity. The oil painting format anchors the
          system in a visual tradition with historical durability rather than
          trend-based cartoon aesthetics.
        </P>
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* 11. CONCLUSION                                             */}
      {/* ---------------------------------------------------------- */}
      <Section id="conclusion" number={11} title="Conclusion">
        <P>
          Solazzo introduces a conviction-based NFT primitive in which ownership
          is dynamic, principal is protected, yield sustains the system, and
          identity evolves with market conditions.
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
      {/* 12. FREQUENTLY ASKED QUESTIONS                             */}
      {/* ---------------------------------------------------------- */}
      <Section id="faq" number={12} title="Frequently Asked Questions">
        <FaqItem question="Do I earn staking rewards on my locked SOL?">
          No. The staking yield generated by your locked SOL accrues to the
          Solazzo treasury, not to you individually. This is how the project
          sustains itself &mdash; there is no mint price, no royalty structure,
          and no token. Staking yield is the sole revenue model. Your return is
          not denominated in yield. It is denominated in conviction. You lock SOL
          at today&rsquo;s prices, and when the thesis resolves &mdash; either
          through displacement or settlement at $1,000 &mdash; you receive that
          same SOL back, at whatever it is then worth. The opportunity cost of
          foregone staking rewards is real, but it is small relative to the
          magnitude of the underlying bet. Solana&rsquo;s current staking yield
          is approximately 4% and declining annually toward a terminal rate of
          roughly 1.5%. If SOL goes from $86 to $1,000, the staking yield you
          did not earn along the way is rounding error on an
          11&times; move.
        </FaqItem>

        <FaqItem question="Can I get my SOL back at any time?">
          No. That is the point. Your SOL is locked until one of two things
          happens: someone displaces you by locking a greater amount into your
          slot, or SOL reaches $1,000 and the collection settles. In either
          case, you receive exactly the amount you originally locked &mdash; no
          penalties, no slippage, no reductions. But you cannot simply decide to
          withdraw because you got nervous. The mechanism is designed to make
          conviction binding. If you could leave whenever you wanted, it would
          not be conviction &mdash; it would be a savings account.
        </FaqItem>

        <FaqItem question="What happens if SOL never reaches $1,000?">
          Your SOL remains locked until you are displaced. If no one ever
          outbids you and SOL never reaches $1,000, your capital stays in the
          contract. This is the real cost of conviction &mdash; not the SOL
          itself (which is never consumed), but the liquidity you forfeit while
          holding the position. The system does not pretend this risk away. It
          prices it in. You are making a bet, and the bet has duration. The
          question is not whether you can afford to lose the SOL &mdash; you
          cannot lose it. The question is whether you can afford to have it
          locked while the world changes around you.
        </FaqItem>

        <FaqItem question="Why only 1,000 slots?">
          The scarcity is structural, not cosmetic. One thousand slots means
          ownership is genuinely competitive &mdash; there is a finite number of
          positions and anyone can be displaced. It also means the collection can
          sustain cultural coherence. A 10,000-piece generative collection
          dilutes identity. One thousand portraits, each derived from a real
          person&rsquo;s likeness and painted in a consistent Baroque style, form
          something closer to a gallery than a drop. The number also rhymes with
          the price target. One thousand slots. One thousand dollars.
        </FaqItem>

        <FaqItem question="Is my face stored somewhere?">
          No. Headshot uploads are processed ephemerally during the portrait
          generation session. The raw photograph is used only to extract a facial
          embedding for the AI model and is never permanently stored. Once your
          five-stage portrait set is finalized, only the stylized oil paintings
          are retained &mdash; uploaded to Arweave for permanent decentralized
          storage. The original headshot is discarded. Solazzo never holds,
          sells, or shares your biometric data.
        </FaqItem>

        <FaqItem question="What if I don't like my portrait?">
          Each ownership cycle includes a limited number of draft iterations
          before finalization. You can preview and regenerate your portrait
          within that allowance. Once you finalize, the five-stage set is
          committed to decentralized storage and becomes the permanent visual
          representation of your slot. If you are displaced and later reclaim the
          slot (or claim a new one), a fresh portrait session begins.
        </FaqItem>

        <FaqItem question="What happens to my portrait if I get displaced?">
          Your portrait is removed from the slot. The NFT reverts to a neutral
          placeholder until the new owner generates their own portrait. Your
          finalized images remain on Arweave &mdash; they are permanently stored
          and accessible &mdash; but they are no longer displayed as the active
          representation of that slot.
        </FaqItem>

        <FaqItem question="Can I choose which slot I want?">
          Yes. You can claim any unowned slot or challenge any owned slot by
          locking a greater amount of SOL. There is no random assignment. Slot
          selection is a deliberate act.
        </FaqItem>

        <FaqItem question="What determines how detailed or ornate my portrait is?">
          Two factors. First, the global SOL price determines your <em>stage</em>{" "}
          &mdash; which of the five evolutionary phases your portrait displays.
          Second, your individual lock amount determines the <em>aesthetic
          ceiling</em> within that stage. Two holders at the same stage may have
          different levels of refinement &mdash; richer textures, rarer
          accessories, more intricate brushwork &mdash; based on how much SOL
          they have committed. Price determines narrative position. Locked
          capital determines stylistic depth.
        </FaqItem>

        <FaqItem question="Is this a security? Am I investing?">
          Solazzo is not an investment product and does not promise financial
          returns. You lock SOL and receive it back in exactly the same quantity
          upon displacement or settlement. There is no token, no equity, no
          profit-sharing arrangement, and no expectation of profit derived from
          the efforts of others. Staking yield accrues to the
          treasury as payment for the infrastructure, portrait generation, and
          operational costs of the system &mdash; not as a return distributed to
          participants. Solazzo is a collection, not a fund. That said, this
          document is not legal advice and participants should evaluate their own
          regulatory context.
        </FaqItem>

        <FaqItem question="What blockchain is this on? Why Solana?">
          Solana. The choice is not incidental &mdash; it is the thesis. The
          collection&rsquo;s entire economic structure is built around the belief
          that SOL will reach $1,000. Solana also provides the transaction speed,
          low fees, and composability that make the lock-and-displace mechanic
          practical at scale. A displacement must settle instantly and cheaply.
          Solana makes that possible.
        </FaqItem>

        <FaqItem question="How is the $1,000 settlement price verified?">
          The SOL/USD price is consumed from Pyth Network&rsquo;s on-chain
          oracle feed. Settlement requires the price to be sustained above
          $1,000 for a confirmation window &mdash; multiple consecutive oracle
          updates &mdash; to prevent flash spikes or manipulation from triggering
          a premature conclusion.
        </FaqItem>
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

function FaqItem({
  question,
  children,
}: {
  question: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <p className="text-sm font-medium text-foreground mb-2">{question}</p>
      <p className="text-sm text-foreground/70 leading-relaxed">{children}</p>
    </div>
  );
}
