export type StageNumber = 1 | 2 | 3 | 4 | 5;

export const STAGE_NAMES: Record<StageNumber, string> = {
  1: "Humble Believer",
  2: "Rising Confidence",
  3: "Established Wealth",
  4: "Maximum Excess",
  5: "Reflective Maturity",
};

const BASE_PROMPT = `Transform this photograph into a Baroque oil painting portrait in the style of Rembrandt and Caravaggio.

Square format, 1:1 aspect ratio. Baroque oil painting portrait derived from the attached headshot.

IDENTITY: Preserve exact facial proportions from the reference — identical nose shape, eye spacing, eyebrow structure, jawline, cheekbones. Do not idealize, smooth, or beautify. Keep natural skin texture and facial asymmetries.

COMPOSITION: Chest-up framing. Camera slightly below eye level. Subject placed off-center. Torso angled slightly away from viewer. Head turned toward upper-left, tilted subtly upward.

STYLE: Museum-quality oil painting. Heavy impasto on highlights with visible confident brushwork and brush drag marks. Layered glazing in shadows. Aged varnish patina with uneven sheen. Canvas texture visible through paint.

Paint this with the rough, tactile quality of a 17th-century Dutch master — thick uneven paint, visible canvas fibers, painterly abstraction in dark areas. No photographic sharpness, no digital gloss, no modern cinematic look.

Avoid: plastic skin, over-sharpening, warped or misaligned eyes, extra fingers or limbs, text, watermarks, logos, frame overlays, contemporary fashion, bright colors, HDR look, photorealistic rendering, smooth digital finish.`;

const STAGE_OVERLAYS: Record<StageNumber, string> = {
  1: `CLOTHING: Plain black wool, no accessories. A cheap black digital watch with matte resin strap is barely visible on the wrist, mostly lost in shadow. One hand rests near chest in a self-guarding gesture.

LIGHTING: Extreme tenebrism, 80-90% of canvas in deep shadow. Single narrow warm beam from upper-left at 45 degrees illuminates only one eye and upper cheekbone, barely grazing the bridge of the nose. The lit eye is wet, reflective, intensely alive. The unlit side dissolves into soft velvety darkness. Background is near-black with faint aged canvas texture.

EXPRESSION: Serious, searching, quietly vulnerable. Eyes present but slightly distant, gazing past the viewer rather than engaging directly.

PALETTE: Muted — umber, burnt sienna, deep oxblood warmth in light areas, near-black shadows. Clothing disappears into shadow with only a faint edge of light suggesting form.`,

  2: `CLOTHING: Refined dark fabrics with subtle texture — a fine wool or cashmere. A simple silver ring on one hand, a thin chain barely visible at the collar. Posture more upright and open than before.

LIGHTING: Opens slightly from Stage 1, 70-80% shadow. The key light is warmer and slightly broader, illuminating more of the face — both eyes now partially lit, with the far eye still receding into shadow. A faint rim light on the shoulder suggests emerging from darkness.

EXPRESSION: Confident, composed. The gaze is more direct now, engaging the viewer with quiet self-assurance. A subtle hint of determination in the set of the jaw.

PALETTE: Warmer golds creeping in, wine-red hints in the fabric and skin tones. Shadows remain deep but take on a richer, warmer character. The overall impression is of warmth building from within.`,

  3: `CLOTHING: Rich fabrics — silk or velvet in deep jewel tones. Gold chains visible at the chest, gemstone rings catching light. A fine timepiece glints subtly. The clothing has weight and texture, painted with visible brushwork.

LIGHTING: Intensified and more dramatic, 60-70% shadow. Multiple light sources suggested — the key light stronger, a secondary fill creating rich reflected light in shadows. Fabrics and metals catch and scatter light across the composition.

EXPRESSION: Accomplished, assured. The subject regards the viewer with the calm authority of someone who has arrived. A slight upward tilt to the chin, relaxed but commanding presence.

PALETTE: Burgundy, gold, and emerald dominate. Rich warm tones throughout — the shadows themselves carry color now, deep reds and warm browns rather than pure black. Gold highlights painted with thick impasto.`,

  4: `CLOTHING: Opulent excess — diamond grills catching light, layered heavy gold chains, an iced-out watch with diamonds blazing. Multiple rings on every finger, gemstones and precious metals competing for attention. The clothing is luxurious dark fabric serving as backdrop for the jewelry.

LIGHTING: Flash-like, harsh and dramatic, 50-60% shadow. Strong directional light creates hard-edged shadows and intense highlights, especially off metallic and crystalline surfaces. The diamonds and gold create scattered points of brilliant light across the composition.

EXPRESSION: Theatrical, triumphant, almost defiant. The subject presents themselves boldly to the viewer, chin raised, a knowing half-smile. There is joy and spectacle in the excess.

PALETTE: Bold golds and deep blacks create maximum contrast. Brilliant warm highlights against absolute darkness. The jewelry provides pops of white and prismatic light against the rich dark ground.`,

  5: `CLOTHING: Softened, refined — beautiful but restrained fabric, perhaps a simple dark coat. A single meaningful piece of jewelry — one ring or one chain, chosen with intention rather than display. The watch, if visible, is elegant and understated.

LIGHTING: Soft, diffused, 65-75% shadow. The light wraps gently around the subject, coming from a broader, softer source. Less dramatic than any previous stage — more like late afternoon light through a window. Shadows are present but gentle, luminous rather than opaque.

EXPRESSION: Contemplative, wise. The eyes carry depth and experience — someone who has seen everything and found peace. The gaze is warm but distant, looking inward as much as outward. A profound stillness.

PALETTE: Amber, warm grey, muted gold. The richness is there but subdued — like a painting that has aged beautifully. Warm earth tones predominate, with soft golden light. The overall impression is of quiet warmth and hard-won serenity.`,
};

export function getPromptForStage(stage: StageNumber): string {
  return `${BASE_PROMPT}\n\n${STAGE_OVERLAYS[stage]}`;
}
