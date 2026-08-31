import { WALLPAPER_PRESETS } from "../design/wallpaper-presets.js";

export const PRODUCT_BRAND = Object.freeze({
  name: "AI BUILD APP & WEB",
  poweredBy: "SoolenAI",
  promise: "Build stunning Apps & Websites. No code. Just ideas."
});

export const THEME_PRESETS = Object.freeze([
  { id:"auto", name:"Auto Theme", description:"AI chooses a coordinated palette for the industry, audience and brand." },
  { id:"luxury-gold", name:"Luxury Gold", description:"Premium dark surfaces with warm gold highlights." },
  { id:"emerald-premium", name:"Emerald Premium", description:"Deep emerald, soft neutrals and refined metallic accents." },
  { id:"minimal-light", name:"Minimal Light", description:"Bright editorial surfaces, restrained color and generous whitespace." },
  { id:"dark-pro", name:"Dark Pro", description:"High-contrast dark UI with crisp luminous accents." },
  { id:"soft-pastel", name:"Soft Pastel", description:"Gentle, approachable colors for lifestyle, family and creator products." },
  { id:"tech-blue", name:"Tech Blue", description:"Confident blue/cyan system for technology and productivity." },
  { id:"nature-green", name:"Nature Green", description:"Organic greens and warm natural neutrals." },
  { id:"elegant-purple", name:"Elegant Purple", description:"Sophisticated violet/plum palette with premium contrast." }
]);

export const BUILDER_VISUAL_BENCHMARK = Object.freeze({
  id:"customer-approved-premium-builder-2026-08-31",
  finish:"cinematic-native-mobile-product",
  requiredBuilderTraits:[
    "immersive hero artwork or atmospheric visual field",
    "deep emerald or customer-chosen coordinated surfaces instead of flat white pages",
    "metallic or luminous accent treatment when suitable to the chosen palette",
    "layered glass-like cards with clear separation and comfortable spacing",
    "large confident title hierarchy with short readable supporting copy",
    "icon-led action cards and touch targets sized for iPhone use",
    "prominent single primary CTA with obvious next action",
    "style and template choices shown visually rather than as technical settings",
    "bottom navigation or equivalent app-like navigation where it improves the workflow",
    "no exposed provider, hosting, API or infrastructure terminology in the normal customer journey"
  ],
  journeyRule:"Every customer-facing builder step must meet the same premium finish while using a stage-appropriate original visual scene. Different steps may use different AI-selected scenes; the quality floor, typography discipline, spacing, card depth and interaction clarity must remain consistent.",
  originalityRule:"Treat the approved layout as a quality and interaction benchmark, not a pixel-for-pixel asset to copy into every generated customer project."
});

export const PREMIUM_VISUAL_IDEAL = Object.freeze({
  benchmark: "premium-mobile-product-finish",
  principles: [
    "The generated product must feel like a polished released App, not a generic website template or wireframe.",
    "Use a memorable hero or immersive visual moment when appropriate to the industry, while keeping content readable and accessible.",
    "Use layered depth, refined cards, clear icons, strong hierarchy, comfortable spacing and app-like controls.",
    "Every project must have its own visual identity; never clone one reference composition across customers.",
    "Customer color preference is authoritative. AI coordinates the full visual system around that preference instead of changing only one button color.",
    "If the customer gives no color preference, AI selects an industry-appropriate Auto Theme and explains the palette direction in the specification.",
    "A customer can change colors or style later in natural language without losing business logic, data, privacy, accessibility or responsive behavior.",
    "Backgrounds, buttons, cards, icons, typography, borders, gradients, imagery and motion must remain visually coordinated.",
    "Use premium imagery or original generated visual direction where it improves the product; do not add decorative imagery that harms usability.",
    "Mobile-first quality is mandatory, with desktop/tablet adaptations that preserve the same brand system.",
    "Builder steps may rotate through different original wallpapers so the experience feels alive; the customer can override Random mode by choosing a preferred wallpaper.",
    BUILDER_VISUAL_BENCHMARK.journeyRule
  ],
  customerControls: {
    themeModes:["auto","preset","custom"],
    customColorSupport:true,
    naturalLanguageStyleChanges:true,
    wholeSystemRecolor:true,
    preserveLogicDuringVisualChanges:true,
    wallpaperModes:["random","selected"],
    wallpaperChoices:WALLPAPER_PRESETS.map(x=>x.id),
    wallpaperCanBeChangedLater:true
  }
});

