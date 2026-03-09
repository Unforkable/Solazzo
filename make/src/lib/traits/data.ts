import type {
  TraitCategoryDef,
  StageNumber,
  StageShadowRatio,
  PaletteDirectives,
} from "./types";

// ── Constants ───────────────────────────────────────────────────────────────

export const SHADOW_RATIOS: Record<StageNumber, StageShadowRatio> = {
  1: { min: 80, max: 90 },
  2: { min: 70, max: 80 },
  3: { min: 55, max: 70 },
  4: { min: 40, max: 60 },
  5: { min: 70, max: 85 },
};

export const PALETTE_DIRECTIVES: PaletteDirectives = {
  1: "PALETTE & TONE: Muted and grave — umber, burnt sienna, deep oxblood warmth only where the narrow light falls, and near-black everywhere else. Overall luminance must sit in the bottom 10% of the histogram. The painting should feel almost too dark — the viewer leans in. The color of patience and quiet endurance.",
  2: "PALETTE & TONE: Warming slightly — burnt sienna deepens to amber, shadows retain oppressive depth but the lit sliver introduces touches of ochre and warm gold. Overall luminance stays in the bottom 10% of the histogram. Still restrained, never celebratory. Darkness dominates; warmth is a promise, not a presence.",
  3: "PALETTE & TONE: Enriched warmth — warm golds, deep burgundy, rich amber in the lit areas, but the lit areas remain the minority of the canvas. Shadows are deep and carry warmth rather than void. Overall luminance in the bottom 10% of the histogram. The color of established comfort glimpsed through darkness.",
  4: "PALETTE & TONE: Maximum saturation in the highlights — vivid golds, electric accents, cool-toned reflections from diamonds and metal — but these highlights are islands in a sea of darkness. Shadows carry color (deep purple, midnight blue) but remain deep. Overall luminance in the bottom 10% of the histogram. The color of excess emerging from shadow.",
  5: "PALETTE & TONE: Restrained sophistication — muted warm greys, soft platinum light, desaturated gold that reads as memory. Shadows return to near-black dominance. Overall luminance back in the bottom 10% of the histogram. The color of dawn after a long night, barely there.",
};

export const BLOCK_1_IDENTITY_LOCK =
  "A square-format tenebrist oil portrait in the tradition of Caravaggio, derived from the provided headshot. The painting must embrace true tenebrism: dramatic, uncompromising darkness where most of the canvas is swallowed in near-black shadow, and only a narrow shaft of warm light reveals the subject. Strict identity retention with exact facial proportions preserved: identical nose shape, eye spacing, eyebrow structure, jawline curvature, and cheekbone definition. Keep the subject unmistakably recognizable; do not idealize, beautify, smooth, or sharpen features.";

export const BLOCK_9_TECHNICAL_FINISH =
  "Museum-worthy finish viewed in a dimly lit gallery: heavy oil paint texture with confident, visible brushwork; subtle impasto only on the few highlights; softened, layered glazing in the vast shadow areas; aged varnish patina darkened by centuries. The overall painting must read as DARK — deep, rich darks dominate the canvas; highlights are small, concentrated, and warm, never blown out. Preserve natural skin texture and asymmetries; allow slight painterly distortion consistent with Caravaggio's tenebrist technique, but never alter identity. Rough impasto, uneven paint thickness, visible brush drag marks, textured canvas fibers, painterly abstraction in shadow areas. No hyper-real skin detail, no photographic sharpness, no cinematic lighting, no digital gloss, no fill light, no even illumination.";

export const BLOCK_10_NEGATIVE_PROMPT =
  "CRITICAL — Avoid: bright images, overexposure, washed-out highlights, fill light, flat studio lighting, even illumination, high-key lighting, glowing skin. The image must NOT look bright or well-lit. Also avoid: plastic skin, over-sharpening, warped eyes, extra fingers/limbs, text, watermarks, logos, frame overlays. No hyper-real rendering, no 3D look, no cinematic color grading, no HDR effect, no anime influence, no cartoon aesthetics, no stock photo composition.";

// ── Mandatory Wealth Markers ─────────────────────────────────────────────────

export const WRIST: TraitCategoryDef = {
  id: "wrist",
  displayName: "Wrist / Watch",
  type: "mandatory",
  items: [
    // Stage I
    { id: "nothing", name: "Nothing", stages: [1], weight: 55, rarity: "Common", fragment: "", isNothing: true },
    { id: "casio-f91w", name: "Casio F-91W", stages: [1], weight: 15, rarity: "Common", fragment: "A modest, inexpensive black digital watch is visible on the wrist — basic practical style, matte resin strap — partially swallowed by shadow with no shine, no luxury cues, and no emphasis." },
    { id: "mickey-mouse-watch", name: "Mickey Mouse watch", stages: [1], weight: 10, rarity: "Uncommon", fragment: "A novelty Mickey Mouse watch on the wrist, the cartoon face barely legible in the low light — cheap plastic rendered with the same gravitas as fine enamelwork." },
    { id: "rubber-wristband", name: "Swatch Watch", stages: [1], weight: 10, rarity: "Uncommon", fragment: "A colorful  plastic Swatch watch on the wrist — bright plastic case in a vivid pop color, its dial a small illuminated disc against the surrounding darkness, the cheap resin strap catching no light worth speaking of. No luxury, no weight, no shine." },
    { id: "friendship-bracelet", name: "Friendship bracelet (frayed)", stages: [1], weight: 10, rarity: "Uncommon", fragment: "A frayed friendship bracelet in faded thread hangs loose on the wrist, its handmade knots rendered with tender precision in oil." },
    // Stage II
    { id: "g-shock", name: "G-Shock", stages: [2], weight: 30, rarity: "Common", fragment: "A chunky G-Shock digital watch sits heavy on the wrist, its matte black case absorbing light while the crystal face catches a single point of reflection." },
    { id: "seiko-diver", name: "Seiko diver on NATO strap", stages: [2], weight: 25, rarity: "Common", fragment: "A Seiko diver's watch on a worn NATO strap — the brushed steel case catching warm directional light, the fabric strap softened by use." },
    { id: "leather-field-watch", name: "Leather strap field watch", stages: [2], weight: 25, rarity: "Common", fragment: "A practical field watch on a cracked leather strap, the aged brass casing painted with warm amber tones where light grazes its surface." },
    { id: "simple-silver-bangle", name: "Simple silver bangle", stages: [2], weight: 10, rarity: "Uncommon", fragment: "A simple silver bangle catches a thin line of cool light on the wrist, its polished surface a quiet interruption in the surrounding shadow." },
    { id: "beaded-bracelet-stack", name: "Beaded bracelet stack", stages: [2], weight: 10, rarity: "Uncommon", fragment: "A stack of beaded bracelets in muted earth tones circles the wrist, each bead a small sphere of reflected warmth in the directional light." },
    // Stage III
    { id: "tag-heuer-carrera", name: "Tag Heuer Carrera", stages: [3], weight: 25, rarity: "Common", fragment: "A Tag Heuer Carrera on the wrist, its polished steel case and chronograph subdials catching multiple points of warm light — the first unmistakable luxury object." },
    { id: "omega-seamaster", name: "Omega Seamaster", stages: [3], weight: 25, rarity: "Common", fragment: "An Omega Seamaster glints on the wrist, its blue dial a pool of deep color amid the warm painting tones, the bracelet links each catching their own highlight." },
    { id: "gold-link-bracelet", name: "Gold link bracelet", stages: [3], weight: 20, rarity: "Common", fragment: "A gold link bracelet hangs with visible weight on the wrist, each link painted with thick impasto to suggest the density of real gold catching firelight." },
    { id: "designer-smartwatch-gold", name: "Designer smartwatch (gold)", stages: [3], weight: 15, rarity: "Uncommon", fragment: "A gold-cased smartwatch sits on the wrist, its dark screen a void framed by precious metal — contemporary technology rendered as if it were a baroque reliquary." },
    { id: "stacked-gold-bangles", name: "Stacked gold bangles", stages: [3], weight: 15, rarity: "Uncommon", fragment: "Multiple gold bangles are stacked on the wrist, clinking together where they meet, each one catching light at a slightly different angle." },
    // Stage IV
    { id: "iced-ap-royal-oak", name: "Iced-out AP Royal Oak", stages: [4], weight: 25, rarity: "Rare", fragment: "A diamond-encrusted Audemars Piguet Royal Oak dominates the wrist, every facet of the octagonal bezel refracting warm highlights against cold stone — ostentatious, unapologetic, the metal rendered with thick impasto to suggest weight and excess, light catching each diamond individually." },
    { id: "diamond-rolex-day-date", name: "Diamond Rolex Day-Date", stages: [4], weight: 25, rarity: "Rare", fragment: "A diamond-set Rolex Day-Date blazes on the wrist, the presidential bracelet a cascade of gold links and stones, each diamond a tiny sun in the dramatic lighting." },
    { id: "stacked-cartier-love", name: "Stacked Cartier Love bracelets", stages: [4], weight: 15, rarity: "Uncommon", fragment: "Three Cartier Love bracelets are stacked tight on the wrist, their signature screws catching light in alternating gold and rose gold." },
    { id: "diamond-cuff-bracelet", name: "Diamond cuff bracelet", stages: [4], weight: 15, rarity: "Rare", fragment: "A diamond-paved cuff bracelet encircles the wrist like armor, its entire surface a field of white fire rendered with obsessive impasto detail." },
    { id: "two-watches", name: "Two watches on one wrist", stages: [4], weight: 10, rarity: "Legendary", fragment: "Two luxury watches share the same wrist — one gold, one steel — pushed together in defiant excess, each catching light independently in an absurd doubling of wealth." },
    { id: "richard-mille", name: "Richard Mille (transparent)", stages: [4], weight: 10, rarity: "Legendary", fragment: "A Richard Mille with transparent case sits on the wrist, its visible movement rendered as a tiny universe of gears and bridges, the sapphire crystal a window into mechanical obsession." },
    // Stage V
    { id: "patek-philippe-calatrava", name: "Vintage Patek Philippe Calatrava", stages: [5], weight: 30, rarity: "Rare", fragment: "A clean vintage Patek Philippe Calatrava sits quietly on the wrist — thin gold case, cream dial barely visible, leather strap softened by years of wear. No diamonds, no flash. The kind of watch that announces nothing but costs everything. Rendered with restrained brushwork, catching only a whisper of warm light." },
    { id: "cartier-tank", name: "Cartier Tank (leather)", stages: [5], weight: 30, rarity: "Rare", fragment: "A Cartier Tank on a worn leather strap — the rectangular case a study in quiet geometry, its Roman numerals barely visible in the soft light." },
    { id: "single-gold-bangle-thin", name: "Single gold bangle (thin)", stages: [5], weight: 20, rarity: "Common", fragment: "A single thin gold bangle sits on the wrist, catching one clean line of warm light — all that remains of a heavier collection." },
    { id: "bare-wrist-tan-line", name: "Bare wrist with tan line", stages: [5], weight: 10, rarity: "Legendary", fragment: "The wrist is bare — but a faint tan line where a watch once sat is visible in the warm light, a ghost of something removed. The absence is deliberate, painted with the same care as presence." },
    { id: "understated-platinum-cuff", name: "Understated platinum cuff", stages: [5], weight: 10, rarity: "Uncommon", fragment: "A slim platinum cuff on the wrist, its brushed surface catching the softest possible highlight — metal that whispers rather than shouts." },
  ],
};

