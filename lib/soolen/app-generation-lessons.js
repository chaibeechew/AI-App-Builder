export const SOOLEN_APP_GENERATION_LESSONS_VERSION = "2026-09-02.v2";

export const SOOLEN_APP_GENERATION_LESSONS = Object.freeze({
  industryVisualSemantics:[
    "Detect the industry and service context before choosing imagery, hero composition, color system or visual assets.",
    "The first screen must visibly communicate the industry through meaningful subjects, places, products or people instead of relying on text alone.",
    "Service products should usually show people performing the service or using the product when that improves understanding.",
    "Property and real-estate products should prioritize recognizable buildings, houses, apartments, interiors, agents, clients, maps, viewings and people using phones, tablets or computers.",
    "Cinematic or futuristic atmosphere may enhance the industry scene, but it must not replace the industry's real-world visual meaning."
  ],
  multiIndustryAdaptation:[
    "Auto Theme must adapt palette, imagery, icon language, card treatment and mood to the detected industry instead of reusing one universal style.",
    "Real estate should feel architectural and trustworthy; hospitality warm and appetizing; beauty elegant and soft; education clear and encouraging; health calm and trustworthy; finance precise and stable; travel aspirational; commerce product-led; games immersive; corporate organized; creator products visual-first; logistics operational; automotive technical; fitness active.",
    "Customer colors, Brand Kit and explicit style choices remain authoritative and must override automatic palette defaults without losing industry meaning.",
    "Different industries may share the same quality floor, but they should not look like the same template with different words."
  ],
  imageOriginality:[
    "Do not reuse the same generated hero image, composition or scene across unrelated projects.",
    "Within one project, avoid repeating the same image for multiple major sections unless the customer explicitly requests it.",
    "Vary subject, camera distance, viewpoint, lighting, environment, human action and composition while preserving the selected brand system.",
    "Treat references and golden examples as quality signals, not image-copy targets.",
    "Every major visual asset description should be specific enough that a later image generator can produce a distinct scene."
  ],
  typographyAndVisualBalance:[
    "Do not let display typography cover the main industry subject or consume most of the phone viewport.",
    "On mobile, default hero display titles to roughly 28-40px and section headings to roughly 22-30px unless the brand explicitly requires a larger editorial treatment.",
    "A hero should normally balance meaningful visual media and concise foreground text; text-only first screens are not acceptable for image-appropriate consumer or service products.",
    "Use readable contrast protection without turning media into an indistinguishable dark background."
  ],
  fastBuild:[
    "Prefer one-pass generation: infer industry, audience, visual direction, core pages, data, actions and distribution plan from the user's idea before asking follow-up questions.",
    "Reuse validated industry patterns, design tokens, component contracts and golden-reference lessons to save time, but never reuse a customer's unique branding or exact image composition.",
    "Generate the smallest complete premium product first, then add optional depth; do not spend the first pass on placeholder sections.",
    "Only ask the customer for information that is genuinely required for safety, legal compliance, external credentials or an explicitly requested brand choice."
  ],
  distribution:[
    "Every generated App should expose a private/shareable web link path, installable PWA path and store-preparation path.",
    "Private sharing may use controlled links or authenticated access for friends, colleagues or clients.",
    "iOS store preparation should support TestFlight and App Store Connect evidence; Android preparation should support internal/closed testing and Google Play production evidence.",
    "Never claim App Store or Google Play publication is complete until external store submission and approval evidence exists."
  ]
});

export const PROPERTY_SERVICE_VISUAL_SEMANTICS = Object.freeze({
  primarySubjects:["high-rise buildings","apartments","houses","property interiors","agents","clients"],
  serviceActions:["showing listings on a phone","reviewing property details on a tablet","client consultation","viewing planning","map and location review","follow-up work on a laptop"],
  supportingVisuals:["property map","listing photography","appointment calendar","portfolio analytics","lead pipeline"],
  avoid:["text-only hero","generic fantasy scene with no property meaning","repeated identical image","oversized headline hiding the property scene"]
});

export const SOOLEN_FAST_BUILD_SEQUENCE = Object.freeze([
  "understand-idea",
  "infer-industry-and-audience",
  "choose-industry-auto-theme-or-customer-brand",
  "plan-distinct-visual-scenes",
  "compose-pages-data-actions",
  "apply-premium-design-system",
  "build-functional-first-version",
  "verify-mobile-and-core-actions",
  "prepare-share-install-store-paths"
]);

export const SOOLEN_APP_GENERATION_AI_INSTRUCTION = `
SOOLENAI LEARNED APP-GENERATION EXPERIENCE
Use the accumulated product-building lessons below as deterministic generation guidance.

INDUSTRY FIRST
Before visual design, infer what business or service the product represents. The first screen must visually communicate that industry. Do not ship a text-only hero when meaningful industry imagery is appropriate. For real estate, show recognizable property context such as buildings, houses, apartments, interiors, agents, clients, maps, viewings and people using phones, tablets or computers. Futuristic styling may enhance the scene but cannot replace real-world industry meaning.

INDUSTRY DIFFERENTIATION
Do not make every industry look like the same LANERIQ homepage. Use the detected industry to vary the automatic palette, imagery, card language, icon semantics and mood. Real estate is architectural/trustworthy; hospitality is warm/appetizing; beauty is elegant/soft; education is clear/encouraging; health is calm/trustworthy; finance is precise/stable; travel is aspirational; commerce is product-led; games are immersive; corporate is organized; creator products are visual-first; logistics is operational; automotive is technical; fitness is active. Customer Brand Kit or explicit colors override Auto Theme while the industry visual meaning remains intact.

IMAGE UNIQUENESS
Generate or describe distinct visual assets. Do not repeat the same hero image or composition across unrelated projects, and avoid repeating one image across multiple major sections in the same project. Vary subject, viewpoint, lighting, environment and human action while keeping one coherent brand system.

TYPOGRAPHY / MEDIA BALANCE
Do not let giant text cover the industry visual. Mobile hero titles should normally stay around 28-40px and major section headings around 22-30px. Keep imagery clearly visible with enough contrast protection for text, rather than hiding the image under opaque panels. Foreground copy should be concise and immediately understandable.

FAST BUILD
Use one-pass generation whenever possible: infer industry, audience, auto-theme or customer brand, distinct visual scenes, core pages, data, actions and distribution from the idea, then generate the smallest complete premium product. Reuse validated patterns and quality contracts to save time, but never copy a customer's unique brand or exact image composition. Ask follow-up questions only when truly necessary.

DISTRIBUTION READY
Every App should be prepared for three paths: shareable/private web access, installable PWA, and native-store preparation. iOS preparation should support TestFlight/App Store Connect; Android preparation should support internal/closed testing and Google Play. Never claim external store publication without evidence.
`;
