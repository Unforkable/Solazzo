# SOLAZZO — Trait System & Prompt Assembly Specification

**Version 1.0 — March 2026 | CONFIDENTIAL**

---

## 1. Overview

This document defines the complete trait system for Solazzo portrait generation. It specifies every trait category, the item pool per stage, probability weights, prompt fragments for each item, and the rules governing how traits are assembled into final image generation prompts.

The system is designed so that each portrait is unique, visually interesting, and narratively coherent with its stage. Traits are resolved at generation time through weighted random selection, producing emergent rarity across the collection.

### 1.1 Design Principles

**Wealth is always visible from Stage II onward.** Mandatory wealth markers (wrist, chains, earrings, rings, grillz) are always present from Stage II+. There is no "nothing" roll for these categories past Stage I. The escalation of wealth must be immediately legible across stages.

**The Baroque is the painting style, not the subject matter.** Every trait item is contemporary — streetwear, hip-hop jewelry, tech culture, crypto iconography, luxury fashion. These objects are rendered in oil paint with chiaroscuro lighting, impasto texture, and aged varnish. The contrast between classical technique and modern subject is the core visual identity.

**Absurdity is a feature.** Some traits are deliberately strange (holding a goose, a rubber duck, a baguette). These items are rare and stage-independent. They create the viral, shareable moments that drive cultural adoption. A Stage V contemplative portrait holding a fish is peak Solazzo.

**Mood and composition matter more than accessories.** Lighting setup, pose, expression, and atmosphere are rolled independently and are responsible for making each portrait feel like a painting rather than an AI headshot with items pasted on.

**Stage V pulls back, it does not escalate.** The final stage replaces excess with restraint. Wealth markers are understated but clearly expensive. The mood shifts to contemplation. The absence of spectacle is the statement.

---

## 2. Trait Categories

Traits are divided into two types: mandatory wealth markers that are always present from Stage II onward, and optional flavor traits that may resolve to "nothing" at any stage.

### 2.1 Mandatory Wealth Markers

These categories MUST produce a visible item from Stage II onward. At Stage I, "nothing" is permitted and common. The items escalate in value and ostentation across stages, with Stage V pulling back to refined restraint.

#### 2.1.1 Wrist / Watch

Mandatory from Stage II. The wrist is one of the most visible wealth indicators in the portrait composition, often catching light in the lower portion of the frame.

| Item | Rarity | Weight % | Stage |
|------|--------|----------|-------|
| Nothing | N/A | 55% | I only |
| Casio F-91W | Common | 15% | I |
| Mickey Mouse watch | Uncommon | 10% | I |
| Rubber wristband | Common | 10% | I |
| Friendship bracelet (frayed) | Uncommon | 10% | I |
| G-Shock | Common | 30% | II |
| Seiko diver on NATO strap | Common | 25% | II |
| Leather strap field watch | Common | 25% | II |
| Simple silver bangle | Uncommon | 10% | II |
| Beaded bracelet stack | Uncommon | 10% | II |
| Tag Heuer Carrera | Common | 25% | III |
| Omega Seamaster | Common | 25% | III |
| Gold link bracelet | Common | 20% | III |
| Designer smartwatch (gold) | Uncommon | 15% | III |
| Stacked gold bangles | Uncommon | 15% | III |
| Iced-out AP Royal Oak | Rare | 25% | IV |
| Diamond Rolex Day-Date | Rare | 25% | IV |
| Stacked Cartier Love bracelets | Uncommon | 15% | IV |
| Diamond cuff bracelet | Rare | 15% | IV |
| Two watches on one wrist | Legendary | 10% | IV |
| Richard Mille (transparent) | Legendary | 10% | IV |
| Vintage Patek Philippe Calatrava | Rare | 30% | V |
| Cartier Tank (leather) | Rare | 30% | V |
| Single gold bangle (thin) | Common | 20% | V |
| Bare wrist with tan line | Legendary | 10% | V |
| Understated platinum cuff | Uncommon | 10% | V |

**Prompt fragment examples:**

- **Casio F-91W (Stage I):** "A modest, inexpensive black digital watch is visible on the wrist — basic practical style, matte resin strap — partially swallowed by shadow with no shine, no luxury cues, and no emphasis."
- **Iced-out AP Royal Oak (Stage IV):** "A diamond-encrusted Audemars Piguet Royal Oak dominates the wrist, every facet of the octagonal bezel refracting warm highlights against cold stone — ostentatious, unapologetic, the metal rendered with thick impasto to suggest weight and excess, light catching each diamond individually."
- **Vintage Patek Philippe (Stage V):** "A clean vintage Patek Philippe Calatrava sits quietly on the wrist — thin gold case, cream dial barely visible, leather strap softened by years of wear. No diamonds, no flash. The kind of watch that announces nothing but costs everything. Rendered with restrained brushwork, catching only a whisper of warm light."
- **Bare wrist with tan line (Stage V):** "The wrist is bare — but a faint tan line where a watch once sat is visible in the warm light, a ghost of something removed. The absence is deliberate, painted with the same care as presence."

#### 2.1.2 Chains / Neckpiece

Mandatory from Stage II. Chains are the primary vertical wealth signifier, drawing the eye from the face down through the composition. Light catching on chain links is a key visual effect in the Baroque lighting setup.

