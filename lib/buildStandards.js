export const BUILD_STANDARDS = [
  {
    id: "stability",
    name: "Stability",
    target: 90,
    checks: [
      "Clear page purposes and user flows",
      "Graceful empty, loading and error states",
      "No placeholder content",
      "Predictable navigation and recoverable actions",
    ],
  },
  {
    id: "security",
    name: "Security",
    target: 90,
    checks: [
      "Least-privilege access",
      "Server-side validation for sensitive actions",
      "No secrets exposed to clients",
      "Safe authentication and authorization boundaries",
    ],
  },
  {
    id: "privacy",
    name: "Privacy",
    target: 90,
    checks: [
      "Collect only necessary data",
      "Clear purpose for personal data",
      "Private-by-default controls",
      "Delete/export controls where relevant",
    ],
  },
  {
    id: "comfort",
    name: "Comfort",
    target: 88,
    checks: [
      "Low-friction navigation",
      "Readable text and tap targets",
      "Calm motion and clear feedback",
      "Mobile-first layouts",
    ],
  },
  {
    id: "beauty",
    name: "Beauty",
    target: 88,
    checks: [
      "Consistent visual hierarchy",
      "Balanced typography, spacing and imagery",
      "Polished states and transitions",
      "Original visual composition",
    ],
  },
  {
    id: "naturalness",
    name: "Naturalness",
    target: 88,
    checks: [
      "Human language instead of robotic copy",
      "Intuitive flows matching real-world behavior",
      "Natural visual rhythm and spacing",
      "Context-aware interactions",
    ],
  },
];

const TERMS = {
  stability: ["error", "loading", "empty", "retry", "backup", "offline", "validation", "status", "confirmation"],
  security: ["auth", "login", "permission", "role", "secure", "validation", "access", "admin", "token"],
  privacy: ["privacy", "consent", "personal", "delete", "export", "private", "data", "permission"],
  comfort: ["mobile", "simple", "clear", "search", "filter", "navigation", "responsive", "accessible"],
  beauty: ["visual", "design", "style", "brand", "image", "gallery", "theme", "layout"],
  naturalness: ["human", "natural", "friendly", "personalized", "context", "local", "language", "workflow"],
};

function textOf(specification) {
  const pages = Array.isArray(specification?.pages) ? specification.pages : [];
  const features = Array.isArray(specification?.features) ? specification.features : [];
  return [
    specification?.name,
    specification?.description,
    ...pages.flatMap((page) => [page?.name, page?.purpose, page?.description]),
    ...features.flatMap((feature) => [typeof feature === "string" ? feature : feature?.name, typeof feature === "string" ? "" : feature?.description]),
  ].filter(Boolean).join(" ").toLowerCase();
}

function scoreDimension(id, specification) {
  const text = textOf(specification);
  const pages = Array.isArray(specification?.pages) ? specification.pages.length : 0;
  const features = Array.isArray(specification?.features) ? specification.features.length : 0;
  const terms = TERMS[id] || [];
  const hits = terms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0);
  const structure = Math.min(18, pages * 3) + Math.min(18, features * 2);
  const semantic = Math.min(28, hits * 4);
  const baseline = 42;
  return Math.min(100, baseline + structure + semantic);
}

export function assessBuildQuality(specification) {
  const dimensions = BUILD_STANDARDS.map((standard) => {
    const score = scoreDimension(standard.id, specification);
    return {
      id: standard.id,
      name: standard.name,
      score,
      target: standard.target,
      passed: score >= standard.target,
      checks: standard.checks,
    };
  });
  const overall = Math.round(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length);
  return {
    overall,
    passed: dimensions.every((item) => item.passed),
    dimensions,
    methodology: "deterministic-spec-quality-gate-v1",
  };
}

export const GENERATION_QUALITY_RULES = `
Every generated App + Website must be designed against six quality goals:
1. Stability: clear flows, loading/error/empty states, validation, recoverable actions and no placeholders.
2. Security: least privilege, server-side validation for sensitive actions, safe auth boundaries and no client-exposed secrets.
3. Privacy: data minimization, purpose clarity, private-by-default choices and deletion/export controls where relevant.
4. Comfort: mobile-first, readable, accessible, calm, clear and low-friction interactions.
5. Beauty: original visual hierarchy, balanced spacing, typography, imagery and polished states.
6. Naturalness: human language, real-world workflows, natural rhythm and context-aware interactions.
When a feature implies personal or sensitive data, include privacy and permission requirements in the relevant page or feature description.
When a feature implies authentication, payments, administration or protected data, include role/access/security requirements in the relevant page or feature description.
Do not claim a security or privacy guarantee; design explicit safeguards that can later be implemented and tested.
`;