export const CHAINS: TraitCategoryDef = {
  id: "chains",
  displayName: "Chains / Neckpiece",
  type: "mandatory",
  items: [
    // Stage I
    { id: "nothing", name: "Nothing", stages: [1], weight: 50, rarity: "Common", fragment: "", isNothing: true },
    { id: "thin-cheap-chain", name: "Thin cheap chain (tarnished)", stages: [1], weight: 15, rarity: "Common", fragment: "A thin tarnished chain barely catches light at the neck, its cheap metal rendered with the same careful brushwork as any golden rope." },
    { id: "shell-necklace", name: "Shell necklace", stages: [1], weight: 10, rarity: "Uncommon", fragment: "A shell necklace rests against the collarbone, each small shell a pale curve of light against dark skin and darker shadow." },
    { id: "dog-tags", name: "Dog tags", stages: [1], weight: 15, rarity: "Common", fragment: "Military-style dog tags hang on a ball chain, the stamped metal faces reflecting a single streak of warm light from the void." },
    { id: "string-pendant", name: "String pendant (homemade)", stages: [1], weight: 10, rarity: "Uncommon", fragment: "A homemade pendant on rough string hangs at the throat — the charm small and personal, swallowed mostly by shadow." },
    // Stage II
    { id: "thin-gold-chain", name: "Thin gold chain", stages: [2], weight: 30, rarity: "Common", fragment: "A thin gold chain is just visible at the collar, catching a single thread of warm light against the shadow of the neck — modest but deliberate, the first quiet assertion of something earned." },
    { id: "simple-pendant-cord", name: "Simple pendant on cord", stages: [2], weight: 25, rarity: "Common", fragment: "A small pendant hangs from a simple cord, its shape catching one point of warm light at the center of the chest." },
    { id: "silver-cuban-slim", name: "Silver Cuban link (slim)", stages: [2], weight: 25, rarity: "Common", fragment: "A slim silver Cuban link chain sits flat against the chest, each link a tiny mirror for the directional light." },
    { id: "leather-cord-charm", name: "Leather cord with charm", stages: [2], weight: 10, rarity: "Uncommon", fragment: "A dark leather cord with a small metal charm hangs at the sternum, the charm spinning slightly to catch a glint of light." },
    { id: "beaded-necklace", name: "Beaded necklace", stages: [2], weight: 10, rarity: "Uncommon", fragment: "A beaded necklace in dark wooden tones circles the neck, each bead painted as a small sphere of warm reflected light." },
    // Stage III
    { id: "gold-cuban-medium", name: "Gold Cuban link (medium)", stages: [3], weight: 25, rarity: "Common", fragment: "A medium-weight gold Cuban link chain commands the upper chest, its interlocking links each painted with distinct impasto highlights — real gold weight made visible." },
    { id: "layered-thin-gold", name: "Layered thin gold chains", stages: [3], weight: 25, rarity: "Common", fragment: "Three thin gold chains layer at different lengths down the chest, each catching its own line of warm light, creating a cascade of golden threads." },
    { id: "gold-rope-chain", name: "Gold rope chain", stages: [3], weight: 20, rarity: "Common", fragment: "A gold rope chain twists and catches light in a continuous spiral down the chest, its braided texture rendered with meticulous brushwork." },
    { id: "medallion-pendant", name: "Medallion pendant (gold)", stages: [3], weight: 15, rarity: "Uncommon", fragment: "A gold medallion pendant hangs from a thick chain, its engraved surface catching dramatic side-light that reveals worked detail." },
    { id: "ledger-chain", name: "Ledger hardware wallet on chain", stages: [3], weight: 15, rarity: "Rare", fragment: "A Ledger hardware wallet hangs from a gold chain like a modern reliquary — the matte black device rendered with the same reverence as any saint's pendant." },
    // Stage IV
    { id: "massive-cuban-link", name: "Massive Cuban link", stages: [4], weight: 20, rarity: "Rare", fragment: "A massive gold Cuban link chain commands the chest, each link rendered as a thick impasto ridge catching light like a row of small suns — the chain's weight implied through the way fabric pulls beneath it, shadow pooling in the gaps between links." },
    { id: "layered-heavy-chains", name: "Layered heavy chains (3+)", stages: [4], weight: 20, rarity: "Rare", fragment: "Three or more heavy gold chains layer across the chest, each competing for light, their combined weight pulling fabric forward — an armory of gold rendered with excessive impasto." },
    { id: "solana-pendant", name: "Oversized Solana logo pendant", stages: [4], weight: 15, rarity: "Uncommon", fragment: "An oversized Solana logo pendant in polished gold hangs from a thick chain, the angular S-shape catching dramatic light like a corporate coat of arms." },
    { id: "diamond-choker", name: "Diamond choker", stages: [4], weight: 15, rarity: "Rare", fragment: "A diamond choker sits tight against the throat, each stone a point of cold white fire against warm skin — constraint and excess in one object." },
    { id: "chains-over-chains", name: "Chains over chains over chains", stages: [4], weight: 15, rarity: "Legendary", fragment: "Chains upon chains upon chains cascade down the chest — gold, silver, platinum — tangled and layered until individual links merge into a wall of metal catching light from every angle." },
    { id: "ledger-diamond-chain", name: "Ledger wallet on diamond chain", stages: [4], weight: 15, rarity: "Legendary", fragment: "A Ledger hardware wallet hangs from a diamond-studded chain, the utilitarian device transformed into a jeweled talisman — crypto and diamonds rendered with equal baroque reverence." },
    // Stage V
    { id: "single-refined-gold", name: "Single refined gold chain (thin)", stages: [5], weight: 30, rarity: "Common", fragment: "A single thin gold chain sits quietly against the skin, catching one clean line of warm light — all the statement needed." },
    { id: "thin-platinum-chain", name: "Thin platinum chain", stages: [5], weight: 30, rarity: "Common", fragment: "A thin platinum chain is barely visible at the collar, its cool metal a subtle counterpoint to the warm painting tones." },
    { id: "meaningful-pendant", name: "One meaningful pendant (simple)", stages: [5], weight: 25, rarity: "Uncommon", fragment: "A single simple pendant hangs from a fine chain — its meaning personal and unknowable, painted with quiet attention." },
    { id: "bare-neck-chain-indent", name: "Bare neck with chain indent", stages: [5], weight: 15, rarity: "Legendary", fragment: "The neck is bare, but a faint indentation where heavy chains once rested is visible in the warm side-light — skin slightly compressed, a memory of weight carried and set down." },
  ],
};

export const EARRINGS: TraitCategoryDef = {
  id: "earrings",
  displayName: "Earrings",
  type: "mandatory",
  items: [
    // Stage I
    { id: "nothing", name: "Nothing", stages: [1], weight: 60, rarity: "Common", fragment: "", isNothing: true },
    { id: "tiny-stud-silver", name: "Single tiny stud (silver)", stages: [1], weight: 20, rarity: "Common", fragment: "A tiny silver stud in one earlobe catches a pinpoint of cool light near the jaw, barely visible in the surrounding shadow." },
    { id: "cheap-small-hoop", name: "Cheap small hoop", stages: [1], weight: 20, rarity: "Common", fragment: "A small cheap hoop earring catches a thin crescent of light, its base metal oxidized to a dull warmth." },
    // Stage II
    { id: "single-diamond-stud", name: "Single diamond stud", stages: [2], weight: 30, rarity: "Common", fragment: "A single diamond stud in one ear catches and scatters light near the jawline — a bright point of white fire against deep shadow." },
    { id: "small-hoops-silver", name: "Small hoops (silver)", stages: [2], weight: 25, rarity: "Common", fragment: "Small silver hoops frame the earlobes, each catching a clean arc of reflected light from the key source." },
    { id: "both-ears-studs", name: "Both ears basic studs", stages: [2], weight: 25, rarity: "Common", fragment: "Basic metal studs in both ears create two symmetrical points of light flanking the face." },
    { id: "cross-earring-small", name: "Single cross earring (small)", stages: [2], weight: 20, rarity: "Uncommon", fragment: "A small cross earring hangs from one lobe, swinging slightly, its form catching light on the vertical and horizontal bars." },
    // Stage III
    { id: "diamond-studs-both", name: "Diamond studs both ears", stages: [3], weight: 30, rarity: "Common", fragment: "Diamond studs in both ears create twin points of scattered white light near the jaw, each stone rendered as a small explosion of brilliance." },
    { id: "medium-gold-hoops", name: "Medium gold hoops", stages: [3], weight: 25, rarity: "Common", fragment: "Medium gold hoops catch warm light in generous arcs on either side of the face, their polished surfaces reflecting the key light." },
    { id: "designer-earrings", name: "Designer earrings", stages: [3], weight: 20, rarity: "Uncommon", fragment: "Designer earrings with distinctive branded hardware catch dramatic light near the face, luxury made visible at the focal point." },
    { id: "pearl-drop", name: "Pearl drop earring", stages: [3], weight: 15, rarity: "Uncommon", fragment: "A single pearl drop earring hangs from one lobe, its lustrous surface catching a soft glow — organic warmth against painted skin." },
    { id: "cross-earring-gold", name: "Cross earring (gold)", stages: [3], weight: 10, rarity: "Uncommon", fragment: "A gold cross earring catches warm light as it hangs, its polished surface creating a bright accent near the jaw." },
    // Stage IV
    { id: "massive-diamond-studs", name: "Massive diamond studs", stages: [4], weight: 25, rarity: "Rare", fragment: "Massive diamond studs dominate the earlobes, each stone large enough to cast its own scattered light pattern onto the neck and jaw." },
    { id: "oversized-gold-hoops", name: "Oversized gold hoops", stages: [4], weight: 20, rarity: "Uncommon", fragment: "Oversized gold hoops sweep from earlobes to shoulders, their circumference catching a dramatic arc of warm light." },
    { id: "dangly-diamond-cross", name: "Dangly diamond cross", stages: [4], weight: 20, rarity: "Rare", fragment: "A diamond-encrusted cross earring dangles and sways, each stone catching light independently as the pendant moves." },
    { id: "airpod-diamond", name: "AirPod in one ear + diamond other", stages: [4], weight: 15, rarity: "Legendary", fragment: "An AirPod sits in one ear while a massive diamond stud occupies the other — contemporary absurdity rendered with complete baroque sincerity." },
    { id: "chandelier-earrings", name: "Chandelier earrings (diamond)", stages: [4], weight: 20, rarity: "Rare", fragment: "Chandelier earrings cascade from the lobes in tiers of diamonds, each tier catching light at a different angle, framing the face in cold fire." },
    // Stage V
    { id: "single-solitaire", name: "Single quality solitaire diamond", stages: [5], weight: 35, rarity: "Common", fragment: "A single solitaire diamond stud in one ear catches one perfect point of warm light — quality over quantity, visible only on close inspection." },
    { id: "small-refined-hoop", name: "Small refined gold hoop", stages: [5], weight: 30, rarity: "Common", fragment: "A small refined gold hoop sits close to the earlobe, its polished surface catching a gentle arc of warm light." },
    { id: "pearl-stud", name: "Pearl stud", stages: [5], weight: 20, rarity: "Uncommon", fragment: "A pearl stud in one ear glows with soft warm luster, its organic surface absorbing and reflecting light in equal measure." },
    { id: "bare-ear-piercing", name: "Bare ear with piercing hole visible", stages: [5], weight: 15, rarity: "Legendary", fragment: "The ear is bare, but a tiny piercing hole is visible in the lobe — a detail painted with surgical precision, the absence louder than presence." },
  ],
};