| Item | Rarity | Weight % | Stage |
|------|--------|----------|-------|
| Nothing | N/A | 50% | I only |
| Thin cheap chain (tarnished) | Common | 15% | I |
| Shell necklace | Uncommon | 10% | I |
| Dog tags | Common | 15% | I |
| String pendant (homemade) | Uncommon | 10% | I |
| Thin gold chain | Common | 30% | II |
| Simple pendant on cord | Common | 25% | II |
| Silver Cuban link (slim) | Common | 25% | II |
| Leather cord with charm | Uncommon | 10% | II |
| Beaded necklace | Uncommon | 10% | II |
| Gold Cuban link (medium) | Common | 25% | III |
| Layered thin gold chains | Common | 25% | III |
| Gold rope chain | Common | 20% | III |
| Medallion pendant (gold) | Uncommon | 15% | III |
| Ledger hardware wallet on chain | Rare | 15% | III |
| Massive Cuban link | Rare | 20% | IV |
| Layered heavy chains (3+) | Rare | 20% | IV |
| Oversized Solana logo pendant | Uncommon | 15% | IV |
| Diamond choker | Rare | 15% | IV |
| Chains over chains over chains | Legendary | 15% | IV |
| Ledger wallet on diamond chain | Legendary | 15% | IV |
| Single refined gold chain (thin) | Common | 30% | V |
| Thin platinum chain | Common | 30% | V |
| One meaningful pendant (simple) | Uncommon | 25% | V |
| Bare neck with chain indent | Legendary | 15% | V |

**Prompt fragment examples:**

- **Thin gold chain (Stage II):** "A thin gold chain is just visible at the collar, catching a single thread of warm light against the shadow of the neck — modest but deliberate, the first quiet assertion of something earned."
- **Massive Cuban link (Stage IV):** "A massive gold Cuban link chain commands the chest, each link rendered as a thick impasto ridge catching light like a row of small suns — the chain's weight implied through the way fabric pulls beneath it, shadow pooling in the gaps between links."
- **Bare neck with chain indent (Stage V):** "The neck is bare, but a faint indentation where heavy chains once rested is visible in the warm side-light — skin slightly compressed, a memory of weight carried and set down."

#### 2.1.3 Earrings

Mandatory from Stage II. Earrings catch light near the face and are critical for creating visual interest in the portrait's focal area. In Baroque lighting, a single diamond stud can become a brilliant point of light against deep shadow.

| Item | Rarity | Weight % | Stage |
|------|--------|----------|-------|
| Nothing | N/A | 60% | I only |
| Single tiny stud (silver) | Common | 20% | I |
| Cheap small hoop | Common | 20% | I |
| Single diamond stud | Common | 30% | II |
| Small hoops (silver) | Common | 25% | II |
| Both ears basic studs | Common | 25% | II |
| Single cross earring (small) | Uncommon | 20% | II |
| Diamond studs both ears | Common | 30% | III |
| Medium gold hoops | Common | 25% | III |
| Designer earrings | Uncommon | 20% | III |
| Pearl drop earring | Uncommon | 15% | III |
| Cross earring (gold) | Uncommon | 10% | III |
| Massive diamond studs | Rare | 25% | IV |
| Oversized gold hoops | Uncommon | 20% | IV |
| Dangly diamond cross | Rare | 20% | IV |
| AirPod in one ear + diamond other | Legendary | 15% | IV |
| Chandelier earrings (diamond) | Rare | 20% | IV |
| Single quality solitaire diamond | Common | 35% | V |
| Small refined gold hoop | Common | 30% | V |
| Pearl stud | Uncommon | 20% | V |
| Bare ear with piercing hole visible | Legendary | 15% | V |

#### 2.1.4 Rings

Mandatory from Stage II. Rings are visible when hands appear in the composition (which is common given pose variations). They add detail to the lower frame and create points of reflected light.

| Item | Rarity | Weight % | Stage |
|------|--------|----------|-------|
| Nothing | N/A | 60% | I only |
| Single cheap ring | Common | 15% | I |
| Mood ring | Uncommon | 15% | I |
| Rubber band as ring | Common | 10% | I |
| Single silver band | Common | 30% | II |
| Signet ring (silver) | Common | 30% | II |
| Simple gold ring | Common | 25% | II |
| Class ring | Uncommon | 15% | II |
| Gold signet ring | Common | 25% | III |
| Diamond ring (single stone) | Common | 25% | III |
| Stacked rings on one finger | Uncommon | 25% | III |
| Pinky ring (gold) | Uncommon | 25% | III |
| Rings on every finger | Rare | 25% | IV |
| Massive diamond ring | Rare | 25% | IV |
| Knuckle rings (connected) | Rare | 20% | IV |
| Championship-style ring | Legendary | 15% | IV |
| Sovereign ring (oversized gold) | Uncommon | 15% | IV |
| Single meaningful signet (gold) | Common | 35% | V |
| Refined wedding-style band | Common | 30% | V |
| One stone ring (understated) | Uncommon | 20% | V |
| Bare fingers with ring tan lines | Legendary | 15% | V |

#### 2.1.5 Grillz

Optional at Stages I-II, mandatory from Stage III onward. Grillz are the most distinctly "Solazzo" trait — nothing says "contemporary wealth rendered in oil paint" more than diamond teeth catching candlelight. The visibility depends on expression rolls (closed mouth hides grillz).