export const PREMIUM_VISUAL_AI_INSTRUCTION = `
AI BUILD APP & WEB PREMIUM VISUAL IDEAL
The visual quality floor is a polished, premium, released-product experience: strong hero treatment where appropriate, immersive high-quality imagery/background direction, layered depth, refined cards, clear icons, confident typography, comfortable spacing and app-like controls. Do not produce a plain generic template or text-heavy wireframe.

CUSTOMER-APPROVED BUILDER BENCHMARK
Use this interaction and finish standard across the builder journey: cinematic or atmospheric visual field, clear brand/title hierarchy, deep coordinated surfaces, refined luminous/glass cards, icon-led actions, strong mobile touch targets, visual style/template choices, one obvious primary CTA and app-like navigation. Each step may show a different original scene, but every step must look like the same premium product family. Do not expose provider, API, hosting or infrastructure details to normal customers.

COLOR & THEME CONTROL
The customer is allowed to choose any color direction. Treat the customer's current color/style instruction as authoritative. When colors change, coordinate the complete design system: background, surfaces, cards, buttons, icons, typography colors, borders, highlights, gradients, imagery treatment and motion accents. Never recolor only one component while leaving the rest visually inconsistent.
If no color preference is supplied, use Auto Theme: choose an industry-, audience- and brand-appropriate palette. Supported directions include Luxury Gold, Emerald Premium, Minimal Light, Dark Pro, Soft Pastel, Tech Blue, Nature Green and Elegant Purple, but AI may create a more suitable original palette.

WALLPAPER & STEP VISUALS
Use an original wallpaper/background direction that fits the project. Valid built-in wallpaper ids are: ${WALLPAPER_PRESETS.map(x=>x.id).join(", ")}. Random mode may select a different visual direction for different builder steps. Selected mode must respect the customer's chosen wallpaper unless accessibility or readability requires a safe adjustment. Wallpaper is part of the full visual system, not a detached decorative layer.

ORIGINALITY
Use the approved premium finish as a quality benchmark, not as a composition to copy. Each customer project must have its own composition, imagery, typography rhythm, components and brand personality. Learn the intent and quality level, not the private asset or exact layout.

SAFE VISUAL MODIFICATION
A visual/style request must preserve business logic, data structures, workflows, permissions, privacy protections, accessibility, loading/error states and responsive behavior unless the customer explicitly asks to change them.
`;

export function buildCustomerThemeInstruction({themeMode="auto",themePreset="auto",primaryColor="",accentColor="",backgroundColor="",styleRequest="",wallpaperMode="random",wallpaperPreset=""}={}) {
  const mode=["auto","preset","custom"].includes(themeMode)?themeMode:"auto";
  const preset=THEME_PRESETS.find(x=>x.id===themePreset)?.name||"Auto Theme";
  const custom=[primaryColor&&`primary ${primaryColor}`,accentColor&&`accent ${accentColor}`,backgroundColor&&`background ${backgroundColor}`].filter(Boolean).join(", ");
  const validWallpaper=WALLPAPER_PRESETS.find(x=>x.id===wallpaperPreset);
  return [
    `Theme mode: ${mode}.`,
    mode==="preset"?`Requested preset direction: ${preset}.`:"",
    mode==="custom"&&custom?`Customer-selected colors: ${custom}. Coordinate the entire visual system around these colors.`:"",
    styleRequest?`Customer visual direction: ${String(styleRequest).trim()}.`:"",
    wallpaperMode==="selected"&&validWallpaper?`Customer-selected wallpaper: ${validWallpaper.name} (${validWallpaper.id}). Preserve this wallpaper direction.`:"AI wallpaper mode: random/auto. Choose a valid project-appropriate wallpaper direction."
  ].filter(Boolean).join(" ");
}
