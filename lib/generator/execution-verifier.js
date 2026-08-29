import { normalizeAppSpec, safeRoute } from "./runtime-guard.js";

const DANGEROUS_TEXT_PATTERNS = [
  /eval\s*\(/i,
  /new\s+Function\s*\(/i,
  /child_process/i,
  /process\.env/i,
  /document\.cookie/i,
  /localStorage\s*\.\s*setItem\s*\(\s*["'`](token|secret|password|api[_-]?key)/i,
  /https?:\/\/[^\s"'`]+/i,
];

function flatten(value, out = []) {
  if (value == null) return out;
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => flatten(v, out));
  else if (typeof value === "object") Object.values(value).forEach((v) => flatten(v, out));
  return out;
}

export function verifyGeneratedAppExecution(input = {}) {
  const spec = normalizeAppSpec(input);
  const errors = [];
  const warnings = [];
  const routes = new Set();

  if (!spec.pages?.length) errors.push("NO_PAGES");
  if (!spec.pages?.some((p) => safeRoute(p.route, "/") === "/")) errors.push("NO_HOME_ROUTE");
  for (const page of spec.pages || []) {
    const route = safeRoute(page.route, "/");
    if (routes.has(route)) errors.push(`DUPLICATE_ROUTE:${route}`);
    routes.add(route);
    if (!Array.isArray(page.components) || page.components.length === 0) warnings.push(`EMPTY_COMPONENTS:${page.id || route}`);
  }

  const allText = flatten(spec).join("\n");
  for (const pattern of DANGEROUS_TEXT_PATTERNS) {
    if (pattern.test(allText)) errors.push(`SECURITY_PATTERN:${pattern.source}`);
  }

  const navRoutes = new Set((spec.navigation || []).map((n) => safeRoute(n?.route, "/")));
  for (const route of navRoutes) if (!routes.has(route)) errors.push(`BROKEN_NAVIGATION:${route}`);

  const dataEntities = spec.data && typeof spec.data === "object" ? Object.keys(spec.data) : [];
  if ((spec.features || []).length > 0 && dataEntities.length === 0) warnings.push("NO_DATA_MODEL");

  const checks = {
    buildableStructure: errors.every((e) => !e.startsWith("NO_") && !e.startsWith("DUPLICATE_ROUTE")),
    runtimeRoutesValid: errors.every((e) => !e.startsWith("BROKEN_NAVIGATION")),
    securityPassed: errors.every((e) => !e.startsWith("SECURITY_PATTERN")),
    privacyPassed: !/password|secret|api[_-]?key/i.test(allText),
  };

  return { ok: errors.length === 0, errors, warnings, checks, normalizedSpec: spec };
}

export function buildRepairInstruction(report = {}) {
  return [
    "Repair only the failing deterministic checks below while preserving working requirements.",
    ...(report.errors || []).map((e) => `- ${e}`),
    ...(report.warnings || []).map((w) => `- warning: ${w}`),
    "Return a complete corrected application specification.",
  ].join("\n");
}