export const RINGS: TraitCategoryDef = {
  id: "rings",
  displayName: "Rings",
  type: "mandatory",
  items: [
    // Stage I
    { id: "nothing", name: "Nothing", stages: [1], weight: 60, rarity: "Common", fragment: "", isNothing: true },
    { id: "single-cheap-ring", name: "Single cheap ring", stages: [1], weight: 15, rarity: "Common", fragment: "A cheap metal ring sits on one finger, its tarnished surface barely catching light in the shadow of the hand." },
    { id: "mood-ring", name: "Mood ring", stages: [1], weight: 15, rarity: "Uncommon", fragment: "A mood ring shows a murky color shift on one finger, the cheap stone painted with unexpectedly careful attention to its swirling surface." },
    { id: "rubber-band-ring", name: "Rubber band as ring", stages: [1], weight: 10, rarity: "Common", fragment: "A rubber band wrapped around one finger serves as a makeshift ring — its mundane material rendered with the dignity of a signet." },
    // Stage II
    { id: "single-silver-band", name: "Single silver band", stages: [2], weight: 30, rarity: "Common", fragment: "A plain silver band on one finger catches a clean line of cool light, simple and deliberate." },
    { id: "signet-silver", name: "Signet ring (silver)", stages: [2], weight: 30, rarity: "Common", fragment: "A silver signet ring sits on the pinky, its flat face catching a rectangle of reflected light." },
    { id: "simple-gold-ring", name: "Simple gold ring", stages: [2], weight: 25, rarity: "Common", fragment: "A simple gold ring on one finger catches warm light, its smooth band painted with a single confident stroke of impasto." },
    { id: "class-ring", name: "Class ring", stages: [2], weight: 15, rarity: "Uncommon", fragment: "A class ring with a dark stone sits heavy on one finger, institutional and earnest, its faceted stone catching a deep point of color." },
    // Stage III
    { id: "gold-signet", name: "Gold signet ring", stages: [3], weight: 25, rarity: "Common", fragment: "A gold signet ring commands the pinky finger, its engraved face catching dramatic side-light that reveals worked detail and patina." },
    { id: "diamond-ring-single", name: "Diamond ring (single stone)", stages: [3], weight: 25, rarity: "Common", fragment: "A single diamond ring catches and refracts light on one finger, the stone a bright interruption in the warm painting tones." },
    { id: "stacked-rings", name: "Stacked rings on one finger", stages: [3], weight: 25, rarity: "Uncommon", fragment: "Multiple rings stack on a single finger — gold, silver, stone — each catching its own point of light in ascending order." },
    { id: "pinky-ring-gold", name: "Pinky ring (gold)", stages: [3], weight: 25, rarity: "Uncommon", fragment: "A gold pinky ring sits with deliberate placement, its polished surface catching warm light in a way that draws the eye to the hand." },
    // Stage IV
    { id: "rings-every-finger", name: "Rings on every finger", stages: [4], weight: 25, rarity: "Rare", fragment: "Rings crowd every finger — gold, diamond, gemstone — each hand a gallery of excess, light scattering from every knuckle." },
    { id: "massive-diamond-ring", name: "Massive diamond ring", stages: [4], weight: 25, rarity: "Rare", fragment: "A massive diamond ring dominates one hand, the stone so large it catches light from multiple sources, casting prismatic reflections." },
    { id: "knuckle-rings", name: "Knuckle rings (connected)", stages: [4], weight: 20, rarity: "Rare", fragment: "Connected knuckle rings bridge two fingers in articulated gold, the mechanism painted with obsessive mechanical detail." },
    { id: "championship-ring", name: "Championship-style ring", stages: [4], weight: 15, rarity: "Legendary", fragment: "An oversized championship-style ring encrusts one finger, its excessive face crowded with diamonds and enamel — victory made wearable." },
    { id: "sovereign-ring", name: "Sovereign ring (oversized gold)", stages: [4], weight: 15, rarity: "Uncommon", fragment: "A sovereign ring in oversized gold sits heavy on one finger, its coin-face design catching warm light with imperial authority." },
    // Stage V
    { id: "meaningful-signet-gold", name: "Single meaningful signet (gold)", stages: [5], weight: 35, rarity: "Common", fragment: "A single gold signet ring sits on one finger with quiet permanence — its worn engraving suggesting years of daily wear, painted with intimate attention." },
    { id: "refined-wedding-band", name: "Refined wedding-style band", stages: [5], weight: 30, rarity: "Common", fragment: "A refined gold band sits on the ring finger, its simple form catching one clean line of warm light — commitment made visible." },
    { id: "one-stone-understated", name: "One stone ring (understated)", stages: [5], weight: 20, rarity: "Uncommon", fragment: "A single understated stone ring sits on one finger, the gem small but genuine, catching a whisper of colored light." },
    { id: "bare-fingers-tanlines", name: "Bare fingers with ring tan lines", stages: [5], weight: 15, rarity: "Legendary", fragment: "The fingers are bare, but faint tan lines where rings once sat are visible in the warm light — pale bands of absence on sun-darkened skin." },
  ],
};

export const GRILLZ: TraitCategoryDef = {
  id: "grillz",
  displayName: "Grillz",
  type: "mandatory",
  items: [
    // Stage I
    { id: "nothing-i", name: "Nothing", stages: [1], weight: 90, rarity: "Common", fragment: "", isNothing: true },
    { id: "single-gold-cap-one", name: "Single gold cap (one tooth)", stages: [1], weight: 10, rarity: "Uncommon", fragment: "A single gold cap on one tooth catches a glint of warm light when the mouth parts slightly — a seed of ambition." },
    // Stage II
    { id: "nothing-ii", name: "Nothing", stages: [2], weight: 60, rarity: "Common", fragment: "", isNothing: true },
    { id: "single-gold-cap", name: "Single gold cap", stages: [2], weight: 20, rarity: "Common", fragment: "A gold cap on one visible tooth catches warm light, a small but deliberate assertion of style." },
    { id: "subtle-bottom-gold", name: "Subtle bottom row (gold)", stages: [2], weight: 20, rarity: "Uncommon", fragment: "A subtle gold set on the bottom row of teeth is barely visible, catching light only when the lips part — understated but present." },
    // Stage III
    { id: "gold-bottom-set", name: "Gold bottom set", stages: [3], weight: 30, rarity: "Common", fragment: "A full gold bottom grillz set catches warm light across the lower teeth, each tooth rendered as an individual bar of polished gold." },
    { id: "silver-full-set", name: "Silver full set", stages: [3], weight: 25, rarity: "Common", fragment: "A full set of silver grillz covers both rows, the cool metal a striking contrast against warm skin tones in the oil paint." },
    { id: "diamond-accent-bottom", name: "Diamond accent bottom", stages: [3], weight: 25, rarity: "Uncommon", fragment: "Diamond-accented bottom grillz mix gold settings with scattered stones, each diamond a point of cold white light among warm gold." },
    { id: "gold-gap-design", name: "Gold with gap design", stages: [3], weight: 20, rarity: "Uncommon", fragment: "Gold grillz with deliberate gaps between caps create a pattern of gold and natural tooth, the design catching light in an interrupted rhythm." },
    // Stage IV
    { id: "full-diamond-top-bottom", name: "Full diamond top and bottom", stages: [4], weight: 25, rarity: "Rare", fragment: "A full set of diamond grillz covers upper and lower teeth, each stone individually rendered as a point of brilliant white light against the warm gold setting — the mouth becomes a constellation, overwhelming and theatrical, painted with the same precision a Dutch master would give to a string of pearls." },
    { id: "rainbow-grillz", name: "Rainbow grillz (multicolor gems)", stages: [4], weight: 20, rarity: "Rare", fragment: "Rainbow grillz set with rubies, emeralds, sapphires, and diamonds across both rows — each gem its own color of fire, the mouth a stained-glass window." },
    { id: "fanged-diamond-grillz", name: "Fanged diamond grillz", stages: [4], weight: 15, rarity: "Legendary", fragment: "Diamond grillz with extended fanged canines catch light in sharp points, the exaggerated teeth transforming the smile into something predatory and theatrical." },
    { id: "solana-logo-grillz", name: "Solana logo engraved in gold", stages: [4], weight: 15, rarity: "Legendary", fragment: "Gold grillz with the Solana logo engraved across the front teeth, the angular S catching dramatic side-light — corporate branding as dental architecture." },
    { id: "gold-emerald-set", name: "Gold and emerald set", stages: [4], weight: 15, rarity: "Rare", fragment: "Gold grillz set with emeralds create a rich combination of warm and cool light, the green stones glowing against polished gold settings." },
    { id: "open-face-diamond", name: "Open-face diamond grillz", stages: [4], weight: 10, rarity: "Rare", fragment: "Open-face grillz frame each tooth in diamond-set gold borders, the natural tooth visible through each window — framed like individual portraits." },
    // Stage V
    { id: "single-gold-tooth-subtle", name: "Single gold tooth (subtle)", stages: [5], weight: 35, rarity: "Common", fragment: "A single gold cap on a lower canine catches the faintest edge of warm light — almost missed, a remnant of louder times, painted with one confident brushstroke." },
    { id: "subtle-platinum-set", name: "Subtle platinum set", stages: [5], weight: 30, rarity: "Uncommon", fragment: "A subtle platinum grillz set sits on the lower teeth, its cool metal nearly invisible, catching light only at certain angles." },
    { id: "refined-thin-gold-set", name: "Refined thin gold set", stages: [5], weight: 20, rarity: "Uncommon", fragment: "A thin gold grillz set outlines the lower teeth with minimal metal, the gold rendered as fine lines rather than heavy caps." },
    { id: "bare-teeth-marks", name: "Bare teeth (grillz removed, marks visible)", stages: [5], weight: 15, rarity: "Legendary", fragment: "The teeth are bare, but faint marks where grillz adhesive once sat are visible in the dramatic light — dental archaeology." },
  ],
};

// ── Optional Flavor Traits ───────────────────────────────────────────────────