| Item | Rarity | Weight % | Stage |
|------|--------|----------|-------|
| Nothing | N/A | 90% | I |
| Single gold cap (one tooth) | Uncommon | 10% | I |
| Nothing | N/A | 60% | II |
| Single gold cap | Common | 20% | II |
| Subtle bottom row (gold) | Uncommon | 20% | II |
| Gold bottom set | Common | 30% | III |
| Silver full set | Common | 25% | III |
| Diamond accent bottom | Uncommon | 25% | III |
| Gold with gap design | Uncommon | 20% | III |
| Full diamond top and bottom | Rare | 25% | IV |
| Rainbow grillz (multicolor gems) | Rare | 20% | IV |
| Fanged diamond grillz | Legendary | 15% | IV |
| Solana logo engraved in gold | Legendary | 15% | IV |
| Gold and emerald set | Rare | 15% | IV |
| Open-face diamond grillz | Rare | 10% | IV |
| Single gold tooth (subtle) | Common | 35% | V |
| Subtle platinum set | Uncommon | 30% | V |
| Refined thin gold set | Uncommon | 20% | V |
| Bare teeth (grillz removed, marks visible) | Legendary | 15% | V |

**Prompt fragment examples:**

- **Full diamond grillz (Stage IV):** "A full set of diamond grillz covers upper and lower teeth, each stone individually rendered as a point of brilliant white light against the warm gold setting — the mouth becomes a constellation, overwhelming and theatrical, painted with the same precision a Dutch master would give to a string of pearls."
- **Single gold tooth (Stage V):** "A single gold cap on a lower canine catches the faintest edge of warm light — almost missed, a remnant of louder times, painted with one confident brushstroke."

---

### 2.2 Optional Flavor Traits

"Nothing" is a valid and often common outcome for these categories at every stage. These traits add personality, humor, and uniqueness on top of the mandatory wealth base. The absurd items (goose, rubber duck, fish) appear here.

#### 2.2.1 Eyewear

Eyewear interacts heavily with lighting — reflections in lenses, shadows cast by frames, and the way glasses obscure or reveal the eyes all affect the portrait's emotional register.

| Item | Rarity | Weight % | Stage |
|------|--------|----------|-------|
| Nothing | N/A | 50% | I |
| Cheap gas station sunglasses | Common | 15% | I |
| Blue light glasses (office) | Common | 15% | I |
| Taped-together nerd glasses | Uncommon | 10% | I |
| Safety goggles (work) | Uncommon | 10% | I |
| Nothing | N/A | 45% | II |
| Ray-Ban Wayfarers | Common | 20% | II |
| Clean aviators | Common | 20% | II |
| Reading glasses | Common | 15% | II |
| Nothing | N/A | 40% | III |
| Designer frames (thick) | Common | 20% | III |
| Gold-rimmed aviators | Uncommon | 20% | III |
| Tinted lenses (amber) | Uncommon | 20% | III |
| Nothing | N/A | 25% | IV |
| Solana pit vipers | Rare | 25% | IV |
| Diamond-encrusted frames | Rare | 15% | IV |
| Oversized shield sunglasses | Uncommon | 15% | IV |
| Ski goggles on forehead | Legendary | 10% | IV |
| Clout goggles | Uncommon | 10% | IV |
| Nothing | N/A | 55% | V |
| Thin wire-frame glasses | Common | 20% | V |
| Glasses indent on nose bridge | Legendary | 10% | V |
| Reading glasses held in hand | Uncommon | 15% | V |

**Prompt fragment examples:**

- **Solana pit vipers (Stage IV):** "Solana-branded pit viper sunglasses sit on the face, the wraparound lenses reflecting a distorted scene that doesn't match the painting's environment — as if they're a portal to somewhere louder. The neon frame rendered in thick, confident paint against the classical shadows."
- **Glasses indent on nose bridge (Stage V):** "No glasses are worn, but two faint red marks on either side of the nose bridge reveal where frames recently sat — a subtle, almost invisible detail that rewards close inspection, painted with surgical precision."

#### 2.2.2 Headwear

Headwear changes the silhouette of the portrait significantly. In Baroque composition, the top of the head is often where light enters the frame, so headwear interacts with the primary light source.

| Item | Rarity | Weight % | Stage |
|------|--------|----------|-------|
| Nothing | N/A | 45% | I |
| McDonald's visor | Uncommon | 12% | I |
| Gas station trucker hat | Common | 15% | I |
| Worn-out backwards snapback | Common | 15% | I |
| Sweatband | Uncommon | 8% | I |
| Hard hat (construction) | Uncommon | 5% | I |
| Nothing | N/A | 50% | II |
| Clean fitted cap | Common | 18% | II |
| Basic beanie | Common | 15% | II |
| Dad hat | Common | 12% | II |
| Headband | Uncommon | 5% | II |
| Nothing | N/A | 50% | III |
| Designer cap | Common | 18% | III |
| Silk durag | Uncommon | 15% | III |
| Leather beret | Uncommon | 12% | III |
| Bucket hat (designer) | Uncommon | 5% | III |
| Nothing | N/A | 40% | IV |
| Diamond-encrusted fitted | Rare | 18% | IV |
| Designer bucket hat | Uncommon | 15% | IV |
| Custom embroidered durag | Uncommon | 12% | IV |
| Bandana (designer print) | Uncommon | 10% | IV |
| Crown (ironic, cheap plastic) | Legendary | 5% | IV |
| Nothing | N/A | 70% | V |
| Nothing (bare head) | N/A | 15% | V |
| Reading glasses pushed up on head | Uncommon | 10% | V |
| Simple linen headwrap | Uncommon | 5% | V |

