import { normalizeAppSpec, safeRoute } from "./runtime-guard.js";

function rawObject(value){return value&&typeof value==="object"&&!Array.isArray(value)?value:{};}

export function selfTestGeneratedApp(input) {
  const raw=rawObject(input);
  const rawPages=Array.isArray(raw.pages)?raw.pages:[];
  const spec = normalizeAppSpec(raw);
  const errors = [];
  const warnings = [];
  const routes = new Set();
  const pageIds = new Set();

  if(!rawPages.length)errors.push("Project must include at least one explicit page before normalization.");
  for (const page of spec.pages) {
    const route = safeRoute(page.route, "/");
    if (routes.has(route)) errors.push(`Duplicate route: ${route}`);
    routes.add(route);
    if(pageIds.has(page.id))errors.push(`Duplicate page id: ${page.id}`);
    pageIds.add(page.id);
    if (!page.name.trim()) warnings.push(`Page ${page.id} has no name.`);
    if(!page.description.trim()&&!page.purpose.trim()&&(!Array.isArray(page.components)||!page.components.length))warnings.push(`Page ${page.id} has no meaningful content.`);
  }
  if(!routes.has("/"))errors.push("Project must include a Home route (/).");

  for(const item of spec.navigation||[]){
    const route=safeRoute(item?.route,"/");
    if(!routes.has(route))errors.push(`Navigation points to missing route: ${route}`);
  }
  for (const action of spec.actions) {
    if (action && typeof action === "object" && !action.name && !action.label && !action.title) warnings.push("Action without a label was normalized.");
  }
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    normalizedSpec: spec,
    checks: {
      hasExplicitPages: rawPages.length > 0,
      hasHome: routes.has("/"),
      hasPages: spec.pages.length > 0,
      routesUnique: !errors.some((e) => e.startsWith("Duplicate route")),
      pageIdsUnique: !errors.some((e)=>e.startsWith("Duplicate page id")),
      navigationValid: !errors.some((e)=>e.startsWith("Navigation points to missing route")),
    }
  };
}