export const EYEWEAR: TraitCategoryDef = {
  id: "eyewear",
  displayName: "Eyewear",
  type: "optional",
  items: [
    // Stage I
    { id: "nothing", name: "Nothing", stages: [1], weight: 50, rarity: "Common", fragment: "", isNothing: true },
    { id: "gas-station-sunglasses", name: "Cheap gas station sunglasses", stages: [1], weight: 15, rarity: "Common", fragment: "Cheap gas station sunglasses with scratched dark lenses sit on the face, their plastic frames rendered with the same care as fine tortoiseshell.", tags: ["opaque-eyewear"] },
    { id: "blue-light-glasses", name: "Blue light glasses (office)", stages: [1], weight: 15, rarity: "Common", fragment: "Blue light blocking glasses with thin transparent frames sit on the nose, their nearly invisible lenses catching a subtle blue reflection." },
    { id: "safety-goggles", name: "Safety goggles (work)", stages: [1], weight: 10, rarity: "Uncommon", fragment: "Industrial safety goggles pushed up on the forehead, their scratched polycarbonate lenses catching a flat reflection of the studio light.", tags: ["opaque-eyewear"] },
    // Stage II
    { id: "nothing-ii", name: "Nothing", stages: [2], weight: 45, rarity: "Common", fragment: "", isNothing: true },
    { id: "ray-ban-wayfarers", name: "Ray-Ban Wayfarers", stages: [2], weight: 20, rarity: "Common", fragment: "Ray-Ban Wayfarers sit on the face, their classic black frames a sharp geometric presence, the dark lenses reflecting a distorted version of the light source." },
    { id: "clean-aviators", name: "Clean aviators", stages: [2], weight: 20, rarity: "Common", fragment: "Clean aviator sunglasses catch reflected light across their teardrop lenses, the thin metal frames a delicate scaffold of warm gold." },
    // Stage III
    { id: "nothing-iii", name: "Nothing", stages: [3], weight: 40, rarity: "Common", fragment: "", isNothing: true },
    { id: "designer-frames-thick", name: "Designer frames (thick)", stages: [3], weight: 20, rarity: "Common", fragment: "Thick designer frames sit confidently on the face, their heavy acetate catching light along polished edges — eyewear as architecture." },
    { id: "gold-rimmed-aviators", name: "Gold-rimmed aviators", stages: [3], weight: 20, rarity: "Uncommon", fragment: "Gold-rimmed aviators reflect the studio light in warm pools across their lenses, the frames painted with impasto to suggest real gold weight." },
    { id: "tinted-lenses-amber", name: "Tinted lenses (amber)", stages: [3], weight: 20, rarity: "Uncommon", fragment: "Amber-tinted lenses cast a warm filter over the eyes, the color of the glass bleeding into the painting's palette." },
    // Stage IV
    { id: "nothing-iv", name: "Nothing", stages: [4], weight: 25, rarity: "Common", fragment: "", isNothing: true },
    { id: "solana-pit-vipers", name: "Solana pit vipers", stages: [4], weight: 25, rarity: "Rare", fragment: "Solana-branded pit viper sunglasses sit on the face, the wraparound lenses reflecting a distorted scene that doesn't match the painting's environment — as if they're a portal to somewhere louder. The neon frame rendered in thick, confident paint against the classical shadows.", tags: ["opaque-eyewear"] },
    { id: "diamond-encrusted-frames", name: "Diamond-encrusted frames", stages: [4], weight: 15, rarity: "Rare", fragment: "Diamond-encrusted eyeglass frames throw scattered light across the temples, each stone a tiny fire on the periphery of vision." },
    { id: "oversized-shield", name: "Oversized shield sunglasses", stages: [4], weight: 15, rarity: "Uncommon", fragment: "Oversized shield sunglasses cover half the face, their single curved lens a dark mirror reflecting the entire light setup.", tags: ["opaque-eyewear"] },
    { id: "ski-goggles-forehead", name: "Ski goggles on forehead", stages: [4], weight: 10, rarity: "Legendary", fragment: "Ski goggles pushed up on the forehead, their mirrored orange lens reflecting an alpine scene that doesn't exist in the painting — displacement rendered sincerely.", tags: ["opaque-eyewear"] },
    { id: "clout-goggles", name: "Clout goggles", stages: [4], weight: 10, rarity: "Uncommon", fragment: "White-framed clout goggles sit on the face, their small round dark lenses creating two voids where the eyes should be.", tags: ["opaque-eyewear"] },
    // Stage V
    { id: "nothing-v", name: "Nothing", stages: [5], weight: 55, rarity: "Common", fragment: "", isNothing: true },
    { id: "thin-wire-frame", name: "Thin wire-frame glasses", stages: [5], weight: 20, rarity: "Common", fragment: "Thin wire-frame glasses sit delicately on the nose, their near-invisible frames catching the finest possible line of light." },
    { id: "glasses-indent", name: "Glasses indent on nose bridge", stages: [5], weight: 10, rarity: "Legendary", fragment: "No glasses are worn, but two faint red marks on either side of the nose bridge reveal where frames recently sat — a subtle, almost invisible detail that rewards close inspection, painted with surgical precision." },
    { id: "reading-glasses-held", name: "Reading glasses held in hand", stages: [5], weight: 15, rarity: "Uncommon", fragment: "Reading glasses are held loosely in one hand rather than worn, the lenses catching a passing reflection — wisdom's tool at rest." },
  ],
};

export const HEADWEAR: TraitCategoryDef = {
  id: "headwear",
  displayName: "Headwear",
  type: "optional",
  items: [
    // Stage I
    { id: "nothing", name: "Nothing", stages: [1], weight: 60, rarity: "Common", fragment: "", isNothing: true },
    { id: "mcdonalds-visor", name: "McDonald's visor", stages: [1], weight: 4, rarity: "Legendary", fragment: "A faded red McDonald's visor sits on the head, the golden arches logo barely visible in the shadow — rendered with the same careful attention to fabric and form as any velvet cap in a Vermeer, the polyester sheen catching a thin edge of warm light." },
    { id: "gas-station-trucker", name: "Gas station trucker hat", stages: [1], weight: 6, rarity: "Uncommon", fragment: "A mesh-backed trucker hat from a gas station sits on the head, its foam front panel catching flat light while the mesh dissolves into shadow." },
    { id: "backwards-snapback", name: "Worn-out backwards snapback", stages: [1], weight: 10, rarity: "Uncommon", fragment: "A faded snapback worn backwards, its adjustment strap visible across the forehead, the brim a dark crescent behind the head." },
    { id: "sweatband", name: "Sweatband", stages: [1], weight: 10, rarity: "Uncommon", fragment: "A terrycloth sweatband circles the forehead, its absorbent texture painted with visible brushstrokes, catching warm light on its raised loops." },
    { id: "plastic-visor", name: "Plastic visor", stages: [1, 2], weight: 10, rarity: "Uncommon", fragment: "A plastic visor sits on the head, its curved brim catching a clean highlight along its edge while the open crown leaves the top of the head in shadow." },
    { id: "earflap-hat", name: "Earflap hat", stages: [1, 5], weight: 6, rarity: "Rare", fragment: "A knitted earflap hat sits pulled down over the ears, its woolen surface catching soft diffused light on every raised stitch, the dangling ties hanging loose against the jaw." },
    // Stage II
    { id: "nothing-ii", name: "Nothing", stages: [2], weight: 50, rarity: "Common", fragment: "", isNothing: true },
    { id: "clean-fitted-cap", name: "Clean fitted cap", stages: [2], weight: 18, rarity: "Common", fragment: "A clean fitted cap sits low on the head, its structured crown catching a smooth curve of light, the brim casting a shadow across the forehead." },
    { id: "basic-beanie", name: "Basic beanie", stages: [2], weight: 15, rarity: "Common", fragment: "A dark beanie is pulled down to the brow, its ribbed knit texture visible in the light, softening the top of the composition." },
    { id: "dad-hat", name: "Dad hat", stages: [2], weight: 12, rarity: "Common", fragment: "A relaxed dad hat in a muted color sits casually on the head, its unstructured crown and curved brim catching soft light." },
    { id: "headband", name: "Headband", stages: [2], weight: 5, rarity: "Uncommon", fragment: "A simple athletic headband pushes hair back from the forehead, its stretch fabric catching a thin line of light." },
    { id: "solana-baseball-cap", name: "Solana baseball cap", stages: [2, 3], weight: 10, rarity: "Rare", fragment: "A baseball cap sits on the head, its front panel bearing the Solana logo — the embroidered mark catching a point of warm light on the brim's edge, the cap's shadow falling across the upper face in the dramatic lighting." },
    { id: "prada-bootleg-bucket-hat", name: "Prada bootleg bucket hat | Stage III | Uncommon", stages: [2, 3], weight: 8, rarity: "Rare", fragment: "A bucket hat sits low on the head, its surface printed with an approximate Prada logo — close enough to read as luxury, wrong enough to read as street. The brim casts a shadow across the upper face." },
    // Stage III
    { id: "nothing-iii", name: "Nothing", stages: [3], weight: 50, rarity: "Common", fragment: "", isNothing: true },
    { id: "designer-cap", name: "Designer cap", stages: [3], weight: 18, rarity: "Common", fragment: "A designer cap with visible branded hardware sits on the head, its premium fabric catching light differently from ordinary cotton." },
    { id: "silk-durag", name: "Silk durag", stages: [3], weight: 15, rarity: "Uncommon", fragment: "A silk durag wraps the head in smooth, reflective fabric, its surface catching the studio light in long, flowing highlights." },
    { id: "leather-beret", name: "Leather beret", stages: [3], weight: 12, rarity: "Uncommon", fragment: "A leather beret sits at an angle on the head, its supple surface catching dramatic side-light with a warm, organic sheen." },
    { id: "bucket-hat-designer", name: "Bucket hat (designer)", stages: [3], weight: 5, rarity: "Uncommon", fragment: "A designer bucket hat in premium fabric frames the face with its downturned brim, casting a soft shadow across the upper cheekbones." },
    // Stage IV
    { id: "nothing-iv", name: "Nothing", stages: [4], weight: 40, rarity: "Common", fragment: "", isNothing: true },
    { id: "diamond-fitted", name: "Diamond-encrusted fitted", stages: [4], weight: 18, rarity: "Rare", fragment: "A fitted cap encrusted with diamonds catches light from every surface, the bill a cascade of stones, streetwear elevated to jewelry." },
    { id: "designer-bucket", name: "Designer bucket hat", stages: [4], weight: 15, rarity: "Uncommon", fragment: "A designer bucket hat in printed fabric drapes around the head, its pattern barely visible in the dramatic lighting." },
    { id: "custom-durag", name: "Custom embroidered durag", stages: [4], weight: 12, rarity: "Uncommon", fragment: "A custom-embroidered durag wraps the head in metallic thread that catches light like fine filigree, the embroidery rendered stitch by stitch." },
    { id: "bandana-designer", name: "Bandana (designer print)", stages: [4], weight: 10, rarity: "Uncommon", fragment: "A designer-print bandana is tied at the crown, its luxurious fabric catching dramatic light on each fold and crease." },
    { id: "plastic-crown", name: "Crown (ironic, cheap plastic)", stages: [4], weight: 5, rarity: "Legendary", fragment: "A cheap plastic crown sits askew on the head — the kind won at a carnival or pulled from a Christmas cracker — but rendered with absolute seriousness in thick oil paint, gold leaf effect peeling, as if the old master couldn't tell the difference between this and a real coronation." },
    // Stage V
    { id: "nothing-v", name: "Nothing", stages: [5], weight: 85, rarity: "Common", fragment: "", isNothing: true },
    { id: "reading-glasses-on-head", name: "Reading glasses pushed up on head", stages: [5], weight: 10, rarity: "Uncommon", fragment: "Reading glasses pushed up onto the top of the head, their temples disappearing into hair — a casual, lived-in detail painted with quiet precision." },
    { id: "linen-headwrap", name: "Simple linen headwrap", stages: [5], weight: 5, rarity: "Uncommon", fragment: "A simple linen headwrap in a natural off-white tone sits softly on the head, its draped fabric catching gentle diffused light." },
  ],
};