**Prompt fragment examples:**

- **McDonald's visor (Stage I):** "A faded red McDonald's visor sits on the head, the golden arches logo barely visible in the shadow — rendered with the same careful attention to fabric and form as any velvet cap in a Vermeer, the polyester sheen catching a thin edge of warm light."
- **Crown, cheap plastic (Stage IV):** "A cheap plastic crown sits askew on the head — the kind won at a carnival or pulled from a Christmas cracker — but rendered with absolute seriousness in thick oil paint, gold leaf effect peeling, as if the old master couldn't tell the difference between this and a real coronation."

#### 2.2.3 Held Object / Prop

This is the primary category for absurdist and memorable traits. Props interact with the pose system — holding an object requires a hand position, which influences the overall composition. The absurd items (goose, lobster, rubber duck) are deliberately stage-independent and rare, creating unexpected combinations at any wealth level.

| Item | Rarity | Weight % | Stage |
|------|--------|----------|-------|
| Nothing | N/A | 40% | I |
| Flip phone | Common | 10% | I |
| Scratched lottery ticket | Uncommon | 8% | I |
| Energy drink can | Common | 10% | I |
| Bus pass | Common | 8% | I |
| Crumpled paper bag | Uncommon | 6% | I |
| Cigarette (unlit) | Common | 6% | I |
| A goose | Legendary | 3% | I |
| Rubber duck | Legendary | 3% | I |
| A fish (just holding a fish) | Legendary | 3% | I |
| A baguette | Rare | 3% | I |
| Nothing | N/A | 40% | II |
| Smartphone | Common | 12% | II |
| Coffee cup (paper) | Common | 10% | II |
| Paperback book | Common | 10% | II |
| Cigarette (lit) | Common | 8% | II |
| Keys on lanyard | Common | 6% | II |
| A goose | Legendary | 3% | II |
| A small cat | Rare | 4% | II |
| Rubber duck | Legendary | 3% | II |
| A baguette | Rare | 4% | II |
| Nothing | N/A | 35% | III |
| Champagne flute | Common | 12% | III |
| Solana Saga phone | Uncommon | 10% | III |
| Cigar (lit) | Common | 10% | III |
| Cocktail glass | Common | 8% | III |
| A parrot on shoulder | Rare | 5% | III |
| A lobster | Legendary | 4% | III |
| A goose | Legendary | 3% | III |
| Rubber duck | Legendary | 3% | III |
| A fish | Legendary | 3% | III |
| Wine glass (red) | Common | 7% | III |
| Nothing | N/A | 25% | IV |
| Bottle of Dom Perignon | Uncommon | 12% | IV |
| Diamond-studded phone | Rare | 10% | IV |
| Lit sparkler | Uncommon | 8% | IV |
| Two phones | Uncommon | 7% | IV |
| Small dog in designer outfit | Rare | 6% | IV |
| A sword | Legendary | 5% | IV |
| Money fan (cash spread) | Uncommon | 8% | IV |
| A goose (wearing tiny chain) | Legendary | 4% | IV |
| A lobster | Legendary | 4% | IV |
| Rubber duck (gold-plated) | Legendary | 4% | IV |
| A fish | Legendary | 3% | IV |
| Flaming torch | Legendary | 4% | IV |
| Nothing | N/A | 40% | V |
| Single cup of tea | Common | 15% | V |
| Old photograph held loosely | Uncommon | 10% | V |
| Reading glasses in hand | Common | 10% | V |
| Unlit cigarette (contemplative) | Common | 8% | V |
| A fish (no explanation) | Legendary | 4% | V |
| A goose (calm, settled) | Legendary | 3% | V |
| Rubber duck | Legendary | 3% | V |
| Single flower (wilting) | Rare | 4% | V |
| Empty glass | Uncommon | 3% | V |

**Prompt fragment examples:**

- **A goose (any stage):** "The subject cradles a live white goose against their chest with both hands — the bird's feathers rendered in meticulous oil detail, each plume catching light individually. The goose is calm, dignified, unexplained. Its eye is as alert and psychologically present as the subject's own."
- **A goose wearing tiny chain (Stage IV):** "The subject cradles a live white goose wearing a miniature gold Cuban link chain around its neck — both bird and chain rendered with absurd precision, the goose's feathers catching the same dramatic light as the subject's jewelry. Neither subject nor goose acknowledges the absurdity."
- **A fish (any stage):** "The subject holds a large fresh fish by the tail with one hand, arm extended slightly — the fish's scales rendered as individual points of iridescent light, its eye glassy and reflective. No explanation is offered. The fish is simply present, painted with the same gravity as any nobleman's scepter."
- **Inner lip tattoo SOLANA (any stage):** "The subject pulls down the lower lip with one hand, revealing SOLANA tattooed in blocky capitals on the inner lip — the wet pink tissue rendered with uncomfortable anatomical precision, the black ink crisp against flesh, painted as if the old master found this gesture as worthy of documentation as any nobleman's pose."
- **McDonald's visor (Stage I):** "A faded red McDonald's visor sits on the head, the golden arches logo barely visible in the shadow — rendered with the same careful attention to fabric and form as any velvet cap in a Vermeer, the polyester sheen catching a thin edge of warm light."

#### 2.2.4 Tattoos

