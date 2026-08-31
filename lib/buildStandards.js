import { RELEASE_SCORE_REQUIRED } from "./release-readiness.js";

export const RELEASE_READINESS_SCORE = RELEASE_SCORE_REQUIRED;

export const BUILD_STANDARDS = [
  { id: "stability", name: "Stability", target: RELEASE_READINESS_SCORE, checks: ["Clear page purposes and user flows","Graceful empty, loading and error states","No placeholder content","Predictable navigation and recoverable actions"] },
  { id: "security", name: "Security", target: RELEASE_READINESS_SCORE, checks: ["Least-privilege access","Server-side validation for sensitive actions","No secrets exposed to clients","Safe authentication and authorization boundaries"] },
  { id: "privacy", name: "Privacy", target: RELEASE_READINESS_SCORE, checks: ["Collect only necessary data","Clear purpose for personal data","Private-by-default controls","Delete/export controls where relevant"] },
  { id: "comfort", name: "Comfort", target: RELEASE_READINESS_SCORE, checks: ["Low-friction navigation","Readable text and tap targets","Calm motion and clear feedback","Mobile-first layouts"] },
  { id: "beauty", name: "Beauty", target: RELEASE_READINESS_SCORE, checks: ["Distinctive visual hierarchy rather than generic template composition","Premium backgrounds or imagery appropriate to the product and brand","Balanced typography, spacing, imagery and polished states","Original responsive composition with a memorable hero experience"] },
  { id: "naturalness", name: "Naturalness", target: RELEASE_READINESS_SCORE, checks: ["Human language instead of robotic copy","Intuitive flows matching real-world behavior","Natural visual rhythm and spacing","Context-aware interactions"] },
];

const TERMS = {
  stability: ["error", "loading", "empty", "retry", "backup", "offline", "validation", "status", "confirmation"],
  security: ["auth", "login", "permission", "role", "secure", "validation", "access", "admin", "token"],
  privacy: ["privacy", "consent", "personal", "delete", "export", "private", "data", "permission"],
  comfort: ["mobile", "simple", "clear", "search", "filter", "navigation", "responsive", "accessible"],
  beauty: ["visual", "design", "style", "brand", "image", "gallery", "theme", "layout", "hero", "background", "premium", "responsive"],
  naturalness: ["human", "natural", "friendly", "personalized", "context", "local", "language", "workflow"],
};

function textOf(specification) {
  const pages = Array.isArray(specification?.pages) ? specification.pages : [];
  const features = Array.isArray(specification?.features) ? specification.features : [];
  return [specification?.name,specification?.description,specification?.designSystem?.mood,specification?.designSystem?.visualDirection,...pages.flatMap((page) => [page?.name,page?.purpose,page?.description,page?.layout,page?.visualTreatment,page?.backgroundTreatment]),...features.flatMap((feature) => [typeof feature === "string" ? feature : feature?.name, typeof feature === "string" ? "" : feature?.description, typeof feature === "string" ? "" : feature?.uiPattern])].filter(Boolean).join(" ").toLowerCase();
}

function scoreDimension(id, specification) {
  const text = textOf(specification);
  const pages = Array.isArray(specification?.pages) ? specification.pages.length : 0;
  const features = Array.isArray(specification?.features) ? specification.features.length : 0;
  const terms = TERMS[id] || [];
  const hits = terms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0);
  const structure = Math.min(18, pages * 3) + Math.min(18, features * 2);
  const semantic = Math.min(28, hits * 4);
  const designCompleteness = id === "beauty" ? ["backgroundDirection","heroDirection","layoutSignature","fontDirection","iconStyle"].filter((key) => String(specification?.designSystem?.[key] || "").trim()).length * 2 : 0;
  const baseline = 42;
  return Math.min(100, baseline + structure + semantic + designCompleteness);
}

export function assessBuildQuality(specification) {
  const dimensions = BUILD_STANDARDS.map((standard) => {
    const score = scoreDimension(standard.id, specification);
    return { id: standard.id, name: standard.name, score, target: standard.target, passed: score >= standard.target, checks: standard.checks };
  });
  const overall = Math.round(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length);
  return { overall, passed: dimensions.every((item) => item.passed) && overall >= RELEASE_READINESS_SCORE, dimensions, methodology: "deterministic-spec-quality-gate-v3-100" };
}

export const GENERATION_QUALITY_RULES = `
Every generated App + Website, including the free promotional first project and Standard tier, must aim for a 100-point internal release-readiness target across stability, security, privacy, comfort, beauty and naturalness. Professional Mode adds deeper control; it must not be a paywall for basic quality.
1. Stability: clear flows, loading/error/empty states, validation, recoverable actions and no placeholders.
2. Security: least privilege, server-side validation for sensitive actions, safe auth boundaries and no client-exposed secrets.
3. Privacy: data minimization, purpose clarity, private-by-default choices and deletion/export controls where relevant.
4. Comfort: mobile-first, readable, accessible, calm, clear and low-friction interactions.
5. Beauty: original premium visual identity, distinctive layout, memorable hero treatment, refined typography and spacing, high-quality background/imagery direction, polished states and responsive composition. Avoid generic template appearance.
6. Naturalness: human language, real-world workflows, natural rhythm and context-aware interactions.
Do not publish merely because the deterministic specification score is high. Runtime, dependency, infrastructure, payment, integration and real-device checks must still be completed where applicable. A 100 score is an internal quality gate, not a guarantee of zero defects, absolute security, legal compliance or market leadership.
`;
