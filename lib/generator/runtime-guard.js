import { applySoolenMaxSecurity } from "../ai/soolenai-max-security.js";
import { applyLivingIntelligenceStandard } from "../ai/liui-standard.js";
import { applyGeneratedExperienceStandard } from "../design/generated-experience-standard.js";
import { applyGeneratedQualityBaseline } from "./generated-quality-baseline.js";

// Defensive helpers used by generated-app rendering. Generated output must fail soft,
// never take down the whole preview/runtime because one AI field is malformed.
export function safeArray(value) { return Array.isArray(value) ? value : []; }
export function safeObject(value) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
export function safeText(value, fallback = "") { return typeof value === "string" ? value : fallback; }
export function safeRoute(path, fallback = "/") {
  if (typeof path !== "string" || !path.trim()) return fallback;
  return path.startsWith("/") ? path : `/${path}`;
}

export function normalizeAppSpec(input) {
  const raw = safeObject(input);
  const pages = safeArray(raw.pages).map((page, index) => {
    const p = safeObject(page);
    return {
      id: safeText(p.id, `page-${index + 1}`),
      name: safeText(p.name, `Page ${index + 1}`),
      route: safeRoute(p.route, index === 0 ? "/" : `/page-${index + 1}`),
      description: safeText(p.description),
      purpose: safeText(p.purpose),
      components: safeArray(p.components),
      layout: safeText(p.layout),
      visualTreatment: safeText(p.visualTreatment),
      backgroundTreatment: safeText(p.backgroundTreatment),
    };
  });
  const productType=safeText(raw.productType,"app_website");
  const requestedPlatforms=safeArray(raw.platforms).filter(value=>typeof value==="string"&&value.trim()).map(value=>value.trim().toLowerCase());
  const platforms=[...new Set(["ios","android","web",...requestedPlatforms])];
  const qualityReady=applyGeneratedQualityBaseline({
    name: safeText(raw.name, "Generated App"),
    description: safeText(raw.description),
    productType: productType==="mobile_game"?"mobile_game":"app_website",
    platforms,
    game: safeObject(raw.game),
    industry: safeObject(raw.industry),
    language: safeObject(raw.language),
    designSystem: safeObject(raw.designSystem),
    liui: safeObject(raw.liui),
    visualAssets: safeArray(raw.visualAssets),
    templateStrategy: safeObject(raw.templateStrategy),
    qualityPlan: safeObject(raw.qualityPlan),
    security: safeObject(raw.security),
    pages: pages.length ? pages : [{ id: "home", name: "Home", route: "/", description: "", purpose: "", components: [], layout: "", visualTreatment: "", backgroundTreatment: "" }],
    features: safeArray(raw.features),
    data: safeObject(raw.data),
    dataModels: safeArray(raw.dataModels),
    actions: safeArray(raw.actions),
    navigation: safeArray(raw.navigation),
    demoVideo: safeObject(raw.demoVideo),
  });
  const secured=applySoolenMaxSecurity(qualityReady);
  const experienced=applyGeneratedExperienceStandard({specification:secured}).specification;
  return applyLivingIntelligenceStandard(experienced);
}