Tattoos are stage-independent in availability but vary in type and intensity. The inner lip tattoo reading "SOLANA" is a special coupled trait that forces a specific pose (lip pull-down). Tattoos rendered in oil paint should look like they're part of the skin, with brushwork visible through the ink.

| Item | Rarity | Weight % | Stage |
|------|--------|----------|-------|
| Nothing | N/A | 70% | All |
| Neck tattoo (abstract linework) | Uncommon | 6% | All |
| Hand/knuckle tattoo | Uncommon | 5% | All |
| Inner lip tattoo "SOLANA" | Legendary | 3% | All (forces pose) |
| Face tattoo (subtle, small) | Rare | 4% | All |
| Face tattoo (heavy, multiple) | Legendary | 2% | All |
| Tear drop tattoo | Rare | 3% | All |
| Neck tattoo (text/script) | Uncommon | 4% | All |
| "gm" on knuckles | Legendary | 3% | All |

#### 2.2.5 Background Element

Background elements add depth and atmosphere beyond the default near-black void. These should be subtle and partially obscured by shadow — they create an impression rather than a clear scene.

| Item | Rarity | Weight % | Stage |
|------|--------|----------|-------|
| Nothing (pure dark) | N/A | 55% | I |
| Faint brick wall texture | Common | 15% | I |
| Fluorescent light leak | Uncommon | 10% | I |
| Rain on window behind | Uncommon | 10% | I |
| Steam/breath in cold air | Uncommon | 10% | I |
| Nothing (pure dark) | N/A | 50% | II |
| Blurred city lights | Common | 15% | II |
| Smoke/haze drifting | Common | 15% | II |
| Neon sign glow (color) | Uncommon | 10% | II |
| Window light spill | Uncommon | 10% | II |
| Nothing (pure dark) | N/A | 40% | III |
| Warm interior (out of focus) | Common | 15% | III |
| Smoke/haze | Common | 15% | III |
| Gold leaf flaking | Uncommon | 10% | III |
| Blurred figures in background | Rare | 10% | III |
| Art hanging on wall (blurred) | Uncommon | 10% | III |
| Nothing (pure dark) | N/A | 25% | IV |
| Neon glow (multiple colors) | Common | 15% | IV |
| Stacked cash (blurred) | Uncommon | 10% | IV |
| Floating Solana logos | Rare | 10% | IV |
| LED ring light reflection | Uncommon | 10% | IV |
| Smoke/haze (heavy) | Common | 10% | IV |
| Confetti/sparkle particles | Uncommon | 8% | IV |
| A second smaller portrait within portrait | Legendary | 5% | IV |
| Fireworks | Rare | 7% | IV |
| Nothing (pure dark) | N/A | 55% | V |
| Aged canvas texture (heavy) | Common | 15% | V |
| Single candle flame (distant) | Uncommon | 10% | V |
| Rain on glass (blurred) | Uncommon | 10% | V |
| Faint landscape (barely visible) | Rare | 5% | V |
| Empty room receding into dark | Rare | 5% | V |

#### 2.2.6 Clothing Detail

Clothing detail adds texture and context to the torso area. Most clothing is swallowed by shadow in the Baroque lighting — these details catch just enough light to register.

| Item | Rarity | Weight % | Stage |
|------|--------|----------|-------|
| Plain black t-shirt | Common | 25% | I |
| Hoodie (hood down, strings visible) | Common | 25% | I |
| Work uniform/smock | Uncommon | 15% | I |
| Plain white undershirt | Common | 20% | I |
| High-vis vest edge visible | Uncommon | 15% | I |
| Clean crewneck | Common | 25% | II |
| Hoodie (quality, neutral) | Common | 25% | II |
| Denim jacket collar | Common | 20% | II |
| Flannel shirt collar | Common | 15% | II |
| Turtleneck | Uncommon | 15% | II |
| Leather jacket collar | Common | 25% | III |
| Designer hoodie (visible brand) | Uncommon | 20% | III |
| Silk shirt collar | Common | 20% | III |
| Velvet blazer | Uncommon | 20% | III |
| Cashmere sweater | Common | 15% | III |
| Fur-lined collar/coat | Uncommon | 20% | IV |
| Designer leather (exotic) | Rare | 18% | IV |
| Sequined/embellished jacket | Rare | 15% | IV |
| Headphones around neck (Beats) | Uncommon | 12% | IV |
| Open shirt showing chest | Common | 15% | IV |
| Custom embroidered robe | Rare | 10% | IV |
| Towel over shoulder (boxing) | Legendary | 10% | IV |
| Simple black cashmere | Common | 30% | V |
| White linen shirt (open collar) | Common | 25% | V |
| Bare shoulders (draped fabric) | Uncommon | 15% | V |
| Worn leather jacket (aged) | Uncommon | 15% | V |
| Robe (simple, monastic feel) | Rare | 15% | V |

---

## 3. Mood & Composition Layer

These categories control how the portrait feels rather than what it contains. They are rolled independently of trait categories and are responsible for making each portrait a compelling painting. Every portrait rolls from ALL of these categories simultaneously.

### 3.1 Lighting Setup

Lighting is the single most important variable for painting quality. Each option specifies a complete light scenario including direction, quality, color temperature, and shadow ratio. The shadow ratio (% of canvas in darkness) is stage-dependent but the light type is rolled within that constraint.

