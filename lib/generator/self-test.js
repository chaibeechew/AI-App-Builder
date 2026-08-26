import { normalizeAppSpec, safeRoute } from "./runtime-guard.js";

export function selfTestGeneratedApp(input) {
  const spec = normalizeAppSpec(input);
  const errors = [];
  const warnings = [];
  const routes = new Set();
  for (const page of spec.pages) {
    const route = safeRoute(page.route, "/");
    if (routes.has(route)) errors.push(`Duplicate route: ${route}`);
    routes.add(route);
    if (!page.name.trim()) warnings.push(`Page ${page.id} has no name.`);
  }
  for (const action of spec.actions) {
    if (action && typeof action === "object" && !action.name && !action.label) warnings.push("Action without a label was normalized.");
  }
  return { ok: errors.length === 0, errors, warnings, normalizedSpec: spec, checks: { hasHome: spec.pages.some((p) => p.route === "/"), hasPages: spec.pages.length > 0, routesUnique: errors.every((e) => !e.startsWith("Duplicate route")) } };
}