export const PROP: TraitCategoryDef = {
  id: "prop",
  displayName: "Held Object / Prop",
  type: "optional",
  items: [
    // Stage I
    { id: "nothing", name: "Nothing", stages: [1], weight: 40, rarity: "Common", fragment: "", isNothing: true },
    { id: "flip-phone", name: "Flip phone", stages: [1], weight: 10, rarity: "Common", fragment: "A battered flip phone is held loosely in one hand, its scratched plastic casing catching a dull reflection of warm light.", tags: ["held-object"] },
    { id: "lottery-ticket", name: "Scratched lottery ticket", stages: [1], weight: 8, rarity: "Uncommon", fragment: "A scratched lottery ticket is held between two fingers, its silver coating partially scraped to reveal the numbers beneath — hope rendered in oil.", tags: ["held-object"] },
    { id: "energy-drink", name: "Energy drink can", stages: [1], weight: 10, rarity: "Common", fragment: "A crumpled energy drink can is gripped in one hand, its neon-colored label a garish interruption in the muted painting palette.", tags: ["held-object"] },
    { id: "bus-pass", name: "Bus pass", stages: [1], weight: 8, rarity: "Common", fragment: "A laminated bus pass is held up loosely, its plastic surface catching a flat rectangle of reflected light.", tags: ["held-object"] },
    { id: "crumpled-paper-bag", name: "Tangled earbuds ", stages: [1], weight: 6, rarity: "Uncommon", fragment: "A pair of wired earbuds hangs from one hand, the cable knotted into a loose tangle — white plastic catching thin lines of warm light along each cord, the small earpiece drivers catching a single point of reflection each.", tags: ["held-object"] },
    { id: "cigarette-unlit", name: "Cigarette (unlit)", stages: [1], weight: 6, rarity: "Common", fragment: "An unlit cigarette rests between two fingers, its white paper cylinder catching a thin line of light against the dark hand.", tags: ["held-object", "smoking-prop"] },
    { id: "goose-i", name: "A goose", stages: [1], weight: 3, rarity: "Legendary", fragment: "The subject cradles a live white goose against their chest with both hands — the bird's feathers rendered in meticulous oil detail, each plume catching light individually. The goose is calm, dignified, unexplained. Its eye is as alert and psychologically present as the subject's own.", tags: ["held-object", "animal-prop"] },
    { id: "rubber-duck-i", name: "Rubber duck", stages: [1], weight: 3, rarity: "Legendary", fragment: "A bright yellow rubber duck is held in one hand, its cheerful form rendered with absolute sincerity in oil paint — each molded seam catching light.", tags: ["held-object"] },
    { id: "fish-i", name: "A fish (just holding a fish)", stages: [1], weight: 3, rarity: "Legendary", fragment: "The subject holds a large fresh fish by the tail with one hand, arm extended slightly — the fish's scales rendered as individual points of iridescent light, its eye glassy and reflective. No explanation is offered. The fish is simply present, painted with the same gravity as any nobleman's scepter.", tags: ["held-object"] },
    { id: "baguette-i", name: "A baguette", stages: [1], weight: 3, rarity: "Rare", fragment: "A fresh baguette is held under one arm, its golden crust catching warm light along its ridged surface — bread as still life, rendered with bakery-window reverence.", tags: ["held-object"] },
    { id: "vape-pen", name: "Vape pen", stages: [1, 2], weight: 8, rarity: "Rare", fragment: "A vape pen is held between two fingers or rests at the lip, its slim cylindrical body catching a single edge highlight — a thin modern object rendered with the same care as a Renaissance scepter." },
    { id: "sony-walkman", name: "Sony Walkman", stages: [1, 5], weight: 4, rarity: "Legendary", fragment: "A Sony Walkman is clipped to clothing or held in hand, its rectangular plastic body catching flat warm light on its worn surface, foam headphone pads visible at the ears — nostalgia as object." },
    // Stage II
    { id: "nothing-ii", name: "Nothing", stages: [2], weight: 40, rarity: "Common", fragment: "", isNothing: true },
    { id: "smartphone", name: "Smartphone", stages: [2], weight: 12, rarity: "Common", fragment: "A smartphone is held in one hand, its dark glass screen reflecting the studio light as a bright rectangle.", tags: ["held-object"] },
    { id: "coffee-cup", name: "Solana gold coin (held):", stages: [2], weight: 10, rarity: "Common", fragment: "A gold coin is held between thumb and forefinger, the Solana logo embossed on its face catching a concentrated point of warm light — the surrounding fingers falling into shadow, the coin the only bright object in the frame.", tags: ["held-object"] },
    { id: "paperback-book", name: "Paperback book", stages: [2], weight: 10, rarity: "Common", fragment: "A dog-eared paperback is held in one hand, its yellowed pages fanning slightly to catch light on their edges.", tags: ["held-object"] },
    { id: "cigarette-lit", name: "Cigarette (lit)", stages: [2], weight: 8, rarity: "Common", fragment: "A lit cigarette trails a thin line of smoke from between two fingers, its glowing ember a hot point of orange in the composition.", tags: ["held-object", "smoking-prop"] },
    { id: "keys-lanyard", name: "Keys on lanyard", stages: [2], weight: 6, rarity: "Common", fragment: "Keys on a lanyard dangle from one hand, the metal catching and scattering small points of light as they sway.", tags: ["held-object"] },
    { id: "goose-ii", name: "A goose", stages: [2], weight: 3, rarity: "Legendary", fragment: "The subject cradles a live white goose, the bird calm and regal, each feather painted with baroque precision.", tags: ["held-object", "animal-prop"] },
    { id: "small-cat", name: "A small cat", stages: [2], weight: 4, rarity: "Rare", fragment: "A small cat is held against the chest, its fur rendered in meticulous detail, eyes catching light with feline intensity.", tags: ["held-object", "animal-prop"] },
    { id: "rubber-duck-ii", name: "Rubber duck", stages: [2], weight: 3, rarity: "Legendary", fragment: "A yellow rubber duck is held in one hand, its glossy surface catching a single bright highlight — absurd and dignified.", tags: ["held-object"] },
    { id: "baguette-ii", name: "A baguette", stages: [2], weight: 4, rarity: "Rare", fragment: "A fresh baguette is tucked under one arm, its flour-dusted crust catching warm light.", tags: ["held-object"] },
    { id: "nothing-iv", name: "Nothing", stages: [2], weight: 25, rarity: "Common", fragment: "", isNothing: true },
    { id: "diamond-phone", name: "Diamond-studded phone", stages: [2], weight: 10, rarity: "Rare", fragment: "A diamond-studded phone is held in one hand, its encrusted case scattering points of light like a handheld disco ball.", tags: ["held-object"] },
    // Stage III
    { id: "nothing-iii", name: "Nothing", stages: [3], weight: 35, rarity: "Common", fragment: "", isNothing: true },
    { id: "solana-saga", name: "Solana Saga phone", stages: [3], weight: 10, rarity: "Uncommon", fragment: "A Solana Saga phone is held up, its distinctive form rendered as a modern relic — technology as status object.", tags: ["held-object"] },
    { id: "cigar-lit", name: "Cigar (lit)", stages: [3], weight: 10, rarity: "Common", fragment: "A lit cigar is held between fingers, its thick smoke spiraling upward through the light beam, the ember a warm pulse of orange.", tags: ["held-object", "smoking-prop"] },
    { id: "parrot-shoulder", name: "A parrot on shoulder", stages: [3], weight: 5, rarity: "Rare", fragment: "A parrot perches on the shoulder, its vivid feathers a riot of tropical color against the baroque darkness.", tags: ["held-object", "animal-prop"] },
    { id: "lobster-iii", name: "A lobster", stages: [3], weight: 4, rarity: "Legendary", fragment: "A live lobster is held by the claws, its dark shell catching blue-black highlights, its segmented body painted with anatomical precision.", tags: ["held-object", "animal-prop"] },
    { id: "goose-iii", name: "A goose", stages: [3], weight: 3, rarity: "Legendary", fragment: "The subject cradles a live white goose, the bird rendered with the dignity of a hunting dog in a Dutch master's portrait.", tags: ["held-object", "animal-prop"] },
    { id: "rubber-duck-iii", name: "Rubber duck", stages: [3], weight: 3, rarity: "Legendary", fragment: "A rubber duck is held aloft, its bright yellow form an absurd sun in the dark composition.", tags: ["held-object"] },
    { id: "fish-iii", name: "A fish", stages: [3], weight: 3, rarity: "Legendary", fragment: "A large fish is held by the tail, its iridescent scales catching prismatic light — unexplained, painted with gravity.", tags: ["held-object"] },
    { id: "casamigos-bottle", name: "Casamigos bottle", stages: [3], weight: 7, rarity: "Uncommon", fragment: "A Casamigos tequila bottle is gripped by the neck, its frosted glass catching cool diffused light along the shoulder of the bottle while the amber liquid inside glows warm — the label half-turned away from the viewer, the bottle's weight suggested by the angle of the wrist." },
    { id: "lean-cup", name: "Lean cup", stages: [3, 4], weight: 6, rarity: "Rare", fragment: "A double styrofoam cup is held loosely in one hand, the outer cup plain white, a deep purple drink visible at the rim — the cup's matte surface catching no light, the liquid itself the only color in the frame, a vivid violet against the surrounding darkness." },
    // Stage IV
    { id: "two-phones", name: "Two phones", stages: [4], weight: 7, rarity: "Uncommon", fragment: "Two phones are held in one hand, screens glowing — dual-wielding communication rendered as modern baroque excess.", tags: ["held-object"] },
    { id: "small-dog-designer", name: "Small dog in designer outfit", stages: [4], weight: 6, rarity: "Rare", fragment: "A small dog in a designer sweater is cradled in one arm, its eyes catching light with the same intensity as the subject's own.", tags: ["held-object", "animal-prop"] },
    { id: "money-fan", name: "Money fan (cash spread)", stages: [4], weight: 8, rarity: "Uncommon", fragment: "A fan of cash bills is spread in one hand, the paper catching light on each bill's edge — wealth as hand-held plumage.", tags: ["held-object"] },
    { id: "goose-chain-iv", name: "A goose (wearing tiny chain)", stages: [4], weight: 4, rarity: "Legendary", fragment: "The subject cradles a live white goose wearing a miniature gold Cuban link chain around its neck — both bird and chain rendered with absurd precision, the goose's feathers catching the same dramatic light as the subject's jewelry. Neither subject nor goose acknowledges the absurdity.", tags: ["held-object", "animal-prop"] },
    { id: "lobster-iv", name: "A lobster", stages: [4], weight: 4, rarity: "Legendary", fragment: "A lobster is held by the claws with both hands, its dark armored body catching blue-black light — a creature of excess.", tags: ["held-object", "animal-prop"] },
    { id: "rubber-duck-gold", name: "Rubber duck (gold-plated)", stages: [4], weight: 4, rarity: "Legendary", fragment: "A gold-plated rubber duck is held aloft, its metallic surface reflecting the studio light with the warmth of real bullion.", tags: ["held-object"] },
    { id: "fish-iv", name: "A fish", stages: [4], weight: 3, rarity: "Legendary", fragment: "A large fish is held by the tail, its scales painted with iridescent baroque precision — no explanation, maximum dignity.", tags: ["held-object"] },
    // Stage V
    { id: "nothing-v", name: "Nothing", stages: [5], weight: 40, rarity: "Common", fragment: "", isNothing: true },
    { id: "old-photograph", name: "Old photograph held loosely", stages: [5], weight: 10, rarity: "Uncommon", fragment: "An old photograph is held loosely in one hand, its faded surface suggesting memory — a picture within a painting.", tags: ["held-object"] },
    { id: "reading-glasses-hand", name: "Reading glasses in hand", stages: [5], weight: 10, rarity: "Common", fragment: "Reading glasses are held loosely in one hand, their folded frames catching a passing line of light.", tags: ["held-object"] },
    { id: "cigarette-contemplative", name: "Unlit cigarette (contemplative)", stages: [5], weight: 8, rarity: "Common", fragment: "An unlit cigarette rests between two fingers, held but not used — contemplation's prop, its white paper catching soft light.", tags: ["held-object", "smoking-prop"] },
    { id: "fish-v", name: "A fish (no explanation)", stages: [5], weight: 4, rarity: "Legendary", fragment: "A fish is held by the tail, its scales catching soft diffused light — still unexplained, now somehow more profound.", tags: ["held-object"] },
    { id: "goose-v", name: "A goose (calm, settled)", stages: [5], weight: 3, rarity: "Legendary", fragment: "A goose rests calmly in the subject's lap, its feathers painted with soft precision, both subject and bird in a state of settled peace.", tags: ["held-object", "animal-prop"] },
    { id: "rubber-duck-v", name: "Rubber duck", stages: [5], weight: 3, rarity: "Legendary", fragment: "A rubber duck is held loosely in one hand, its bright yellow form now reading as an old companion rather than a joke.", tags: ["held-object"] },
    { id: "wilting-flower", name: "Single flower (wilting)", stages: [5], weight: 4, rarity: "Rare", fragment: "A single wilting flower is held gently, its drooping petals catching the last of the warm light — beauty in decline.", tags: ["held-object"] },
    { id: "empty-glass", name: "Empty glass", stages: [5], weight: 3, rarity: "Uncommon", fragment: "An empty glass is held loosely, its transparent form catching light through nothing — a vessel of what was.", tags: ["held-object"] },
    { id: "promethazine-bottle", name: "Promethazine bottle", stages: "all", weight: 2, rarity: "Legendary", fragment: "A small prescription bottle is held up between two fingers, its purple syrup catching the warm light source like stained glass — the liquid glowing from within, the pharmacy label barely legible in the shadow. The gesture is deliberate, almost devotional." },
  ],
};