| Lighting Setup | Rarity | Weight % | Stage Affinity |
|---------------|--------|----------|----------------|
| Single candle from below (unsettling, interrogation) | Uncommon | 8% | I, V |
| Harsh directional upper-left 45 degrees (classic Caravaggio) | Common | 20% | All |
| Soft diffused golden (Rembrandt warmth) | Common | 18% | II, III, V |
| Backlit with rim light (silhouette edge) | Uncommon | 10% | I, V |
| Dual source conflicting (warm vs cool) | Rare | 8% | III, IV |
| Flash photography (flat, blown-out, paparazzi) | Rare | 8% | IV |
| Moonlight cold blue with single warm accent | Uncommon | 8% | I, V |
| Fire glow (flickering, orange, unstable) | Uncommon | 8% | I, II |
| Narrow concentrated beam (single eye lit) | Rare | 6% | I, V |
| Overhead downlight (dramatic under-eye shadows) | Uncommon | 6% | III, IV |

**Shadow ratio by stage:** Stage I: 80-90% darkness. Stage II: 70-80%. Stage III: 55-70%. Stage IV: 40-60%. Stage V: 70-85%.

### 3.2 Expression

Expression carries the emotional weight of each portrait. Note that expression interacts with grillz visibility — closed-mouth expressions hide grillz, open-mouth or smiling expressions reveal them.

| Expression | Rarity | Weight % | Stage Affinity |
|-----------|--------|----------|----------------|
| Closed mouth half-smile (knowing) | Common | 12% | II, III |
| Slight smirk, one side only | Common | 10% | III, IV |
| Mouth slightly open, mid-sentence | Uncommon | 8% | II, IV |
| Jaw clenched, tension visible | Uncommon | 8% | I, III |
| Full grin showing teeth/grillz | Uncommon | 8% | IV |
| Lip bitten slightly | Rare | 5% | I, II |
| Exhaling smoke | Uncommon | 6% | All (needs cigarette/cigar) |
| Dead serious, no emotion | Common | 15% | I, V |
| Looking amused by something off-canvas | Uncommon | 6% | III, IV |
| Quiet vulnerability, brow slightly furrowed | Common | 12% | I, V |
| Defiant, chin forward | Uncommon | 6% | III, IV |
| Wistful, distant longing | Rare | 4% | V |

### 3.3 Eye Direction & Intensity

Where the subject looks relative to the viewer fundamentally changes the portrait's psychological impact. Direct eye contact creates confrontation. Averted gaze creates mystery.

| Eye Direction | Rarity | Weight % | Stage Affinity |
|--------------|--------|----------|----------------|
| Direct stare into viewer (confrontational) | Common | 20% | III, IV |
| Looking just past viewer's shoulder | Uncommon | 10% | I, V |
| Eyes cast downward (contemplative) | Common | 12% | I, V |
| Looking sharply to one side | Common | 12% | II, III |
| Eyes half-closed (unbothered) | Uncommon | 8% | IV |
| One eye more closed than other (subtle) | Rare | 5% | All |
| Looking upward (aspirational) | Common | 12% | I, II |
| Staring into light source | Uncommon | 8% | I, V |
| Looking at held object | Common | 8% | All (needs prop) |
| Unfocused, thousand-yard stare | Rare | 5% | V |

### 3.4 Pose & Body Language

Pose determines the overall composition and energy of the portrait. Some poses are coupled with specific traits (lip-pull for inner lip tattoo, cradling for goose/animal props). The pose system should check for coupled traits and force the appropriate pose when triggered.

| Pose | Rarity | Weight % | Stage Affinity |
|------|--------|----------|----------------|
| Three-quarter profile (standard) | Common | 20% | All |
| Turned to profile, looking back over shoulder | Uncommon | 10% | III, IV |
| Leaning forward into frame (aggressive) | Uncommon | 8% | IV |
| Leaning back, chin tilted up (imperious) | Uncommon | 8% | III, IV |
| Head tilted to one side (curious) | Common | 10% | I, II |
| Hand touching face (chin on fist / finger on temple) | Common | 12% | I, V |
| Arms crossed | Common | 10% | III, IV |
| One hand adjusting collar or chain | Uncommon | 6% | II, III |
| Pulling down lower lip (inner tattoo reveal) | Legendary | 3% | All (coupled) |
| Holding prop up toward viewer | Uncommon | 5% | All (needs prop) |
| Hands in pockets (only shoulders/head visible) | Common | 8% | I, II |

### 3.5 Compositional Tension

These are the "something is off" qualities that elevate a portrait from a standard composition to something that demands a second look. Every portrait should roll one compositional device.

| Device | Rarity | Weight % | Stage Affinity |
|--------|--------|----------|----------------|
| Standard centered (no device) | Common | 30% | All |
| Subject off-center, heavy negative space on one side | Common | 15% | I, V |
| Extreme close crop (top of head cut off) | Uncommon | 10% | IV |
| Wider than expected, showing environment | Uncommon | 8% | III |
| Subject partially obscured by shadow (half face) | Uncommon | 10% | I, V |
| Foreground element slightly out of focus | Rare | 6% | III, IV |
| Visible paint drip or run | Rare | 5% | All |
| Canvas texture heavier on one side (deteriorating) | Rare | 5% | V |
| Subject slightly blurred, background sharp (inverted focus) | Legendary | 3% | V |
| Dutch angle (slight tilt) | Uncommon | 8% | IV |

### 3.6 Atmosphere / Surface Texture

