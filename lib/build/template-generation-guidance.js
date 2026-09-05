import { getTemplateCatalog } from "../templateCatalog.js";

const TEMPLATE_CUE_RE = /(?:template|inspiration|reference|reimagine|模板|靈感|灵感|參考|参考)/i;

function includesCanonical(haystack, value) {
  const needle = String(value || "").trim().toLowerCase();
  return Boolean(needle) && haystack.includes(needle);
}

function boundedList(values, limit = 8) {
  return Array.isArray(values)
    ? values.map(value => String(value || "").trim()).filter(Boolean).slice(0, limit)
    : [];
}

export function resolveTemplateGenerationGuidance(idea) {
  const source = String(idea || "").trim().slice(0, 12000);
  if (!source || !TEMPLATE_CUE_RE.test(source)) return null;
  const normalized = source.toLowerCase();

  const template = getTemplateCatalog().find(candidate =>
    includesCanonical(normalized, candidate.title) &&
    includesCanonical(normalized, candidate.industry) &&
    includesCanonical(normalized, candidate.archetype)
  );
  if (!template) return null;

  return Object.freeze({
    id: template.id,
    schemaVersion: template.schemaVersion,
    industry: String(template.industry),
    archetype: String(template.archetype),
    style: String(template.style),
    pages: Object.freeze(boundedList(template.pages)),
    features: Object.freeze(boundedList(template.features)),
    generationRole: "active-structural-guidance",
    source: "LANERIQ AI Template Engine",
    canonicalCatalogVerified: true,
    directCopyAllowed: false,
    preserveThirdPartyBranding: false,
  });
}

export function templatePlanningBrief(guidance) {
  if (!guidance?.canonicalCatalogVerified) return "";
  return [
    "LANERIQ ACTIVE TEMPLATE GUIDANCE",
    `Canonical template ID: ${guidance.id}`,
    `Industry: ${guidance.industry}`,
    `Product archetype: ${guidance.archetype}`,
    `Visual direction: ${guidance.style}`,
    guidance.pages?.length ? `Structural page guidance: ${guidance.pages.join(", ")}` : "",
    guidance.features?.length ? `Capability guidance: ${guidance.features.join(", ")}` : "",
    "Use these canonical fields as active planning constraints when choosing modules and product structure.",
    "Re-plan the information architecture, components, copy, visuals and interactions for the customer's own product.",
    "Do not copy third-party brand identity, proprietary copy, images, source code, distinctive layouts or trade dress.",
  ].filter(Boolean).join("\n");
}