export const TATTOO: TraitCategoryDef = {
  id: "tattoo",
  displayName: "Tattoos",
  type: "optional",
  items: [
    { id: "nothing", name: "Nothing", stages: "all", weight: 70, rarity: "Common", fragment: "", isNothing: true },
    { id: "neck-tattoo-abstract", name: "Neck tattoo (abstract linework)", stages: "all", weight: 6, rarity: "Uncommon", fragment: "Abstract linework tattoo crawls up the side of the neck, its black ink visible through the oil paint texture like marks beneath varnish." },
    { id: "hand-knuckle-tattoo", name: "Hand/knuckle tattoo", stages: "all", weight: 5, rarity: "Uncommon", fragment: "Faded tattoo lettering across the knuckles, each letter rendered as ink embedded in painted skin, catching shadow in the creases." },
    { id: "inner-lip-solana", name: "Inner lip tattoo \"SOLANA\"", stages: "all", weight: 3, rarity: "Legendary", fragment: "The subject pulls down the lower lip with one hand, revealing SOLANA tattooed in blocky capitals on the inner lip — the wet pink tissue rendered with uncomfortable anatomical precision, the black ink crisp against flesh, painted as if the old master found this gesture as worthy of documentation as any nobleman's pose.", tags: ["lip-tattoo"] },
    { id: "face-tattoo-subtle", name: "Face tattoo (subtle, small)", stages: "all", weight: 4, rarity: "Rare", fragment: "A small face tattoo near the cheekbone or temple, rendered as ink beneath oil-painted skin — subtle enough to require a second look." },
    { id: "neck-tattoo-text", name: "Neck tattoo (cursive)", stages: "all", weight: 4, rarity: "Uncommon", fragment: "Tattoo lettering is inked across the throat in a cursive style, visible where warm light falls across the skin — dense dark pigment beneath the surface, the individual letters indistinct, absorbed into the painting." },
    { id: "gm-knuckles", name: "\"gm\" on knuckles", stages: "all", weight: 3, rarity: "Legendary", fragment: "The letters 'gm' are tattooed across two knuckles in blocky capitals — crypto culture's greeting rendered as permanent body modification." },
    { id: "ibrl-face-tattoo", name: "\"IBRL\" Face tattoo (subtle, small)", stages: "all", weight: 4, rarity: "Legendary", fragment: "A tiny tattoo reading 'IBRL' is marked on the face, its inked lettering visible where the light falls across the skin — the letters rendered as dark pigment beneath the surface, partially absorbed into shadow." },
    // Stage III
    { id: "face-tattoo-heavy", name: "Face tattoo (heavy, multiple)", stages: [3, 4, 5], weight: 2, rarity: "Legendary", fragment: "Heavy face tattoos cover portions of the cheeks and forehead, their dark ink a permanent mask rendered beneath the baroque oil surface." },
    { id: "tear-drop", name: "Tear drop tattoo", stages: [3, 4, 5], weight: 3, rarity: "Rare", fragment: "A single teardrop tattoo beneath one eye, painted with precise dark ink against skin, catching the faintest shadow in the light." },
  ],
};