Atmosphere affects the overall material quality of the painting. These interact with the museum-worthy finish instructions in the base prompt.

| Atmosphere | Rarity | Weight % | Stage Affinity |
|-----------|--------|----------|----------------|
| Clean aged varnish (standard) | Common | 30% | All |
| Heavy craquelure (painting looks 300 years old) | Uncommon | 12% | I, V |
| Smoke or haze drifting across frame | Common | 12% | All |
| Rain/water droplets on surface (behind glass) | Rare | 6% | I, V |
| Gold leaf fragments in varnish | Uncommon | 8% | III, IV |
| Subtle lens flare / light leak (anachronistic) | Rare | 6% | IV |
| Dust particles visible in light beam | Common | 10% | I, II |
| Condensation / breath fog | Uncommon | 6% | I |
| Paint surface cracking in real-time (active decay) | Legendary | 4% | V |
| Wet paint look (fresh, glossy) | Rare | 6% | IV |

---

## 4. Prompt Assembly Architecture

Each final image prompt is assembled from modular blocks. The trait roller resolves all categories, then the prompt assembler injects the results into a stage-specific template. The following defines the block order and structure.

### 4.1 Block Order

Every prompt is assembled in this exact order:

| Block | Source | Variability |
|-------|--------|-------------|
| 1. Identity Lock | Constant | Never changes |
| 2. Composition & Pose | Rolled (pose + compositional tension) | Per portrait |
| 3. Expression & Eyes | Rolled (expression + eye direction) | Per portrait |
| 4. Lighting Setup | Rolled (within stage shadow ratio) | Per portrait |
| 5. Mandatory Wealth Traits | Rolled (wrist, chains, earrings, rings, grillz) | Per portrait |
| 6. Optional Flavor Traits | Rolled (eyewear, headwear, prop, tattoo, clothing) | Per portrait |
| 7. Background & Atmosphere | Rolled (background element + atmosphere) | Per portrait |
| 8. Palette Directive | Stage-determined | Per stage |
| 9. Technical Finish | Mostly constant (minor stage variation) | Minimal |
| 10. Negative Prompt / Avoid List | Constant | Never changes |

### 4.2 Block Templates

#### Block 1: Identity Lock (Constant)

> A square-format baroque oil portrait derived from the provided headshot, with strict identity retention and exact facial proportions preserved: identical nose shape, eye spacing, eyebrow structure, jawline curvature, and cheekbone definition. Keep the subject unmistakably recognizable; do not idealize, beautify, smooth, or sharpen features.

#### Block 2: Composition & Pose (Rolled)

Template: `{framing_description}. {pose_description}. {compositional_device_description}.`

Example assembled (three-quarter + hand on face + off-center):

> Chest-up composition. The subject is placed slightly off-center in the frame with heavy negative space to the right. The torso angles slightly away from the viewer. One hand rests against the cheek, fingers curled loosely beneath the jaw in a gesture of quiet contemplation.

#### Block 3: Expression & Eyes (Rolled)

Template: `Expression is {expression_description}. {eye_direction_description}.`

Example assembled (dead serious + looking past viewer):

> Expression is flat and unreadable — no warmth, no hostility, just an unsettling absence of performance. The eyes are directed just past the viewer's left shoulder, as if aware of something in the room that the viewer cannot see.

#### Block 4: Lighting Setup (Rolled)

Template: `{lighting_type_description}. {shadow_ratio} of the canvas in deep shadow. {specific_light_behavior}.`

Example assembled (Stage I, narrow beam, 85% shadow):

> Extreme tenebrism: roughly 85% of the canvas in deep shadow. A narrow, concentrated warm beam of light cuts across only one eye and the upper cheekbone, grazing the bridge of the nose; everything else falls into darkness. The lit eye should feel unnervingly alive — wet, reflective, and intent — while the unlit side dissolves into a soft, velvety void.

#### Block 5: Mandatory Wealth Traits (Rolled)

Each trait item has a pre-written prompt fragment in Baroque painting language. These fragments describe both the object and how it interacts with the lighting and paint style. See individual category sections above for examples.

#### Block 6: Optional Flavor Traits (Rolled)

Same fragment structure as mandatory traits. See individual category sections above for examples.

#### Block 7: Background & Atmosphere (Rolled)

Combined from background element roll + atmosphere roll.

#### Block 8: Palette Directive (Stage-Determined)

- **Stage I:** "Palette stays muted and grave — umber, burnt sienna, deep oxblood warmth in the light, and near-black shadows. No brightness boost, no vibrancy. The color of patience and quiet endurance."
- **Stage II:** "Palette warms slightly — burnt sienna deepens to amber, shadows retain depth but light areas introduce touches of ochre and warm gold. The first suggestion that things are improving. Still restrained, never celebratory."
- **Stage III:** "Palette enriches noticeably — warm golds, deep burgundy, rich amber dominate the lit areas. Shadows remain deep but carry warmth rather than void. The color of established comfort, of rooms with good lighting."
- **Stage IV:** "Palette hits maximum saturation — vivid golds, electric highlights, occasional cool-toned reflections from diamonds and metal. Shadows may carry color (deep purple, midnight blue). The color of excess, of flash photography at 3am, of too much of everything."
- **Stage V:** "Palette returns to restraint but with sophistication — muted warm greys, soft platinum light, desaturated gold that reads as memory rather than presence. Shadows are softer, less absolute. The color of dawn after a long night, of things settling."