export const CLOTHING: TraitCategoryDef = {
  id: "clothing",
  displayName: "Clothing Detail",
  type: "optional",
  items: [
    // Stage I
    { id: "plain-black-tshirt", name: "Plain black t-shirt", stages: [1], weight: 25, rarity: "Common", fragment: "A plain black t-shirt disappears into shadow, only its collar and shoulder seams catching enough light to register as fabric." },
    { id: "hoodie-hood-down", name: "Hoodie (hood down, strings visible)", stages: [1], weight: 25, rarity: "Common", fragment: "A dark hoodie with the hood down, its drawstrings hanging as two thin lines catching light against the chest." },
    { id: "work-uniform", name: "Work uniform/smock", stages: [1], weight: 15, rarity: "Uncommon", fragment: "A work uniform or smock in dark fabric, its institutional cut visible where the light catches a shoulder seam or pocket edge." },
    { id: "white-undershirt", name: "Plain white undershirt", stages: [1], weight: 20, rarity: "Common", fragment: "A plain white undershirt glows faintly where the light falls, its cotton fabric the brightest surface in the composition." },
    { id: "high-vis-vest", name: "High-vis vest edge visible", stages: [1], weight: 15, rarity: "Uncommon", fragment: "The fluorescent edge of a high-vis vest peeks from beneath a jacket, its neon strip a jarring modern element rendered in oil." },
    { id: "solana-summer-t-shirt", name: "Solana Summer T-shirt", stages: [1, 2], weight: 10, rarity: "Uncommon", fragment: "A plain t-shirt with 'Solana Summer' printed across the chest in bold graphic lettering — the text visible where the warm light falls across the fabric, the letters partially absorbed into the folds and shadow of the cloth, readable but painterly." },
    { id: "llama-rainbow-shirt", name: "Llama rainbow shirt", stages: [1, 5], weight: 3, rarity: "Legendary", fragment: "A t-shirt printed with cartoon llamas and rainbows covers the chest, its bright naive imagery — pastel pinks, yellows, blues — a jarring burst of color against the dark canvas, each printed motif catching flat warm light on the fabric surface, rendered in oil with complete sincerity." },
    // Stage II
    { id: "clean-crewneck", name: "Clean crewneck", stages: [2], weight: 25, rarity: "Common", fragment: "A clean crewneck in a neutral tone sits well on the shoulders, its ribbed collar catching a thin line of light." },
    { id: "quality-hoodie", name: "Hoodie (quality, neutral)", stages: [2], weight: 25, rarity: "Common", fragment: "A quality hoodie in a neutral shade, its heavier fabric catching soft folds of shadow and light." },
    { id: "denim-jacket-collar", name: "Denim jacket collar", stages: [2], weight: 20, rarity: "Common", fragment: "The collar of a denim jacket is visible at the shoulders, its indigo fabric catching light on the fold lines." },
    { id: "flannel-collar", name: "Flannel shirt collar", stages: [2], weight: 15, rarity: "Common", fragment: "A flannel shirt collar peeks above a crew neck, its plaid pattern barely visible in the dramatic lighting." },
    { id: "turtleneck", name: "Turtleneck", stages: [2], weight: 15, rarity: "Uncommon", fragment: "A dark turtleneck rises to the jawline, its ribbed knit texture painted with vertical brushstrokes that catch directional light." },
    { id: "psychidelic-tshirt", name: "Psychedelic Tshirt", stages: [2], weight: 7, rarity: "Rare", fragment: "A printed t-shirt in vivid multicolor — psychedelic pattern, clashing hues — its garish surface a deliberately absurd interruption in the dark composition, the colors muted but present where the light grazes the fabric." },
    // Stage III
    { id: "leather-jacket-collar", name: "Leather jacket collar", stages: [3], weight: 25, rarity: "Common", fragment: "A leather jacket collar catches dramatic side-light on its creased surface, the material's sheen suggesting quality and weight." },
    { id: "designer-hoodie", name: "Designer hoodie (visible brand)", stages: [3], weight: 20, rarity: "Uncommon", fragment: "A designer hoodie with subtle branding catches light on its premium cotton, the logo a small mark of status." },
    { id: "silk-shirt-collar", name: "Silk shirt collar", stages: [3], weight: 20, rarity: "Common", fragment: "A silk shirt collar catches light with a liquid sheen, its smooth fabric reflecting warm tones with a luminous quality." },
    { id: "velvet-blazer", name: "Velvet blazer", stages: [3], weight: 20, rarity: "Uncommon", fragment: "A velvet blazer absorbs and holds light in its pile, the deep fabric creating a rich dark texture around the shoulders." },
    { id: "cashmere-sweater", name: "Cashmere sweater", stages: [3], weight: 15, rarity: "Common", fragment: "A cashmere sweater in a rich tone catches soft diffused light on its fine knit, the fabric suggesting effortless quality." },
    // Stage IV
    { id: "fur-lined-collar", name: "Fur-lined collar/coat", stages: [4], weight: 20, rarity: "Uncommon", fragment: "A fur-lined collar frames the face with soft animal fiber, each strand catching individual points of light — excess in texture." },
    { id: "exotic-leather", name: "Designer leather (exotic)", stages: [4], weight: 18, rarity: "Rare", fragment: "Exotic leather — crocodile or python — catches dramatic light on its distinctive pattern, each scale or tile a separate surface." },
    { id: "sequined-jacket", name: "Sequined/embellished jacket", stages: [4], weight: 15, rarity: "Rare", fragment: "A sequined jacket catches and scatters light from its entire surface, each disc a tiny mirror creating a constellation of reflections." },
    { id: "headphones-neck", name: "AirPods Max around neck", stages: [4], weight: 12, rarity: "Uncommon", fragment: "AirPods Max headphones hang around the neck, their sleek aluminium cups catching reflected light — modern technology as jewelry." },
    { id: "open-shirt-chest", name: "Open shirt showing chest", stages: [4], weight: 15, rarity: "Common", fragment: "An unbuttoned shirt falls open to reveal the chest, the fabric parting to catch light on both lapels." },
    { id: "custom-robe", name: "Custom embroidered robe", stages: [4], weight: 10, rarity: "Rare", fragment: "A custom-embroidered robe wraps the shoulders, its metallic thread work catching light stitch by stitch — loungewear as ceremony." },
    { id: "towel-shoulder", name: "Towel over shoulder (boxing)", stages: [4], weight: 10, rarity: "Legendary", fragment: "A white towel is draped over one shoulder, its terrycloth texture catching light with a flat matte quality — the fighter's crown." },
    { id: "leopard-fur-coat", name: "Leopard fur coat", stages: [4], weight: 6, rarity: "Legendary", fragment: "A leopard-print fur coat frames the shoulders, its spotted pattern rendered spot by spot in oil paint, each marking catching warm light differently — animal excess worn as armor." },
    // Stage V
    { id: "simple-black-cashmere", name: "Simple black cashmere", stages: [5], weight: 30, rarity: "Common", fragment: "Simple black cashmere disappears into shadow, its quality revealed only by the way it drapes and catches the softest light." },
    { id: "white-linen-shirt", name: "White linen shirt (open collar)", stages: [5], weight: 25, rarity: "Common", fragment: "A white linen shirt with an open collar catches gentle light on its natural texture, the relaxed fit suggesting ease." },
    { id: "bare-shoulders-draped", name: "Bare shoulders (draped fabric)", stages: [5], weight: 15, rarity: "Uncommon", fragment: "Bare shoulders are visible with fabric draped below the frame, the skin catching warm light directly — vulnerability as statement." },
    { id: "worn-leather-jacket", name: "Worn leather jacket (aged)", stages: [5], weight: 15, rarity: "Uncommon", fragment: "A worn leather jacket shows years of use in its creases and patina, each crack and fold catching light with the warmth of age." },
    { id: "monastic-robe", name: "Robe (simple, monastic feel)", stages: [5], weight: 15, rarity: "Rare", fragment: "A simple robe in natural linen wraps the shoulders, its unadorned folds catching soft light — monastic in its simplicity." },
    { id: "heavy-metal-band-vest", name: "Heavy metal band vest", stages: "all", weight: 8, rarity: "Uncommon", fragment: "\nA denim vest with the sleeves cut off sits on the shoulders, its back panel covered in sewn-on patches barely legible in the low light — dark fabric absorbing shadow, the stitched edges of each patch catching the faintest thread of warm light." },
  ],
};

// ── Mood & Composition Layer ─────────────────────────────────────────────────

export const LIGHTING: TraitCategoryDef = {
  id: "lighting",
  displayName: "Lighting Setup",
  type: "mood",
  items: [
    { id: "single-candle-below", name: "Single candle from below", stages: [1, 5], weight: 8, rarity: "Uncommon", fragment: "A single candle illuminates from below, casting unsettling upward shadows that hollow the eye sockets and accentuate the jaw — interrogation lighting, unflattering and honest." },
    { id: "harsh-caravaggio", name: "Harsh directional upper-left 45° (Caravaggio)", stages: "all", weight: 20, rarity: "Common", fragment: "Harsh directional light from the upper-left at 45 degrees — the classic Caravaggio setup — carving the face into sharp planes of light and shadow." },
    { id: "soft-rembrandt", name: "Soft diffused golden (Rembrandt)", stages: [2, 3, 5], weight: 18, rarity: "Common", fragment: "Soft diffused golden light wraps the face with Rembrandt warmth, the shadow triangle forming naturally beneath one eye." },
    { id: "dual-source-conflicting", name: "Dual source conflicting (warm vs cool)", stages: [3, 4], weight: 8, rarity: "Rare", fragment: "Two conflicting light sources — one warm, one cool — paint the face in split tones, warm gold on one side and cold blue on the other." },
    { id: "flash-paparazzi", name: "Flash photography (flat, paparazzi)", stages: [4], weight: 8, rarity: "Rare", fragment: "Flat, harsh flash lighting blows out the center of the face, killing shadow and creating the unflattering forensic look of paparazzi photography." },
    { id: "moonlight-warm-accent", name: "Moonlight cold blue with warm accent", stages: [1, 5], weight: 8, rarity: "Uncommon", fragment: "Cold blue moonlight washes the face with an otherworldly pallor, a single point of warm light — a candle, a match — creating a small island of warmth." },
    { id: "fire-glow", name: "Fire glow (flickering, orange)", stages: [1, 2], weight: 8, rarity: "Uncommon", fragment: "Flickering firelight paints the face in unstable orange warmth, shadows dancing at the edges as if the light source is alive and moving." },
    { id: "narrow-beam-single-eye", name: "Narrow concentrated beam (single eye lit)", stages: [1, 5], weight: 6, rarity: "Rare", fragment: "A narrow concentrated beam of light illuminates only one eye and a sliver of cheekbone — the rest of the face lost in absolute darkness." },
    { id: "overhead-downlight", name: "Overhead downlight", stages: [3, 4], weight: 6, rarity: "Uncommon", fragment: "Overhead downlight creates dramatic under-eye shadows and illuminates the top of the head and shoulders, the face falling into partial shadow." },
  ],
};

export const EXPRESSION: TraitCategoryDef = {
  id: "expression",
  displayName: "Expression",
  type: "mood",
  items: [
    { id: "half-smile-knowing", name: "Closed mouth half-smile (knowing)", stages: [2, 3], weight: 12, rarity: "Common", fragment: "A closed-mouth half-smile — knowing and self-contained — the corners of the lips lifted just enough to suggest private amusement.", tags: ["closed-mouth"] },
    { id: "slight-smirk", name: "Slight smirk, one side only", stages: [3, 4], weight: 10, rarity: "Common", fragment: "A slight smirk pulls one corner of the mouth upward, asymmetrical and confident — the face of someone who knows something you don't." },
    { id: "mouth-open-mid-sentence", name: "Mouth slightly open, mid-sentence", stages: [2, 4], weight: 8, rarity: "Uncommon", fragment: "The mouth is slightly open as if caught mid-sentence, the lower lip relaxed, a sense of interrupted speech.", tags: ["open-mouth"] },
    { id: "jaw-clenched", name: "Jaw clenched, tension visible", stages: [1, 3], weight: 8, rarity: "Uncommon", fragment: "The jaw is clenched, tension visible in the masseter muscles, the face holding something back with controlled force.", tags: ["closed-mouth"] },
    { id: "full-grin", name: "Full grin showing teeth/grillz", stages: [4], weight: 8, rarity: "Uncommon", fragment: "A full grin splits the face, teeth and grillz fully visible, the expression open and theatrical — joy or triumph uncontained.", tags: ["open-mouth"] },
    { id: "lip-bitten", name: "Lip bitten slightly", stages: [1, 2], weight: 5, rarity: "Rare", fragment: "The lower lip is bitten slightly, caught between the teeth in a moment of uncertainty or suppressed emotion.", tags: ["closed-mouth"] },
    { id: "exhaling-smoke", name: "Exhaling smoke", stages: "all", weight: 6, rarity: "Uncommon", fragment: "The subject exhales a stream of smoke, the lips pursed in a soft O, the smoke rendered as a translucent veil drifting through the light beam.", tags: ["open-mouth", "smoke-expression"] },
    { id: "dead-serious", name: "Dead serious, no emotion", stages: [1, 5], weight: 15, rarity: "Common", fragment: "The face is dead serious — no warmth, no hostility, just an unsettling absence of performance, as if the subject has forgotten they are being watched.", tags: ["closed-mouth"] },
    { id: "amused-off-canvas", name: "Looking amused by something off-canvas", stages: [3, 4], weight: 6, rarity: "Uncommon", fragment: "The subject looks amused by something occurring outside the frame, a faint smile directed at nothing the viewer can see." },
    { id: "quiet-vulnerability", name: "Quiet vulnerability, brow slightly furrowed", stages: [1, 5], weight: 12, rarity: "Common", fragment: "Quiet vulnerability in the face — the brow slightly furrowed, the eyes soft, a moment of unguarded openness." },
    { id: "defiant-chin-forward", name: "Defiant, chin forward", stages: [3, 4], weight: 6, rarity: "Uncommon", fragment: "A defiant expression with the chin pushed slightly forward, the face daring the viewer to challenge." },
    { id: "wistful-longing", name: "Wistful, distant longing", stages: [5], weight: 4, rarity: "Rare", fragment: "A wistful expression of distant longing — the eyes unfocused, the face softened by memory or regret." },
    { id: "new-1773067662881", name: "Composed, faintly smug", stages: [3], weight: 10, rarity: "Common", fragment: "Expression is composed and faintly smug — a controlled almost-smile held just below the surface, the kind that knows something the viewer doesn't." },
  ],
};

export const EYE_DIRECTION: TraitCategoryDef = {
  id: "eyeDirection",
  displayName: "Eye Direction & Intensity",
  type: "mood",
  items: [
    { id: "direct-stare", name: "Direct stare into viewer", stages: [3, 4], weight: 20, rarity: "Common", fragment: "The eyes stare directly into the viewer — confrontational, unflinching, creating an uncomfortable psychological link." },
    { id: "past-shoulder", name: "Looking just past viewer's shoulder", stages: [1, 5], weight: 10, rarity: "Uncommon", fragment: "The eyes are directed just past the viewer's left shoulder, as if aware of something in the room that the viewer cannot see." },
    { id: "eyes-downward", name: "Eyes cast downward", stages: [1, 5], weight: 12, rarity: "Common", fragment: "The eyes are cast downward in contemplation, the lids heavy, the gaze directed at something below the frame or at nothing at all." },
    { id: "sharply-one-side", name: "Looking sharply to one side", stages: [2, 3], weight: 12, rarity: "Common", fragment: "The eyes cut sharply to one side, the head not following, creating tension between the direction of the face and the direction of attention." },
    { id: "half-closed-unbothered", name: "Eyes half-closed (unbothered)", stages: [4], weight: 8, rarity: "Uncommon", fragment: "The eyes are half-closed in a look of supreme unbothered confidence — heavy-lidded, relaxed, as if the viewer is not important enough to fully engage." },
    { id: "one-eye-more-closed", name: "One eye more closed than other", stages: "all", weight: 5, rarity: "Rare", fragment: "One eye is slightly more closed than the other, creating an asymmetry that feels natural and lived-in — a subtle human imperfection." },
    { id: "looking-upward", name: "Looking upward (aspirational)", stages: [1, 2], weight: 12, rarity: "Common", fragment: "The eyes are directed upward, past the top of the frame, in a gesture of aspiration or supplication — looking toward something unreachable." },
    { id: "staring-into-light", name: "Staring into light source", stages: [1, 5], weight: 8, rarity: "Uncommon", fragment: "The eyes stare directly into the light source, the irises contracted, the whites catching maximum illumination — an uncomfortable, almost sacred gesture." },
    { id: "looking-at-held-object", name: "Looking at held object", stages: "all", weight: 8, rarity: "Common", fragment: "The eyes are directed downward at the held object, studying it with focused attention — the object becomes the psychological center of the portrait." },
    { id: "thousand-yard-stare", name: "Unfocused, thousand-yard stare", stages: [5], weight: 5, rarity: "Rare", fragment: "The eyes are unfocused in a thousand-yard stare — present but not here, seeing through the viewer to something far beyond." },
  ],
};

export const POSE: TraitCategoryDef = {
  id: "pose",
  displayName: "Pose & Body Language",
  type: "mood",
  items: [
    { id: "three-quarter-profile", name: "Three-quarter profile (standard)", stages: "all", weight: 20, rarity: "Common", fragment: "The torso angles slightly away from the viewer in a standard three-quarter profile, the face turned back toward the light." },
    { id: "profile-looking-back", name: "Turned to profile, looking back", stages: [3, 4], weight: 10, rarity: "Uncommon", fragment: "The subject is turned nearly to full profile, looking back over the shoulder toward the viewer — dramatic and theatrical." },
    { id: "leaning-forward", name: "Leaning forward into frame", stages: [4], weight: 8, rarity: "Uncommon", fragment: "The subject leans forward into the frame, shoulders advanced, creating an aggressive presence that pushes toward the viewer." },
    { id: "leaning-back-chin-up", name: "Leaning back, chin tilted up", stages: [3, 4], weight: 8, rarity: "Uncommon", fragment: "The subject leans back with chin tilted upward, looking down at the viewer with imperious remove." },
    { id: "head-tilted", name: "Head tilted to one side", stages: [1, 2], weight: 10, rarity: "Common", fragment: "The head tilts to one side in a gesture of curiosity or consideration, breaking the vertical axis of the composition." },
    { id: "hand-touching-face", name: "Hand touching face", stages: [1, 5], weight: 12, rarity: "Common", fragment: "One hand rests against the face — chin on fist or finger at temple — a gesture of quiet contemplation." },
    { id: "arms-crossed", name: "Arms crossed", stages: [3, 4], weight: 10, rarity: "Common", fragment: "Arms are crossed over the chest, the posture defensive or authoritative, the forearms catching light on their upper surfaces.", tags: ["no-hands-free"] },
    { id: "adjusting-collar-chain", name: "One hand adjusting collar or chain", stages: [2, 3], weight: 6, rarity: "Uncommon", fragment: "One hand reaches up to adjust a collar or touch a chain, the gesture casual and caught in motion." },
    { id: "pulling-down-lower-lip", name: "Pulling down lower lip (inner tattoo)", stages: "all", weight: 3, rarity: "Legendary", fragment: "One hand pulls down the lower lip to reveal the inner surface — an invasive, confrontational gesture painted with anatomical precision." },
    { id: "holding-prop-up", name: "Holding prop up toward viewer", stages: "all", weight: 5, rarity: "Uncommon", fragment: "One hand holds a prop up toward the viewer, extending it slightly forward — presenting, offering, or confronting." },
    { id: "hands-in-pockets", name: "Hands in pockets", stages: [1, 2], weight: 8, rarity: "Common", fragment: "The hands are thrust into pockets, only the shoulders and head visible above the pocket line, the body language closed and guarded.", tags: ["no-hands-free"] },
    { id: "hand-over-mouth", name: "Hand over mouth (concealed smile)", stages: [3], weight: 10, rarity: "Common", fragment: "One hand is raised to the mouth, fingers loosely curled, partially covering the lips — the gesture caught mid-thought, unhurried." },
  ],
};

export const COMPOSITION: TraitCategoryDef = {
  id: "composition",
  displayName: "Compositional Tension",
  type: "mood",
  items: [
    { id: "standard-centered", name: "Standard centered (no device)", stages: "all", weight: 30, rarity: "Common", fragment: "Standard centered composition — the subject placed at the visual center with balanced negative space." },
    { id: "off-center-negative-space", name: "Subject off-center, heavy negative space", stages: [1, 5], weight: 15, rarity: "Common", fragment: "The subject is placed off-center with heavy negative space on one side, the emptiness becoming a compositional weight." },
    { id: "extreme-close-crop", name: "Extreme close crop", stages: [4], weight: 10, rarity: "Uncommon", fragment: "Extreme close crop cuts off the top of the head and edges of the shoulders, creating an uncomfortable intimacy." },
    { id: "wider-than-expected", name: "Wider than expected", stages: [3], weight: 8, rarity: "Uncommon", fragment: "The framing is wider than expected for a portrait, revealing more of the environment and body, the subject placed within a context." },
    { id: "half-face-shadow", name: "Subject partially obscured by shadow", stages: "all", weight: 10, rarity: "Uncommon", fragment: "The subject is partially obscured by shadow, half the face dissolved into darkness, identity emerging from and returning to the void." },
    { id: "foreground-out-of-focus", name: "Foreground element slightly out of focus", stages: [3, 4], weight: 6, rarity: "Rare", fragment: "A foreground element — a hand, a prop, a shoulder — is slightly out of focus, creating depth between the viewer and the subject." },
    { id: "paint-drip", name: "Visible paint drip or run", stages: "all", weight: 5, rarity: "Rare", fragment: "A visible paint drip or run descends from one edge of the composition, the painted surface acknowledging its own materiality." },
    { id: "canvas-heavier-one-side", name: "Canvas texture heavier on one side", stages: [5], weight: 5, rarity: "Rare", fragment: "The canvas texture is heavier on one side of the composition, as if the painting is deteriorating unevenly — age as aesthetic." },
    { id: "subject-blurred-bg-sharp", name: "Subject slightly blurred, background sharp", stages: [5], weight: 3, rarity: "Legendary", fragment: "The subject is slightly blurred while the background is sharp — an inversion of normal focus that makes the subject feel like a memory." },
    { id: "dutch-angle", name: "Dutch angle (slight tilt)", stages: [4], weight: 8, rarity: "Uncommon", fragment: "The entire composition tilts at a slight Dutch angle, creating a sense of instability and dynamism." },
  ],
};

export const ATMOSPHERE: TraitCategoryDef = {
  id: "atmosphere",
  displayName: "Atmosphere / Surface Texture",
  type: "mood",
  items: [
    { id: "clean-aged-varnish", name: "Clean aged varnish (standard)", stages: "all", weight: 30, rarity: "Common", fragment: "Clean aged varnish coats the surface with a warm amber patina, its uneven sheen catching light like honey on glass." },
    { id: "heavy-craquelure", name: "Heavy craquelure", stages: [1, 5], weight: 12, rarity: "Uncommon", fragment: "Heavy craquelure covers the painted surface, the web of cracks suggesting the painting is centuries old, each fissure catching shadow." },
    { id: "smoke-haze-frame", name: "Smoke or haze drifting across frame", stages: "all", weight: 12, rarity: "Common", fragment: "A thin veil of smoke or atmospheric haze drifts across the frame, softening edges and making the light beam visible." },
    { id: "rain-droplets-surface", name: "Rain/water droplets on surface", stages: [1, 5], weight: 6, rarity: "Rare", fragment: "Water droplets sit on the painting's surface as if behind glass, each drop a tiny lens distorting the image beneath." },
    { id: "gold-leaf-varnish", name: "Gold leaf fragments in varnish", stages: [3, 4], weight: 8, rarity: "Uncommon", fragment: "Fragments of gold leaf are embedded in the varnish layer, catching light as scattered metallic flecks across the surface." },
    { id: "lens-flare-light-leak", name: "Subtle lens flare / light leak", stages: [4], weight: 6, rarity: "Rare", fragment: "A subtle lens flare or light leak crosses the frame — an anachronistic photographic artifact rendered in oil paint." },
    { id: "dust-particles", name: "Dust particles visible in light beam", stages: [1, 2], weight: 10, rarity: "Common", fragment: "Dust particles float visibly in the light beam, each mote a tiny point of scattered illumination — time made visible." },
    { id: "condensation-breath", name: "Condensation / breath fog", stages: [1], weight: 6, rarity: "Uncommon", fragment: "Condensation or breath fog hazes the lower portion of the frame, as if the painting exists in a cold space." },
    { id: "paint-cracking-realtime", name: "Paint surface cracking in real-time", stages: [5], weight: 4, rarity: "Legendary", fragment: "The paint surface appears to be actively cracking, fresh fissures spreading as if the painting is aging before the viewer's eyes." },
    { id: "wet-paint-glossy", name: "Wet paint look (fresh, glossy)", stages: [4], weight: 6, rarity: "Rare", fragment: "The paint surface has a wet, fresh, glossy appearance — as if just completed, the pigment still mobile and reflective." },
  ],
};

// ── Master list (order matches prompt assembly block order) ──────────────────

export const ALL_CATEGORIES: TraitCategoryDef[] = [
  WRIST, CHAINS, EARRINGS, RINGS, GRILLZ,
  EYEWEAR, HEADWEAR, PROP, TATTOO, CLOTHING,
  LIGHTING, EXPRESSION, EYE_DIRECTION, POSE, COMPOSITION, ATMOSPHERE,
];