#### Block 9: Technical Finish (Mostly Constant)

> Museum-worthy finish: heavy oil paint texture with confident, visible brushwork; subtle impasto on highlights; softened, layered glazing in the shadows; aged varnish patina with a restrained, uneven sheen that catches the light like an old master painting. Preserve natural skin texture and asymmetries; allow slight painterly distortion consistent with baroque technique, but never alter identity. Painted with rough impasto technique, uneven paint thickness, visible brush drag marks, textured canvas fibers clearly visible, subtle surface imperfections, painterly abstraction in shadow areas, no hyper-real skin detail, no photographic sharpness, no cinematic lighting, no digital gloss.

#### Block 10: Negative Prompt / Avoid List (Constant)

> Avoid: plastic skin, over-sharpening, warped eyes, extra fingers/limbs, text, watermarks, logos, frame overlays. No hyper-real rendering, no 3D look, no cinematic color grading, no HDR effect, no anime influence, no cartoon aesthetics, no stock photo composition.

---

## 5. Trait Coupling & Dependency Rules

Some traits interact with or force other trait selections. The trait roller must check for these couplings after all independent rolls are complete and adjust accordingly.

**Inner lip tattoo -> Lip-pull pose:** If tattoo category rolls "Inner lip tattoo SOLANA," the pose is forced to "Pulling down lower lip." This overrides any other pose roll.

**Animal prop -> Cradling/holding pose:** If prop rolls goose, cat, small dog, or parrot, the pose must accommodate holding or cradling the animal. Three-quarter profile and hand-on-face poses are replaced with appropriate holding poses.

**Exhaling smoke expression -> Cigarette/cigar/vape prop:** If expression rolls "exhaling smoke," the prop must include a cigarette, cigar, joint, or vape. If no smoking prop was rolled, override the prop to the stage-appropriate smoking item.

**Grillz visibility -> Expression:** If grillz are rolled (anything other than "nothing"), the expression should be weighted toward open-mouth or smiling variants to ensure visibility. If a closed-mouth expression is rolled with grillz, the grillz are still present but may not be visible — this is acceptable and creates an interesting "hidden trait" dynamic.

**Eyewear -> Eye direction:** If opaque sunglasses are rolled, eye direction descriptions referencing visible eye detail ("wet, reflective") must be adjusted. The sunglasses become the eye, and light interaction happens on the lens surface instead.

**Extreme close crop -> Headwear:** If compositional tension rolls "extreme close crop (top of head cut off)," headwear is invisible and should not be described in the prompt even if rolled. The trait still counts for metadata/rarity but is not rendered.

**Held object -> Hand pose:** Any held object overrides "hands in pockets" and "arms crossed" poses. The hand holding the prop must be described in the pose block.

---

## 6. Rarity Calculation & Metadata

Each portrait's rarity is calculated as the product of the individual trait probabilities. Since traits are rolled independently, the overall rarity of a specific combination is multiplicative.

### 6.1 Rarity Tiers

Items are tagged with rarity labels for marketplace display and filtering:

| Tier | Typical Weight Range | Color Code |
|------|---------------------|------------|
| Common | 15-35% | #A0A0A0 (grey) |
| Uncommon | 5-15% | #4CAF50 (green) |
| Rare | 3-8% | #2196F3 (blue) |
| Legendary | 1-5% | #FFD700 (gold) |

### 6.2 Metadata Output

After generation, the complete trait roll is stored in the NFT metadata on Arweave. This enables marketplace filtering, rarity ranking, and collection analytics. The metadata includes every rolled trait, its rarity tier, the stage at generation, and the mood/composition selections.

### 6.3 Lock Amount as Weight Modifier

The amount of SOL locked by the portrait owner applies a small positive modifier to rarity rolls. This is NOT a guarantee of rare traits — it is a statistical nudge. A higher lock shifts the probability distribution by +1-3% toward rarer tiers per category. The exact modifier formula should be calibrated during testing to ensure that the nudge is perceptible over large samples but not deterministic for any individual portrait.

---

## 7. Implementation Notes

### 7.1 Trait Roller Architecture

The trait roller is a server-side function that takes three inputs: the portrait's stage (determined by current SOL price), the owner's locked SOL amount, and a random seed. It outputs a complete trait manifest — a JSON object containing every category selection, rarity tag, and the assembled prompt fragments. The random seed should be derived from a combination of on-chain data (block hash, slot number) and the owner's pubkey to ensure determinism and verifiability.

### 7.2 Prompt Fragment Library

Each trait item requires a hand-written prompt fragment of 1-3 sentences describing the object in Baroque painting language. These fragments must specify: the object itself, how it interacts with light, its material quality, and its emotional register. The fragment library is the most labor-intensive part of this system and should be built and tested iteratively against the image generation model.

### 7.3 Testing Strategy

Before launch, generate a minimum of 200 test portraits across all five stages with randomized trait rolls. Evaluate for: visual coherence (do traits look natural together?), prompt conflict (do any trait combinations produce bad outputs?), rarity distribution (does the actual distribution match the specified weights?), and compositional quality (does every portrait feel like a painting?). Adjust weights, fragments, and coupling rules based on test results.

### 7.4 Expansion

The trait system is designed to be extensible. New items can be added to any category at any time by writing a prompt fragment and assigning a weight. Seasonal or limited-time traits could be added for special events. The modular block structure means new trait categories can be inserted without rewriting the entire prompt template.
